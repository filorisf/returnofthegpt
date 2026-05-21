import { MINIONS, LANE } from '../../../shared/constants.js';

export class ServerMinion {
  constructor(id, side, x, y) {
    this.id = id;
    this.side = side;
    this.x = x;
    this.y = y;
    this.hp = MINIONS.HP;
    this.maxHp = MINIONS.HP;
    this.attackCooldown = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  update(dt, heroes, minions, towers, nexuses) {
    if (this.hp <= 0) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const enemies = this._getEnemies(heroes, minions, towers, nexuses);
    let nearest = null, nearestDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    });

    if (nearest && nearestDist <= MINIONS.ATTACK_RANGE) {
      if (this.attackCooldown <= 0) {
        nearest.takeDamage?.(MINIONS.DAMAGE);
        this.attackCooldown = MINIONS.ATTACK_COOLDOWN_MS / 1000;
      }
    } else if (nearest && nearestDist <= MINIONS.AGGRO_RANGE) {
      this._moveToward(nearest.x, nearest.y, dt);
    } else {
      // March toward enemy nexus along lane direction
      const goal = this.side === 'left' ? LANE.END : LANE.START;
      this._moveToward(goal.x, goal.y, dt);
    }
  }

  _moveToward(tx, ty, dt) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    this.x += (dx / dist) * MINIONS.SPEED * dt;
    this.y += (dy / dist) * MINIONS.SPEED * dt;
  }

  _getEnemies(heroes, minions, towers, nexuses) {
    const result = [];
    heroes.forEach(h => { if (h.side !== this.side && !h.dead) result.push(h); });
    minions.forEach(m => { if (m.side !== this.side && m.hp > 0) result.push(m); });
    towers.forEach(t => { if (t.side !== this.side && t.hp > 0) result.push(t); });
    Object.values(nexuses).forEach(n => { if (n && n.side !== this.side && n.hp > 0) result.push(n); });
    return result;
  }

  serialize() {
    return { id: this.id, side: this.side, x: Math.round(this.x), y: Math.round(this.y), hp: this.hp, maxHp: this.maxHp };
  }
}
