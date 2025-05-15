import { logger } from '../utils/logger';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private readonly maxRetries = 5;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly eventListeners: { [event: string]: ((...args: any[]) => void)[] } = {};
  private isConnected = false;

  constructor(public port: number) {
    this.connect();
  }

  public async connect(): Promise<boolean> {
    if (this.ws) {
      this.close();
    }

    try {
      const url = `ws://localhost:${this.port}`;
      this.ws = new WebSocket(url);
      
      return await new Promise<boolean>((resolve) => {
        if (!this.ws) {
          resolve(false);
          return;
        }

        const onOpen = () => {
          this.isConnected = true;
          this.retryCount = 0;
          if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
          }
          logger.info('WebSocket connection established');
          this.emit('open');
          resolve(true);
        };

        const onError = (error: Event) => {
          logger.error('WebSocket connection error:', error);
          this.emit('error', error);
          this.attemptReconnect();
          resolve(false);
        };

        const onClose = () => {
          this.isConnected = false;
          logger.info('WebSocket connection closed');
          this.emit('close');
          this.attemptReconnect();
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
      this.attemptReconnect();
      return false;
    }
  }

  private attemptReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      logger.error('Max WebSocket reconnection attempts reached');
      return;
    }

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);

    logger.warn(`Attempting to reconnect in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
    
    this.retryTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(data: any): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket is not connected');
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

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners[event];
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          logger.error(`Error in ${event} listener:`, error);
        }
      }
    }
  }
}

// Create a singleton instance
export const wsManager = new WebSocketManager(8765);
