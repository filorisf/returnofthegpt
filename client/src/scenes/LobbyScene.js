import { io } from 'socket.io-client';
import { HEROES } from '../../../shared/constants.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  create() {
    this.socket = io(SERVER_URL);
    this.selectedHero = 'warrior';
    this.keyLayout = 'azerty';

    this._buildUI();
    this._setupSocketEvents();
  }

  _buildUI() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Title
    this.add.text(W / 2, 80, 'RETURN OF THE GPT', {
      fontSize: '42px', fontFamily: 'monospace', color: '#e0c060', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, 135, '— 1v1 Lane —', {
      fontSize: '18px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(0.5);

    // Hero select
    this.add.text(W / 2, 210, 'Choisis ton héros', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ccc',
    }).setOrigin(0.5);

    this._heroButtons = {};
    const heroes = Object.values(HEROES);
    heroes.forEach((hero, i) => {
      const x = W / 2 + (i - (heroes.length - 1) / 2) * 200;
      const btn = this._makeHeroCard(x, 310, hero);
      this._heroButtons[hero.id] = btn;
    });
    this._selectHero('warrior');

    // Keyboard layout selector
    this.add.text(W / 2, 420, 'Clavier', {
      fontSize: '13px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5);
    this._layoutBtns = {};
    ['AZERTY', 'QWERTY'].forEach((layout, i) => {
      const x = W / 2 + (i - 0.5) * 130;
      const bg = this.add.rectangle(x, 448, 110, 34, 0x1a2233)
        .setStrokeStyle(2, 0x334466).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(x, 448, layout, {
        fontSize: '14px', fontFamily: 'monospace', color: '#aaa',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this._selectLayout(layout.toLowerCase()));
      this._layoutBtns[layout.toLowerCase()] = { bg, lbl };
    });
    this._selectLayout('azerty');

    // Room code display (shows code after room creation)
    this._codeDisplay = this.add.text(W / 2, 510, '', {
      fontSize: '32px', fontFamily: 'monospace', color: '#e0c060', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buttons
    this._btnCreate = this._makeButton(W / 2 - 140, 590, 'Créer une room', () => this._createRoom());
    this._btnJoin = this._makeButton(W / 2 + 140, 590, 'Rejoindre', () => this._showJoinPanel());

    // Join panel (hidden HTML overlay)
    this._joinPanel = this._createJoinPanel();

    // Status text
    this._status = this.add.text(W / 2, 655, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#88cc88',
    }).setOrigin(0.5);

    this._errorText = this.add.text(W / 2, 685, '', {
      fontSize: '15px', fontFamily: 'monospace', color: '#e06060',
    }).setOrigin(0.5);
  }

  _makeHeroCard(x, y, hero) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 160, 160, 0x222244).setInteractive({ useHandCursor: true });
    const border = this.add.rectangle(0, 0, 160, 160).setStrokeStyle(2, 0x4444aa);
    const name = this.add.text(0, -50, hero.name, { fontSize: '20px', fontFamily: 'monospace', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const hpText = this.add.text(0, -15, `HP: ${hero.hp}`, { fontSize: '13px', fontFamily: 'monospace', color: '#88ff88' }).setOrigin(0.5);
    const dmgText = this.add.text(0, 5, `DMG: ${hero.attackDamage}`, { fontSize: '13px', fontFamily: 'monospace', color: '#ff8888' }).setOrigin(0.5);
    const q = this.add.text(0, 30, `Q: ${hero.abilities.Q.name}`, { fontSize: '12px', fontFamily: 'monospace', color: '#aaa' }).setOrigin(0.5);
    const w = this.add.text(0, 48, `W: ${hero.abilities.W.name}`, { fontSize: '12px', fontFamily: 'monospace', color: '#aaa' }).setOrigin(0.5);

    container.add([bg, border, name, hpText, dmgText, q, w]);
    bg.on('pointerdown', () => this._selectHero(hero.id));
    container._border = border;
    container._heroId = hero.id;
    return container;
  }

  _selectHero(heroId) {
    this.selectedHero = heroId;
    Object.values(this._heroButtons).forEach(btn => {
      btn._border.setStrokeStyle(2, btn._heroId === heroId ? 0xe0c060 : 0x4444aa);
    });
  }

  _selectLayout(layout) {
    this.keyLayout = layout;
    Object.entries(this._layoutBtns).forEach(([k, { bg, lbl }]) => {
      const active = k === layout;
      bg.setStrokeStyle(2, active ? 0xe0c060 : 0x334466);
      lbl.setColor(active ? '#e0c060' : '#aaa');
    });
  }

  _makeButton(x, y, label, onClick) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 220, 50, 0x334466).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, { fontSize: '16px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5);
    btn.add([bg, text]);
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0x4466aa));
    bg.on('pointerout', () => bg.setFillStyle(0x334466));
    return btn;
  }

  _createJoinPanel() {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      display: 'none',
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#111222',
      border: '2px solid #4466aa',
      borderRadius: '8px',
      padding: '32px 40px',
      textAlign: 'center',
      zIndex: '999',
      fontFamily: 'monospace',
      color: '#fff',
      minWidth: '320px',
    });

    panel.innerHTML = `
      <div style="font-size:18px;margin-bottom:16px;color:#aaa;">Entre le code de room</div>
      <input id="rotg-code-input" maxlength="4" autocomplete="off" spellcheck="false"
        style="font-size:36px;width:130px;text-align:center;text-transform:uppercase;
               background:#222244;color:#e0c060;border:2px solid #4466aa;
               border-radius:4px;padding:8px;letter-spacing:8px;outline:none;font-family:monospace;" />
      <div style="margin-top:20px;display:flex;gap:12px;justify-content:center;">
        <button id="rotg-join-btn"
          style="padding:10px 28px;font-size:16px;font-family:monospace;
                 background:#334466;color:#fff;border:none;border-radius:4px;cursor:pointer;">
          Rejoindre
        </button>
        <button id="rotg-cancel-btn"
          style="padding:10px 28px;font-size:16px;font-family:monospace;
                 background:#332222;color:#aaa;border:none;border-radius:4px;cursor:pointer;">
          Annuler
        </button>
      </div>
      <div id="rotg-join-error" style="color:#e06060;margin-top:12px;font-size:14px;"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#rotg-join-btn').addEventListener('click', () => this._doJoin());
    panel.querySelector('#rotg-cancel-btn').addEventListener('click', () => this._hideJoinPanel());
    panel.querySelector('#rotg-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._doJoin();
      if (e.key === 'Escape') this._hideJoinPanel();
    });

    return panel;
  }

  _showJoinPanel() {
    this._errorText.setText('');
    this._joinPanel.style.display = 'block';
    this._joinPanel.querySelector('#rotg-code-input').value = '';
    this._joinPanel.querySelector('#rotg-join-error').textContent = '';
    setTimeout(() => this._joinPanel.querySelector('#rotg-code-input').focus(), 50);
  }

  _hideJoinPanel() {
    this._joinPanel.style.display = 'none';
  }

  _createRoom() {
    this._errorText.setText('');
    this.socket.emit('create_room', { heroId: this.selectedHero });
    this._status.setText('Room créée, en attente du 2ème joueur...');
  }

  _doJoin() {
    const code = this._joinPanel.querySelector('#rotg-code-input').value.trim().toUpperCase();
    if (code.length < 4) {
      this._joinPanel.querySelector('#rotg-join-error').textContent = 'Code à 4 caractères requis';
      return;
    }
    this._hideJoinPanel();
    this.socket.emit('join_room', { code, heroId: this.selectedHero });
  }

  _showCodeBanner(code) {
    if (this._codeBanner) this._codeBanner.remove();
    const banner = document.createElement('div');
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      background: '#111222',
      border: '2px solid #e0c060',
      borderRadius: '8px',
      padding: '16px 36px',
      textAlign: 'center',
      zIndex: '999',
      fontFamily: 'monospace',
      color: '#fff',
      pointerEvents: 'none',
    });
    banner.innerHTML = `
      <div style="font-size:13px;color:#aaa;margin-bottom:6px;">Code de ta room — partage-le à ton pote !</div>
      <div style="font-size:42px;font-weight:bold;color:#e0c060;letter-spacing:10px;">${code}</div>
      <div style="font-size:12px;color:#555;margin-top:6px;">En attente du 2ème joueur...</div>
    `;
    document.body.appendChild(banner);
    this._codeBanner = banner;
  }

  _setupSocketEvents() {
    this.socket.on('room_created', ({ code }) => {
      this._showCodeBanner(code);
    });

    this.socket.on('joined', (data) => {
      this._lobbyData = data;
    });

    this.socket.on('game_start', (state) => {
      this._joinPanel.remove();
      if (this._codeBanner) { this._codeBanner.remove(); this._codeBanner = null; }
      this.scene.start('GameScene', { socket: this.socket, ...this._lobbyData, initialState: state, layout: this.keyLayout });
    });

    this.socket.on('error', ({ msg }) => {
      this._errorText.setText(msg);
    });
  }
}
