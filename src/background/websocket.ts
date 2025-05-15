import { logger } from '../utils/logger';
import { DEFAULT_CONFIG } from '../config';

/**
 * Manages WebSocket connection with automatic reconnection and message queuing
 * @public
 */
export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  
  /**
   * Get singleton instance of WebSocketManager
   * @param port - WebSocket server port
   */
  public static getInstance(port: number = DEFAULT_CONFIG.WS_PORT): WebSocketManager {
    if (!WebSocketManager.instance || WebSocketManager.instance.port !== port) {
      WebSocketManager.instance = new WebSocketManager(port);
    }
    return WebSocketManager.instance;
  }
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly eventListeners: { [event: string]: ((...args: any[]) => void)[] } = {};
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private messageQueue: any[] = [];
  private connectionAttempts = 0;
  private lastError: Error | null = null;

  private constructor(public port: number) {
    if (!this.isValidPort(port)) {
      throw new Error(`Invalid WebSocket port: ${port}. Must be between 1 and 65535`);
    }
    this.connect();
  }

  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }

  /**
   * Get the current connection state
   */
  public get state() {
    return this.connectionState;
  }

  /**
   * Get the last error that occurred
   */
  public get error() {
    return this.lastError;
  }

  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connection is established or rejects on error
   */
  public async connect(): Promise<boolean> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      logger.warn('WebSocket connection already in progress or established');
      return this.connectionState === 'connected';
    }

    this.connectionState = 'connecting';
    this.connectionAttempts++;
    
    // Clean up any existing connection
    this.close();

    try {
      const url = `ws://localhost:${this.port}`;
      
      // Validate URL for security
      if (!this.isValidWsUrl(url)) {
        throw new Error(`Invalid WebSocket URL: ${url}`);
      }
      this.ws = new WebSocket(url);
      
      return await new Promise<boolean>((resolve) => {
        if (!this.ws) {
          resolve(false);
          return;
        }

        const onOpen = () => {
          this.connectionState = 'connected';
          this.retryCount = 0;
          this.connectionAttempts = 0;
          this.lastError = null;
          
          if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
          }
          
          logger.info('WebSocket connection established');
          this.emit('open');
          
          // Process any queued messages
          this.processQueue();
          resolve(true);
        };

        const onError = (error: Event) => {
          this.handleError(error);
          resolve(false);
        };

        const onClose = () => {
          this.connectionState = 'disconnected';
          logger.info('WebSocket connection closed');
          this.emit('close');
          this.scheduleReconnect();
        };

        const onMessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            this.emit('message', message);
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error);
            this.emit('error', error);
          }
        };

        this.ws.addEventListener('open', onOpen, { once: true });
        this.ws.addEventListener('error', onError, { once: true });
        this.ws.addEventListener('close', onClose, { once: true });
        this.ws.addEventListener('message', onMessage);
      });
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  private isValidWsUrl(url: string): boolean {
    try {
      const { protocol, hostname } = new URL(url);
      return DEFAULT_CONFIG.ALLOWED_WS_ORIGINS.some(
        origin => url.startsWith(origin)
      );
    } catch (e) {
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= DEFAULT_CONFIG.WS_MAX_RETRIES) {
      this.connectionState = 'error';
      this.lastError = new Error(`Max WebSocket reconnection attempts (${DEFAULT_CONFIG.WS_MAX_RETRIES}) reached`);
      logger.error(this.lastError.message);
      this.emit('error', this.lastError);
      return;
    }

    this.retryCount++;
    const delay = Math.min(
      DEFAULT_CONFIG.WS_RETRY_DELAY * Math.pow(2, this.retryCount - 1),
      DEFAULT_CONFIG.WS_MAX_RETRY_DELAY
    );

    logger.warn(`Attempting to reconnect in ${delay}ms (attempt ${this.retryCount}/${DEFAULT_CONFIG.WS_MAX_RETRIES})`);
    
    this.retryTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleError = (error: Event | Error) => {
    this.connectionState = 'error';
    this.lastError = error instanceof Error ? error : new Error(String(error));
    
    logger.error('WebSocket connection error:', this.lastError);
    this.emit('error', this.lastError);
    
    // Schedule reconnect if we're not in a connecting state
    if (this.connectionState === 'error') {
      this.scheduleReconnect();
    }
    
    return false; // For use in Promise rejections
  };

  /**
   * Send data through the WebSocket connection
   * @param data - Data to send (will be JSON.stringified)
   * @returns Promise that resolves when the message is sent or queued
   */
  public async send(data: any): Promise<void> {
    if (this.connectionState !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue the message if we're not connected
      this.messageQueue.push(data);
      
      // If we're not trying to connect, try to reconnect
      if (this.connectionState !== 'connecting') {
        this.connect().catch(error => {
          logger.error('Failed to reconnect:', error);
        });
      }
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Close the WebSocket connection
   * @param code - Close code
   * @param reason - Close reason
   */
  public close(code?: number, reason?: string): void {
    this.connectionState = 'disconnected';
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(code, reason);
        }
      } catch (error) {
        logger.error('Error closing WebSocket:', error);
      } finally {
        this.ws = null;
      }
    }
  }

  /**
   * Add an event listener
   * @param event - Event name ('open', 'close', 'error', 'message')
   * @param callback - Event handler
   */
  public on(event: 'open' | 'close' | 'error' | 'message', callback: (...args: any[]) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove an event listener
   * @param event - Event name
   * @param callback - Event handler to remove
   */
  public off(event: 'open' | 'close' | 'error' | 'message', callback: (...args: any[]) => void): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event to all listeners
   * @param event - Event name
   * @param args - Event arguments
   */
  private emit(event: 'open' | 'close' | 'error' | 'message', ...args: any[]): void {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        try {
          callback(...args);
        } catch (error) {
          logger.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }

  // Process any queued messages when connection is established
  private processQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(messageStr);
      } catch (error) {
        logger.error('Error sending queued message:', error);
        // Re-queue the message if sending failed
        this.messageQueue.unshift(message);
        break;
      }
    }
  }
}

/**
 * Get the WebSocket manager instance
 * @returns WebSocketManager instance
 */
export function getWebSocketManager(port: number = DEFAULT_CONFIG.WS_PORT): WebSocketManager {
  return WebSocketManager.getInstance(port);
}

// Default export for backward compatibility
export const wsManager = getWebSocketManager();
