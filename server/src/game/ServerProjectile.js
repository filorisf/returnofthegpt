export class ServerProjectile {
  constructor(id, x, y, target, damage, speed, ownerSide) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.ownerSide = ownerSide;
    this.done = false;
  }

  update(dt, allUnits) {
    if (this.done) return;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.speed * dt + 10) {
      if (this.target.takeDamage && this.target.hp > 0 && !this.target.dead) {
        this.target.takeDamage(this.damage);
      }
      this.done = true;
      return;
    }

    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }

  serialize() {
    return { id: this.id, x: Math.round(this.x), y: Math.round(this.y), done: this.done };
  }
}
