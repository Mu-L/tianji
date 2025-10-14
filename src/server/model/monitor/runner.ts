import { Workspace } from '@prisma/client';
import { subscribeEventBus } from '../../ws/shared.js';
import { prisma } from '../_client.js';
import { monitorProviders } from './provider/index.js';
import { sendNotification } from '../notification/index.js';
import dayjs from 'dayjs';
import { logger } from '../../utils/logger.js';
import { token } from '../notification/token/index.js';
import { ContentToken } from '../notification/token/type.js';
import { createAuditLog } from '../auditLog.js';
import { MonitorWithNotification } from './types.js';
import { get } from 'lodash-es';
import { updateMonitorErrorMessage } from './index.js';
import { formatString } from '../../utils/template.js';

/**
 * Class which actually run monitor data collect
 */
export class MonitorRunner {
  isStopped = false;
  timer: NodeJS.Timeout | null = null;
  retriedNum = 0;
  currentStatus: 'UP' | 'DOWN' = 'UP';

  constructor(
    public workspace: Workspace,
    public monitor: MonitorWithNotification
  ) {}

  /**
   * Notice: Here is a issue which when workspace changed timezone and its will not effect immediately.
   */
  getTimezone(): string {
    return get(this.workspace, ['settings', 'timezone']) || 'utc';
  }

  private async runMonitor() {
    const monitor = this.monitor;
    const { type, workspaceId, maxRetries } = monitor;

    const provider = monitorProviders[type];
    if (!provider) {
      throw new Error(`Unknown monitor type: ${type}`);
    }

    try {
      let value = 0;
      try {
        value = await provider.run(monitor);

        if (value === 0) {
          return; // if value is 0, skip all logic
        }
      } catch (err) {
        const errorMessage = get(err, 'message', String(err));
        logger.error(`[Monitor] (id: ${monitor.id}) run error:`, errorMessage);
        createAuditLog({
          workspaceId: this.monitor.workspaceId,
          relatedId: this.monitor.id,
          relatedType: 'Monitor',
          content: `Monitor(id: ${monitor.id}) exec error: ${errorMessage}`,
        });
        updateMonitorErrorMessage(this.monitor.id, errorMessage);
        value = -1;
      }

      if (value < 0 && this.retriedNum < maxRetries) {
        // can be retry
        this.retriedNum++;
      } else {
        this.retriedNum = 0; // make sure its will throw error in every retry times

        // check event update
        if (value < 0 && this.currentStatus === 'UP') {
          // UP -> DOWN
          await this.createEvent(
            'DOWN',
            `Monitor [${monitor.name}] has been down`
          );

          const { title, content } = this.buildDownNotification(
            this.monitor.recentError || 'Unknown error'
          );
          await this.notify(title, [token.text(content)]);
          this.currentStatus = 'DOWN';
        } else if (value > 0 && this.currentStatus === 'DOWN') {
          // DOWN -> UP
          await this.createEvent('UP', `Monitor [${monitor.name}] has been up`);

          const { title, content } = this.buildUpNotification();
          await this.notify(title, [token.text(content)]);
          this.currentStatus = 'UP';
        }
      }

      // insert into data
      const data = await prisma.monitorData.create({
        data: {
          monitorId: monitor.id,
          value,
        },
      });

      subscribeEventBus.emit('onMonitorReceiveNewData', workspaceId, data);
    } catch (err) {
      logger.error('[Monitor] Run monitor error,', monitor.id, String(err));
    }
  }

  async manualTrigger() {
    await this.runMonitor();
  }

  /**
   * Start single monitor
   */
  async startMonitor() {
    const monitor = this.monitor;
    const { interval } = monitor;

    const nextAction = () => {
      if (this.isStopped === true) {
        return;
      }

      this.timer = setTimeout(() => {
        run();
      }, interval * 1000);
    };

    const run = async () => {
      try {
        await this.runMonitor();
      } catch (err) {
        createAuditLog({
          workspaceId: this.monitor.workspaceId,
          relatedId: this.monitor.id,
          relatedType: 'Monitor',
          content: `Run monitor(id: ${monitor.id}) error: ${String(err)}`,
        });
      } finally {
        nextAction();
      }
    };

    this.isStopped = false;
    run();

    logger.info(`Start monitor ${monitor.name}(${monitor.id})`);
  }

  stopMonitor() {
    const monitor = this.monitor;

    this.isStopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    logger.info(`Stop monitor ${monitor.name}(${monitor.id})`);
  }

  async restartMonitor() {
    this.stopMonitor();
    this.startMonitor();
  }

  async createEvent(type: 'UP' | 'DOWN', message: string) {
    return await prisma.monitorEvent.create({
      data: {
        message,
        monitorId: this.monitor.id,
        type,
      },
    });
  }

  async notify(title: string, message: ContentToken[]) {
    const notifications = this.monitor.notifications;
    await Promise.all(
      notifications.map((n) =>
        sendNotification(n, title, message).catch((err) => {
          console.error(err);
        })
      )
    );
  }

  getCurrentTime(): string {
    return dayjs().tz(this.getTimezone()).format('YYYY-MM-DD HH:mm:ss (z)');
  }

  private buildUpNotification(): { title: string; content: string } {
    const monitor = this.monitor as MonitorWithNotification & {
      upMessageTemplate?: string | null;
    };
    const currentTime = this.getCurrentTime();

    const templateVars = {
      monitorName: monitor.name,
      currentTime,
      monitorType: monitor.type,
    };

    const defaultTitle = `[${monitor.name}] ✅ Up`;
    const defaultContent = `[${monitor.name}] ✅ Up\nTime: ${currentTime}`;

    let title = defaultTitle;
    let content = defaultContent;

    if (monitor.upMessageTemplate) {
      try {
        content = formatString(monitor.upMessageTemplate, templateVars);
        // Extract title from first line or use default
        const lines = content.split('\n');
        title = lines[0] || defaultTitle;
      } catch (err) {
        logger.warn(
          `[Monitor] Failed to format up template for ${monitor.id}:`,
          err
        );
        // Fallback to default
        title = defaultTitle;
        content = defaultContent;
      }
    }

    return { title, content };
  }

  private buildDownNotification(errorMessage: string): {
    title: string;
    content: string;
  } {
    const monitor = this.monitor as MonitorWithNotification & {
      downMessageTemplate?: string | null;
    };
    const currentTime = this.getCurrentTime();

    const templateVars = {
      monitorName: monitor.name,
      currentTime,
      monitorType: monitor.type,
      errorMessage,
    };

    const defaultTitle = `[${monitor.name}] 🔴 Down`;
    const defaultContent = `[${monitor.name}] 🔴 Down\nTime: ${currentTime}\nError: ${errorMessage}`;

    let title = defaultTitle;
    let content = defaultContent;

    if (monitor.downMessageTemplate) {
      try {
        content = formatString(monitor.downMessageTemplate, templateVars);
        // Extract title from first line or use default
        const lines = content.split('\n');
        title = lines[0] || defaultTitle;
      } catch (err) {
        logger.warn(
          `[Monitor] Failed to format down template for ${monitor.id}:`,
          err
        );
        // Fallback to default
        title = defaultTitle;
        content = defaultContent;
      }
    }

    return { title, content };
  }
}
