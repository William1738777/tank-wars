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

// --- Registry to track bullet IDs and stop echoes ---
const seenCasts = new Set(); 

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
    
    const roomDisplay = document.getElementById('room-code-display');
    if (roomDisplay) roomDisplay.innerText = gameId;
    
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

// --- FIXED: HOST-AUTHORITATIVE HP & STATE RECEPTION ---
socket.on('playerUpdate', (data) => {
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING' || !players || players.length < 2) return;
    
    if (data.isHost && !isHost) { 
        // I am the Guest: Update the Host's position and states
        if (players[0]) { 
            players[0].x = data.x; players[0].y = data.y; players[0].angle = data.angle; 
            if (data.dashState !== undefined) players[0].dashState = data.dashState;
            if (data.fireShieldActive !== undefined) players[0].fireShieldActive = data.fireShieldActive;
            if (data.isGhosting !== undefined) players[0].isGhosting = data.isGhosting;
            if (data.zHeight !== undefined) players[0].zHeight = data.zHeight;
            if (data.zHeightActive !== undefined) players[0].zHeightActive = data.zHeightActive;
            
            // --- FIXED: Sync airborne properties to prevent crash landing bug ---
            if (data.knockupSource !== undefined) players[0].knockupSource = data.knockupSource;
            if (data.chronoIntercepted !== undefined) players[0].chronoIntercepted = data.chronoIntercepted;
        }
        // CRITICAL FIX: The Host dictates ALL HP on the screen
        if (players[0] && data.p1Hp !== undefined) players[0].hp = data.p1Hp;
        if (players[1] && data.p2Hp !== undefined) players[1].hp = data.p2Hp;
        
    } else if (!data.isHost && isHost) { 
        // I am the Host: Update the Guest's position and states
        if (players[1]) { 
            players[1].x = data.x; players[1].y = data.y; players[1].angle = data.angle; 
            
            // CRITICAL: Unpack the Guest's states so Host's Engine calculates physics/collisions!
            if (data.dashState !== undefined) players[1].dashState = data.dashState;
            if (data.fireShieldActive !== undefined) players[1].fireShieldActive = data.fireShieldActive;
            if (data.isGhosting !== undefined) players[1].isGhosting = data.isGhosting;
            if (data.zHeight !== undefined) players[1].zHeight = data.zHeight;
            if (data.zHeightActive !== undefined) players[1].zHeightActive = data.zHeightActive;
            
            // --- FIXED: Sync airborne properties to prevent crash landing bug ---
            if (data.knockupSource !== undefined) players[1].knockupSource = data.knockupSource;
            if (data.chronoIntercepted !== undefined) players[1].chronoIntercepted = data.chronoIntercepted;
        }
    }
});

// --- THE "FAVOR THE SHOOTER" BYPASS FOR DASHES/MELEE ---
socket.on('directHit', (data) => {
    // If I am the Host referee, and the Guest claims they dashed into me or died locally, I must accept the damage
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
    
    // CRITICAL: If we already drew this bullet locally, throw the network duplicate in the trash!
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
    if (typeof gameState === 'undefined' || gameState !== 'PLAYING') return;
    
    p1Score = data.p1Score; p2Score = data.p2Score;
    if (document.getElementById('score-p1')) document.getElementById('score-p1').innerText = p1Score;
    if (document.getElementById('score-p2')) document.getElementById('score-p2').innerText = p2Score;
    
    if (!isHost) { 
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
            
            let p1Stats = {totalDamage:0, bouncedDamage:0, xSkillDamage:0, shieldGenerated:0};
            let p2Stats = {totalDamage:0, bouncedDamage:0, xSkillDamage:0, shieldGenerated:0};
            let p1Obj = players.find(p => p.owner === 1);
            let p2Obj = players.find(p => p.owner === 2);
            if(p1Obj) p1Stats = p1Obj.matchStats;
            if(p2Obj) p2Stats = p2Obj.matchStats;
            
            document.getElementById('stats-p1').innerHTML = `
                Damage Dealt: <b>${Math.round(p1Stats.totalDamage)}</b><br>
                Bounced Dmg: <b>${Math.round(p1Stats.bouncedDamage)}</b><br>
                X-Skill Dmg: <b>${Math.round(p1Stats.xSkillDamage)}</b><br>
                Shield Gen: <b>${Math.round(p1Stats.shieldGenerated)}</b>
            `;
            document.getElementById('stats-p2').innerHTML = `
                Damage Dealt: <b>${Math.round(p2Stats.totalDamage)}</b><br>
                Bounced Dmg: <b>${Math.round(p2Stats.bouncedDamage)}</b><br>
                X-Skill Dmg: <b>${Math.round(p2Stats.xSkillDamage)}</b><br>
                Shield Gen: <b>${Math.round(p2Stats.shieldGenerated)}</b>
            `;

            setTimeout(() => { document.getElementById('victory-screen').style.display = 'flex'; }, 1500);
        } else {
            setTimeout(() => {
                players.forEach((tank, index) => {
                    let spawn = spawnPoints[index === 0 ? 0 : 3];
                    tank.x = spawn.x; tank.y = spawn.y; tank.angle = index === 0 ? 0 : Math.PI;
                    tank.hp = tank.maxHp; tank.isDead = false; tank.poisons = []; tank.stunTimer = 0;
                    tank.hookState = 'ready'; tank.dashState = 0; tank.burstsLeft = 0; tank.flameTimer = 0;
                    tank.mgAmmo = tank.mgMaxAmmo; tank.mgReloading = false; tank.invulnTimer = 90; 
                    tank.kbX = 0; tank.kbY = 0; tank.kbTimer = 0; tank.electrocutedTimer = 0;
                    tank.energy = 0; tank.zReady = false; tank.zFiring = false; tank.zChargeTimer = 0; tank.cShots = 0;
                    
                    tank.destroAiming = false; tank.destroLocked = false; tank.destroAimDist = 100;
                    tank.afterStunSlow = 0; tank.destroSlowTimer = 0; tank.kbType = null;
                    tank.fireShieldActive = false; tank.isGhosting = false; tank.fireTrailTicks = 0;
                    tank.phantomEvasiveTimer = 0; tank.isGhost = false; tank.ghostToggleTimer = 0;
                    tank.phantomMarks = 0; tank.phantomMarkTimer = 0; tank.phantomShockTimer = 0;
                    tank.abyssSlowStacks = 0; tank.abyssSlowTimer = 0;
                    
                    tank.tempestStacks = 0; tank.tempestSpeedStacks = 0; tank.tempestSpeedTimer = 0;
                    tank.tempestCSpdStacks = 0; tank.tempestCSpdTimer = 0; tank.tempestSlowTimer = 0;
                    tank.tempestShieldHp = 0; tank.tempestShieldTimer = 0;
                    tank.tempestOrbitalAngle = 0; tank.tempestOrbitalCooldowns = [0, 0, 0];
                    tank.typhoonMarks = 0; tank.inTornado = false; 
                    
                    tank.zHeight = 0; tank.zRotation = 0;
                    tank.portalA = null; tank.portalB = null; tank.portalTimer = 0;
    
                    tank.blackoutAnchor = null; tank.blackoutLasers = [];
                    tank.xHoldTimer = 0; tank.xHeldLastFrame = false; tank.blackoutLaserTimer = 0;
                    
                    tank.cooldowns = { c: 0, x: 0, z: 0 };
                });
                projectiles = []; hazards = []; flashes = []; particles = []; floatingTexts = [];
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
            
            // The super() call natively generated this.castId inside Projectile.js, we just grab it!
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !fromNetwork) {
                let myOwnerId = isHost ? 1 : 2;
                if (owner === myOwnerId) {
                    seenCasts.add(this.castId); // Register our own bullet so we don't echo it
                    socket.emit('playerShoot', { roomId: myRoomCode, owner, x, y, angle, speed, radius, damage, color, type, bounces, castId: this.castId });
                }
            }
        }
    };
}
