import { GAME } from '../../../shared/constants.js';

const TICK = GAME.TICK_MS;

export class ClientProjectile {
  constructor(scene, data) {
    this.scene = scene;
    this.displayX = data.x; this.displayY = data.y;
    this.startX   = data.x; this.startY   = data.y;
    this.targetX  = data.x; this.targetY  = data.y;
    this.interpStart = performance.now();

    this.dot = scene.add.circle(data.x, data.y, 5, 0xffdd44).setDepth(8);
  }

  applyState(s, now) {
    this.startX = this.displayX; this.startY = this.displayY;
    this.targetX = s.x;         this.targetY = s.y;
    this.interpStart = now;
  }

  render(now) {
    const alpha = Math.min(1, (now - this.interpStart) / TICK);
    this.displayX = this.startX + (this.targetX - this.startX) * alpha;
    this.displayY = this.startY + (this.targetY - this.startY) * alpha;
    this.dot.setPosition(this.displayX, this.displayY);
  }

  destroy() {
    this.dot.destroy();
  }
}
