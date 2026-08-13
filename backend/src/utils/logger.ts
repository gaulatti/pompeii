import { ConsoleLogger, LoggerService } from '@nestjs/common';

/**
 * A logger service that outputs log messages in JSON format to the console.
 * Implements the LoggerService interface.
 */
export class JSONLogger extends ConsoleLogger implements LoggerService {
  /**
   * A flag indicating whether the logger is enabled.
   *
   * Ideally, the JSON Logger should be enabled only in containerized environments
   * to enable easy CloudWatch logging.
   */
  private enabled = process.env.CONTAINERIZED === 'true';

  /**
   * The realm for the logger.
   */
  private realm: string;

  /**
   * Creates an instance of the logger.
   *
   * @param realm - An optional string representing the realm or context for the logger.
   */
  constructor(realm?: string) {
    super();
    this.realm = realm || 'Global';
  }

  /**
   * Logs a message with a specified level and optional context.
   *
   * @param level - The log level (e.g., 'info', 'error', 'debug').
   * @param message - The message to log. Can be of any type.
   * @param context - Optional. Additional context or metadata to include with the log message.
   */
  private logMessage(level: string, message: any, context?: any) {
    if (this.enabled) {
      console.log(
        JSON.stringify({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
          realm: this.realm,
        }),
      );
    } else {
      console.log(`[${this.realm}]`, message, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Logs a message with an optional context.
   *
   * @param message - The message to log. Can be of any type.
   * @param context - Optional. The context or source of the log message.
   */
  log(message: any, context?: any) {
    this.logMessage('log', message, context);
  }

  /**
   * Logs an error message with optional trace and context information.
   *
   * @param message - The error message to log. Can be of any type.
   * @param trace - Optional. A string representing the stack trace or additional trace information.
   * @param context - Optional. A string representing the context in which the error occurred.
   */
  error(message: any, trace?: string, context?: any) {
    this.logMessage('error', message, context);
    if (trace) {
      this.error(trace);
    }
  }

  /**
   * Logs a warning message with an optional context.
   *
   * @param message - The warning message to log. Can be of any type.
   * @param context - Optional. The context in which the warning occurred.
   */
  warn(message: any, context?: any) {
    this.logMessage('warn', message, context);
  }

  /**
   * Logs a debug message with optional context.
   *
   * @param message - The message to log. Can be of any type.
   * @param context - Optional. The context in which the message is logged.
   */
  debug(message: any, context?: any) {
    this.logMessage('debug', message, context);
  }

  /**
   * Logs a verbose level message to the console.
   *
   * @param message - The message to log. Can be of any type.
   * @param context - An optional string providing additional context about the message.
   */
  verbose(message: any, context?: any) {
    this.logMessage('verbose', message, context);
  }

  /**
   * Logs a message with a 'sequelize' level.
   *
   * @param {string} message - The message to log.
   */
  sequelizeLog(message: string) {
    this.logMessage('sequelize', message);
  }
}

/**
 * A singleton instance of the JsonLogger class.
 */
const logger = new JSONLogger();
export { logger };
