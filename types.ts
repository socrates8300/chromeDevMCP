// TypeScript types for MCP Console Logger

// WebSocket types
export interface WebSocketEventMap {
  open: Event;
  close: CloseEvent;
  error: Event;
  message: MessageEvent;
}

export type WebSocketEventType = keyof WebSocketEventMap;

export interface ConsoleLog {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  url: string;
  tabId: number | null;
  stackTrace?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  type: string;
  timeStamp: number;
  statusCode: number | null;
  statusText: string | null;
  fromCache: boolean;
  requestHeaders: Array<{ name: string; value: string }>;
  responseHeaders: Array<{ name: string; value: string }>;
  requestBody: any | null;
  responseError: string | null;
  responseBody?: any;
  ip?: string;
  timing: {
    startTime: number;
    endTime: number | null;
    duration: number | null;
  };
}

export interface MCPMessage {
  action: string;
  data?: any;
  requestId?: string;
  timestamp?: number;
}

export interface MCPToolResponse {
  success: boolean;
  data: any;
  error?: string;
  requestId?: string;
}

export interface TabData {
  logs: ConsoleLog[];
  networkRequests: {
    requests: { [requestId: string]: NetworkRequest };
    requestsQueue: string[];
  };
  lastActivity?: number;
}

export interface MCPConfig {
  port: number;
  maxStoredRequests: number;
  sensitiveHeaders: string[];
  sensitiveFormFields: string[];
  enabled: boolean;
  captureConsole: boolean;
  captureNetwork: boolean;
}

export interface WebSocketMessage {
  type: 'log' | 'network' | 'command' | 'status' | 'error';
  data: any;
  timestamp: number;
  tabId?: number;
  requestId?: string;
}

export interface NetworkRequestDetails extends chrome.webRequest.WebRequestDetails {
  statusCode?: number;
  statusText?: string;
  fromCache?: boolean;
  ip?: string;
  requestHeaders?: chrome.webRequest.HttpHeader[];
  responseHeaders?: chrome.webRequest.HttpHeader[];
  requestBody?: any;
  responseBody?: any;
  responseError?: string;
  timing: {
    startTime: number;
    endTime: number | null;
    duration: number | null;
  };
  error?: string;
  statusLine?: string;
}

// Chrome extension specific types
declare global {
  interface Window {
    chrome: typeof chrome;
  }

  // Extend the existing chrome.webRequest namespace
  namespace chrome.webRequest {
    // These types are already defined in the Chrome types, so we'll use them directly
    // The actual Chrome types will be used at runtime
  }
}
