# MCP Console Logger

**MCP Console Logger** is an open-source Chrome extension that captures browser console logs and network activity, making them accessible to clients via WebSocket. It's designed for advanced debugging, automation, and integration with agent workflows using the Model Context Protocol (MCP).

---

## Features

- **Console Log Capture:** Automatically collects all `console.log`, `console.error`, `console.warn`, etc. from web pages
- **Network Activity Monitoring:** Records HTTP(S) requests and responses, including headers, timing, and status codes
- **WebSocket Integration:** Real-time data streaming to connected clients with automatic reconnection
- **Modular Architecture:** Clean separation of concerns with dedicated modules for WebSocket, network monitoring, and message handling
- **TypeScript Support:** Full type safety throughout the codebase
- **Configurable Logging:** Adjustable log levels for debugging and production use
- **Privacy Protections:** Sensitive headers and form fields are masked before sharing

---

## Installation

### Prerequisites
- Node.js (v14 or later)
- Google Chrome or any Chromium-based browser

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR-USERNAME/mcp-console-logger.git
cd mcp-console-logger
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
Connect to the WebSocket server at `ws://localhost:8080` (default port) to receive real-time updates.

#### Available Events
- `networkRequestUpdate`: Fired when a new network request is captured
- `consoleLog`: Fired when a new console log is captured
- `error`: Fired when an error occurs

#### Example Client Connection
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data);
};

// Send a command to update settings
ws.send(JSON.stringify({
  type: 'updateSettings',
  settings: { logLevel: 'debug' }
}));
```

### Configuration
Edit the `src/config.ts` file to customize the following settings:
- WebSocket port
- Log levels
- Network request filtering
- Privacy settings

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

The extension is built with a modular architecture for better maintainability and testability:

```
src/
├── background/           # Background script and services
│   ├── index.ts          # Entry point
│   ├── websocket.ts      # WebSocket manager
│   ├── network-monitor.ts # Network request monitoring
│   ├── message-handler.ts # Message handling
│   └── storage.ts        # Persistent storage
├── content/              # Content scripts
├── popup/                # Extension popup UI
└── utils/                # Shared utilities
    └── logger.ts         # Logging utility
```

## Security & Privacy

- **Data Collection**: The extension only collects data from web pages you explicitly enable it for
- **Sensitive Data**: Headers like `Authorization`, `Cookie`, and form fields like `password` are automatically masked
- **Local Processing**: All data processing happens locally in your browser
- **WebSocket Security**: The WebSocket server only accepts connections from `localhost` by default
- **Permissions**: The extension requests only the minimum required permissions

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Ensure no other application is using the default port (8080)
   - Check the browser console for any error messages
   - Verify that your firewall allows WebSocket connections

2. **Network Requests Not Captured**
   - Make sure the extension has the necessary permissions
   - Check if the website is using a service worker that might interfere
   - Try refreshing the page after enabling the extension

3. **High CPU/Memory Usage**
   - The extension is designed to be lightweight, but monitoring many requests can be resource-intensive
   - Try filtering out unnecessary requests in the configuration

## Contributing

Contributions are welcome! Here's how you can help:

1. Report bugs by opening an issue
2. Suggest new features or improvements
3. Submit pull requests with bug fixes or new features

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Load the extension in Chrome as described in the Installation section

### Code Style

- Follow the existing code style
- Use TypeScript types wherever possible
- Write tests for new features
- Update documentation when making changes

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