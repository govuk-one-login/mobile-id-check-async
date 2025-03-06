import { Template } from "aws-cdk-lib/assertions";
import type { MatcherFunction } from "expect";

export interface Metric {
  // Both name and namespace could be an object to support cloudformation functions
  name: string;
  namespace: string;
  dimensions: string[];
  alarmName?: string;
  metricFilterName?: string;
}

function stringify(input: string | object): string {
  if (typeof input == "string") {
    return input;
  }
  return JSON.stringify(input);
}

export function extractCustomMetricsFromMetricFilters(
  template: Template,
): Metric[] {
  return Object.entries(
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-metricfilter.html
    template.findResources("AWS::Logs::MetricFilter"),
  ).flatMap(([metricFilterName, metricFilter]) => {
    return metricFilter.Properties.MetricTransformations.flatMap(
      (metricTransformation) => {
        return {
          name: stringify(metricTransformation.MetricName),
          namespace: stringify(metricTransformation.MetricNamespace),
          dimensions:
            metricTransformation.Dimensions?.map((dimension) =>
              stringify(dimension.Key),
            ) || [],
          metricFilterName: metricFilterName,
        };
      },
    );
  });
}

export function extractCustomMetricsFromAlarms(template: Template): Metric[] {
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html
  const alarms = Object.entries(
    template.findResources("AWS::CloudWatch::Alarm"),
  );

  // Alarms can use metrics in two possible ways. This pulls out both and filters down to custom metrics
  let alarmMetrics: Metric[] = alarms.flatMap(([alarmName, alarm]) => {
    if (alarm.Properties.MetricName && alarm.Properties.Namespace) {
      return {
        alarmName: alarmName,
        name: stringify(alarm.Properties.MetricName),
        namespace: stringify(alarm.Properties.Namespace),
        dimensions:
          alarm.Properties.Dimensions?.map((dimension) =>
            stringify(dimension.Name),
          ) || [],
      };
    }

    return alarm.Properties.Metrics.flatMap((metric) => {
      if (metric.MetricStat) {
        return {
          alarmName: alarmName,
          name: stringify(metric.MetricStat.Metric.MetricName),
          namespace: stringify(metric.MetricStat.Metric.Namespace),
          dimensions:
            metric.MetricStat.Metric.Dimensions?.map((dimension) =>
              stringify(dimension.Name),
            ) || [],
        };
      }
    });
  });

  // Remove undefined metrics
  alarmMetrics = alarmMetrics.filter((alarmMetric) => !!alarmMetric);

  // Remove metrics which use the `AWS/*` namespace
  alarmMetrics = alarmMetrics.filter((alarmMetric) => {
    if (typeof alarmMetric.namespace === "object") {
      return true;
    }
    return !alarmMetric.namespace.startsWith("AWS/");
  });

  return alarmMetrics;
}

export const toHaveCustomMetricDefinitionIn: MatcherFunction<
  [customMetrics: Metric[]]
> = function (alarmMetric: Metric, customMetrics: Metric[]) {
  const alarmMetricMatchesSomeCustomMetric = customMetrics.some(
    (customMetric) => {
      return (
        alarmMetric.name == customMetric.name &&
        alarmMetric.namespace == customMetric.namespace
      );
    },
  );

  if (alarmMetricMatchesSomeCustomMetric) {
    return {
      pass: true,
      message: () =>
        `Metric for alarm ${alarmMetric.alarmName} correctly matches a custom metric.\n\nName: ${alarmMetric.name}\nNamespace: ${alarmMetric.namespace}`,
    };
  }

  const availableMetrics = listAvailableMetrics(customMetrics);

  return {
    pass: false,
    message: () =>
      `Metric for alarm ${alarmMetric.alarmName} is missing a matching custom metric.\n\nName: ${alarmMetric.name}\nNamespace: ${alarmMetric.namespace}\n\nPossible values:\n${JSON.stringify(availableMetrics, null, 2)}`,
  };
};

export const toUseDimensionFromCustomMetricsIn: MatcherFunction<
  [customMetrics: Metric[]]
> = function (alarmMetric: Metric, customMetrics: Metric[]) {
  const customMetricsWithMatchingNameAndNamespace: Metric[] =
    customMetrics.filter((customMetric) => {
      return (
        alarmMetric.name == customMetric.name &&
        alarmMetric.namespace == customMetric.namespace
      );
    });

  if (customMetricsWithMatchingNameAndNamespace.length === 0) {
    // Duplicates the check in `toHaveCustomMetricDefinitionIn`. Keeping both for more helpful test output
    const availableMetrics = listAvailableMetrics(customMetrics);

    return {
      pass: false,
      message: () =>
        `Metric for alarm ${alarmMetric.alarmName} is missing a matching custom metric.\n\nName: ${alarmMetric.name}\nNamespace: ${alarmMetric.namespace}\n\nPossible values:\n${JSON.stringify(availableMetrics, null, 2)}`,
    };
  }

  const alarmMetricDimensionsMatchesSomeCustomMetric =
    customMetricsWithMatchingNameAndNamespace.some((customMetric) => {
      return alarmMetric.dimensions.every((dimension) => {
        return customMetric.dimensions.includes(dimension); // Should this check the inverse and enforce a comple match of the list?
      });
    });

  if (alarmMetricDimensionsMatchesSomeCustomMetric) {
    return {
      pass: true,
      message: () =>
        `Metric for alarm ${alarmMetric.alarmName} correctly matches a custom metric using name.\n\nName: ${alarmMetric.name}\nNamespace: ${alarmMetric.namespace}\nDimensions: ${JSON.stringify(alarmMetric.dimensions, null, 2)}`,
    };
  }

  return {
    pass: false,
    message: () =>
      `Metric for alarm ${alarmMetric.alarmName} does not match a custom metric.\n\nName: ${alarmMetric.name}\nNamespace: ${alarmMetric.namespace}\nDimensions: ${JSON.stringify(alarmMetric.dimensions, null, 2)}\n\nClose matches: ${JSON.stringify(customMetricsWithMatchingNameAndNamespace, null, 2)}`,
  };
};

function listAvailableMetrics(metrics: Metric[]): string[] {
  return metrics
    .map((metric) => {
      return `${metric.name} - ${metric.namespace}`;
    })
    .filter((metric, index, array) => array.indexOf(metric) === index)
    .sort();
}
