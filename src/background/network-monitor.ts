import { logger } from '../utils/logger';
import { WebSocketManager } from './websocket';

// Store the WebSocket manager instance
let wsManagerInstance: WebSocketManager | null = null;

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  requestHeaders?: chrome.webRequest.HttpHeader[];
  responseHeaders?: chrome.webRequest.HttpHeader[];
  statusCode?: number;
  statusText?: string;
  type: string;
  timeStamp: number;
  fromCache?: boolean;  // Made optional to match the actual usage
  ip?: string;
  error?: string;
  timing: {
    startTime: number;
    endTime: number | null;
    duration: number | null;
  };
}

interface TabData {
  requests: Map<string, NetworkRequest>;
  requestsQueue: string[];
}

const tabData = new Map<number, TabData>();
const MAX_REQUESTS = 1000;

export function initNetworkMonitoring(wsManager: WebSocketManager): void {
  // Store the WebSocket manager instance
  wsManagerInstance = wsManager;
  // Set up web request listeners
  chrome.webRequest.onBeforeRequest.addListener(
    handleBeforeRequest,
    { urls: ['<all_urls>'] },
    ['requestBody']
  );

  chrome.webRequest.onSendHeaders.addListener(
    handleSendHeaders,
    { urls: ['<all_urls>'] },
    ['requestHeaders']
  );

  chrome.webRequest.onHeadersReceived.addListener(
    handleHeadersReceived,
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  chrome.webRequest.onCompleted.addListener(
    handleRequestCompleted,
    { urls: ['<all_urls>'] }
  );

  chrome.webRequest.onErrorOccurred.addListener(
    handleRequestError,
    { urls: ['<all_urls>'] }
  );

  logger.log('Network monitoring initialized');
}

function getOrCreateTabData(tabId: number): TabData {
  let tab = tabData.get(tabId);
  if (!tab) {
    tab = {
      requests: new Map(),
      requestsQueue: []
    };
    tabData.set(tabId, tab);
  }
  return tab;
}

function handleBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
  try {
    const { tabId, requestId, url, method, type, timeStamp } = details;
    if (tabId === -1) return; // Skip background requests

    const tabData = getOrCreateTabData(tabId);
    
    const request: NetworkRequest = {
      id: requestId,
      url,
      method,
      type,
      timeStamp,
      fromCache: false,
      timing: {
        startTime: timeStamp,
        endTime: null,
        duration: null
      }
    };

    tabData.requests.set(requestId, request);
    tabData.requestsQueue.push(requestId);

    // Enforce max stored requests
    while (tabData.requestsQueue.length > MAX_REQUESTS) {
      const oldRequestId = tabData.requestsQueue.shift();
      if (oldRequestId) {
        tabData.requests.delete(oldRequestId);
      }
    }

    // Notify listeners
    notifyRequestUpdate(tabId, request);
  } catch (error) {
    logger.error('Error in handleBeforeRequest:', error);
  }
}

function handleSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
  try {
    const { tabId, requestId, requestHeaders } = details;
    if (tabId === -1) return;

    const tabData = getOrCreateTabData(tabId);
    const request = tabData.requests.get(requestId);
    
    if (request) {
      request.requestHeaders = requestHeaders;
      notifyRequestUpdate(tabId, request);
    }
  } catch (error) {
    logger.error('Error in handleSendHeaders:', error);
  }
}

function handleHeadersReceived(details: chrome.webRequest.WebResponseHeadersDetails & { fromCache?: boolean; ip?: string }): void {
  try {
    const { tabId, requestId, statusCode, statusLine, responseHeaders } = details;
    if (tabId === -1) return;

    const tabData = getOrCreateTabData(tabId);
    const request = tabData.requests.get(requestId);
    
    if (request) {
      request.responseHeaders = responseHeaders;
      request.statusCode = statusCode;
      request.statusText = statusLine;
      if ('fromCache' in details) {
        request.fromCache = details.fromCache;
      }
      if ('ip' in details) {
        request.ip = details.ip;
      }
      
      notifyRequestUpdate(tabId, request);
    }
  } catch (error) {
    logger.error('Error in handleHeadersReceived:', error);
  }
}

function handleRequestCompleted(details: chrome.webRequest.WebResponseCacheDetails): void {
  try {
    const { tabId, requestId, timeStamp } = details;
    if (tabId === -1) return;

    const tabData = getOrCreateTabData(tabId);
    const request = tabData.requests.get(requestId);
    
    if (request) {
      request.timing.endTime = timeStamp;
      request.timing.duration = timeStamp - request.timing.startTime;
      notifyRequestUpdate(tabId, request);
    }
  } catch (error) {
    logger.error('Error in handleRequestCompleted:', error);
  }
}

function handleRequestError(details: chrome.webRequest.WebResponseErrorDetails): void {
  try {
    const { tabId, requestId, error, timeStamp } = details;
    if (tabId === -1) return;

    const tabData = getOrCreateTabData(tabId);
    const request = tabData.requests.get(requestId);
    
    if (request) {
      request.error = error;
      request.timing.endTime = timeStamp;
      request.timing.duration = timeStamp - request.timing.startTime;
      notifyRequestUpdate(tabId, request);
    }
  } catch (error) {
    logger.error('Error in handleRequestError:', error);
  }
}

function notifyRequestUpdate(tabId: number, request: NetworkRequest): void {
  // Send update via WebSocket if connected
  if (wsManagerInstance) {
    wsManagerInstance.send(JSON.stringify({
      type: 'networkRequestUpdate',
      tabId,
      request: {
        ...request,
        // Ensure fromCache is always a boolean
        fromCache: Boolean(request.fromCache)
      }
    }));
  }
}

// Export for testing
export const __test__ = {
  getOrCreateTabData,
  handleBeforeRequest,
  handleSendHeaders,
  handleHeadersReceived,
  handleRequestCompleted,
  handleRequestError,
  tabData
};
