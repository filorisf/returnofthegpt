import { HEROES, GAME } from '../../../shared/constants.js';

const COLORS = { left: 0x4488ff, right: 0xff4444 };
const R = 22;
const TICK = GAME.TICK_MS;

export class ClientHero {
  constructor(scene, data, isMe) {
    this.scene = scene;
    this.isMe = isMe;
    this.state = data;
    this.side = data.side;

    // Interpolation state
    this.displayX = data.x; this.displayY = data.y;
    this.startX   = data.x; this.startY   = data.y;
    this.targetX  = data.x; this.targetY  = data.y;
    this.interpStart = performance.now();

    const color = COLORS[data.side];
    this.circle = scene.add.circle(data.x, data.y, R, color).setDepth(5);
    if (isMe) this.circle.setStrokeStyle(3, 0xffffff);

    const cfg = HEROES[data.heroId];
    this.nameTag = scene.add.text(data.x, data.y - R - 14, cfg?.name ?? data.heroId, {
      fontSize: '12px', fontFamily: 'monospace', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this.hpBarBg = scene.add.rectangle(data.x, data.y - R - 6, 44, 5, 0x330000).setDepth(6);
    this.hpBar   = scene.add.rectangle(data.x - 22, data.y - R - 6, 44, 5, 0x00ee44).setOrigin(0, 0.5).setDepth(7);

    this.parryRing = scene.add.circle(data.x, data.y, R + 7, 0xffffff, 0.35).setDepth(4).setVisible(false);

    this.deadOverlay = scene.add.circle(data.x, data.y, R, 0x000000, 0.65).setDepth(8).setVisible(false);
    this.deadText    = scene.add.text(data.x, data.y, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaa',
    }).setOrigin(0.5).setDepth(9).setVisible(false);
  }

  applyState(s, now) {
    this.startX = this.displayX; this.startY = this.displayY;
    this.targetX = s.x;         this.targetY = s.y;
    this.interpStart = now;
    this.state = s;

    // Non-positional state updates happen immediately
    const pct = s.hp / s.maxHp;
    this.hpBar.setSize(Math.max(0, 44 * pct), 5);
    this.hpBar.setFillStyle(pct > 0.5 ? 0x00ee44 : pct > 0.25 ? 0xeeaa00 : 0xee2200);

    const dead = s.dead;
    this.circle.setVisible(!dead);
    this.hpBarBg.setVisible(!dead);
    this.hpBar.setVisible(!dead);
    this.parryRing.setVisible(s.parrying && !dead);
    this.deadOverlay.setVisible(dead);
    this.deadText.setText(dead ? `${s.respawnTimer}s` : '').setVisible(dead);
  }

  render(now) {
    const alpha = Math.min(1, (now - this.interpStart) / TICK);
    this.displayX = this.startX + (this.targetX - this.startX) * alpha;
    this.displayY = this.startY + (this.targetY - this.startY) * alpha;

    const x = this.displayX, y = this.displayY;
    this.circle.setPosition(x, y);
    this.nameTag.setPosition(x, y - R - 14);
    this.hpBarBg.setPosition(x, y - R - 6);
    this.hpBar.setPosition(x - 22, y - R - 6);
    this.parryRing.setPosition(x, y);
    this.deadOverlay.setPosition(x, y);
    this.deadText.setPosition(x, y);
  }

  destroy() {
    [this.circle, this.nameTag, this.hpBarBg, this.hpBar,
     this.parryRing, this.deadOverlay, this.deadText].forEach(o => o.destroy());
  }
}
