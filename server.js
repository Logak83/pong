const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

class Player {
  constructor(ws) {
    this.ws = ws;
    this.paddleY = 100;
    this.score = 0;
  }
}

// Game state
const gameState = {
  ball: { x: 200, y: 150, vx: 3, vy: 3, radius: 10 },
  players: [null, null], // max 2 players
  width: 400,
  height: 300,
  paddleHeight: 60,
  paddleWidth: 10,
};

function resetBall() {
  gameState.ball.x = gameState.width / 2;
  gameState.ball.y = gameState.height / 2;
  gameState.ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
  gameState.ball.vy = 3 * (Math.random() > 0.5 ? 1 : -1);
}

function broadcastGameState() {
  const state = {
    ball: gameState.ball,
    players: gameState.players.map(p => p ? { paddleY: p.paddleY, score: p.score } : null),
  };
  const message = JSON.stringify({ type: "update", data: state });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function gameLoop() {
  const ball = gameState.ball;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Ball collision with top/bottom walls
  if (ball.y <= ball.radius || ball.y >= gameState.height - ball.radius) {
    ball.vy *= -1;
  }

  // Paddle collision check
  const paddleCollision = (playerIndex) => {
    const player = gameState.players[playerIndex];
    if (!player) return false;
    const paddleX = playerIndex === 0 ? 0 : gameState.width - gameState.paddleWidth;
    if (
      ball.x - ball.radius <= paddleX + gameState.paddleWidth &&
      ball.x + ball.radius >= paddleX &&
      ball.y >= player.paddleY &&
      ball.y <= player.paddleY + gameState.paddleHeight
    ) {
      return true;
    }
    return false;
  };

  if (paddleCollision(0) && ball.vx < 0) {
    ball.vx *= -1;
  } else if (paddleCollision(1) && ball.vx > 0) {
    ball.vx *= -1;
  }

  // Score points if ball passes paddle
  if (ball.x < 0) {
    gameState.players[1]?.score++;
    resetBall();
  } else if (ball.x > gameState.width) {
    gameState.players[0]?.score++;
    resetBall();
  }

  broadcastGameState();
}

wss.on("connection", (ws) => {
  // Assign player to slot 0 or 1
  let playerIndex = gameState.players.findIndex(p => p === null);
  if (playerIndex === -1) {
    ws.send(JSON.stringify({ type: "error", message: "Game full" }));
    ws.close();
    return;
  }

  const player = new Player(ws);
  gameState.players[playerIndex] = player;

  ws.send(JSON.stringify({ type: "welcome", playerIndex }));

  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === "paddleMove" && typeof msg.data === "number") {
        player.paddleY = Math.min(Math.max(msg.data, 0), gameState.height - gameState.paddleHeight);
      }
    } catch {
      // ignore invalid messages
    }
  });

  ws.on("close", () => {
    gameState.players[playerIndex] = null;
  });
});

setInterval(gameLoop, 1000 / 60);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
