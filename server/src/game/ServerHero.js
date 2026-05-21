import { LANE, clampToLane, lanePoint } from '../../../shared/constants.js';
import { ServerProjectile } from './ServerProjectile.js';

export class ServerHero {
  constructor(id, config, x, y, side) {
    this.id = id;
    this.side = side;
    this.config = config;
    this.x = x;
    this.y = y;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.dead = false;
    this.respawnTimer = 0;
    this.attackCooldown = 0;
    this.abilityCooldowns = { Q: 0, W: 0 };
    this.parrying = false;
    this.parryTimer = 0;
    this._targetX = null;
    this._targetY = null;
  }

  setMoveTarget(x, y) {
    const clamped = clampToLane(x, y);
    this._targetX = clamped.x;
    this._targetY = clamped.y;
  }

  triggerAttack(targetX, targetY, heroes, minions, towers, nexuses, projectiles, genId) {
    if (this.dead || this.attackCooldown > 0) return;
    const enemies = this._getEnemies(heroes, minions, towers, nexuses);
    const target = this._closestInRange(enemies, this.config.attackRange, targetX, targetY);
    if (!target) return;
    this.attackCooldown = this.config.attackCooldownMs / 1000;
    if (this.config.id === 'mage') {
      projectiles.push(new ServerProjectile(genId(), this.x, this.y, target, this.config.attackDamage, 500, this.side));
    } else {
      target.takeDamage?.(this.config.attackDamage);
    }
  }

  triggerAbility(key, targetX, targetY, heroes, minions, projectiles, genId) {
    if (this.dead || this.abilityCooldowns[key] > 0) return;
    if (key === 'Q') this._castQ(heroes, minions, targetX, targetY, projectiles, genId);
    if (key === 'W') this._castW(targetX, targetY);
  }

  update(dt, heroes, minions, towers, nexuses, projectiles, genId) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this._respawn();
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.abilityCooldowns.Q = Math.max(0, this.abilityCooldowns.Q - dt);
    this.abilityCooldowns.W = Math.max(0, this.abilityCooldowns.W - dt);
    if (this.parrying) {
      this.parryTimer -= dt;
      if (this.parryTimer <= 0) this.parrying = false;
    }

    // Move toward target
    if (this._targetX !== null) {
      const dx = this._targetX - this.x;
      const dy = this._targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6) {
        const step = this.config.speed * dt;
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        const c = clampToLane(this.x, this.y);
        this.x = c.x; this.y = c.y;
      } else {
        this._targetX = null;
        this._targetY = null;
      }
    }
  }

  _castQ(heroes, minions, tx, ty, projectiles, genId) {
    const ability = this.config.abilities.Q;
    this.abilityCooldowns.Q = ability.cooldownMs / 1000;

    if (this.config.id === 'warrior') {
      const dx = tx - this.x, dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      const dashDist = Math.min(dist, ability.range);
      if (dist > 0) {
        const nx = this.x + (dx / dist) * dashDist;
        const ny = this.y + (dy / dist) * dashDist;
        const c = clampToLane(nx, ny);
        this.x = c.x; this.y = c.y;
      }
      this._targetX = null;
      const enemies = this._getEnemies(heroes, minions, [], {});
      enemies.forEach(e => {
        if (Math.hypot(e.x - this.x, e.y - this.y) < 90) e.takeDamage?.(ability.damage);
      });
    } else if (this.config.id === 'mage') {
      const enemies = this._getEnemies(heroes, minions, [], {});
      const target = this._closestInRange(enemies, ability.range, tx, ty) || { x: tx, y: ty };
      projectiles.push(new ServerProjectile(genId(), this.x, this.y, target, ability.damage, ability.projectileSpeed, this.side));
    }
  }

  _castW(tx, ty) {
    const ability = this.config.abilities.W;
    this.abilityCooldowns.W = ability.cooldownMs / 1000;

    if (this.config.id === 'warrior') {
      this.parrying = true;
      this.parryTimer = ability.duration / 1000;
    } else if (this.config.id === 'mage') {
      const dx = tx - this.x, dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      const blinkDist = Math.min(dist, ability.range);
      if (dist > 0) {
        const nx = this.x + (dx / dist) * blinkDist;
        const ny = this.y + (dy / dist) * blinkDist;
        const c = clampToLane(nx, ny);
        this.x = c.x; this.y = c.y;
        this._targetX = null;
      }
    }
  }

  _getEnemies(heroes, minions, towers, nexuses) {
    const result = [];
    heroes.forEach(h => { if (h.side !== this.side && !h.dead) result.push(h); });
    minions.forEach(m => { if (m.side !== this.side && m.hp > 0) result.push(m); });
    towers.forEach(t => { if (t.side !== this.side && t.hp > 0) result.push(t); });
    Object.values(nexuses).forEach(n => { if (n && n.side !== this.side && n.hp > 0) result.push(n); });
    return result;
  }

  _closestInRange(units, range, px, py) {
    let best = null, bestDist = range;
    // Prefer closest to cursor
    units.forEach(u => {
      const d = Math.hypot(u.x - px, u.y - py);
      if (d <= bestDist) { bestDist = d; best = u; }
    });
    // Fallback: closest to self
    if (!best) {
      let selfBest = Infinity;
      units.forEach(u => {
        const d = Math.hypot(u.x - this.x, u.y - this.y);
        if (d <= range && d < selfBest) { selfBest = d; best = u; }
      });
    }
    return best;
  }

  takeDamage(amount) {
    if (this.parrying) return;
    const effective = Math.max(1, amount - (this.config.defense ?? 0));
    this.hp = Math.max(0, this.hp - effective);
    if (this.hp <= 0 && !this.dead) this._die();
  }

  _die() {
    this.dead = true;
    this.respawnTimer = 8;
    this._targetX = null;
    this._targetY = null;
  }

  _respawn() {
    this.dead = false;
    this.hp = this.maxHp;
    const spawn = this.side === 'left' ? lanePoint(500) : lanePoint(LANE.LENGTH - 500);
    this.x = spawn.x;
    this.y = spawn.y;
  }

  serialize() {
    return {
      id: this.id,
      side: this.side,
      heroId: this.config.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
      hp: this.hp,
      maxHp: this.maxHp,
      dead: this.dead,
      respawnTimer: Math.ceil(this.respawnTimer),
      parrying: this.parrying,
      abilityCooldowns: {
        Q: Math.round(this.abilityCooldowns.Q * 10) / 10,
        W: Math.round(this.abilityCooldowns.W * 10) / 10,
      },
    };
  }
}
