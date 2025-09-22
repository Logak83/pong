const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 60;

let playerIndex = null;
let paddleY = 120;

const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (message) => {
  const msg = JSON.parse(message.data);

  if (msg.type === "welcome") {
    playerIndex = msg.playerIndex;
  }

  if (msg.type === "update") {
    drawGame(msg.data);
  }
};

canvas.addEventListener("mousemove", (e) => {
  if (playerIndex === null) return;
  const rect = canvas.getBoundingClientRect();
  paddleY = e.clientY - rect.top - PADDLE_HEIGHT / 2;
  paddleY = Math.min(Math.max(paddleY, 0), canvas.height - PADDLE_HEIGHT);
  ws.send(JSON.stringify({ type: "paddleMove", data: paddleY }));
});

function drawGame(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ball
  const ball = state.ball;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw paddles
  state.players.forEach((player, idx) => {
    if (!player) return;
    const x = idx === 0 ? 0 : canvas.width - PADDLE_WIDTH;
    ctx.fillRect(x, player.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
  });

  // Draw scores
  ctx.font = "20px Arial";
  ctx.fillText(state.players[0]?.score || 0, 50, 20);
  ctx.fillText(state.players[1]?.score || 0, canvas.width - 50, 20);
}
