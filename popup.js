document.addEventListener('DOMContentLoaded', function() {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const portInput = document.getElementById('portInput');
  const savePortButton = document.getElementById('savePort');
  const startServerButton = document.getElementById('startServer');
  const clearLogsButton = document.getElementById('clearLogs');
  const logCountElement = document.getElementById('logCount');
  const requestCountElement = document.getElementById('requestCount');
  const clearAllButton = document.getElementById('clearAll');

  // Load saved port
  chrome.storage.local.get(['mcpPort', 'serverStatus'], function(result) {
    if (result.mcpPort) {
      portInput.value = result.mcpPort;
    }
    updateStatusIndicator(result.serverStatus || 'disconnected');
  });

  // Save port button
  savePortButton.addEventListener('click', function() {
    const port = parseInt(portInput.value);
    if (port >= 1 && port <= 65535) {
      chrome.storage.local.set({ mcpPort: port }, function() {
        alert('Port saved. Server will restart with new port.');
      });
    } else {
      alert('Please enter a valid port number (1-65535)');
    }
  });

  // Start/restart server button
  startServerButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'restartServer' });
  });

  // Clear logs button
  clearLogsButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        alert('No active tab found');
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'clearCapturedLogs' }, function() {
        updateLogCount();
        alert('Logs cleared for current tab');
      });
    });
  });

  // Clear all data button
  clearAllButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        alert('No active tab found');
        return;
      }
      chrome.runtime.sendMessage({ action: 'clearAllData', tabId: tabs[0].id }, function() {
        updateLogCount();
        updateRequestCount();
        alert('All data cleared for current tab');
      });
    });
  });

  // Update log count for current tab
  function updateLogCount() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCapturedLogs' }, function(response) {
        if (chrome.runtime.lastError) {
          logCountElement.textContent = '0';
          return;
        }
        if (response && response.logs) {
          logCountElement.textContent = response.logs.length;
        } else {
          logCountElement.textContent = '0';
        }
      });
    });
  }

  // Update network request count for current tab
  function updateRequestCount() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;
      chrome.runtime.sendMessage({ action: 'getNetworkRequestCount', tabId: tabs[0].id }, function(response) {
        if (chrome.runtime.lastError) {
          requestCountElement.textContent = '0';
          return;
        }
        requestCountElement.textContent = response.count || '0';
      });
    });
  }

  // Update the status indicator
  function updateStatusIndicator(status) {
    statusIndicator.className = 'status-indicator';
    switch (status) {
      case 'connected':
        statusIndicator.classList.add('status-connected');
        statusText.textContent = 'Connected';
        break;
      case 'disconnected':
        statusIndicator.classList.add('status-disconnected');
        statusText.textContent = 'Disconnected';
        break;
      case 'error':
        statusIndicator.classList.add('status-error');
        statusText.textContent = 'Connection Error';
        break;
      default:
        statusIndicator.classList.add('status-disconnected');
        statusText.textContent = 'Unknown Status';
    }
  }

  // Listen for status updates
  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.serverStatus) {
      updateStatusIndicator(changes.serverStatus.newValue);
    }
  });

  // Update counts when popup opens
  updateLogCount();
  updateRequestCount();

  // Periodically refresh counts
  setInterval(function() {
    updateLogCount();
    updateRequestCount();
  }, 1000);
});
