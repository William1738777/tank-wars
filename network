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
const waitingOverlay = document.getElementById('waiting-overlay');
const roomCodeDisplay = document.getElementById('room-code-display');

// Global Network State
let isOnlineGame = false;
let isHost = false;
let myRoomCode = "";

// Lobby Interactions
if (btnOnline) {
    btnOnline.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        lobbyScreen.style.display = 'flex';
    });
}

btnLobbyBack.addEventListener('click', () => {
    lobbyScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
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
        let statusColor = game.status === 'IN PROGRESS' ? '#ff3333' : '#00ff66';
        li.innerHTML = `
            <span>ROOM: <b>${game.id}</b></span>
            <span style="color: ${statusColor}; font-size: 18px;">${game.status}</span>
            <button class="join-btn" data-id="${game.id}" style="padding: 10px 20px; background: #00ff66; cursor: pointer; border: none; font-weight: bold; ${game.status === 'IN PROGRESS' ? 'display:none;' : ''}">JOIN</button>
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
    socket.emit('createGame');
});

socket.on('gameCreated', (gameId) => {
    isOnlineGame = true; isHost = true; myRoomCode = gameId;
    lobbyScreen.style.display = 'none'; selectScreen.style.display = 'flex';
    waitingOverlay.style.display = 'flex'; roomCodeDisplay.innerText = `ROOM: ${gameId}`;
    
    // Lock CPU elements for online
    const p2Next = document.getElementById('btn-p2-next');
    const p2Ready = document.getElementById('btn-p2-ready');
    const toggleAi = document.getElementById('btn-toggle-ai');
    if(p2Next) p2Next.style.display = 'none';
    if(p2Ready) p2Ready.style.display = 'none';
    if(toggleAi) toggleAi.style.display = 'none';
});

socket.on('gameJoined', (gameId) => {
    isOnlineGame = true; isHost = false; myRoomCode = gameId;
    lobbyScreen.style.display = 'none'; selectScreen.style.display = 'flex'; waitingOverlay.style.display = 'none';
    
    // Lock P1 elements for Joiner
    const p1Next = document.getElementById('btn-p1-next');
    const p1Ready = document.getElementById('btn-p1-ready');
    const mapSelect = document.getElementById('btn-map-select');
    const toggleAi = document.getElementById('btn-toggle-ai');
    
    if(p1Next) p1Next.style.display = 'none';
    if(p1Ready) p1Ready.style.display = 'none'; 
    if(mapSelect) mapSelect.style.display = 'none';
    if(toggleAi) toggleAi.style.display = 'none';
    
    socket.emit('requestSync', gameId);
});

socket.on('playerJoined', (playerId) => { waitingOverlay.style.display = 'none'; });
socket.on('forceSync', () => { socket.emit('syncSelection', { roomId: myRoomCode, p1Selection, p2Selection, selectedMapIndex, p1Ready, p2Ready }); });

socket.on('updateSelection', (data) => {
    p1Selection = data.p1Selection; p2Selection = data.p2Selection; selectedMapIndex = data.selectedMapIndex;
    if (data.p1Ready !== undefined) p1Ready = data.p1Ready;
    if (data.p2Ready !== undefined) p2Ready = data.p2Ready;

    const p1ReadyBtn = document.getElementById('btn-p1-ready');
    const p1ReadyText = document.getElementById('p1-ready-text');
    const p1Panel = document.getElementById('p1-panel');
    if (p1Ready) {
        if(p1ReadyBtn) p1ReadyBtn.style.display = 'none';
        if(p1ReadyText) p1ReadyText.style.display = 'block';
        if(p1Panel) p1Panel.style.borderColor = '#00ff00';
    }

    const p2ReadyBtn = document.getElementById('btn-p2-ready');
    const p2ReadyText = document.getElementById('p2-ready-text');
    const p2Panel = document.getElementById('p2-panel');
    if (p2Ready) {
        if(p2ReadyBtn) p2ReadyBtn.style.display = 'none';
        if(p2ReadyText) p2ReadyText.style.display = 'block';
        if(p2Panel) p2Panel.style.borderColor = '#00ff00';
    }

    currentMap = mapsData[selectedMapIndex];
    const mapNameDisplay = document.getElementById('map-name-display') || document.getElementById('map-name');
    if (mapNameDisplay) mapNameDisplay.innerText = (mapNameDisplay.id === 'map-name' ? 'MAP: ' : '') + currentMap.name;

    if (typeof updateDisplays === 'function') updateDisplays();
    if (typeof drawMinimap === 'function') drawMinimap();
    if (typeof checkAllReady === 'function') checkAllReady();
});

socket.on('startGame', () => { if (typeof startGame === 'function') startGame(); });

// --- IN-GAME REAL-TIME SOCKET LISTENERS ---

socket.on('playerUpdate', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING' || !players || players.length < 2) return;
    if (data.isHost && !isHost) { // Sync Host's tank coordinates onto Guest's machine
        if (players[0]) { players[0].x = data.x; players[0].y = data.y; players[0].angle = data.angle; players[0].hp = data.hp; }
    } else if (!data.isHost && isHost) { // Sync Guest's tank coordinates onto Host's machine
        if (players[1]) { players[1].x = data.x; players[1].y = data.y; players[1].angle = data.angle; players[1].hp = data.hp; }
    }
});

socket.on('playerShoot', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING') return;
    if (typeof Projectile !== 'undefined' && typeof projectiles !== 'undefined') {
        // Pass true as the final argument so this incoming bullet doesn't echo back out
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
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING') return;
    p1Score = data.p1Score; p2Score = data.p2Score;
    if (document.getElementById('score-p1')) document.getElementById('score-p1').innerText = p1Score;
    if (document.getElementById('score-p2')) document.getElementById('score-p2').innerText = p2Score;
    
    if (!isHost) { // Only Guest runs local score force-updates since Host computes authorization
        let loser = players.find(p => p.owner === data.loserOwnerId);
        if (loser && !loser.isDead) {
            loser.isDead = true;
            if (typeof createKaboom === 'function') createKaboom(loser.x, loser.y, 2.0 * (loser.scaleMod || 1));
        }
        if (p1Score >= 3 || p2Score >= 3) {
            gameState = 'OVER';
            const winnerText = p1Score >= 3 ? "PLAYER 1" : "PLAYER 2";
            document.getElementById('victory-title').innerText = `${winnerText} WINS!`;
            document.getElementById('victory-title').style.color = p1Score >= 3 ? '#00aaff' : '#ff3333';
            setTimeout(() => { document.getElementById('victory-screen').style.display = 'flex'; }, 1500);
        } else {
            setTimeout(() => {
                players.forEach(p => { p.hp = p.maxHp; p.isDead = false; p.poisons = []; p.stunTimer = 0; });
                if (players[0]) { players[0].x = spawnPoints[0].x; players[0].y = spawnPoints[0].y; players[0].angle = 0; }
                if (players[1]) { players[1].x = spawnPoints[3].x; players[1].y = spawnPoints[3].y; players[1].angle = Math.PI; }
                if (typeof updateHUD === 'function') updateHUD();
            }, 1500);
        }
    }
});

// --- MONKEYPATCH ATTACK ATTRIBUTES ---
if (typeof Projectile !== 'undefined') {
    const OriginalProjectile = Projectile;
    Projectile = class extends OriginalProjectile {
        constructor(owner, x, y, angle, speed, radius, damage, color, type, bounces, castId = null, fromNetwork = false) {
            super(owner, x, y, angle, speed, radius, damage, color, type, bounces, castId);
            // Catch if you fired a bullet locally, send it across the internet
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !fromNetwork) {
                let myOwnerId = isHost ? 1 : 2;
                if (owner === myOwnerId) {
                    socket.emit('playerShoot', { roomId: myRoomCode, owner, x, y, angle, speed, radius, damage, color, type, bounces, castId });
                }
            }
        }
    };
}
