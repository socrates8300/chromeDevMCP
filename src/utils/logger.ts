type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

let currentLogLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  if (level in LOG_LEVELS) {
    currentLogLevel = level;
  }
}

export const logger = {
  error(message: string, ...args: any[]): void {
    if (LOG_LEVELS[currentLogLevel] >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  warn(message: string, ...args: any[]): void {
    if (LOG_LEVELS[currentLogLevel] >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  info(message: string, ...args: any[]): void {
    if (LOG_LEVELS[currentLogLevel] >= LOG_LEVELS.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  debug(message: string, ...args: any[]): void {
    if (LOG_LEVELS[currentLogLevel] >= LOG_LEVELS.debug) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  },
  
  setLogLevel(level: LogLevel): void {
    if (level in LOG_LEVELS) {
      currentLogLevel = level;
    }
  }
};

// Export for testing
export const __test__ = {
  setLogLevel,
  LOG_LEVELS,
  currentLogLevel: () => currentLogLevel
};
