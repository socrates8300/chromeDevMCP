import { ConsoleLog } from './types';
import { Logger } from './utils';

declare global {
  interface Window {
    __capturedConsoleLogs: ConsoleLog[];
  }
}

// Initialize singleton
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

  // Array to store captured logs
  const capturedLogs: ConsoleLog[] = [];

  // Override console methods to capture logs
  console.log = (...args: any[]) => {
    captureLog('log', args);
    originalConsole.log.apply(console, args);
  };

  console.info = (...args: any[]) => {
    captureLog('info', args);
    originalConsole.info.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    captureLog('warn', args);
    originalConsole.warn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    captureLog('error', args);
    originalConsole.error.apply(console, args);
  };

  console.debug = (...args: any[]) => {
    captureLog('debug', args);
    originalConsole.debug.apply(console, args);
  };

  // Helper function to format and capture logs
  function captureLog(level: string, args: IArguments | any[]) {
    try {
      // Convert arguments to array
      const argsArray = Array.from(args).map(arg => {
        try {
          // Handle different types of arguments
          if (typeof arg === 'object') {
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch (e: any) {
          return `[Object conversion error: ${e.message}]`;
        }
      });

      // Create log entry with timestamp
      const logEntry: ConsoleLog = {
        timestamp: new Date().toISOString(),
        level: level as 'log' | 'info' | 'warn' | 'error' | 'debug',
        message: argsArray.join(' '),
        url: window.location.href,
        tabId: null // Will be set by background script
      };

      // Add to captured logs
      capturedLogs.push(logEntry);

      // Send log to background script
      chrome.runtime.sendMessage({
        action: 'consoleLog',
        data: logEntry
      });
    } catch (error: any) {
      logger.error('Error in console capture', error);
    }
  }

  // Expose captured logs to window for debugging
  window.__capturedConsoleLogs = capturedLogs;

  // Listen for requests from the background script
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    try {
      if (message.action === 'getCapturedLogs') {
        sendResponse({ logs: capturedLogs });
      } else if (message.action === 'clearCapturedLogs') {
        capturedLogs.length = 0;
        sendResponse({ success: true });
      }
      return true;
    } catch (error: any) {
      logger.error('Error handling message in content script', error);
    }
  });

})();
