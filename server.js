const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve your game files to the browser
app.use(express.static(__dirname));

let activeGames = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    socket.emit('updateGamesList', activeGames);

    socket.on('createGame', () => {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        activeGames[gameId] = { 
            id: gameId, 
            host: socket.id, 
            status: 'WAITING FOR PLAYER...' 
        };
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        io.emit('updateGamesList', activeGames);
    });

    socket.on('joinGame', (gameId) => {
        if (activeGames[gameId] && activeGames[gameId].status === 'WAITING FOR PLAYER...') {
            activeGames[gameId].status = 'IN PROGRESS';
            activeGames[gameId].client = socket.id;
            socket.join(gameId);
            io.to(activeGames[gameId].host).emit('playerJoined', socket.id);
            socket.emit('gameJoined', gameId);
            io.emit('updateGamesList', activeGames);
        }
    });

    socket.on('syncSelection', (data) => {
        socket.to(data.roomId).emit('updateSelection', data);
    });

    socket.on('requestSync', (roomId) => {
        if(activeGames[roomId]) {
            io.to(activeGames[roomId].host).emit('forceSync');
        }
    });

    socket.on('launchGame', (roomId) => {
        socket.to(roomId).emit('startGame');
    });

    // --- LIVE MULTIPLAYER RELAY CHANNELS ---
    socket.on('playerUpdate', (data) => {
        socket.to(data.roomId).emit('playerUpdate', data);
    });

    socket.on('playerShoot', (data) => {
        socket.to(data.roomId).emit('playerShoot', data);
    });

    socket.on('playerHazard', (data) => {
        socket.to(data.roomId).emit('playerHazard', data);
    });

    socket.on('matchDeath', (data) => {
        socket.to(data.roomId).emit('matchDeath', data);
    });

    // --- FIXED: Added the missing directHit channel ---
    socket.on('directHit', (data) => {
        socket.to(data.roomId).emit('directHit', data);
    });

    socket.on('disconnect', () => {
        for (let gameId in activeGames) {
            if (activeGames[gameId].host === socket.id) {
                delete activeGames[gameId];
                io.emit('updateGamesList', activeGames);
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Warzone Server running on http://localhost:3000');
});
