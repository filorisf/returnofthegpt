import { NEXUS } from '../../../shared/constants.js';

export class ServerNexus {
  constructor(id, side, x, y) {
    this.id = id;
    this.side = side;
    this.x = x;
    this.y = y;
    this.hp = NEXUS.HP;
    this.maxHp = NEXUS.HP;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  serialize() {
    return { id: this.id, side: this.side, x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp };
  }
}
