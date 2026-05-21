import { HEROES } from '../../../shared/constants.js';

const BAR_H = 110;

export class HUD {
  constructor(scene, mySide, heroId) {
    this.scene = scene;
    this.heroConfig = HEROES[heroId] ?? HEROES.warrior;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const Y0 = H - BAR_H; // top of HUD bar

    // ── Background panel ──────────────────────────────────────────────
    scene.add.rectangle(W / 2, H - BAR_H / 2, W, BAR_H, 0x07090f, 0.96)
      .setScrollFactor(0).setDepth(20);
    scene.add.rectangle(W / 2, Y0, W, 2, 0x223355)
      .setScrollFactor(0).setDepth(20);

    // ── LEFT: hero identity + HP + stats ─────────────────────────────
    const sideColor = mySide === 'left' ? 0x4488ff : 0xff4444;
    const sideHex   = mySide === 'left' ? '#4488ff' : '#ff4444';

    // Hero dot + name
    scene.add.circle(26, Y0 + 22, 10, sideColor)
      .setScrollFactor(0).setDepth(21);
    scene.add.text(42, Y0 + 12, this.heroConfig.name.toUpperCase(), {
      fontSize: '17px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(21);
    scene.add.text(42, Y0 + 32, mySide === 'left' ? 'BLEU' : 'ROUGE', {
      fontSize: '11px', fontFamily: 'monospace', color: sideHex,
    }).setScrollFactor(0).setDepth(21);

    // HP bar
    const HP_W = 260, HP_X = 20, HP_Y = Y0 + 58;
    scene.add.rectangle(HP_X + HP_W / 2, HP_Y, HP_W, 14, 0x1a0000)
      .setScrollFactor(0).setDepth(21);
    this._hpFill = scene.add.rectangle(HP_X, HP_Y, HP_W, 14, 0x00dd44)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this._hpText = scene.add.text(HP_X + HP_W / 2, HP_Y, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23);
    this._HP_W = HP_W;

    // Stats row
    const statsY = Y0 + 80;
    scene.add.text(HP_X, statsY, 'ATK', {
      fontSize: '10px', fontFamily: 'monospace', color: '#886644',
    }).setScrollFactor(0).setDepth(21);
    this._atkVal = scene.add.text(HP_X + 26, statsY, `${this.heroConfig.attackDamage}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffaa66', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(21);

    scene.add.text(HP_X + 70, statsY, 'DEF', {
      fontSize: '10px', fontFamily: 'monospace', color: '#446688',
    }).setScrollFactor(0).setDepth(21);
    scene.add.text(HP_X + 96, statsY, `${this.heroConfig.defense ?? 0}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#66aaff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(21);

    scene.add.text(HP_X + 140, statsY, 'VIT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#446644',
    }).setScrollFactor(0).setDepth(21);
    scene.add.text(HP_X + 166, statsY, `${this.heroConfig.speed}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#88ff88', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(21);

    scene.add.text(HP_X + 220, statsY, 'PRT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#664466',
    }).setScrollFactor(0).setDepth(21);
    scene.add.text(HP_X + 246, statsY, `${this.heroConfig.attackRange}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#dd88ff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(21);

    // ── CENTER: ability boxes ────────────────────────────────────────
    const cx = W / 2;
    this._qBox = this._makeAbilityBox(scene, cx - 68, Y0 + 55, 'Q', this.heroConfig.abilities.Q);
    this._eBox = this._makeAbilityBox(scene, cx + 68, Y0 + 55, 'E', this.heroConfig.abilities.W);

    // Center label
    scene.add.text(cx, Y0 + 8, 'CAPACITÉS', {
      fontSize: '10px', fontFamily: 'monospace', color: '#334466',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    // ── RIGHT: keybinds hint ─────────────────────────────────────────
    const hints = [
      'Clic droit  → déplacer',
      'Clic gauche → attaquer',
      'Q / E       → capacités',
    ];
    hints.forEach((h, i) => {
      scene.add.text(W - 14, Y0 + 18 + i * 18, h, {
        fontSize: '11px', fontFamily: 'monospace', color: '#2a3a4a',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(21);
    });
  }

  _makeAbilityBox(scene, x, y, key, ability) {
    const W = 118, H = 86;

    // Border / bg
    const bg = scene.add.rectangle(x, y, W, H, 0x111a2e)
      .setStrokeStyle(1, 0x2a3a5a).setScrollFactor(0).setDepth(20);

    // Cooldown overlay (full-height darkening)
    const overlay = scene.add.rectangle(x, y, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(22);

    // Key badge (top-left corner)
    scene.add.rectangle(x - W / 2 + 14, y - H / 2 + 10, 22, 18, 0x1e3060)
      .setScrollFactor(0).setDepth(21);
    scene.add.text(x - W / 2 + 14, y - H / 2 + 10, key, {
      fontSize: '13px', fontFamily: 'monospace', color: '#e0c060', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22);

    // Ability name
    const nameText = scene.add.text(x + 6, y - H / 2 + 10, ability.name, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ccddff', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);

    // Ability description (cooldown / range)
    const cdSec = (ability.cooldownMs / 1000).toFixed(0);
    const desc = ability.damage
      ? `DMG ${ability.damage}  CD ${cdSec}s`
      : ability.duration
        ? `Durée ${(ability.duration / 1000).toFixed(1)}s  CD ${cdSec}s`
        : `Portée ${ability.range ?? '—'}  CD ${cdSec}s`;

    scene.add.text(x, y + 6, desc, {
      fontSize: '10px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    // Cooldown countdown (center, big)
    const cdNum = scene.add.text(x, y + 26, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ff6666', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23);

    // Ready indicator
    const ready = scene.add.text(x, y + 28, 'PRÊT', {
      fontSize: '11px', fontFamily: 'monospace', color: '#44cc88',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23);

    return { bg, overlay, cdNum, ready };
  }

  update(heroState) {
    if (!heroState) return;

    // HP bar
    const pct = Math.max(0, heroState.hp / heroState.maxHp);
    this._hpFill.setSize(this._HP_W * pct, 14);
    this._hpFill.setFillStyle(pct > 0.5 ? 0x00dd44 : pct > 0.25 ? 0xddaa00 : 0xdd2200);
    this._hpText.setText(`${heroState.hp} / ${heroState.maxHp} HP`);

    // Abilities
    this._updateAbility(this._qBox, heroState.abilityCooldowns?.Q ?? 0);
    this._updateAbility(this._eBox, heroState.abilityCooldowns?.W ?? 0);
  }

  _updateAbility(box, cd) {
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
}
