import { ConsoleLog, NetworkRequest, MCPConfig } from './types';

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupCallback: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public setCleanupCallback(callback: () => void): void {
    this.cleanupCallback = callback;
  }

  public startCleanup(interval = 300000) { // 5 minutes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => this.cleanupMemory(), interval);
  }

  private cleanupMemory() {
    if (this.cleanupCallback) {
      this.cleanupCallback();
    }
  }

  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

type EventType = 'open' | 'close' | 'error' | 'message';
type EventCallback = (event?: any) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private config: { port: number };
  private eventListeners: Map<EventType, Set<EventCallback>>;

  private constructor() {
    this.config = { port: 8765 }; // Default port
    this.eventListeners = new Map();
    this.initializeEventListeners();
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public setConfig(config: { port: number }): void {
    this.config = config;
  }

  private initializeEventListeners(): void {
    (['open', 'close', 'error', 'message'] as EventType[]).forEach(type => {
      this.eventListeners.set(type, new Set());
    });
  }

  private emit(event: EventType, data?: any): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  public on(event: EventType, callback: EventCallback): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  public off(event: EventType, callback: EventCallback): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  public connect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws) {
        this.disconnect();
      }

      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.retryCount = 0;
          this.emit('open');
          resolve(true);
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          this.retryConnection(url);
          resolve(false);
        };
        
        this.ws.onclose = () => {
          this.emit('close');
          this.retryConnection(url);
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          this.emit('message', event);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.emit('error', error);
        resolve(false);
      }
    });
  }

  private retryConnection(url: string) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }

      this.retryTimeout = setTimeout(() => {
        this.connect(url);
      }, delay);
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public close(): void {
    this.disconnect();
  }

  public send(message: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.emit('error', error);
        return false;
      }
    }
    console.error('WebSocket is not connected');
    return false;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    console.error(`[MCP Console Logger] ${errorMessage}`);
    // Send error to background script for logging
    chrome.runtime.sendMessage({
      action: 'error',
      data: { message: errorMessage, timestamp: new Date().toISOString() }
    });
  }

  public warn(message: string): void {
    console.warn(`[MCP Console Logger] ${message}`);
  }

  public info(message: string): void {
    console.info(`[MCP Console Logger] ${message}`);
  }
}

export function formatHeaders(headers: any[]): Array<{ name: string; value: string }> {
  return headers.map(header => ({
    name: header.name.toLowerCase(),
    value: header.value
  }));
}

export function filterSensitiveData(data: any, config: MCPConfig): any {
  if (!data) return data;

  if (typeof data === 'object') {
    const result: any = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      if (config.sensitiveFormFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '[FILTERED]';
      } else {
        result[key] = filterSensitiveData(data[key], config);
      }
    }
    return result;
  }

  return data;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function batchMessages<T>(
  messages: T[],
  batchSize: number = 100
): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }
  return batches;
}
