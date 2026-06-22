const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// --- Security and Authentication Imports ---
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Middleware to parse JSON bodies from frontend login forms ---
app.use(express.json());

// Serve game files to the browser
app.use(express.static(__dirname));

// --- Temporary In-Memory Database & Secret Key ---
let users = []; 
const JWT_SECRET = "super-secret-tank-key-123";

// ==========================================
// AUTHENTICATION API ROUTES
// ==========================================

// ROUTE A: Register a new account
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }

        const userExists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userExists) {
            return res.status(400).json({ message: "Username already taken!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Math.random().toString(36).substring(2, 9),
            username: username,
            password: hashedPassword,
            stats: { wins: 0, losses: 0, xp: 0, level: 1 }
        };

        users.push(newUser);
        console.log(`🆕 Account created for: ${username}`);
        
        res.status(201).json({ message: "Registration successful!" });
    } catch (error) {
        res.status(500).json({ message: "Server error during registration" });
    }
});

// ROUTE B: Log into an existing account
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`🔓 ${user.username} logged in successfully.`);

        res.json({
            token: token,
            user: {
                username: user.username,
                stats: user.stats
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error during login" });
    }
});

// ==========================================
// MULTIPLAYER SOCKET.IO LOGIC (TEAM EXPANSION)
// ==========================================

let activeGames = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Send games list immediately to new connections
    socket.emit('updateGamesList', activeGames);

    // --- LOBBY CREATION & JOINING ---
    socket.on('createGame', (requestedMode = '2v2') => {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        let max = 4;
        if (requestedMode === '1v1') max = 2;
        if (requestedMode === '3v3') max = 6;

        activeGames[gameId] = { 
            id: gameId, 
            host: socket.id, 
            status: 'WAITING',
            mode: requestedMode,
            maxPlayers: max,
            players: [ 
                { id: socket.id, team: 1, isHost: true, isReady: false, selection: 0 } 
            ]
        };
        
        socket.join(gameId);
        socket.emit('gameCreated', activeGames[gameId]);
        io.emit('updateGamesList', activeGames);
    });

    socket.on('joinGame', (gameId) => {
        const game = activeGames[gameId];
        
        if (game && game.players.length < game.maxPlayers && game.status !== 'IN PROGRESS') {
            // Auto-balance teams based on current counts
            let t1Count = game.players.filter(p => p.team === 1).length;
            let t2Count = game.players.filter(p => p.team === 2).length;
            let assignedTeam = (t1Count <= t2Count) ? 1 : 2;

            const newPlayer = { id: socket.id, team: assignedTeam, isHost: false, isReady: false, selection: 5 };
            game.players.push(newPlayer);
            socket.join(gameId);
            
            if (game.players.length >= game.maxPlayers) {
                game.status = 'FULL';
            }

            io.to(gameId).emit('lobbyUpdate', game);
            socket.emit('gameJoined', game);
            io.emit('updateGamesList', activeGames);
        }
    });

    // --- LOBBY MANAGEMENT CONTROLS ---
    socket.on('changeMode', (data) => {
        // data = { roomId, mode: '2v2' | '3v3' | '1v1' }
        const game = activeGames[data.roomId];
        if (game && game.host === socket.id) {
            game.mode = data.mode;
            game.maxPlayers = data.mode === '3v3' ? 6 : (data.mode === '2v2' ? 4 : 2);
            game.status = game.players.length >= game.maxPlayers ? 'FULL' : 'WAITING';
            
            // Re-verify team assignments if maximum capacities shrunk
            io.to(data.roomId).emit('lobbyUpdate', game);
            io.emit('updateGamesList', activeGames);
        }
    });

    socket.on('changeTeam', (data) => {
        // data = { roomId, team: 1 | 2 }
        const game = activeGames[data.roomId];
        if (game) {
            let player = game.players.find(p => p.id === socket.id);
            if (player) {
                player.team = data.team;
                io.to(data.roomId).emit('lobbyUpdate', game);
            }
        }
    });

    socket.on('updatePlayerState', (data) => {
        // data = { roomId, selection: INT, isReady: BOOL }
        const game = activeGames[data.roomId];
        if (game) {
            let player = game.players.find(p => p.id === socket.id);
            if (player) {
                if (data.selection !== undefined) player.selection = data.selection;
                if (data.isReady !== undefined) player.isReady = data.isReady;
                io.to(data.roomId).emit('lobbyUpdate', game);
            }
        }
    });

    socket.on('launchGame', (roomId) => {
        const game = activeGames[roomId];
        if (game) {
            game.status = 'IN PROGRESS';
            io.to(roomId).emit('startGame', game);
            io.emit('updateGamesList', activeGames);
        }
    });

    socket.on('syncSelection', (data) => { 
        socket.to(data.roomId).emit('updateSelection', data); 
    });
    
    socket.on('requestSync', (roomId) => { 
        if(activeGames[roomId]) io.to(activeGames[roomId].host).emit('forceSync'); 
    });

    // --- LIVE MULTIPLAYER GAMEPLAY RELAY CHANNELS ---
    socket.on('playerUpdate', (data) => { socket.to(data.roomId).emit('playerUpdate', data); });
    socket.on('playerShoot', (data) => { socket.to(data.roomId).emit('playerShoot', data); });
    socket.on('playerHazard', (data) => { socket.to(data.roomId).emit('playerHazard', data); });
    socket.on('matchDeath', (data) => { socket.to(data.roomId).emit('matchDeath', data); });
    socket.on('directHit', (data) => { socket.to(data.roomId).emit('directHit', data); });

    // --- DISCONNECT & ROOM CLEANUP LOGIC ---
    socket.on('disconnect', () => {
        for (let gameId in activeGames) {
            let game = activeGames[gameId];
            let playerIndex = game.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                if (game.host === socket.id) {
                    // Host disconnected: completely terminate the game lobby
                    delete activeGames[gameId];
                    io.to(gameId).emit('hostLeft'); 
                } else {
                    // Client disconnected: purge them from player index arrays and reopen slot
                    game.players.splice(playerIndex, 1);
                    game.status = 'WAITING'; 
                    io.to(gameId).emit('lobbyUpdate', game);
                }
                io.emit('updateGamesList', activeGames);
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Warzone Server running on http://localhost:3000');
});
