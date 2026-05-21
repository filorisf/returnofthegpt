const COLORS = { left: 0x2255ff, right: 0xff2222 };

export class ClientNexus {
  constructor(scene, data) {
    this.scene = scene;
    this.body = scene.add.rectangle(data.x, data.y, 56, 56, COLORS[data.side]).setDepth(2);
    this.body.setStrokeStyle(3, 0xffffff);
    this.label = scene.add.text(data.x, data.y, data.side === 'left' ? 'N' : 'N', {
      fontSize: '24px', fontFamily: 'monospace', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);
    this.hpBarBg = scene.add.rectangle(data.x, data.y + 38, 60, 6, 0x330000).setDepth(3);
    this.hpBar = scene.add.rectangle(data.x - 30, data.y + 38, 60, 6, 0x00aaff).setOrigin(0, 0.5).setDepth(4);
  }

  applyState(s) {
    const pct = s.hp / s.maxHp;
    this.hpBar.setSize(Math.max(0, 60 * pct), 6);
    this.hpBar.setFillStyle(pct > 0.5 ? 0x00aaff : pct > 0.25 ? 0xeeaa00 : 0xee2200);
    this.body.setVisible(s.hp > 0);
    this.label.setVisible(s.hp > 0);
  }

  destroy() {
    [this.body, this.label, this.hpBarBg, this.hpBar].forEach(o => o.destroy());
  }
}
