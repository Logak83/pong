const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'frontend')));

let players = {};
let ball = { x: 300, y: 200, vx: 5, vy: 5 };
let paddles = {};

// Broadcast game state to all connected clients
function broadcastGameState() {
  const state = { ball, paddles };
  const data = JSON.stringify({ type: 'state', state });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Update game physics and broadcast state 60 times per second
setInterval(() => {
  // Update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Bounce ball off top and bottom
  if (ball.y < 0 || ball.y > 400) ball.vy *= -1;

  // Bounce ball off paddles
  Object.values(paddles).forEach(p => {
    if (
      ball.x > p.x && ball.x < p.x + 10 &&
      ball.y > p.y && ball.y < p.y + 100
    ) {
      ball.vx *= -1;
    }
  });

  broadcastGameState();
}, 1000 / 60);

wss.on('connection', (ws) => {
  const id = Date.now();
  paddles[id] = { x: 10, y: 150 };

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move') {
      paddles[id].y = data.position;
    }
  });

  ws.on('close', () => {
    delete paddles[id];
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
