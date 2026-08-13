import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for interacting with AWS CloudWatch to send custom metrics.
 *
 * @remarks
 * This service is designed to be used in containerized environments. Metrics will not be sent if the application is not running in a container.
 *
 * @example
 * ```typescript
 * const cloudWatchService = new CloudWatchService();
 * await cloudWatchService.sendMetric('MyMetric', 1, { Environment: 'Production' });
 * ```
 */
@Injectable()
export class CloudWatchService {
  /**
   * Logger and CloudWatchService instances.
   */
  private readonly logger = new Logger(CloudWatchService.name);
  private cloudWatchClient: CloudWatchClient;

  /**
   * Constructs a new instance of the CloudWatchService.
   * Initializes the CloudWatchClient with the AWS region specified in the environment variables.
   */
  constructor() {
    this.cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION,
    });
  }

  /**
   * Sends a metric to CloudWatch.
   *
   * @param metricName - The name of the metric.
   * @param value - The value of the metric.
   * @param dimensions - An optional object containing key-value pairs for dimensions. Defaults to an empty object.
   * @param unit - The unit of the metric. Defaults to `StandardUnit.Count`.
   *
   * @remarks
   * This method skips sending metrics if the application is not running in a container. This is useful to avoid sending metrics from local development environments.
   *
   * @throws Will log an error if the metric fails to send.
   */
  async sendMetric(
    metricName: string,
    value: number,
    dimensions: Record<string, string> = {},
    unit: StandardUnit = StandardUnit.Count,
  ) {
    /**
     * Skip sending metrics if the application is not running in a container.
     */
    if (process.env.CONTAINERIZED !== 'true') {
      return;
    }

    /**
     * Convert the dimensions object to an array of key-value pairs.
     */
    const dimensionsArray = Object.keys(dimensions).map((key) => ({
      Name: key,
      Value: dimensions[key],
    }));

    const params = {
      Namespace: 'Pompeii/Metrics',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Dimensions: dimensionsArray,
          Unit: unit,
        },
      ],
    };

    try {
      const command = new PutMetricDataCommand(params);
      await this.cloudWatchClient.send(command);
    } catch (error) {
      this.logger.error(
        `Failed to send metric ${metricName}: ${error.message}`,
      );
    }
  }
}
