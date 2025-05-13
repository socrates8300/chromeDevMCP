// Store logs from all tabs
const tabLogs = {};
// Store network requests by tab
const tabNetworkRequests = {};
const MAX_STORED_REQUESTS = 500; // Limit per tab to control memory usage
let websocket = null;
let port = 8765; // Default WebSocket port
let isServerRunning = false;

// ---- NETWORK MONITORING ----
function initNetworkMonitoring() {
  chrome.webRequest.onBeforeRequest.addListener(
    handleBeforeRequest,
    { urls: ["<all_urls>"] },
    ["requestBody"]
  );
  chrome.webRequest.onSendHeaders.addListener(
    handleSendHeaders,
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
  );
  chrome.webRequest.onHeadersReceived.addListener(
    handleHeadersReceived,
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
  );
  chrome.webRequest.onCompleted.addListener(
    handleRequestCompleted,
    { urls: ["<all_urls>"] }
  );
  chrome.webRequest.onErrorOccurred.addListener(
    handleRequestError,
    { urls: ["<all_urls>"] }
  );
}
function getOrCreateNetworkRequest(details) {
  const { tabId, requestId } = details;
  if (!tabNetworkRequests[tabId]) {
    tabNetworkRequests[tabId] = {
      requests: {},
      requestsQueue: []
    };
  }
  const tabData = tabNetworkRequests[tabId];
  if (!tabData.requests[requestId]) {
    tabData.requests[requestId] = {
      requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timeStamp: details.timeStamp,
      statusCode: null,
      statusText: null,
      fromCache: false,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      responseError: null,
      timing: {
        startTime: details.timeStamp,
        endTime: null,
        duration: null
      }
    };
    tabData.requestsQueue.push(requestId);
    if (tabData.requestsQueue.length > MAX_STORED_REQUESTS) {
      const oldestRequestId = tabData.requestsQueue.shift();
      delete tabData.requests[oldestRequestId];
    }
  }
  return tabData.requests[requestId];
}
function filterHeaders(headers) {
  if (!headers) return [];
  return headers.map(header => {
    const sensitiveHeaders = [
      'cookie', 'set-cookie', 'authorization', 
      'proxy-authorization', 'x-csrf-token'
    ];
    const headerCopy = { ...header };
    if (sensitiveHeaders.includes(headerCopy.name.toLowerCase())) {
      headerCopy.value = '[FILTERED]';
    }
    return headerCopy;
  });
}
function handleBeforeRequest(details) {
  const request = getOrCreateNetworkRequest(details);
  if (details.requestBody) {
    try {
      let parsedBody = null;
      if (details.requestBody.formData) {
        parsedBody = {
          type: 'formData',
          content: Object.keys(details.requestBody.formData).reduce((acc, key) => {
            if (["password", "token", "auth", "key", "secret"].some(s => key.toLowerCase().includes(s))) {
              acc[key] = '[FILTERED]';
            } else {
              acc[key] = details.requestBody.formData[key];
            }
            return acc;
          }, {})
        };
      } else if (details.requestBody.raw) {
        parsedBody = {
          type: 'raw',
          byteSize: details.requestBody.raw.reduce((sum, chunk) => sum + (chunk.bytes ? chunk.bytes.byteLength : 0), 0)
        };
      }
      request.requestBody = parsedBody;
    } catch (error) {
      request.requestBodyError = `Error parsing body: ${error.message}`;
    }
  }
  notifyNetworkUpdate(details.tabId, details.requestId, 'started');
}
function handleSendHeaders(details) {
  const request = getOrCreateNetworkRequest(details);
  request.requestHeaders = filterHeaders(details.requestHeaders);
  notifyNetworkUpdate(details.tabId, details.requestId, 'headers-sent');
}
function handleHeadersReceived(details) {
  const request = getOrCreateNetworkRequest(details);
  request.responseHeaders = filterHeaders(details.responseHeaders);
  request.statusCode = details.statusCode;
  request.statusText = details.statusLine;
  notifyNetworkUpdate(details.tabId, details.requestId, 'headers-received');
}
function handleRequestCompleted(details) {
  const request = getOrCreateNetworkRequest(details);
  request.timing.endTime = details.timeStamp;
  request.timing.duration = details.timeStamp - request.timing.startTime;
  request.statusCode = details.statusCode;
  request.fromCache = details.fromCache;
  notifyNetworkUpdate(details.tabId, details.requestId, 'completed');
}
function handleRequestError(details) {
  const request = getOrCreateNetworkRequest(details);
  request.timing.endTime = details.timeStamp;
  request.timing.duration = details.timeStamp - request.timing.startTime;
  request.responseError = details.error;
  notifyNetworkUpdate(details.tabId, details.requestId, 'error');
}
function notifyNetworkUpdate(tabId, requestId, eventType) {
  if (websocket && websocket.readyState === WebSocket.OPEN && tabNetworkRequests[tabId]?.requests[requestId]) {
    websocket.send(JSON.stringify({
      type: 'network.update',
      data: {
        tabId,
        requestId,
        eventType,
        request: tabNetworkRequests[tabId].requests[requestId]
      }
    }));
  }
}
// ---- END NETWORK MONITORING ----

// Initialize the WebSocket server connection
function initWebSocket() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.close();
  }

  // Get the stored port from settings
  chrome.storage.local.get(['mcpPort'], function(result) {
    if (result.mcpPort) {
      port = result.mcpPort;
    }
    
    // Connect to WebSocket
    websocket = new WebSocket(`ws://localhost:${port}`);
    
    websocket.onopen = function(event) {
      console.log(`WebSocket connected on port ${port}`);
      isServerRunning = true;
      
      // Register MCP server capabilities
      websocket.send(JSON.stringify({
        type: 'register',
        data: {
          name: 'MCP Console Logger',
          version: '1.0.0',
          capabilities: ['tools'],
          tools: [
            {
              name: 'getConsoleLogs',
              description: 'Retrieves console logs from the active browser tab',
              parameters: {}
            },
            {
              name: 'clearConsoleLogs',
              description: 'Clears captured console logs for the active tab',
              parameters: {}
            },
            {
              name: 'getNetworkRequests',
              description: 'Retrieves network requests from the active browser tab',
              parameters: {
                filter: {
                  type: 'string',
                  description: 'Optional filter for URLs (e.g., "/api/")',
                  required: false
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of requests to return',
                  required: false
                },
                includeHeaders: {
                  type: 'boolean',
                  description: 'Whether to include headers in the response',
                  required: false
                }
              }
            },
            {
              name: 'clearNetworkRequests',
              description: 'Clears captured network requests for the active tab',
              parameters: {}
            },
            {
              name: 'getDiagnosticData',
              description: 'Retrieves both console logs and network requests for comprehensive debugging',
              parameters: {
                includeHeaders: {
                  type: 'boolean',
                  description: 'Whether to include headers in network requests',
                  required: false
                }
              }
            }
          ]
        }
      }));
      
      // Update status in storage
      chrome.storage.local.set({ serverStatus: 'connected' });
    };
    
    websocket.onclose = function(event) {
      console.log('WebSocket disconnected');
      isServerRunning = false;
      chrome.storage.local.set({ serverStatus: 'disconnected' });
      
      // Try to reconnect after a delay
      setTimeout(initWebSocket, 5000);
    };
    
    websocket.onerror = function(error) {
      console.error('WebSocket error:', error);
      chrome.storage.local.set({ serverStatus: 'error' });
    };
    
    websocket.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        
        // Handle requests from MCP clients
        if (message.type === 'tool.request') {
          handleToolRequest(message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
  });
}

// Handle tool requests from MCP clients
function handleToolRequest(message) {
  const { id, tool } = message;
  // Console log tools
  if (tool.name === 'getConsoleLogs') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        sendToolResponse(id, { error: 'No active tab found' });
        return;
      }
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: 'getCapturedLogs' }, function(response) {
        if (chrome.runtime.lastError) {
          sendToolResponse(id, { logs: tabLogs[tabId] || [] });
          return;
        }
        sendToolResponse(id, { logs: response.logs || [] });
      });
    });
  } else if (tool.name === 'clearConsoleLogs') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        sendToolResponse(id, { error: 'No active tab found' });
        return;
      }
      const tabId = tabs[0].id;
      delete tabLogs[tabId];
      chrome.tabs.sendMessage(tabId, { action: 'clearCapturedLogs' }, function() {
        sendToolResponse(id, { success: true });
      });
    });
  } else if (tool.name === 'getNetworkRequests') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        sendToolResponse(id, { error: 'No active tab found' });
        return;
      }
      const tabId = tabs[0].id;
      const tabData = tabNetworkRequests[tabId];
      if (!tabData) {
        sendToolResponse(id, { requests: [] });
        return;
      }
      let requests = tabData.requestsQueue.map(reqId => tabData.requests[reqId]);
      if (tool.parameters?.filter) {
        const filterText = tool.parameters.filter;
        requests = requests.filter(req => req.url.includes(filterText));
      }
      if (tool.parameters?.limit && typeof tool.parameters.limit === 'number') {
        requests = requests.slice(-tool.parameters.limit);
      }
      if (!tool.parameters?.includeHeaders) {
        requests = requests.map(req => {
          const { requestHeaders, responseHeaders, ...rest } = req;
          return rest;
        });
      }
      sendToolResponse(id, { requests });
    });
  } else if (tool.name === 'clearNetworkRequests') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        sendToolResponse(id, { error: 'No active tab found' });
        return;
      }
      const tabId = tabs[0].id;
      delete tabNetworkRequests[tabId];
      sendToolResponse(id, { success: true });
    });
  } else if (tool.name === 'getDiagnosticData') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        sendToolResponse(id, { error: 'No active tab found' });
        return;
      }
      const tabId = tabs[0].id;
      // Get logs
      chrome.tabs.sendMessage(tabId, { action: 'getCapturedLogs' }, function(response) {
        let logs = (response && response.logs) || (tabLogs[tabId] || []);
        // Get network
        const tabData = tabNetworkRequests[tabId];
        let requests = tabData ? tabData.requestsQueue.map(reqId => tabData.requests[reqId]) : [];
        if (!tool.parameters?.includeHeaders) {
          requests = requests.map(req => {
            const { requestHeaders, responseHeaders, ...rest } = req;
            return rest;
          });
        }
        sendToolResponse(id, {
          logs,
          requests,
          timestamp: new Date().toISOString(),
          url: tabs[0].url
        });
      });
    });
  }
}

// Send tool response back to MCP client
function sendToolResponse(requestId, data) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({
      type: 'tool.response',
      id: requestId,
      data: data
    }));
  }
}

// Listen for console logs from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'consoleLog' && sender.tab) {
    const tabId = sender.tab.id;
    if (!tabLogs[tabId]) {
      tabLogs[tabId] = [];
    }
    const logWithTabId = {
      ...message.data,
      tabId: tabId
    };
    tabLogs[tabId].push(logWithTabId);
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'log.update',
        data: {
          log: logWithTabId
        }
      }));
    }
  }
  // Handle popup requests for network request count
  if (message.action === 'getNetworkRequestCount') {
    const tabId = message.tabId;
    const tabData = tabNetworkRequests[tabId];
    const count = tabData ? tabData.requestsQueue.length : 0;
    sendResponse({ count });
    return true;
  }
  // Handle popup requests to clear all data
  if (message.action === 'clearAllData') {
    const tabId = message.tabId;
    delete tabLogs[tabId];
    delete tabNetworkRequests[tabId];
    sendResponse({ success: true });
    return true;
  }
  return true;
});

// Initialize WebSocket and network monitoring when extension is loaded
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['mcpPort'], function(result) {
    if (!result.mcpPort) {
      chrome.storage.local.set({ mcpPort: port });
    }
  });
  initWebSocket();
  initNetworkMonitoring();
});

// Re-initialize WebSocket when port is changed
chrome.storage.onChanged.addListener((changes) => {
  if (changes.mcpPort) {
    port = changes.mcpPort.newValue;
    initWebSocket();
  }
});

// Listen for popup requests to restart server
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'restartServer') {
    initWebSocket();
    sendResponse({ success: true });
    return true;
  }
});
