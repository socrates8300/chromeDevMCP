import { logger } from '../utils/logger';
import { WebSocketManager } from './websocket';
import { getPort, setPort } from './storage';

// Store the WebSocket manager instance
let wsManager: WebSocketManager | null = null;

interface TabData {
  logs: any[];
  networkRequests: any[];
}

const tabData = new Map<number, TabData>();

export function setupMessageHandlers(wsManagerInstance: WebSocketManager): void {
  wsManager = wsManagerInstance;
  // Handle messages from content scripts and popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'getTabData':
          handleGetTabData(message.tabId, sendResponse);
          return true; // Required for async response
          
        case 'clearTabData':
          handleClearTabData(message.tabId, sendResponse);
          return true;
          
        case 'getNetworkRequests':
          handleGetNetworkRequests(message.tabId, sendResponse);
          return true;
          
        case 'clearNetworkRequests':
          handleClearNetworkRequests(message.tabId, sendResponse);
          return true;
          
        case 'updatePort':
          handleUpdatePort(message.port, sendResponse);
          return true;
          
        case 'restartServer':
          handleRestartServer(sendResponse);
          return true;
          
        default:
          logger.warn('Unknown message action:', message.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      sendResponse({ error: 'Internal server error' });
    }
  });
}

function handleGetTabData(tabId: number, sendResponse: (response: any) => void): void {
  try {
    const data = tabData.get(tabId);
    // Ensure all required properties are present with default values
    const responseData = {
      logs: data?.logs || [],
      networkRequests: data?.networkRequests || []
    };
    sendResponse({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Error getting tab data:', error);
    sendResponse({ success: false, error: 'Failed to get tab data' });
  }
}

function handleClearTabData(tabId: number, sendResponse: (response: any) => void): void {
  try {
    tabData.delete(tabId);
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Error clearing tab data:', error);
    sendResponse({ success: false, error: 'Failed to clear tab data' });
  }
}

function handleGetNetworkRequests(tabId: number, sendResponse: (response: any) => void): void {
  try {
    const data = tabData.get(tabId);
    sendResponse({
      success: true,
      data: data?.networkRequests || []
    });
  } catch (error) {
    logger.error('Error getting network requests:', error);
    sendResponse({ success: false, error: 'Failed to get network requests' });
  }
}

function handleClearNetworkRequests(tabId: number, sendResponse: (response: any) => void): void {
  try {
    const data = tabData.get(tabId);
    if (data) {
      data.networkRequests = [];
      tabData.set(tabId, data);
    } else {
      // Initialize with empty data if it doesn't exist
      tabData.set(tabId, { logs: [], networkRequests: [] });
    }
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Error clearing network requests:', error);
    sendResponse({ success: false, error: 'Failed to clear network requests' });
  }
}

async function handleUpdatePort(port: number, sendResponse: (response: any) => void): Promise<void> {
  try {
    if (typeof port !== 'number' || port <= 0 || port > 65535) {
      sendResponse({ success: false, error: 'Invalid port number' });
      return;
    }

    // Save the new port
    await setPort(port);
    
    // Reconnect WebSocket with the new port
    if (wsManager) {
      wsManager.close();
      await wsManager.connect();
    }
    
    sendResponse({ success: true, port });
  } catch (error) {
    logger.error('Error updating port:', error);
    sendResponse({ success: false, error: 'Failed to update port' });
  }
}

async function handleRestartServer(sendResponse: (response: any) => void): Promise<void> {
  try {
    if (wsManager) {
      await wsManager.connect();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'WebSocket manager not initialized' });
    }
  } catch (error) {
    logger.error('Error restarting server:', error);
    sendResponse({ success: false, error: 'Failed to restart server' });
  }
}

// Export for testing
export const __test__ = {
  tabData,
  handleGetTabData,
  handleClearTabData,
  handleGetNetworkRequests,
  handleClearNetworkRequests,
  handleRestartServer
};
