# Return of the GPT — MOBA 1v1

## Lancer en local

**Terminal 1 — serveur :**
```
cd server
npm run dev
```

**Terminal 2 — client :**
```
cd client
npm run dev
```

Ouvre `http://localhost:5173` dans deux onglets (ou deux PC sur le même réseau).

## Jouer en ligne (hébergement)

Pour jouer avec un pote à distance, il faut exposer le serveur.
Option simple : **ngrok** (gratuit pour tester)
```
ngrok http 3001
```
Copie l'URL ngrok dans `client/.env` :
```
VITE_SERVER_URL=https://xxxx.ngrok-free.app
```
Puis rebuilder le client : `npm run build` et serve le dossier `dist/`.

## Contrôles

| Touche | Action |
|--------|--------|
| ← → (flèches) | Déplacer gauche/droite |
| ↑ ↓ (flèches) | Déplacer haut/bas |
| A / D | Idem |
| Clic droit | Attaque de base (vers le curseur) |
| Q | Capacité 1 |
| E | Capacité 2 |

## Héros

### Garok (Warrior)
- 700 HP, attaque courte portée
- **Q — Charge** : fonce vers le curseur, dégâts à l'arrivée
- **E — Parry** : bloque les dégâts pendant 1.5s

### Syra (Mage)
- 500 HP, attaque longue portée (projectile)
- **Q — Fireball** : gros projectile infligeant 180 dégâts
- **E — Blink** : téléportation instantanée vers le curseur
