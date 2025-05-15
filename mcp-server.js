// Minimal MCP WebSocket server for local development and Chrome extension testing
const WebSocket = require('ws');

const PORT = 8765;
const wss = new WebSocket.Server({ port: PORT });

console.log(`MCP WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(message) {
    console.log('Received:', message.toString());
    // Echo registration and tool requests for testing
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'register') {
        ws.send(JSON.stringify({ type: 'register.ack', data: { ok: true } }));
      } else if (msg.type === 'tool.request') {
        // Echo back a dummy response
        ws.send(JSON.stringify({
          type: 'tool.response',
          id: msg.id,
          data: { echo: true, tool: msg.tool }
        }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
