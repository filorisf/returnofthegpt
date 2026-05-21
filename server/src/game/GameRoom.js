import { GAME, LANE, MINIONS, lanePoint, clampToLane } from '../../../shared/constants.js';
import { ServerHero } from './ServerHero.js';
import { ServerMinion } from './ServerMinion.js';
import { ServerTower } from './ServerTower.js';
import { ServerNexus } from './ServerNexus.js';

// Precompute lane positions
const POS = {
  leftNexus:  lanePoint(0),
  leftSpawn:  lanePoint(500),
  leftTower:  lanePoint(1000),
  rightTower: lanePoint(LANE.LENGTH - 1000),
  rightSpawn: lanePoint(LANE.LENGTH - 500),
  rightNexus: lanePoint(LANE.LENGTH),
};

export class GameRoom {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.players = new Map();
    this.minions = [];
    this.towers = [];
    this.nexuses = {};
    this.projectiles = [];
    this.tickInterval = null;
    this.minionInterval = null;
    this.nextId = 1;
    this.running = false;
  }

  genId() { return this.nextId++; }

  addPlayer(socket, heroId, side) {
    const heroConfig = _getHeroConfig(heroId);
    const spawn = side === 'left' ? POS.leftSpawn : POS.rightSpawn;
    const hero = new ServerHero(this.genId(), heroConfig, spawn.x, spawn.y, side);
    this.players.set(socket.id, { socket, hero, side });
    socket.emit('joined', { side, heroId: heroConfig.id, playerId: hero.id });
  }

  isFull() { return this.players.size >= 2; }
  isEmpty() { return this.players.size === 0; }
  hasPlayer(id) { return this.players.has(id); }

  start() {
    this._initStructures();
    const state = this._buildFullState();
    this.io.to(this.code).emit('game_start', state);

    this.running = true;
    this.tickInterval = setInterval(() => this._tick(), GAME.TICK_MS);
    this.minionInterval = setInterval(() => this._spawnMinionWave(), MINIONS.SPAWN_INTERVAL_MS);
    setTimeout(() => this._spawnMinionWave(), 5000);
  }

  _initStructures() {
    this.towers = [
      new ServerTower(this.genId(), 'left',  POS.leftTower.x,  POS.leftTower.y),
      new ServerTower(this.genId(), 'right', POS.rightTower.x, POS.rightTower.y),
    ];
    this.nexuses = {
      left:  new ServerNexus(this.genId(), 'left',  POS.leftNexus.x,  POS.leftNexus.y),
      right: new ServerNexus(this.genId(), 'right', POS.rightNexus.x, POS.rightNexus.y),
    };
  }

  _spawnMinionWave() {
    if (!this.running) return;
    // Spawn in single file along lane direction (queue leu leu)
    // First minion is furthest forward, each one 36px behind the previous
    for (let i = 0; i < 3; i++) {
      const gap = i * 36;
      const lx = POS.leftNexus.x + (70 - gap) * LANE.DIR.x;
      const ly = POS.leftNexus.y + (70 - gap) * LANE.DIR.y;
      const rx = POS.rightNexus.x - (70 - gap) * LANE.DIR.x;
      const ry = POS.rightNexus.y - (70 - gap) * LANE.DIR.y;
      this.minions.push(new ServerMinion(this.genId(), 'left',  lx, ly));
      this.minions.push(new ServerMinion(this.genId(), 'right', rx, ry));
    }
  }

  handleMoveTarget(socketId, x, y) {
    const player = this.players.get(socketId);
    if (player && this.running) player.hero.setMoveTarget(x, y);
  }

  handleAttack(socketId, targetX, targetY) {
    const player = this.players.get(socketId);
    if (!player || !this.running) return;
    player.hero.triggerAttack(targetX, targetY,
      [...this.players.values()].map(p => p.hero),
      this.minions, this.towers, this.nexuses, this.projectiles, () => this.genId());
  }

  handleAbility(socketId, key, targetX, targetY) {
    const player = this.players.get(socketId);
    if (!player || !this.running) return;
    const heroes = [...this.players.values()].map(p => p.hero);
    player.hero.triggerAbility(key, targetX, targetY, heroes, this.minions, this.projectiles, () => this.genId());
  }

  handleDisconnect(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      this.players.delete(socketId);
      this.io.to(this.code).emit('player_left', { id: player.hero.id });
      this.stop();
    }
  }

  _tick() {
    const dt = GAME.TICK_MS / 1000;
    const heroes = [...this.players.values()].map(p => p.hero);

    heroes.forEach(h => h.update(dt, heroes, this.minions, this.towers, this.nexuses, this.projectiles, () => this.genId()));
    this.minions.forEach(m => m.update(dt, heroes, this.minions, this.towers, this.nexuses));
    this.towers.forEach(t => t.update(dt, heroes, this.minions));
    this.projectiles.forEach(p => p.update(dt));

    this._resolveCollisions(heroes);

    this.minions = this.minions.filter(m => m.hp > 0);
    this.projectiles = this.projectiles.filter(p => !p.done);

    for (const [side, nexus] of Object.entries(this.nexuses)) {
      if (nexus.hp <= 0) {
        const winner = side === 'left' ? 'right' : 'left';
        this.io.to(this.code).emit('game_over', { winner });
        this.stop();
        return;
      }
    }

    this.io.to(this.code).emit('state', this._buildDeltaState());
  }

  _buildFullState() {
    return {
      heroes:    [...this.players.values()].map(p => p.hero.serialize()),
      towers:    this.towers.map(t => t.serialize()),
      nexuses:   Object.fromEntries(Object.entries(this.nexuses).map(([k, v]) => [k, v.serialize()])),
      minions:   [],
    };
  }

  _buildDeltaState() {
    return {
      heroes:      [...this.players.values()].map(p => p.hero.serialize()),
      minions:     this.minions.map(m => m.serialize()),
      towers:      this.towers.map(t => t.serialize()),
      nexuses:     Object.fromEntries(Object.entries(this.nexuses).map(([k, v]) => [k, v.serialize()])),
      projectiles: this.projectiles.map(p => p.serialize()),
    };
  }

  _resolveCollisions(heroes) {
    const HR = 22, MR = 10, TR = 32, NR = 48;

    // Hero vs Hero
    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        if (!heroes[i].dead && !heroes[j].dead)
          this._pushApart(heroes[i], heroes[j], HR, HR);
      }
    }

    // Hero vs Minion — minions bulldoze (hero takes 85% of push)
    for (const h of heroes) {
      if (h.dead) continue;
      for (const m of this.minions) {
        if (m.hp > 0) this._pushApart(h, m, HR, MR, 0.85, 0.15);
      }
    }

    // Minion vs Minion
    for (let i = 0; i < this.minions.length; i++) {
      for (let j = i + 1; j < this.minions.length; j++) {
        if (this.minions[i].hp > 0 && this.minions[j].hp > 0)
          this._pushApart(this.minions[i], this.minions[j], MR, MR);
      }
    }

    // Units vs static structures — only collide with ENEMY structures
    const movingUnits = [
      ...heroes.filter(h => !h.dead),
      ...this.minions.filter(m => m.hp > 0),
    ];
    for (const unit of movingUnits) {
      const ur = unit.config ? HR : MR;
      for (const tower of this.towers) {
        if (tower.hp > 0 && tower.side !== unit.side)
          this._pushFromStatic(unit, tower, ur, TR);
      }
      for (const nexus of Object.values(this.nexuses)) {
        if (nexus.hp > 0 && nexus.side !== unit.side)
          this._pushFromStatic(unit, nexus, ur, NR);
      }
    }

    // Re-clamp all moving units to lane after resolution
    for (const unit of movingUnits) {
      const c = clampToLane(unit.x, unit.y, 0);
      unit.x = c.x; unit.y = c.y;
    }
  }

  _pushApart(a, b, ra, rb, fracA = 0.5, fracB = 0.5) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const min = ra + rb;
    if (dist >= min || dist < 0.01) return;
    const overlap = min - dist;
    const nx = dx / dist, ny = dy / dist;
    a.x -= nx * overlap * fracA; a.y -= ny * overlap * fracA;
    b.x += nx * overlap * fracB; b.y += ny * overlap * fracB;
  }

  _pushFromStatic(unit, obj, ru, rs) {
    const dx = unit.x - obj.x, dy = unit.y - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const min = ru + rs;
    if (dist >= min || dist < 0.01) return;
    const push = min - dist;
    const nx = dx / dist, ny = dy / dist;
    unit.x += nx * push; unit.y += ny * push;
  }

  stop() {
    this.running = false;
    clearInterval(this.tickInterval);
    clearInterval(this.minionInterval);
  }
}

function _getHeroConfig(heroId) {
  const configs = {
    warrior: { id: 'warrior', name: 'Garok', hp: 700, speed: 200, attackDamage: 60, attackRange: 100, attackCooldownMs: 800, abilities: { Q: { name: 'Charge', cooldownMs: 8000, damage: 120, range: 380 }, W: { name: 'Parry', cooldownMs: 12000, duration: 1500 } } },
    mage:    { id: 'mage',    name: 'Syra',  hp: 500, speed: 185, attackDamage: 35, attackRange: 250, attackCooldownMs: 1100, abilities: { Q: { name: 'Fireball', cooldownMs: 6000, damage: 180, range: 500, projectileSpeed: 500 }, W: { name: 'Blink', cooldownMs: 15000, range: 420 } } },
  };
  return configs[heroId] || configs.warrior;
}
