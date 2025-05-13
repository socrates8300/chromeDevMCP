# MCP Console Logger

**MCP Console Logger** is an open-source Chrome extension and agent server that captures browser console logs and network activity, making them accessible to Model Context Protocol (MCP) clients for advanced debugging, automation, and AI agent workflows.

---

## Features

- **Console Log Capture:** Automatically collects all `console.log`, `console.error`, `console.warn`, etc. from web pages.
- **Network Activity Monitoring:** Records HTTP(S) requests and responses, including headers and timing, with privacy filtering.
- **MCP Protocol Support:** Exposes data and tools to MCP clients over a WebSocket server for agent-driven debugging and automation.
- **Real-Time Updates:** Sends live log and network updates to connected clients.
- **Configurable UI:** Popup interface shows status, log and network request counts, and allows clearing data.
- **Privacy Protections:** Sensitive headers and form fields are masked before sharing.

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR-USERNAME/mcp-console-logger.git
cd mcp-console-logger
```

### 2. Load the Extension in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `mcp-console-logger` directory

### 3. (Optional) Start the Local MCP Server
If you want to test the agent with a local MCP server, use the included Node.js stub:
```bash
cd mcp-console-logger
npm install ws
node mcp-server.js
```

---

## Usage

- Open the popup to see connection status, log/network counters, and control buttons.
- Configure the WebSocket port if needed.
- Use the **Clear Logs** or **Clear All Data** buttons to reset data for the current tab.
- Connect your MCP client to `ws://localhost:8765` (or the port you set) to access logs and network data programmatically.
- Supported MCP tools:
  - `getConsoleLogs` / `clearConsoleLogs`
  - `getNetworkRequests` / `clearNetworkRequests`
  - `getDiagnosticData` (returns both logs and network requests)

### Example MCP Queries
- "Show me all failed network requests."
- "List console errors and related network calls."
- "Clear all logs and network data."

---

## Configuration

See `mcp_config.json` for agent/server configuration, tool exposure, and UI/security settings.

---

## Security & Privacy
- **Sensitive headers** (cookies, authorization, etc.) are masked before being sent.
- **Sensitive form fields** (passwords, tokens) are also masked.
- All captured data remains local unless explicitly sent to a connected MCP client.

---

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or documentation improvements.

---

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
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```