/// <reference types="chrome" />

declare namespace chrome {
  namespace runtime {
    interface Port {
      postMessage: (message: any) => void;
      disconnect: () => void;
      onMessage: chrome.events.Event<(message: any, port: Port) => void>;
      onDisconnect: chrome.events.Event<() => void>;
      name: string;
    }

    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
      origin?: string;
    }

    interface LastError {
      message?: string;
    }
  }

  namespace webRequest {
    interface WebRequestHeadersDetails {
      requestId: string;
      url: string;
      method: string;
      frameId?: number;
      parentFrameId?: number;
      requestBody?: any;
      tabId?: number;
      type?: string;
      timeStamp?: number;
      originUrl?: string;
    }

    interface HttpHeader {
      name: string;
      value?: string;
      binaryValue?: ArrayBuffer;
    }
  }
}

declare const chrome: typeof chrome;
