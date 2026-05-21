import { MAP, LANE } from '../../../shared/constants.js';
import { ClientHero } from '../entities/ClientHero.js';
import { ClientMinion } from '../entities/ClientMinion.js';
import { ClientTower } from '../entities/ClientTower.js';
import { ClientNexus } from '../entities/ClientNexus.js';
import { ClientProjectile } from '../entities/ClientProjectile.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.socket = data.socket;
    this.mySide = data.side;
    this.myPlayerId = data.playerId;
    this.myHeroId = data.heroId;
    this.initialState = data.initialState;
    this.layout = data.layout ?? 'azerty';
  }

  create() {
    // Disable right-click context menu on canvas
    this.game.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this._drawMap();

    this.heroes = new Map();
    this.minions = new Map();
    this.towers = new Map();
    this.nexuses = new Map();
    this.projectiles = new Map();

    this._applyFullState(this.initialState);

    // Camera setup: follow my hero, zoomed in
    this._followTarget = this.add.zone(0, 0, 1, 1);
    this.cameras.main.setBounds(0, 0, MAP.WIDTH, MAP.HEIGHT);
    this.cameras.main.setZoom(1.7);
    this.cameras.main.startFollow(this._followTarget, true, 0.1, 0.1);

    // Position follow target on my spawn immediately
    const myHero = [...this.heroes.values()].find(h => h.isMe);
    if (myHero) this._followTarget.setPosition(myHero.state.x, myHero.state.y);

    this.scene.launch('HUDScene', { side: this.mySide, heroId: this.myHeroId });

    this._setupInput();
    this._setupSocket();
  }

  _drawMap() {
    const gfx = this.add.graphics();

    // Background (jungle)
    gfx.fillStyle(0x162416);
    gfx.fillRect(0, 0, MAP.WIDTH, MAP.HEIGHT);

    // Subtle grid
    gfx.lineStyle(1, 0x1e3020, 0.4);
    for (let x = 0; x < MAP.WIDTH; x += 120) gfx.lineBetween(x, 0, x, MAP.HEIGHT);
    for (let y = 0; y < MAP.HEIGHT; y += 120) gfx.lineBetween(0, y, MAP.WIDTH, y);

    // Lane polygon (diagonal corridor)
    const p = LANE.PERP;
    const hw = LANE.WIDTH / 2;
    const corners = [
      { x: LANE.START.x + p.x * hw, y: LANE.START.y + p.y * hw },
      { x: LANE.END.x   + p.x * hw, y: LANE.END.y   + p.y * hw },
      { x: LANE.END.x   - p.x * hw, y: LANE.END.y   - p.y * hw },
      { x: LANE.START.x - p.x * hw, y: LANE.START.y - p.y * hw },
    ];
    gfx.fillStyle(0x8b7355);
    gfx.fillPoints(corners, true);

    // Lane edge lines
    gfx.lineStyle(5, 0x5a4a2a, 1);
    gfx.lineBetween(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
    gfx.lineBetween(corners[3].x, corners[3].y, corners[2].x, corners[2].y);

    // Base pads
    gfx.fillStyle(0x224488, 0.35);
    gfx.fillCircle(LANE.START.x, LANE.START.y, 130);
    gfx.fillStyle(0x882222, 0.35);
    gfx.fillCircle(LANE.END.x, LANE.END.y, 130);
  }

  _applyFullState(state) {
    const now = performance.now();
    state.heroes.forEach(h => {
      if (!this.heroes.has(h.id)) this.heroes.set(h.id, new ClientHero(this, h, h.id === this.myPlayerId));
      this.heroes.get(h.id).applyState(h, now);
    });
    state.towers.forEach(t => {
      if (!this.towers.has(t.id)) this.towers.set(t.id, new ClientTower(this, t));
      this.towers.get(t.id).applyState(t);
    });
    Object.values(state.nexuses).forEach(n => {
      if (!this.nexuses.has(n.id)) this.nexuses.set(n.id, new ClientNexus(this, n));
      this.nexuses.get(n.id).applyState(n);
    });
  }

  _setupInput() {
    // Right-click: move | Left-click: attack
    this.input.on('pointerdown', (ptr) => {
      if (ptr.rightButtonDown()) {
        const wx = ptr.worldX, wy = ptr.worldY;
        this.socket.emit('move_to', { x: wx, y: wy });
        this._showMoveIndicator(wx, wy);
      } else if (ptr.leftButtonDown()) {
        this.socket.emit('attack', { targetX: ptr.worldX, targetY: ptr.worldY });
      }
    });

    // Abilities
    this.input.keyboard.on('keydown-Q', () => {
      const ptr = this.input.activePointer;
      this.socket.emit('ability', { key: 'Q', targetX: ptr.worldX, targetY: ptr.worldY });
    });
    this.input.keyboard.on('keydown-E', () => {
      const ptr = this.input.activePointer;
      this.socket.emit('ability', { key: 'W', targetX: ptr.worldX, targetY: ptr.worldY });
    });
  }

  _showMoveIndicator(wx, wy) {
    const ring = this.add.circle(wx, wy, 14, 0x00ff88, 0).setStrokeStyle(2, 0x00ff88).setDepth(15);
    this.tweens.add({
      targets: ring,
      alpha: { from: 0.9, to: 0 },
      scaleX: { from: 1, to: 0.3 },
      scaleY: { from: 1, to: 0.3 },
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  _setupSocket() {
    this.socket.on('state', (state) => this._applyDeltaState(state));
    this.socket.on('game_over', ({ winner }) => this._showGameOver(winner));
    this.socket.on('player_left', () => this._showOverlay('Ton adversaire a quitté'));
  }

  update(time) {
    // Interpolate all entities every frame (~60fps)
    this.heroes.forEach(h => h.render(time));
    this.minions.forEach(m => m.render(time));
    this.projectiles.forEach(p => p.render(time));

    // Camera follows interpolated hero position
    const myHero = [...this.heroes.values()].find(h => h.isMe);
    if (myHero && !myHero.state.dead) {
      this._followTarget.setPosition(myHero.displayX, myHero.displayY);
    }
  }

  _applyDeltaState(state) {
    const now = performance.now();

    state.heroes.forEach(h => {
      if (!this.heroes.has(h.id)) this.heroes.set(h.id, new ClientHero(this, h, h.id === this.myPlayerId));
      this.heroes.get(h.id).applyState(h, now);
    });

    const seenMinions = new Set();
    state.minions.forEach(m => {
      seenMinions.add(m.id);
      if (!this.minions.has(m.id)) this.minions.set(m.id, new ClientMinion(this, m));
      this.minions.get(m.id).applyState(m, now);
    });
    this.minions.forEach((m, id) => { if (!seenMinions.has(id)) { m.destroy(); this.minions.delete(id); } });

    state.towers.forEach(t => {
      if (!this.towers.has(t.id)) this.towers.set(t.id, new ClientTower(this, t));
      this.towers.get(t.id).applyState(t);
    });

    Object.values(state.nexuses).forEach(n => {
      if (!this.nexuses.has(n.id)) this.nexuses.set(n.id, new ClientNexus(this, n));
      this.nexuses.get(n.id).applyState(n);
    });

    const seenProj = new Set();
    state.projectiles.forEach(p => {
      seenProj.add(p.id);
      if (!this.projectiles.has(p.id)) this.projectiles.set(p.id, new ClientProjectile(this, p));
      this.projectiles.get(p.id).applyState(p, now);
    });
    this.projectiles.forEach((p, id) => { if (!seenProj.has(id)) { p.destroy(); this.projectiles.delete(id); } });

    const myHero = [...this.heroes.values()].find(h => h.isMe);
    if (myHero) this.events.emit('heroState', myHero.state);
  }

  _showGameOver(winner) {
    const isWinner = winner === this.mySide;
    this._showOverlay(isWinner ? 'VICTOIRE !' : 'DÉFAITE', isWinner ? '#e0c060' : '#e06060');
    this.time.delayedCall(4000, () => {
      this.game.canvas.removeEventListener('contextmenu', e => e.preventDefault());
      this.scene.stop('HUDScene');
      this.scene.start('LobbyScene');
    });
  }

  _showOverlay(text, color = '#ffffff') {
    const W = this.scale.width, H = this.scale.height;
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
      .setScrollFactor(0).setDepth(99);
    this.add.text(W / 2, H / 2, text, {
      fontSize: '72px', fontFamily: 'monospace', color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
  }
}
