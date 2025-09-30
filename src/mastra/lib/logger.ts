/**
 * Simple logger utility for Mastra operations
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private prefix: string

  constructor(prefix = '[Mastra]') {
    this.prefix = prefix
  }

  private formatMessage(level: LogLevel, message: string, ..._args: unknown[]) {
    const timestamp = new Date().toISOString()
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`
  }

  info(message: string, ...args: unknown[]) {
    console.log(this.formatMessage('info', message), ...args)
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, ...args: any[]) {
    console.error(this.formatMessage('error', message), ...args)
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }
}

export const logger = new Logger()
