import { ConsoleLog, LogLevel } from './types';
import { Logger } from './utils';

// Default configuration
const DEFAULT_CONFIG = {
  MAX_LOGS: 1000,
  WS_PORT: 8765,
  WS_MAX_RETRIES: 5,
  WS_RETRY_DELAY: 1000,
  WS_MAX_RETRY_DELAY: 30000,
  ALLOWED_WS_ORIGINS: ['ws://localhost', 'wss://localhost']
};

declare global {
  interface Window {
    __capturedConsoleLogs: ConsoleLog[];
  }
}

// Initialize logger
const logger = Logger.getInstance();

// Console log capture logic
(function() {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Circular buffer to store captured logs with fixed size
  const capturedLogs: ConsoleLog[] = [];
  let logIndex = 0; // Tracks the next position to write to

  // Override console methods to capture logs
  const overrideConsoleMethod = (level: LogLevel) => {
    return function(...args: any[]) {
      captureLog(level, args);
      // Call original method
      originalConsole[level].apply(console, args);
    };
  };

  // Apply overrides
  console.log = overrideConsoleMethod('log');
  console.info = overrideConsoleMethod('info');
  console.warn = overrideConsoleMethod('warn');
  console.error = overrideConsoleMethod('error');
  console.debug = overrideConsoleMethod('debug');

  // Helper function to format and capture logs
  function captureLog(level: LogLevel, args: any[]) {
    try {
      // Convert arguments to string
      const message = args
        .map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch (e) {
            return `[Object conversion error: ${e instanceof Error ? e.message : String(e)}]`;
          }
        })
        .join(' ')
        .substring(0, 10000); // Limit message length

      // Create log entry
      const logEntry: ConsoleLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        url: window.location.href,
        tabId: null,
        stack: new Error().stack?.split('\n').slice(2).join('\n'),
        context: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          location: window.location.toString()
        }
      };

      // Add to captured logs using circular buffer
      if (capturedLogs.length < DEFAULT_CONFIG.MAX_LOGS) {
        capturedLogs.push(logEntry);
      } else {
        capturedLogs[logIndex] = logEntry;
        logIndex = (logIndex + 1) % DEFAULT_CONFIG.MAX_LOGS;
      }

      // Send log to background script
      sendLogToBackground(logEntry);
    } catch (error) {
      console.error('Error in console capture:', error);
    }
  }

  // Send log to background script with retry logic
  function sendLogToBackground(logEntry: ConsoleLog, retryCount = 0) {
    const message = { action: 'consoleLog', data: logEntry };
    
    const handleError = (error: unknown) => {
      console.warn('Failed to send log to background:', error);
      
      // Retry with exponential backoff (max 3 retries)
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => sendLogToBackground(logEntry, retryCount + 1), delay);
      } else {
        console.error('Max retries reached, dropping log:', logEntry.message);
      }
    };

    try {
      if (chrome.runtime?.id) { // Check if extension context is valid
        chrome.runtime.sendMessage(message, handleError);
      }
    } catch (error) {
      handleError(error);
    }
  }

  // Expose captured logs to window for debugging
  window.__capturedConsoleLogs = capturedLogs;

  // Listen for requests from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message?.action) {
        case 'getCapturedLogs':
          sendResponse({
            success: true,
            logs: [...capturedLogs],
            total: capturedLogs.length,
            maxLogs: DEFAULT_CONFIG.MAX_LOGS
          });
          break;
          
        case 'clearCapturedLogs':
          capturedLogs.length = 0;
          logIndex = 0;
          sendResponse({ success: true, clearedAt: new Date().toISOString() });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Return true to indicate we'll respond asynchronously
    return true;
  });
})();
