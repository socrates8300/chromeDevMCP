// Mock chrome API
type ChromeMock = {
  runtime: any;
  webRequest: any;
  tabs: any;
  storage: any;
};

const chromeMock: ChromeMock = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
      hasListeners: jest.fn(),
      addRules: jest.fn(),
      getRules: jest.fn(),
      removeRules: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onBeforeSendHeaders: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onHeadersReceived: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onCompleted: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onErrorOccurred: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
};

(global as any).chrome = chromeMock;

// Mock WebSocket
// Create a custom WebSocket implementation that matches the browser's WebSocket interface
interface WebSocketMock extends WebSocket {
  _open: () => void;
  _close: (code?: number, reason?: string) => void;
  _message: (data: any) => void;
  _error: (error?: any) => void;
}

class WebSocketMockImpl implements WebSocket {
  // Static properties
  static readonly CONNECTING = 0 as const;
  static readonly OPEN = 1 as const;
  static readonly CLOSING = 2 as const;
  static readonly CLOSED = 3 as const;

    // Instance properties
  binaryType: BinaryType = 'blob';
  bufferedAmount: number = 0;
  extensions: string = '';
  protocol: string = '';
  readonly url: string;
  
  // Event handlers
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  
  // Internal state
  readyState: number = WebSocketImpl.CLOSED;
  
  // Event target implementation
  private eventListeners: { [type: string]: Set<EventListenerOrEventListenerObject> } = {};
  
  constructor(url: string) {
    this.url = url;
  }

  // WebSocket methods
  send = jest.fn<Promise<void>, [any]>((data) => Promise.resolve());
  close = jest.fn((code?: number, reason?: string) => {
    this.readyState = WebSocketImpl.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  });
  
  // TypeScript requires these to be implemented
  CONNECTING = 0 as const;
  OPEN = 1 as const;
  CLOSING = 2 as const;
  CLOSED = 3 as const;

  // EventTarget implementation
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = new Set();
    }
    this.eventListeners[type].add(listener);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type].delete(listener);
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners[event.type] || [];
    for (const listener of listeners) {
      if (typeof listener === 'function') {
        (listener as EventListener).call(this, event);
      } else if (typeof (listener as EventListenerObject).handleEvent === 'function') {
        (listener as EventListenerObject).handleEvent(event);
      }
    }
    return !event.defaultPrevented;
  }
  
  // Test helpers
  _open() {
    this.readyState = WebSocketImpl.OPEN;
    const event = new Event('open');
    if (this.onopen) this.onopen(event);
    this.dispatchEvent(event);
  }
  
  _close(code?: number, reason?: string) {
    this.readyState = WebSocketImpl.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    if (this.onclose) this.onclose(event);
    this.dispatchEvent(event);
  }
  
  _message(data: any) {
    const event = new MessageEvent('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data)
    });
    if (this.onmessage) this.onmessage(event);
    this.dispatchEvent(event);
  }
  
  _error(error: any = 'WebSocket error') {
    const event = new ErrorEvent('error', {
      message: typeof error === 'string' ? error : error?.message || 'WebSocket error',
      error: error instanceof Error ? error : new Error(String(error))
    });
    if (this.onerror) this.onerror(event);
    this.dispatchEvent(event);
  }
}

const WebSocketImpl = WebSocketMockImpl as any as typeof WebSocket;
(global as any).WebSocket = WebSocketImpl;

// Mock fetch
(global as any).fetch = jest.fn() as jest.Mock;

// Mock console to suppress test output
const originalConsole = { ...console };

(global as any).console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock process
(global as any).process = {
  env: {
    NODE_ENV: 'test'
  }
};
