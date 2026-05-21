import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameRoom } from './game/GameRoom.js';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function findRoom(socketId) {
  return [...rooms.values()].find(r => r.hasPlayer(socketId));
}

io.on('connection', (socket) => {
  console.log('connect', socket.id);

  socket.on('create_room', ({ heroId }) => {
    const code = generateCode();
    const room = new GameRoom(code, io);
    rooms.set(code, room);
    room.addPlayer(socket, heroId, 'left');
    socket.join(code);
    socket.emit('room_created', { code });
    console.log(`Room ${code} created`);
  });

  socket.on('join_room', ({ code, heroId }) => {
    const room = rooms.get(code.toUpperCase());
    if (!room) return socket.emit('error', { msg: 'Room not found' });
    if (room.isFull()) return socket.emit('error', { msg: 'Room is full' });
    room.addPlayer(socket, heroId, 'right');
    socket.join(code.toUpperCase());
    room.start();
  });

  socket.on('move_to', ({ x, y }) => {
    const room = findRoom(socket.id);
    if (room) room.handleMoveTarget(socket.id, x, y);
  });

  socket.on('ability', ({ key, targetX, targetY }) => {
    const room = findRoom(socket.id);
    if (room) room.handleAbility(socket.id, key, targetX, targetY);
  });

  socket.on('attack', ({ targetX, targetY }) => {
    const room = findRoom(socket.id);
    if (room) room.handleAttack(socket.id, targetX, targetY);
  });

  socket.on('disconnect', () => {
    const room = findRoom(socket.id);
    if (room) {
      room.handleDisconnect(socket.id);
      if (room.isEmpty()) {
        rooms.delete(room.code);
        console.log(`Room ${room.code} deleted`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
