// Network request related types
export interface NetworkRequestTiming {
  startTime: number;
  endTime: number | null;
  duration: number | null;
}

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
  fromCache: boolean;
  ip?: string;
  error?: string;
  timing: NetworkRequestTiming;
}

// Tab data related types
export interface TabNetworkState {
  requests: Map<string, NetworkRequest>;
  requestsQueue: string[];
}

export interface TabData {
  logs: any[];
  networkRequests: any[];
}

// WebSocket related types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Settings related types
export interface ExtensionSettings {
  port: number;
  maxRequests: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Message related types
export type MessageAction = 
  | 'getTabData'
  | 'clearTabData'
  | 'getNetworkRequests'
  | 'clearNetworkRequests'
  | 'restartServer';

export interface Message {
  action: MessageAction;
  tabId?: number;
  [key: string]: any;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}
