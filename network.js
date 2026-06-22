// Initialize Socket.io
const socket = io();

// UI Elements
const btnOnline = document.getElementById('btn-online'); 
const lobbyScreen = document.getElementById('lobby-screen');
const selectScreen = document.getElementById('select-screen');
const mainMenu = document.getElementById('main-menu'); 
const gamesList = document.getElementById('games-list');
const btnLobbyBack = document.getElementById('btn-lobby-back');
const btnLobbyCreate = document.getElementById('btn-lobby-create');
const roomCodeDisplay = document.getElementById('room-code-display');

// ==========================================
// AUTHENTICATION & LOGIN LOGIC
// ==========================================
const authScreen = document.getElementById('auth-screen');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authMessage = document.getElementById('auth-message');

// Handle Register Button
document.getElementById('btn-register').addEventListener('click', async () => {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authMessage.style.color = '#00aaff';
            authMessage.innerText = "Registered! You can now log in.";
        } else {
            authMessage.style.color = '#ff3333';
            authMessage.innerText = data.message;
        }
    } catch (err) {
        authMessage.innerText = "Server connection error.";
    }
});

// Handle Login Button
document.getElementById('btn-login').addEventListener('click', async () => {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('tank_token', data.token);
            localStorage.setItem('tank_username', data.user.username);
            
            authScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            
            socket.auth = { token: data.token };
            socket.disconnect().connect();
        } else {
            authMessage.style.color = '#ff3333';
            authMessage.innerText = data.message;
        }
    } catch (err) {
        authMessage.innerText = "Server connection error.";
    }
});

// Handle Guest Button
document.getElementById('btn-guest').addEventListener('click', () => {
    authScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// ==========================================
// MULTIPLAYER LOBBY LOGIC (TEAM BASED)
// ==========================================

// Global Network State
let isOnlineGame = false;
let isHost = false;
let myRoomCode = "";
let currentLobbyData = null; 
let myOwnerId = 1; 

// Registry to track bullet IDs and stop echoes
const seenCasts = new Set(); 

if (btnOnline) {
    btnOnline.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
    });
}

btnLobbyBack.addEventListener('click', () => {
    lobbyScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

socket.on('updateGamesList', (games) => {
    gamesList.innerHTML = ''; 
    let gameCount = 0;
    for (let id in games) {
        gameCount++;
        const game = games[id];
        const li = document.createElement('li');
        li.style.padding = "10px"; li.style.borderBottom = "1px solid #333";
        li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";
        
        let statusColor = game.status === 'IN PROGRESS' ? '#ff3333' : (game.status === 'FULL' ? '#ffaa00' : '#00ff66');
        let joinDisabled = (game.status === 'IN PROGRESS' || game.status === 'FULL') ? 'display:none;' : '';
        
        li.innerHTML = `
            <span>ROOM: <b>${game.id}</b> <span style="font-size:14px; color:#aaa;">(${game.mode})</span></span>
            <span><span style="color: ${statusColor}; font-size: 18px; margin-right: 15px;">${game.status}</span> <span style="font-size: 14px; color: #888;">${game.players.length}/${game.maxPlayers}</span></span>
            <button class="join-btn" data-id="${game.id}" style="padding: 10px 20px; background: #00ff66; cursor: pointer; border: none; font-weight: bold; ${joinDisabled}">JOIN</button>
        `;
        gamesList.appendChild(li);
    }
    if (gameCount === 0) {
        gamesList.innerHTML = '<li style="color: #777;">No active games found. Click "Create Game" to host one!</li>';
    }
    document.querySelectorAll('.join-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomId = e.target.getAttribute('data-id');
            socket.emit('joinGame', roomId);
        });
    });
});

btnLobbyCreate.addEventListener('click', () => {
    socket.emit('createGame', '2v2');
});

socket.on('gameCreated', (game) => {
    isOnlineGame = true; isHost = true; myRoomCode = game.id; currentLobbyData = game;
    lobbyScreen.classList.add('hidden'); 
    selectScreen.classList.remove('hidden');
    if (typeof updateLobbyUI === 'function') updateLobbyUI(game);
});

socket.on('gameJoined', (game) => {
    isOnlineGame = true; isHost = false; myRoomCode = game.id; currentLobbyData = game;
    lobbyScreen.classList.add('hidden'); 
    selectScreen.classList.remove('hidden');
    if (typeof updateLobbyUI === 'function') updateLobbyUI(game);
});

socket.on('lobbyUpdate', (game) => {
    currentLobbyData = game;
    
    // Auto-map switch logic based on mode toggle
    if (game.mode === '2v2' || game.mode === '3v3') {
        let wIdx = mapsData.findIndex(m => m.id === 'winter');
        if (wIdx !== -1) selectedMapIndex = wIdx;
    } else if (game.mode === '1v1') {
        let dIdx = mapsData.findIndex(m => m.id === 'dusk');
        if (dIdx !== -1) selectedMapIndex = dIdx;
    }

    // Immediately update the preview image in the UI to match
    if (typeof selectedMapIndex !== 'undefined' && mapsData[selectedMapIndex]) {
        const mapNameDisplay = document.getElementById('map-name');
        const minimapImage = document.getElementById('minimap-image');
        if (mapNameDisplay) {
            mapNameDisplay.innerText = 'MAP: ' + mapsData[selectedMapIndex].name;
        }
        if (minimapImage && images[mapsData[selectedMapIndex].bgImg]) {
            minimapImage.src = images[mapsData[selectedMapIndex].bgImg].src;
        }
    }

    if (typeof updateLobbyUI === 'function') updateLobbyUI(game);
});

socket.on('hostLeft', () => {
    alert("The Host disconnected. Returning to Main Menu.");
    location.reload();
});

socket.on('startGame', (game) => {
    currentLobbyData = game;
    
    const myPlayerIndex = game.players.findIndex(p => p.id === socket.id);
    myOwnerId = myPlayerIndex !== -1 ? myPlayerIndex + 1 : 1; 

    if (typeof startGame === 'function') startGame(); 
});

// ==========================================
// IN-GAME REAL-TIME SOCKET LISTENERS
// ==========================================

socket.on('playerUpdate', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING' || !players) return;
    
    let p = players.find(tank => tank.owner === data.owner);
    
    if (p && p.owner !== myOwnerId) { 
        p.x = data.x; 
        p.y = data.y; 
        p.angle = data.angle; 
        
        if (data.hp !== undefined) p.hp = data.hp;
        if (data.dashState !== undefined) p.dashState = data.dashState;
        if (data.fireShieldActive !== undefined) p.fireShieldActive = data.fireShieldActive;
        if (data.isGhosting !== undefined) p.isGhosting = data.isGhosting;
        if (data.zHeight !== undefined) p.zHeight = data.zHeight;
        if (data.zHeightActive !== undefined) p.zHeightActive = data.zHeightActive;
        
        if (data.knockupSource !== undefined) p.knockupSource = data.knockupSource;
        if (data.chronoIntercepted !== undefined) p.chronoIntercepted = data.chronoIntercepted;
    }
});

socket.on('directHit', (data) => {
    if (isHost && typeof players !== 'undefined') {
        let target = players.find(p => p.owner === data.targetId);
        if (target && !target.isDead && target.invulnTimer <= 0) {
            target.hp -= data.damage;
            if (typeof recordDamage === 'function') recordDamage(data.attackerId, data.damage, false, true);
        }
    }
});

socket.on('playerShoot', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING') return;
    
    if (seenCasts.has(data.castId)) return; 
    seenCasts.add(data.castId);

    if (typeof Projectile !== 'undefined' && typeof projectiles !== 'undefined') {
        projectiles.push(new Projectile(data.owner, data.x, data.y, data.angle, data.speed, data.radius, data.damage, data.color, data.type, data.bounces, data.castId, true));
    }
});

socket.on('playerHazard', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING' || typeof hazards === 'undefined') return;
    let h = data.hazard;
    h.fromNetwork = true; 
    hazards.push(h);
});

socket.on('matchDeath', (data) => {
    if (typeof handleNetworkDeath === 'function') {
        handleNetworkDeath(data);
    }
});

if (typeof Projectile !== 'undefined') {
    const OriginalProjectile = Projectile;
    Projectile = class extends OriginalProjectile {
        constructor(owner, x, y, angle, speed, radius, damage, color, type, bounces, castId = null, fromNetwork = false) {
            super(owner, x, y, angle, speed, radius, damage, color, type, bounces, castId);
            
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !fromNetwork) {
                if (owner === myOwnerId) {
                    seenCasts.add(this.castId); 
                    socket.emit('playerShoot', { roomId: myRoomCode, owner, x, y, angle, speed, radius, damage, color, type, bounces, castId: this.castId });
                }
            }
        }
    };
}
