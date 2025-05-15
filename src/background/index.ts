import { logger } from '../utils/logger';
import { initNetworkMonitoring } from './network-monitor';
import { setupMessageHandlers } from './message-handler';
import { WebSocketManager } from './websocket';
import { loadSettings } from './storage';

// Initialize the extension
async function initExtension(): Promise<void> {
  try {
    // Load settings
    const settings = await loadSettings();
    
    // Set log level from settings
    logger.setLogLevel(settings.logLevel);
    
    // Initialize WebSocket connection
    const wsManager = new WebSocketManager(settings.port);
    
    // Initialize network monitoring with WebSocket manager
    await initNetworkMonitoring(wsManager);
    
    // Set up message handlers with WebSocket manager
    setupMessageHandlers(wsManager);
    
    logger.info('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Initialize when installed/updated
chrome.runtime.onInstalled.addListener(() => {
  initExtension();
});

// Re-initialize when the extension is started
chrome.runtime.onStartup?.addListener(() => {
  initExtension();
});

// Export for testing
export { initExtension };
