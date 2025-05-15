# Chrome Dev MCP

**Chrome Dev MCP** is a powerful Chrome extension that captures browser console logs and network activity, making them accessible via WebSocket. It's designed for developers and automated testing frameworks that need real-time access to browser console data and network activity through the Model Context Protocol (MCP).

---

## Features

- **Comprehensive Console Capture:** Captures all console methods (`console.log`, `console.error`, `console.warn`, `console.info`, `console.debug`) with full stack traces and context
- **Memory-Efficient Logging:** Implements a circular buffer to prevent memory leaks in long-running tabs
- **Reliable WebSocket Integration:** Robust WebSocket server with automatic reconnection and error handling
- **TypeScript-First:** Built with TypeScript for type safety and better developer experience
- **Configurable:** Customize log retention, WebSocket settings, and more
- **Privacy-Focused:** Automatically masks sensitive data in logs
- **Error Recovery:** Built-in retry mechanisms for failed log transmissions

---

## Installation

### Prerequisites
- Node.js (v14 or later)
- Google Chrome or any Chromium-based browser

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/chrome-dev-mcp.git
cd chrome-dev-mcp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Extension
```bash
npm run build
```

### 4. Load the Extension in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist` directory

---

## Usage

### Basic Usage
1. Click on the extension icon to open the popup
2. View connection status and statistics
3. Use the controls to manage logging and network monitoring

### WebSocket API
Connect to the WebSocket server at `ws://localhost:8765` (default port) to receive real-time console logs.

#### Message Format
Each message is a JSON object with the following structure:

```typescript
interface ConsoleLog {
  id: string;             // Unique identifier for the log entry
  timestamp: string;      // ISO timestamp
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;        // The log message
  url: string;            // URL of the page where the log originated
  tabId: number | null;   // Chrome tab ID (set by background script)
  stack?: string;         // Stack trace if available
  context: {
    userAgent: string;    // User agent string
    timestamp: number;    // Unix timestamp
    location: string;     // Full URL of the page
  };
}
```

#### Example Client Connection
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
  console.log('Connected to Chrome Dev MCP WebSocket');};

ws.onmessage = (event) => {
  try {
    const logEntry = JSON.parse(event.data);
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`);
    if (logEntry.stack) {
      console.log('Stack trace:', logEntry.stack);
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};
```

### Configuration
Default configuration can be found in `src/config.ts`. You can customize:

```typescript
const DEFAULT_CONFIG = {
  MAX_LOGS: 1000,  // Maximum number of logs to keep in memory
  WS_PORT: 8765,   // WebSocket server port
  WS_MAX_RETRIES: 5,  // Maximum WebSocket reconnection attempts
  WS_RETRY_DELAY: 1000,  // Initial delay between reconnection attempts (ms)
  WS_MAX_RETRY_DELAY: 30000,  // Maximum delay between reconnection attempts (ms)
  ALLOWED_WS_ORIGINS: [  // Allowed WebSocket origins
    'ws://localhost',
    'wss://localhost',
    'ws://127.0.0.1',
    'wss://127.0.0.1'
  ]
};
```

### Development
```bash
# Start the development server with hot-reload
npm run dev

# Build for production
npm run build

# Lint the code
npm run lint

# Run tests
npm test
```

---

## Architecture

The extension follows a clean architecture with clear separation of concerns:

```
src/
├── background/           # Background script and services
│   ├── index.ts          # Background script entry point
│   ├── websocket.ts      # WebSocket server and client management
│   └── message-handler.ts # Message handling between components
├── content/              # Content script for console capture
│   └── index.ts          # Console log capture implementation
├── types/                # TypeScript type definitions
│   └── index.ts          # Shared type definitions
├── utils/                # Shared utilities
│   └── logger.ts         # Centralized logging utility
└── config.ts             # Configuration constants
```

### Key Components

1. **Content Script**
   - Captures console logs using monkey-patching
   - Implements circular buffer for memory efficiency
   - Handles log formatting and sanitization

2. **Background Script**
   - Manages WebSocket server
   - Handles message routing between content scripts and WebSocket clients
   - Implements reconnection logic and error handling

3. **WebSocket Server**
   - Broadcasts console logs to connected clients
   - Validates client connections
   - Manages client lifecycle

## Security & Privacy

- **Local-First Architecture**: All processing happens in the browser
- **Secure by Default**:
  - WebSocket server only accepts connections from `localhost`
  - Origin validation for WebSocket connections
  - No external network requests
- **Data Protection**:
  - Console logs are kept in memory only
  - No persistent storage of captured data
  - No tracking or analytics
- **Minimal Permissions**:
  - `activeTab`: Required to inject content scripts
  - `webNavigation`: For tracking page navigation
  - `storage`: For persisting user preferences

## Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**
   ```bash
   # Check if the port is in use
   lsof -i :8765
   
   # Or on Windows:
   netstat -ano | findstr :8765
   ```

2. **Logs Not Appearing**
   - Ensure the content script is injected (check Chrome's background page console)
   - Verify the tab has the content script active (look for the extension icon in the address bar)
   - Check for any errors in the browser's developer console

3. **Performance Considerations**
   - The extension uses a circular buffer to limit memory usage
   - Each tab maintains its own log buffer
   - High log volume may impact performance (adjust `MAX_LOGS` in config if needed)

### Debugging

1. **Content Script Debugging**
   - Open Chrome DevTools
   - Go to the Console tab
   - Filter for messages from the extension

2. **Background Script Debugging**
   - Go to `chrome://extensions/`
   - Find the extension and click "background page" to open DevTools

3. **WebSocket Debugging**
   - Use a WebSocket client like Postman or `wscat`
   - Monitor WebSocket frames in Chrome's Network tab

## Development

### Prerequisites
- Node.js 16+
- npm 8+
- Google Chrome or Chromium

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Build in watch mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run type checking
npm run type-check

# Lint code
npm run lint
```

### Code Style

- 2-space indentation
- Single quotes
- Semicolons
- TypeScript strict mode
- ESLint + Prettier for code formatting

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please include tests for new features and ensure all tests pass before submitting.

## License

This project is licensed under the [MIT License](LICENSE):

```
MIT License

Copyright (c) 2025 James R.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
```
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```