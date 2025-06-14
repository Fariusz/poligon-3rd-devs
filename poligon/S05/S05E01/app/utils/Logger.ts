import { ILogger } from '../interfaces';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger implements ILogger {
  private readonly logLevel: LogLevel;
  private readonly prefix: string;

  constructor(prefix: string = 'App', logLevel: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.logLevel = logLevel;
  }

  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('INFO', message);
      console.log(formattedMessage, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('WARN', message);
      console.warn(formattedMessage, ...args);
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedMessage = this.formatMessage('ERROR', message);

      if (error) {
        console.error(formattedMessage, error);

        // Log stack trace if available and in debug mode
        if (error.stack && this.shouldLog(LogLevel.DEBUG)) {
          console.error('Stack trace:', error.stack);
        }
      } else {
        console.error(formattedMessage);
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('DEBUG', message);
      console.debug(formattedMessage, ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.getTimestamp();
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  // Utility methods for structured logging
  logWithContext(message: string, context: Record<string, any>): void {
    this.info(`${message} | Context:`, JSON.stringify(context, null, 2));
  }

  logPerformance(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.debug(`Performance: ${operation} completed in ${duration}ms`);
  }

  logApiCall(method: string, url: string, statusCode?: number, duration?: number): void {
    let message = `API Call: ${method} ${url}`;

    if (statusCode !== undefined) {
      message += ` -> ${statusCode}`;
    }

    if (duration !== undefined) {
      message += ` (${duration}ms)`;
    }

    this.info(message);
  }

  // Factory methods for creating loggers with different configurations
  static createConsoleLogger(prefix: string = 'App', logLevel: LogLevel = LogLevel.INFO): Logger {
    return new Logger(prefix, logLevel);
  }

  static createDebugLogger(prefix: string = 'Debug'): Logger {
    return new Logger(prefix, LogLevel.DEBUG);
  }

  static createProductionLogger(prefix: string = 'Prod'): Logger {
    return new Logger(prefix, LogLevel.WARN);
  }

  // Create a silent logger for testing
  static createSilentLogger(): Logger {
    return new Logger('Test', LogLevel.NONE);
  }

  // Method to change log level at runtime
  withLogLevel(level: LogLevel): Logger {
    return new Logger(this.prefix, level);
  }

  // Method to create child logger with additional prefix
  createChildLogger(childPrefix: string): Logger {
    return new Logger(`${this.prefix}:${childPrefix}`, this.logLevel);
  }
}

// Default logger instance
export const defaultLogger = Logger.createConsoleLogger('PhoneTask');

// Convenience function for quick logging
export const createLogger = (prefix: string, logLevel?: LogLevel): Logger => {
  return new Logger(prefix, logLevel);
};
