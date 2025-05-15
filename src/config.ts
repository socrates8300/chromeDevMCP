// Default configuration values
export const DEFAULT_CONFIG = {
  // WebSocket configuration
  WS_PORT: 8765,
  WS_MAX_RETRIES: 5,
  WS_RETRY_DELAY: 1000, // ms
  WS_MAX_RETRY_DELAY: 30000, // ms
  
  // Logging configuration
  MAX_LOGS: 1000, // Maximum number of logs to keep in memory
  
  // Network configuration
  ALLOWED_WS_ORIGINS: ['ws://localhost', 'wss://localhost']
} as const;

export type Config = typeof DEFAULT_CONFIG;
