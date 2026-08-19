import type { GameSnapshot, GameStatus, Obstacle } from './GameEngine';

const PALETTE = {
  skyTop: '#ffd5e8',
  skyBottom: '#ffeff7',
  blush: '#ff9ac7',
  plum: '#7c3ea0',
  violet: '#a65ad8',
  violetDark: '#6c2d90',
  cream: '#fff7dc',
  leaf: '#5f9c7d',
  ink: '#3b2442',
  ground: '#f8c1da',
  groundLine: '#c66ca1'
};

export function renderGame(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, snapshot.elapsed);
  drawObstacles(ctx, snapshot.obstacles, snapshot.elapsed, snapshot.status, snapshot.cat.height, snapshot.groundY, width);
  drawCat(ctx, snapshot);
  drawForeground(ctx, width, height, snapshot.elapsed, snapshot.groundY);
  drawStatusHint(ctx, snapshot, width, height);
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(0.56, PALETTE.skyBottom);
  gradient.addColorStop(1, '#ffe6f1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawSoftCloudBank(ctx, width, height, elapsed);
  drawCloud(ctx, 52 - (elapsed * 6) % 460, 14, 0.2);
  drawCloud(ctx, 238 - (elapsed * 4) % 460, 22, 0.17);
  drawCloud(ctx, 420 - (elapsed * 5) % 460, 9, 0.18);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let index = 0; index < 7; index += 1) {
    const x = (index * 43 + 22 - elapsed * 12) % (width + 40);
    const y = 8 + ((index * 11) % 24);
    drawSparkle(ctx, x, y, 1 + (index % 2));
  }
}

function drawSoftCloudBank(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  const baseY = height - 9;
  const offset = (elapsed * 7) % 160;

  for (let x = -160 - offset; x < width + 160; x += 80) {
    ctx.fillStyle = 'rgba(255, 192, 222, 0.28)';
    roundedBlob(ctx, x, baseY - 12, 72, 18, 12);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(x + 18, baseY - 10, 8, 0, Math.PI * 2);
    ctx.arc(x + 38, baseY - 15, 11, 0, Math.PI * 2);
    ctx.arc(x + 57, baseY - 9, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  roundedBlob(ctx, 0, 0, 92, 28, 18);
  ctx.beginPath();
  ctx.arc(24, 4, 19, 0, Math.PI * 2);
  ctx.arc(48, -5, 26, 0, Math.PI * 2);
  ctx.arc(72, 2, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  elapsed: number,
  status: GameStatus,
  catHeight: number,
  groundY: number,
  width: number
) {
  const wobble = status === 'gameOver' ? 0 : Math.sin(elapsed * 5) * 1.5;

  ctx.fillStyle = 'rgba(124, 62, 160, 0.1)';
  ctx.fillRect(0, groundY + 6, width, 2);

  for (const obstacle of obstacles) {
    if (obstacle.kind === 'bird') {
      drawBird(ctx, obstacle, elapsed);
      continue;
    }

    const top = groundY - obstacle.height;

    ctx.save();
    ctx.translate(obstacle.x, 0);

    const gradient = ctx.createLinearGradient(0, top, 0, groundY);
    gradient.addColorStop(0, PALETTE.violet);
    gradient.addColorStop(1, PALETTE.violetDark);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.quadraticCurveTo(obstacle.width * 0.5, top + wobble, obstacle.width, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 247, 220, 0.56)';
    ctx.beginPath();
    ctx.moveTo(obstacle.width * 0.38, top + 5);
    ctx.lineTo(obstacle.width * 0.5, top + 2 + wobble);
    ctx.lineTo(obstacle.width * 0.62, top + 7);
    ctx.closePath();
    ctx.fill();

    if (obstacle.height > catHeight) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(4, top + 9, obstacle.width - 8, 1);
    }

    ctx.restore();
  }
}

function drawBird(ctx: CanvasRenderingContext2D, bird: Obstacle, elapsed: number) {
  const y = (bird.y ?? 12) + Math.sin(elapsed * 10 + bird.id) * 1.8;
  const wing = Math.sin(elapsed * 18 + bird.id) * 3;

  ctx.save();
  ctx.translate(bird.x, y);
  ctx.fillStyle = '#8f48c6';
  ctx.strokeStyle = PALETTE.violetDark;
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.ellipse(11, 7, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(7, 6);
  ctx.quadraticCurveTo(2, 0 + wing, 0, 7);
  ctx.moveTo(14, 6);
  ctx.quadraticCurveTo(20, 0 - wing, 22, 7);
  ctx.stroke();

  ctx.fillStyle = '#fff7dc';
  ctx.beginPath();
  ctx.arc(14, 5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCat(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot) {
  const { cat, elapsed, status } = snapshot;
  const isCompanion = snapshot.companionMode;
  const runBob = cat.onGround && (status === 'running' || isCompanion) ? Math.sin(elapsed * 16) * 2 : 0;
  const idleHop = status === 'ready' && !isCompanion ? Math.max(0, Math.sin(elapsed * 3.4)) * 6 : 0;
  const idleBreath = status === 'paused' ? Math.sin(elapsed * 2.2) * 1.2 : 0;
  const bob = runBob - idleHop + idleBreath;
  const x = cat.x;
  const y = cat.y + bob + (cat.ducking ? 4 : 0);
  const tailWave = Math.sin(elapsed * 10) * 4;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.48, cat.ducking ? 0.34 : 0.48);

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.fillStyle = PALETTE.cream;

  ctx.beginPath();
  ctx.moveTo(7, 26);
  ctx.bezierCurveTo(-11, 18 + tailWave, -9, 3 + tailWave, 8, 14);
  ctx.stroke();

  roundedBlob(ctx, 7, 10, 36, 26, 14);
  ctx.stroke();

  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.moveTo(12, 13);
  ctx.lineTo(16, 0);
  ctx.lineTo(24, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(29, 13);
  ctx.lineTo(36, 2);
  ctx.lineTo(39, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffc5de';
  ctx.beginPath();
  ctx.moveTo(16, 10);
  ctx.lineTo(17, 5);
  ctx.lineTo(20, 11);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(32, 12);
  ctx.lineTo(35, 7);
  ctx.lineTo(36, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(20, 22, 2.1, 0, Math.PI * 2);
  ctx.arc(34, 22, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(27, 25);
  ctx.quadraticCurveTo(25, 28, 22, 27);
  ctx.moveTo(27, 25);
  ctx.quadraticCurveTo(30, 28, 33, 27);
  ctx.stroke();

  ctx.fillStyle = PALETTE.blush;
  ctx.beginPath();
  ctx.arc(13, 27, 3, 0, Math.PI * 2);
  ctx.arc(40, 27, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  const pawOffset = cat.onGround ? Math.sin(elapsed * 18) * 2 : -1;
  ctx.beginPath();
  ctx.moveTo(14, 34);
  ctx.lineTo(12 + pawOffset, 38);
  ctx.moveTo(34, 34);
  ctx.lineTo(36 - pawOffset, 38);
  ctx.stroke();

  ctx.restore();
}

function drawForeground(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, groundY: number) {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, groundY, width, height - groundY);

  ctx.strokeStyle = PALETTE.groundLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 1);
  ctx.lineTo(width, groundY + 1);
  ctx.stroke();

  for (let index = 0; index < 18; index += 1) {
    const x = (index * 34 - (elapsed * 58) % 34 + 6) % (width + 20);
    const y = groundY + 5 + (index % 2) * 4;
    drawSprig(ctx, x, y);
  }
}

function drawSprig(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = PALETTE.leaf;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2, y - 4);
  ctx.moveTo(x + 2, y - 3);
  ctx.lineTo(x + 5, y - 5);
  ctx.stroke();
}

function drawStatusHint(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, width: number, height: number) {
  const { status } = snapshot;
  if (status === 'running' || snapshot.companionMode) {
    return;
  }

  const label = status === 'ready' ? 'space / click' : status === 'paused' ? 'paused' : 'space to reset';

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  roundedBlob(ctx, width / 2 - 44, height / 2 - 9, 88, 18, 9);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '600 10px Inter, ui-sans-serif, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);
  ctx.restore();
}

function roundedBlob(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const right = x + width;
  const bottom = y + height;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}
