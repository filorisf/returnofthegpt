export const MAP = {
  WIDTH: 3200,
  HEIGHT: 2000,
};

// Diagonal lane: bottom-left (blue) → top-right (red)
const _START = { x: 220, y: 1780 };
const _END   = { x: 2980, y: 220 };
const _LDX = _END.x - _START.x;
const _LDY = _END.y - _START.y;
const _LLEN = Math.sqrt(_LDX * _LDX + _LDY * _LDY); // ~3224

export const LANE = {
  START:  _START,
  END:    _END,
  DIR:    { x: _LDX / _LLEN, y: _LDY / _LLEN },
  PERP:   { x: -_LDY / _LLEN, y: _LDX / _LLEN }, // perpendicular (rotated 90°)
  LENGTH: _LLEN,
  WIDTH:  240,
};

// World position at distance t along lane from START
export function lanePoint(t) {
  return {
    x: LANE.START.x + t * LANE.DIR.x,
    y: LANE.START.y + t * LANE.DIR.y,
  };
}

// Clamps a world point to within the lane corridor
export function clampToLane(px, py, marginT = 80) {
  const dx = px - LANE.START.x;
  const dy = py - LANE.START.y;
  const t = dx * LANE.DIR.x + dy * LANE.DIR.y;
  const tc = Math.max(marginT, Math.min(LANE.LENGTH - marginT, t));
  const cx = LANE.START.x + tc * LANE.DIR.x;
  const cy = LANE.START.y + tc * LANE.DIR.y;
  const ox = px - cx, oy = py - cy;
  const perp = Math.sqrt(ox * ox + oy * oy);
  const maxP = LANE.WIDTH / 2;
  if (perp > maxP && perp > 0) {
    return { x: cx + (ox / perp) * maxP, y: cy + (oy / perp) * maxP };
  }
  return { x: px, y: py };
}

export const GAME = {
  TICK_RATE: 20,
  TICK_MS: 50,
};

export const MINIONS = {
  SPAWN_INTERVAL_MS: 30000,
  SPEED: 80,
  HP: 200,
  DAMAGE: 15,
  ATTACK_RANGE: 60,
  ATTACK_COOLDOWN_MS: 1000,
  AGGRO_RANGE: 120,
};

export const TOWERS = {
  HP: 1500,
  DAMAGE: 80,
  RANGE: 220,
  ATTACK_COOLDOWN_MS: 1500,
};

export const NEXUS = {
  HP: 3000,
};

export const HEROES = {
  warrior: {
    id: 'warrior',
    name: 'Garok',
    hp: 700,
    speed: 200,
    attackDamage: 60,
    attackRange: 100,
    attackCooldownMs: 800,
    defense: 20,
    radius: 22,
    abilities: {
      Q: { name: 'Charge', cooldownMs: 8000, damage: 120, range: 380 },
      W: { name: 'Parry',  cooldownMs: 12000, duration: 1500 },
    },
  },
  mage: {
    id: 'mage',
    name: 'Syra',
    hp: 500,
    speed: 185,
    attackDamage: 35,
    attackRange: 250,
    attackCooldownMs: 1100,
    defense: 8,
    radius: 22,
    abilities: {
      Q: { name: 'Fireball', cooldownMs: 6000, damage: 180, range: 500, projectileSpeed: 500 },
      W: { name: 'Blink',    cooldownMs: 15000, range: 420 },
    },
  },
};
