const COLORS = { left: 0x4466cc, right: 0xcc4444 };

export class ClientTower {
  constructor(scene, data) {
    this.scene = scene;
    // Tower body
    this.body = scene.add.rectangle(data.x, data.y, 36, 50, COLORS[data.side]).setDepth(3);
    this.top = scene.add.triangle(
      data.x, data.y - 36,
      -18, 0, 18, 0, 0, -22,
      COLORS[data.side]
    ).setDepth(3);
    // HP bar
    this.hpBarBg = scene.add.rectangle(data.x, data.y - 42, 40, 5, 0x330000).setDepth(4);
    this.hpBar = scene.add.rectangle(data.x - 20, data.y - 42, 40, 5, 0x00aaff).setOrigin(0, 0.5).setDepth(5);
    // Range circle (faint)
    this.rangeCircle = scene.add.circle(data.x, data.y, 200, 0xffffff, 0.03).setDepth(1);
  }

  applyState(s) {
    const alive = s.hp > 0;
    this.body.setVisible(alive);
    this.top.setVisible(alive);
    this.rangeCircle.setVisible(alive);
    this.hpBarBg.setVisible(alive);
    this.hpBar.setVisible(alive);
    if (alive) {
      const pct = s.hp / s.maxHp;
      this.hpBar.setSize(Math.max(0, 40 * pct), 5);
    }
  }

  destroy() {
    [this.body, this.top, this.hpBarBg, this.hpBar, this.rangeCircle].forEach(o => o.destroy());
  }
}
