import { TOWERS } from '../../../shared/constants.js';

export class ServerTower {
  constructor(id, side, x, y) {
    this.id = id;
    this.side = side;
    this.x = x;
    this.y = y;
    this.hp = TOWERS.HP;
    this.maxHp = TOWERS.HP;
    this.attackCooldown = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  update(dt, heroes, minions) {
    if (this.hp <= 0) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackCooldown > 0) return;

    // Prioritize enemy minions, then heroes
    const enemies = [];
    minions.forEach(m => { if (m.side !== this.side && m.hp > 0) enemies.push(m); });
    heroes.forEach(h => { if (h.side !== this.side && !h.dead) enemies.push(h); });

    const target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= TOWERS.RANGE);
    if (!target) return;

    if (target.takeDamage) target.takeDamage(TOWERS.DAMAGE);
    this.attackCooldown = TOWERS.ATTACK_COOLDOWN_MS / 1000;
  }

  serialize() {
    return { id: this.id, side: this.side, x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp };
  }
}
