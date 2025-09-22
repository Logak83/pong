const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Game state
let players = {};
let ball = {
  x: 300,
  y: 150,
  vx: 5,
  vy: 3,
  radius: 10,
};
const paddleHeight = 70;
const paddleWidth = 10;
const canvasWidth = 600;
const canvasHeight = 300;

// Synchronize game state at fixed intervals
const gameLoopInterval = 1000 / 60; // 60fps

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Add player on connection; assign left or right paddle
  if (Object.keys(players).length < 2) {
    players[socket.id] = {
      paddleY: canvasHeight / 2 - paddleHeight / 2,
      side: Object.keys(players).length === 0 ? 'left' : 'right',
    };
  } else {
    // Reject more than 2 players or handle spectators as needed
    socket.emit('status', 'Game full');
    return;
  }

  // Send initial game state to the newly connected player
  socket.emit('init', { players, ball });

  // Broadcast new player to others
  io.emit('playersUpdate', players);

  // Listen for paddle movement from player
  socket.on('paddleMove', (paddleY) => {
    if (players[socket.id]) {
      players[socket.id].paddleY = paddleY;
    }
  });

  // On player disconnect, remove them
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playersUpdate', players);
  });
});

// Game loop: update ball position and handle collisions
function gameLoop() {
  // Update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Bounce ball top and bottom
  if (ball.y + ball.radius > canvasHeight || ball.y - ball.radius < 0) {
    ball.vy = -ball.vy;
  }

  // Check collision with paddles
  Object.values(players).forEach((player) => {
    let paddleX = player.side === 'left' ? 0 : canvasWidth - paddleWidth;
    if (
      ball.x - ball.radius < paddleX + paddleWidth &&
      ball.x + ball.radius > paddleX &&
      ball.y > player.paddleY &&
      ball.y < player.paddleY + paddleHeight
    ) {
      ball.vx = -ball.vx;
    }
  });

  // TODO: Implement scoring and ball reset when missing paddle

  // Broadcast game state to all players
  io.emit('gameState', { players, ball });
}

// Start game loop
setInterval(gameLoop, gameLoopInterval);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
