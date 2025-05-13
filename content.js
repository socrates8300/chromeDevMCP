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
  const capturedLogs = [];

  // Override console methods to capture logs
  console.log = function() {
    captureLog('log', arguments);
    originalConsole.log.apply(console, arguments);
  };

  console.info = function() {
    captureLog('info', arguments);
    originalConsole.info.apply(console, arguments);
  };

  console.warn = function() {
    captureLog('warn', arguments);
    originalConsole.warn.apply(console, arguments);
  };

  console.error = function() {
    captureLog('error', arguments);
    originalConsole.error.apply(console, arguments);
  };

  console.debug = function() {
    captureLog('debug', arguments);
    originalConsole.debug.apply(console, arguments);
  };

  // Helper function to format and capture logs
  function captureLog(level, args) {
    try {
      // Convert arguments to array
      const argsArray = Array.from(args).map(arg => {
        try {
          // Handle different types of arguments
          if (typeof arg === 'object') {
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch (e) {
          return `[Object conversion error: ${e.message}]`;
        }
      });

      // Create log entry with timestamp
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
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
    } catch (error) {
      // If something goes wrong, use the original console
      originalConsole.error('Error in console capture:', error);
    }
  }

  // Expose captured logs to window for debugging
  window.__capturedConsoleLogs = capturedLogs;

  // Listen for requests from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getCapturedLogs') {
      sendResponse({ logs: capturedLogs });
    } else if (message.action === 'clearCapturedLogs') {
      capturedLogs.length = 0;
      sendResponse({ success: true });
    }
    return true;
  });

})();
