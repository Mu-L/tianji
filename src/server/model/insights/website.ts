import { z } from 'zod';
import { insightsQuerySchema } from '../../utils/schema.js';
import { prisma } from '../_client.js';
import { Prisma, WebsiteEvent } from '@prisma/client';
import { FilterInfoType, FilterInfoValue } from '@tianji/shared';
import { DATA_TYPE, EVENT_TYPE } from '../../utils/const.js';
import { InsightEvent, InsightsSqlBuilder } from './shared.js';
import { processGroupedTimeSeriesData } from './utils.js';
import { clickhouse } from '../../clickhouse/index.js';

export class WebsiteInsightsSqlBuilder extends InsightsSqlBuilder {
  getTableName() {
    return 'WebsiteEvent';
  }

  buildSelectQueryArr() {
    const { metrics } = this.query;

    return metrics.map((item) => {
      if (item.math === 'events') {
        if (item.name === '$all_event') {
          return this.useClickhouse
            ? Prisma.sql`count(1) as "$all_event"`
            : Prisma.sql`count(1) as "$all_event"`;
        }

        if (item.name === '$page_view') {
          return this.useClickhouse
            ? Prisma.sql`sum(case WHEN WebsiteEvent.eventName = '' AND WebsiteEvent.eventType = ${Prisma.raw(EVENT_TYPE.pageView.toString())} THEN 1 ELSE 0 END) as "$page_view"`
            : Prisma.sql`sum(case WHEN "WebsiteEvent"."eventName" is null AND "WebsiteEvent"."eventType" = ${EVENT_TYPE.pageView} THEN 1 ELSE 0 END) as "$page_view"`;
        }

        return this.useClickhouse
          ? Prisma.sql`sum(case WHEN WebsiteEvent.eventName = ${Prisma.raw(`'${item.name}'`)} THEN 1 ELSE 0 END) as ${Prisma.raw(`"${item.name}"`)}`
          : Prisma.sql`sum(case WHEN "WebsiteEvent"."eventName" = ${item.name} THEN 1 ELSE 0 END) as ${Prisma.raw(`"${item.name}"`)}`;
      } else if (item.math === 'sessions') {
        if (item.name === '$all_event') {
          return this.useClickhouse
            ? Prisma.sql`count(distinct sessionId) as "$all_event"`
            : Prisma.sql`count(distinct "sessionId") as "$all_event"`;
        }

        if (item.name === '$page_view') {
          return this.useClickhouse
            ? Prisma.sql`count(distinct case WHEN WebsiteEvent.eventName = '' AND WebsiteEvent.eventType = ${Prisma.raw(EVENT_TYPE.pageView.toString())} THEN sessionId ELSE null END) as "$page_view"`
            : Prisma.sql`count(distinct case WHEN "WebsiteEvent"."eventName" is null AND "WebsiteEvent"."eventType" = ${EVENT_TYPE.pageView} THEN "sessionId" ELSE null END) as "$page_view"`;
        }

        return this.useClickhouse
          ? Prisma.sql`count(distinct case WHEN WebsiteEvent.eventName = ${Prisma.raw(`'${item.name}'`)} THEN sessionId END) as ${Prisma.raw(`"${item.name}"`)}`
          : Prisma.sql`count(distinct case WHEN "WebsiteEvent"."eventName" = ${item.name} THEN "sessionId" END) as ${Prisma.raw(`"${item.name}"`)}`;
      }

      return null;
    });
  }

  buildGroupSelectQueryArr() {
    const { groups } = this.query;
    let groupSelectQueryArr: Prisma.Sql[] = [];
    if (groups.length > 0) {
      for (const g of groups) {
        if (!g.customGroups) {
          groupSelectQueryArr.push(
            Prisma.sql`${this.getValueField(g.type)} as "%${Prisma.raw(g.value)}"`
          );
        } else if (g.customGroups && g.customGroups.length > 0) {
          for (const cg of g.customGroups) {
            groupSelectQueryArr.push(
              Prisma.sql`${this.buildFilterQueryOperator(
                g.type,
                cg.filterOperator,
                cg.filterValue
              )} as "%${Prisma.raw(`${g.value}|${cg.filterOperator}|${cg.filterValue}`)}"`
            );
          }
        }
      }
    }
    return groupSelectQueryArr;
  }

  buildInnerJoinQuery() {
    const { filters, groups } = this.query;
    let innerJoinQuery = Prisma.empty;
    if (filters.length > 0 || groups.length > 0) {
      if (this.useClickhouse) {
        innerJoinQuery = Prisma.sql`INNER JOIN WebsiteEventData ON WebsiteEvent.id = WebsiteEventData.websiteEventId`;
      } else {
        innerJoinQuery = Prisma.sql`INNER JOIN "WebsiteEventData" ON "WebsiteEvent"."id" = "WebsiteEventData"."websiteEventId"`;
      }

      if (filters.length > 0) {
        innerJoinQuery = Prisma.sql`${innerJoinQuery} AND ${Prisma.join(
          filters.map((filter) =>
            this.buildFilterQueryOperator(
              filter.type,
              filter.operator,
              filter.value
            )
          ),
          ' AND '
        )}`;
      }

      if (groups.length > 0) {
        const groupConditions = groups.map((g) =>
          this.useClickhouse
            ? Prisma.sql`WebsiteEventData.eventKey = ${Prisma.raw(`'${g.value}'`)}`
            : Prisma.sql`"WebsiteEventData"."eventKey" = ${g.value}`
        );
        innerJoinQuery = Prisma.sql`${innerJoinQuery} AND ${Prisma.join(
          groupConditions,
          ' OR '
        )}`;
      }
    }
    return innerJoinQuery;
  }

  buildWhereQueryArr() {
    const { insightId, time, metrics } = this.query;
    const { startAt, endAt } = time;

    const whereConditions = [
      // website id
      this.useClickhouse
        ? Prisma.sql`WebsiteEvent.websiteId = ${Prisma.raw(`'${insightId}'`)}`
        : Prisma.sql`"WebsiteEvent"."websiteId" = ${insightId}`,

      // date
      this.useClickhouse
        ? this.buildDateRangeQuery('WebsiteEvent.createdAt', startAt, endAt)
        : this.buildDateRangeQuery(
            '"WebsiteEvent"."createdAt"',
            startAt,
            endAt
          ),

      // event name
      Prisma.join(
        metrics.map((item) => {
          if (item.name === '$all_event') {
            return Prisma.sql`1 = 1`;
          }

          if (item.name === '$page_view') {
            return this.useClickhouse
              ? Prisma.sql`WebsiteEvent.eventType = ${Prisma.raw(EVENT_TYPE.pageView.toString())}`
              : Prisma.sql`"WebsiteEvent"."eventType" = ${EVENT_TYPE.pageView}`;
          }

          return this.useClickhouse
            ? Prisma.sql`WebsiteEvent.eventName = ${Prisma.raw(`'${item.name}'`)}`
            : Prisma.sql`"WebsiteEvent"."eventName" = ${item.name}`;
        }),
        ' OR ',
        '(',
        ')'
      ),
    ];

    return whereConditions;
  }

  private getValueField(type: FilterInfoType): Prisma.Sql {
    if (this.useClickhouse) {
      const valueField =
        type === 'number'
          ? Prisma.sql`WebsiteEventData.numberValue`
          : type === 'string'
            ? Prisma.sql`WebsiteEventData.stringValue`
            : type === 'date'
              ? Prisma.sql`WebsiteEventData.dateValue`
              : Prisma.sql`WebsiteEventData.numberValue`;

      return valueField;
    }

    const valueField =
      type === 'number'
        ? Prisma.sql`"WebsiteEventData"."numberValue"`
        : type === 'string'
          ? Prisma.sql`"WebsiteEventData"."stringValue"`
          : type === 'date'
            ? Prisma.sql`"WebsiteEventData"."dateValue"`
            : Prisma.sql`"WebsiteEventData"."numberValue"`;

    return valueField;
  }

  private buildFilterQueryOperator(
    type: FilterInfoType,
    operator: string,
    value: FilterInfoValue | null
  ) {
    const valueField = this.getValueField(type);

    return this.buildCommonFilterQueryOperator(
      type,
      operator,
      value,
      valueField
    );
  }

  public async queryEvents(
    cursor: string | undefined
  ): Promise<InsightEvent[]> {
    const allEventsSql = this.buildFetchEventsQuery(cursor);

    if (this.useClickhouse) {
      const result = await clickhouse.query({
        query: allEventsSql.sql,
      });
      const { data } = await result.json<any[]>();
      const allEvents = data as unknown as WebsiteEvent[];

      // Get event properties from ClickHouse
      const eventIds = allEvents.map((event) => event.id);
      if (eventIds.length > 0) {
        const eventDataResult = await clickhouse.query({
          query: `SELECT * FROM WebsiteEventData WHERE websiteEventId IN (${eventIds.map((id) => `'${id}'`).join(',')})`,
        });
        const { data: eventDataRows } = await eventDataResult.json<any[]>();
        const allEventProperties = eventDataRows;

        return this.processEventsData(allEvents, allEventProperties);
      } else {
        return this.processEventsData(allEvents, []);
      }
    } else {
      const allEvents = await prisma.$queryRaw<WebsiteEvent[]>(allEventsSql);

      const allEventProperties = await prisma.websiteEventData.findMany({
        where: {
          websiteEventId: {
            in: allEvents.map((event) => event.id),
          },
        },
      });

      return this.processEventsData(allEvents, allEventProperties);
    }
  }

  private processEventsData(
    allEvents: WebsiteEvent[],
    allEventProperties: any[]
  ): InsightEvent[] {
    const result = allEvents.map((event) => {
      const propertyRecords = allEventProperties.filter(
        (property) => property.websiteEventId === event.id
      );

      const properties = propertyRecords.reduce(
        (acc, property) => {
          if (property.dataType === DATA_TYPE.number) {
            acc[property.eventKey] = Number(property.numberValue);
          } else if (property.dataType === DATA_TYPE.date) {
            acc[property.eventKey] = property.dateValue;
          } else {
            acc[property.eventKey] = property.stringValue;
          }

          return acc;
        },
        {} as Record<string, any>
      );

      return {
        id: event.id,
        name: event.eventName ?? 'Page View',
        createdAt: event.createdAt,
        properties: {
          sessionId: event.sessionId,
          urlPath: event.urlPath,
          urlQuery: event.urlQuery,
          referrerPath: event.referrerPath,
          referrerQuery: event.referrerQuery,
          referrerDomain: event.referrerDomain,
          pageTitle: event.pageTitle,
          ...properties,
        },
      };
    });

    return result;
  }
}

export async function insightsWebsite(
  query: z.infer<typeof insightsQuerySchema>,
  context: { timezone: string }
) {
  const builder = new WebsiteInsightsSqlBuilder(query, context);
  const sql = builder.build();

  const data = await builder.executeQuery(sql);

  const result = processGroupedTimeSeriesData(query, context, data);

  return result;
}
