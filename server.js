const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// --- NEW: Security and Authentication Imports ---
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- NEW: Middleware to parse JSON bodies from frontend login forms ---
app.use(express.json());

// Serve your game files to the browser
app.use(express.static(__dirname));

// --- NEW: Temporary In-Memory Database & Secret Key ---
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
// MULTIPLAYER SOCKET.IO LOGIC
// ==========================================

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

    // --- FIXED: The missing directHit channel ---
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
