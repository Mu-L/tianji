import { trpc } from '@/api/trpc';
import { useCurrentWorkspaceId } from '@/store/user';
import { Sparkline } from '@/components/chart/Sparkline';
import React from 'react';
import { getDateArray } from '@tianji/shared';
import dayjs from 'dayjs';

export const WorkerSparkline: React.FC<{ workerId: string }> = React.memo(
  ({ workerId }) => {
    const workspaceId = useCurrentWorkspaceId();

    // Use last 24 hours data
    const startDate = dayjs().subtract(24, 'hour').startOf('hour');
    const endDate = dayjs().endOf('hour');

    const { data = [], isLoading } = trpc.worker.getExecutionTrend.useQuery(
      {
        workspaceId,
        workerId,
      },
      {
        select(data) {
          if (!data || data.length === 0) {
            // Return 8 empty data points for consistent display
            return [
              { value: 0 },
              { value: 0 },
              { value: 0 },
              { value: 0 },
              { value: 0 },
              { value: 0 },
              { value: 0 },
              { value: 0 },
            ];
          }

          return getDateArray(
            data.map((item) => ({
              date: item.date,
              value: item.value,
            })),
            startDate,
            endDate,
            'hour'
          );
        },
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        trpc: {
          context: {
            skipBatch: true,
          },
        },
      }
    );

    if (isLoading) {
      return (
        <div className="flex h-6 w-20 items-center justify-center">
          <span className="text-muted-foreground text-xs">Loading...</span>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex h-6 w-20 items-center justify-center">
          <span className="text-muted-foreground text-xs">No data</span>
        </div>
      );
    }

    // Extract counts for sparkline
    const sparklineData = data.map((item) => item.value || 0);

    return (
      <div className="flex items-center gap-2">
        <Sparkline
          data={sparklineData}
          width={80}
          height={24}
          strokeWidth={1.5}
          showGradient={true}
        />
      </div>
    );
  }
);
WorkerSparkline.displayName = 'WorkerSparkline';
