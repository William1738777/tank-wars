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

    // Send the list of games to the player who just clicked "Online Multiplayer"
    socket.emit('updateGamesList', activeGames);

    // When a player clicks "Create Game"
    socket.on('createGame', () => {
        // Generate a random 6-character room code
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        activeGames[gameId] = { 
            id: gameId, 
            host: socket.id, 
            status: 'WAITING FOR PLAYER...' 
        };
        
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        
        // Broadcast the new game to everyone sitting in the lobby
        io.emit('updateGamesList', activeGames);
    });

    // When a player clicks "Join" on a listed game
    socket.on('joinGame', (gameId) => {
        if (activeGames[gameId] && activeGames[gameId].status === 'WAITING FOR PLAYER...') {
            activeGames[gameId].status = 'IN PROGRESS';
            activeGames[gameId].client = socket.id;
            socket.join(gameId);
            
            // Tell the Host that someone joined!
            io.to(activeGames[gameId].host).emit('playerJoined', socket.id);
            // Tell the Joiner they successfully connected
            socket.emit('gameJoined', gameId);
            
            // Update the lobby list so no one else tries to join this full room
            io.emit('updateGamesList', activeGames);
        }
    });

    // Clean up rooms if the host closes their browser
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
