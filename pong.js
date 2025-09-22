const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ws = new WebSocket(`ws://${window.location.host}`);

let ball = { x: 300, y: 200 };
let paddles = {};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'state') {
    ball = msg.state.ball;
    paddles = msg.state.paddles;
    draw();
  }
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ball
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Draw paddles
  ctx.fillStyle = 'white';
  for (const p of Object.values(paddles)) {
    ctx.fillRect(p.x, p.y, 10, 100);
  }
}

// Send paddle movement on mouse move
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const yPos = event.clientY - rect.top - 50; // Center paddle on mouse
  ws.send(JSON.stringify({ type: 'move', position: yPos }));
});
