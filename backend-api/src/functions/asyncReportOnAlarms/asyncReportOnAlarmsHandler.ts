import {
  AlarmHistoryItem,
  CloudWatchClient,
  DescribeAlarmHistoryCommand,
  DescribeAlarmHistoryCommandInput,
  DescribeAlarmHistoryCommandOutput,
} from "@aws-sdk/client-cloudwatch";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const LOOKBACK_PERIOD = 1 * 1 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds
const cloudWatchClient = new CloudWatchClient();
const snsClient = new SNSClient();

export async function lambdaHandler() {
  const alarmHistoryItems = await getAlarmHistoriesFromCloudWatch(
    new Date(getTargetTimeWindow().start),
    new Date(getTargetTimeWindow().end),
  );
  const eventsByAlarmName = groupEventsByAlarmName(alarmHistoryItems);

  const previousPeriodAlarmHistoryItems = await getAlarmHistoriesFromCloudWatch(
    new Date(getPreviousTimeWindow().start),
    new Date(getPreviousTimeWindow().end),
  );
  const previousPeriodEventsByAlarmName = groupEventsByAlarmName(
    previousPeriodAlarmHistoryItems,
  );

  const top5AlarmsByDuration = getTopNAlarmsByMetricWithPercentageChange(
    eventsByAlarmName,
    previousPeriodEventsByAlarmName,
    5,
    getMillisecondsSpentInAlarm,
  );
  const top5AlarmsByTransitions = getTopNAlarmsByMetricWithPercentageChange(
    eventsByAlarmName,
    previousPeriodEventsByAlarmName,
    5,
    countOkToAlarmTransitions,
  );

  const transitionsReport = formatAlarmReport(
    top5AlarmsByTransitions,
    "Times fired",
    formatAsNumberOfTransitions,
  );
  const durationReport = formatAlarmReport(
    top5AlarmsByDuration,
    "Time spent in ALARM",
    formatAsHoursMinutesAndSeconds,
  );

  console.log(transitionsReport);
  console.log(durationReport);

  try {
    const response = await snsClient.send(
      new PublishCommand({
        TopicArn:
          "arn:aws:sns:eu-west-2:211125300205:cc-async-backend-alarm-reporting",
        Message: JSON.stringify({
          version: "1.0",
          source: "custom",
          content: {
            description: `${transitionsReport}\n\n${durationReport}`,
          },
        }),
      }),
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}

async function getAlarmHistoriesFromCloudWatch(
  startDate: Date,
  endDate: Date,
): Promise<AlarmHistoryItem[]> {
  const alarmHistoryItems: AlarmHistoryItem[] = [];

  let thereAreMoreResultsToFetch = true;
  let nextToken = undefined;
  while (thereAreMoreResultsToFetch) {
    const commandInput: DescribeAlarmHistoryCommandInput = {
      HistoryItemType: "StateUpdate",
      StartDate: startDate,
      EndDate: endDate,
      NextToken: nextToken,
    };
    const command = new DescribeAlarmHistoryCommand(commandInput);

    try {
      const response = (await cloudWatchClient.send(
        command,
      )) as DescribeAlarmHistoryCommandOutput;
      alarmHistoryItems.push(...response.AlarmHistoryItems!);
      nextToken = response.NextToken;
      if (nextToken === undefined) {
        thereAreMoreResultsToFetch = false;
      }
    } catch (error) {
      console.log("ERROR: " + error);
    }
  }

  return alarmHistoryItems.sort((a, b) => {
    if (a.Timestamp! < b.Timestamp!) {
      return -1;
    }
    if (a.Timestamp! > b.Timestamp!) {
      return 1;
    }
    return 0;
  });
}

function groupEventsByAlarmName(
  alarmHistoryItems: AlarmHistoryItem[],
): Record<string, AlarmEvent[]> {
  return alarmHistoryItems.reduce(
    (
      eventsByAlarmName: Record<string, AlarmEvent[]>,
      currentAlarmHistoryItem: AlarmHistoryItem,
    ) => {
      if (
        currentAlarmHistoryItem.AlarmName === undefined ||
        currentAlarmHistoryItem.Timestamp === undefined ||
        currentAlarmHistoryItem.HistorySummary === undefined ||
        ![
          "Alarm updated from OK to ALARM",
          "Alarm updated from ALARM to OK",
        ].includes(currentAlarmHistoryItem.HistorySummary)
      ) {
        return eventsByAlarmName;
      }

      const alarmName = currentAlarmHistoryItem.AlarmName;
      eventsByAlarmName[alarmName] = eventsByAlarmName[alarmName] || [];
      eventsByAlarmName[alarmName].push({
        stateTransition:
          currentAlarmHistoryItem.HistorySummary as StateTransition,
        timestamp: currentAlarmHistoryItem.Timestamp,
      });
      return eventsByAlarmName;
    },
    {},
  );
}

function getTopNAlarmsByMetricWithPercentageChange(
  eventsByAlarmName: Record<string, AlarmEvent[]>,
  previousPeriodEventsByAlarmName: Record<string, AlarmEvent[]>,
  n: number,
  calculateMetric: CalculateMetric,
): AlarmReportItem[] {
  return (
    Object.entries(eventsByAlarmName)
      // First, apply metric to events for each alarm to get metric value
      .map(([alarmName, alarmEvents]): [string, number] => [
        alarmName,
        calculateMetric(alarmEvents, getTargetTimeWindow()),
      ])

      // Then sort by metric value in descending order
      .sort(([_, firstMetricValue], [__, secondMetricValue]) => {
        if (firstMetricValue > secondMetricValue) {
          return -1;
        }
        if (secondMetricValue > firstMetricValue) {
          return 1;
        }
        return 0;
      })

      // Then take only the top N items
      .slice(0, n)

      // Finally, enrich with percentage change vs same metric applied to same alarm in previous period
      .map(([alarmName, metricValue]) => {
        const previousMetricValue = calculateMetric(
          previousPeriodEventsByAlarmName[alarmName] || [],
          getPreviousTimeWindow(),
        );
        const percentageChange =
          ((metricValue - previousMetricValue) / previousMetricValue) * 100;
        return {
          alarmName,
          metricValue,
          percentageChange,
        };
      })
  );
}

function countOkToAlarmTransitions(
  events: AlarmEvent[],
  _timeWindow: TimeWindow,
): number {
  return events.filter(
    (event) => event.stateTransition === "Alarm updated from OK to ALARM",
  ).length;
}

function getMillisecondsSpentInAlarm(
  events: AlarmEvent[],
  timeWindow: TimeWindow,
): number {
  let millisecondsSpentInAlarm = 0;

  // This ensures that for alarms that were already in ALARM state at the start of the lookback window, we count elapsed
  // time from the beginning of the period.
  let startTimestamp = timeWindow.start;

  for (const [i, alarmEvent] of events.entries()) {
    if (alarmEvent.stateTransition === "Alarm updated from ALARM to OK") {
      // When alarm transitions from ALARM to OK, we count time elapsed from entering the ALARM state
      millisecondsSpentInAlarm +=
        alarmEvent.timestamp.getTime() - startTimestamp;
    } else if (i === events.length - 1) {
      // If still in alarm at time of analysis, add the time elapsed since entering that state
      millisecondsSpentInAlarm +=
        timeWindow.end - alarmEvent.timestamp.getTime();
    } else {
      // When an alarm transitions from OK to ALARM, we reset the start timestamp to count from this point
      startTimestamp = alarmEvent.timestamp.getTime();
    }
  }
  return millisecondsSpentInAlarm;
}

function getTargetTimeWindow(): TimeWindow {
  return {
    start: Date.now() - LOOKBACK_PERIOD,
    end: Date.now(),
  };
}

function getPreviousTimeWindow(): TimeWindow {
  return {
    start: Date.now() - 2 * LOOKBACK_PERIOD,
    end: Date.now() - LOOKBACK_PERIOD,
  };
}

function formatAlarmReport(
  items: AlarmReportItem[],
  metricHeading: string,
  formatMetricValue: FormatInteger,
): string {
  const header = `
| Alarm Name | ${metricHeading} | % Change From Previous Period |
| ---------- | ---------------- | ----------------------------- |
`;
  const formattedItems = items
    .map(
      (item) =>
        `| ${item.alarmName} | ${formatMetricValue(item.metricValue)} | ${formatAsPercentageChange(item.percentageChange)} |`,
    )
    .join("\n");
  return header + formattedItems;
}

function formatAsHoursMinutesAndSeconds(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const seconds = Math.floor((milliseconds / 1000) % 60);
  return `${hours}h${minutes}m${seconds}s`;
}

function formatAsNumberOfTransitions(integer: number): string {
  return `${integer}`;
}

function formatAsPercentageChange(integer: number): string {
  if (!Number.isFinite(integer)) {
    return "N/A";
  }
  return `${integer.toFixed(2)}%`;
}

interface AlarmEvent {
  timestamp: Date;
  stateTransition: StateTransition;
}

interface AlarmReportItem {
  alarmName: string;
  metricValue: number;
  percentageChange: number;
}

interface TimeWindow {
  start: number;
  end: number;
}

type CalculateMetric = (events: AlarmEvent[], timeWindow: TimeWindow) => number;

type FormatInteger = (integer: number) => string;

type StateTransition =
  | "Alarm updated from OK to ALARM"
  | "Alarm updated from ALARM to OK";
