import { GAME } from '../../../shared/constants.js';

const COLORS = { left: 0x88bbff, right: 0xff8888 };
const TICK = GAME.TICK_MS;

export class ClientMinion {
  constructor(scene, data) {
    this.scene = scene;
    this.displayX = data.x; this.displayY = data.y;
    this.startX   = data.x; this.startY   = data.y;
    this.targetX  = data.x; this.targetY  = data.y;
    this.interpStart = performance.now();

    this.body     = scene.add.rectangle(data.x, data.y, 16, 16, COLORS[data.side]).setDepth(4);
    this.hpBarBg  = scene.add.rectangle(data.x, data.y - 14, 20, 3, 0x330000).setDepth(5);
    this.hpBar    = scene.add.rectangle(data.x - 10, data.y - 14, 20, 3, 0x00ee44).setOrigin(0, 0.5).setDepth(6);
  }

  applyState(s, now) {
    this.startX = this.displayX; this.startY = this.displayY;
    this.targetX = s.x;         this.targetY = s.y;
    this.interpStart = now;

    const pct = s.hp / s.maxHp;
    this.hpBar.setSize(Math.max(0, 20 * pct), 3);
  }

  render(now) {
    const alpha = Math.min(1, (now - this.interpStart) / TICK);
    this.displayX = this.startX + (this.targetX - this.startX) * alpha;
    this.displayY = this.startY + (this.targetY - this.startY) * alpha;

    this.body.setPosition(this.displayX, this.displayY);
    this.hpBarBg.setPosition(this.displayX, this.displayY - 14);
    this.hpBar.setPosition(this.displayX - 10, this.displayY - 14);
  }

  destroy() {
    this.body.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
  }
}
