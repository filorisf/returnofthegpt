import { HEROES } from '../../../shared/constants.js';

const BAR_H = 110;

export class HUDScene extends Phaser.Scene {
  constructor() { super('HUDScene'); }

  init(data) {
    this.mySide     = data.side;
    this.heroConfig = HEROES[data.heroId] ?? HEROES.warrior;
    this.layout     = data.layout ?? 'azerty';
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const Y0 = H - BAR_H;

    // Background panel
    this.add.rectangle(W / 2, H - BAR_H / 2, W, BAR_H, 0x07090f, 0.96).setDepth(20);
    this.add.rectangle(W / 2, Y0, W, 2, 0x223355).setDepth(20);

    // ── LEFT: hero identity + HP + stats ─────────────────────────────
    const sideColor = this.mySide === 'left' ? 0x4488ff : 0xff4444;
    const sideHex   = this.mySide === 'left' ? '#4488ff' : '#ff4444';

    this.add.circle(26, Y0 + 22, 10, sideColor).setDepth(21);
    this.add.text(42, Y0 + 12, this.heroConfig.name.toUpperCase(), {
      fontSize: '17px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setDepth(21);
    this.add.text(42, Y0 + 32, this.mySide === 'left' ? 'BLEU' : 'ROUGE', {
      fontSize: '11px', fontFamily: 'monospace', color: sideHex,
    }).setDepth(21);

    // HP bar
    const HP_W = 260, HP_X = 20, HP_Y = Y0 + 58;
    this.add.rectangle(HP_X + HP_W / 2, HP_Y, HP_W, 14, 0x1a0000).setDepth(21);
    this._hpFill = this.add.rectangle(HP_X, HP_Y, HP_W, 14, 0x00dd44)
      .setOrigin(0, 0.5).setDepth(22);
    this._hpText = this.add.text(HP_X + HP_W / 2, HP_Y, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0.5).setDepth(23);
    this._HP_W = HP_W;

    // Stats row
    const sY = Y0 + 80;
    const stats = [
      ['ATK', '#886644', `${this.heroConfig.attackDamage}`,  '#ffaa66', 0],
      ['DEF', '#446688', `${this.heroConfig.defense ?? 0}`,  '#66aaff', 70],
      ['VIT', '#446644', `${this.heroConfig.speed}`,         '#88ff88', 140],
      ['PRT', '#664466', `${this.heroConfig.attackRange}`,   '#dd88ff', 220],
    ];
    stats.forEach(([label, lc, val, vc, ox]) => {
      this.add.text(HP_X + ox,      sY, label, { fontSize: '10px', fontFamily: 'monospace', color: lc }).setDepth(21);
      this.add.text(HP_X + ox + 26, sY, val,   { fontSize: '10px', fontFamily: 'monospace', color: vc, fontStyle: 'bold' }).setDepth(21);
    });

    // ── CENTER: ability boxes ────────────────────────────────────────
    const cx = W / 2;
    const [k1, k2] = this.layout === 'azerty' ? ['A', 'Z'] : ['Q', 'W'];
    this.add.text(cx, Y0 + 8, 'CAPACITÉS', {
      fontSize: '10px', fontFamily: 'monospace', color: '#334466',
    }).setOrigin(0.5).setDepth(21);
    this._qBox = this._abilityBox(cx - 68, Y0 + 55, k1, this.heroConfig.abilities.Q);
    this._eBox = this._abilityBox(cx + 68, Y0 + 55, k2, this.heroConfig.abilities.W);

    // ── RIGHT: keybind hints ─────────────────────────────────────────
    [`Clic droit  → déplacer`, `Clic gauche → attaquer`, `${k1} / ${k2}       → capacités`]
      .forEach((h, i) => {
        this.add.text(W - 14, Y0 + 18 + i * 18, h, {
          fontSize: '11px', fontFamily: 'monospace', color: '#2a3a4a',
        }).setOrigin(1, 0).setDepth(21);
      });

    // Receive state from GameScene via events
    this.scene.get('GameScene').events.on('heroState', this._onHeroState, this);
  }

  _abilityBox(x, y, key, ability) {
    const BW = 118, BH = 86;
    this.add.rectangle(x, y, BW, BH, 0x111a2e).setStrokeStyle(1, 0x2a3a5a).setDepth(20);
    const overlay = this.add.rectangle(x, y, BW, BH, 0x000000, 0).setDepth(22);

    this.add.rectangle(x - BW / 2 + 14, y - BH / 2 + 10, 22, 18, 0x1e3060).setDepth(21);
    this.add.text(x - BW / 2 + 14, y - BH / 2 + 10, key, {
      fontSize: '13px', fontFamily: 'monospace', color: '#e0c060', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);
    this.add.text(x + 6, y - BH / 2 + 10, ability.name, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ccddff', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(21);

    const cdSec = (ability.cooldownMs / 1000).toFixed(0);
    const desc = ability.damage
      ? `DMG ${ability.damage}  CD ${cdSec}s`
      : ability.duration
        ? `Durée ${(ability.duration / 1000).toFixed(1)}s  CD ${cdSec}s`
        : `Portée ${ability.range ?? '—'}  CD ${cdSec}s`;
    this.add.text(x, y + 6, desc, {
      fontSize: '10px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setDepth(21);

    const cdNum  = this.add.text(x, y + 26, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ff6666', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(23);
    const ready  = this.add.text(x, y + 28, 'PRÊT', {
      fontSize: '11px', fontFamily: 'monospace', color: '#44cc88',
    }).setOrigin(0.5).setDepth(23);

    return { overlay, cdNum, ready };
  }

  _onHeroState(s) {
    const pct = Math.max(0, s.hp / s.maxHp);
    this._hpFill.setSize(this._HP_W * pct, 14);
    this._hpFill.setFillStyle(pct > 0.5 ? 0x00dd44 : pct > 0.25 ? 0xddaa00 : 0xdd2200);
    this._hpText.setText(`${s.hp} / ${s.maxHp} HP`);
    this._applyCD(this._qBox, s.abilityCooldowns?.Q ?? 0);
    this._applyCD(this._eBox, s.abilityCooldowns?.W ?? 0);
  }

  _applyCD(box, cd) {
    if (cd > 0) {
      box.overlay.setAlpha(0.55);
      box.cdNum.setText(`${cd}s`).setVisible(true);
      box.ready.setVisible(false);
    } else {
      box.overlay.setAlpha(0);
      box.cdNum.setVisible(false);
      box.ready.setVisible(true);
    }
  }

  shutdown() {
    const gs = this.scene.get('GameScene');
    if (gs?.events) gs.events.off('heroState', this._onHeroState, this);
  }
}
