// --- MENU LOGIC ---
let gameMode = 'ONLINE'; 

function showMenu(menuId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const targetMenu = document.getElementById(menuId);
    if (targetMenu) targetMenu.classList.remove('hidden');
}

function startMode(mode) {
    gameMode = mode;
    showMenu('select-screen');
    
    if (mode === 'ARCADE') {
        alert("Arcade mode is currently disabled while Team Skirmish is active.");
        location.reload();
    }
}

// --- DYNAMIC LOBBY UI REBUILDER ---
function updateLobbyUI(game) {
    const t1Slots = document.getElementById('t1-slots');
    const t2Slots = document.getElementById('t2-slots');
    if (!t1Slots || !t2Slots) return;

    t1Slots.innerHTML = '';
    t2Slots.innerHTML = '';

    let allReady = true;
    let localPlayer = null;

    // Render players
    game.players.forEach(p => {
        if (!p.isReady) allReady = false;
        if (p.id === socket.id) localPlayer = p;

        const tankData = tanksData[p.selection] || tanksData[0];
        
        const slot = document.createElement('div');
        slot.className = `player-slot ${p.isReady ? 'ready' : ''}`;
        
        let badges = '';
        if (p.id === socket.id) badges += `<span class="you-badge">YOU</span>`;
        if (p.isHost) badges += `<span class="you-badge" style="background:#ffcc00;">HOST</span>`;

        slot.innerHTML = `
            <img src="${tankData.img.src}" alt="${tankData.name}">
            <div style="flex-grow: 1;">
                <div style="font-weight: bold; font-size: 18px; color: ${tankData.color};">${tankData.name} ${badges}</div>
                <div style="font-size: 12px; color: ${p.isReady ? '#00ff00' : '#888'};">${p.isReady ? 'READY' : 'WAITING...'}</div>
            </div>
        `;

        if (p.team === 1) t1Slots.appendChild(slot);
        else t2Slots.appendChild(slot);
    });

    // Generate empty slots based on mode
    let maxPerTeam = game.maxPlayers / 2;
    let t1Count = game.players.filter(p => p.team === 1).length;
    let t2Count = game.players.filter(p => p.team === 2).length;

    for(let i = t1Count; i < maxPerTeam; i++) {
        t1Slots.innerHTML += `<div class="player-slot" style="opacity: 0.3; justify-content: center; color: #555;">[ OPEN SLOT ]</div>`;
    }
    for(let i = t2Count; i < maxPerTeam; i++) {
        t2Slots.innerHTML += `<div class="player-slot" style="opacity: 0.3; justify-content: center; color: #555;">[ OPEN SLOT ]</div>`;
    }

    // Host Controls Reveal
    const hostControls = document.getElementById('host-controls');
    const btnMapSelect = document.getElementById('btn-map-select');
    if (isHost && hostControls) {
        hostControls.style.display = 'flex';
        btnMapSelect.style.display = 'block';
    }

    // Launch Button Logic
    const btnLaunch = document.getElementById('btn-launch-game');
    if (btnLaunch) {
        if (allReady && game.players.length === game.maxPlayers) {
            if (isHost) {
                btnLaunch.innerText = "START GAME";
                btnLaunch.disabled = false;
                btnLaunch.style.background = '#00ff66';
                btnLaunch.style.color = '#000';
            } else {
                btnLaunch.innerText = "WAITING FOR HOST TO START...";
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
            }
        } else {
            btnLaunch.innerText = game.players.length < game.maxPlayers ? "WAITING FOR PLAYERS..." : "WAITING FOR READY...";
            btnLaunch.disabled = true;
            btnLaunch.style.background = '#333';
            btnLaunch.style.color = '#777';
        }
    }

    // Update Local Button States
    const btnReady = document.getElementById('btn-local-ready');
    if (btnReady && localPlayer) {
        if (localPlayer.isReady) {
            btnReady.innerText = "CANCEL READY";
            btnReady.style.background = '#333';
            btnReady.style.borderColor = '#555';
            btnReady.style.color = '#fff';
        } else {
            btnReady.innerText = "READY UP";
            btnReady.style.background = '#ffaa00';
            btnReady.style.borderColor = '#ffaa00';
            btnReady.style.color = '#000';
        }
    }
}

// --- LOCAL PLAYER CONTROLS EMITTERS ---
function uiCycleTank(dir) {
    if (!currentLobbyData) return;
    let localPlayer = currentLobbyData.players.find(p => p.id === socket.id);
    if (!localPlayer || localPlayer.isReady) return; 

    let newSel = localPlayer.selection;
    do {
        newSel = (newSel + dir + tanksData.length) % tanksData.length;
    } while (tanksData[newSel].npcOnly);

    socket.emit('updatePlayerState', { roomId: myRoomCode, selection: newSel });
}

function uiToggleReady() {
    if (!currentLobbyData) return;
    let localPlayer = currentLobbyData.players.find(p => p.id === socket.id);
    if (localPlayer) {
        socket.emit('updatePlayerState', { roomId: myRoomCode, isReady: !localPlayer.isReady });
    }
}

function uiSwitchTeam() {
    if (!currentLobbyData) return;
    let localPlayer = currentLobbyData.players.find(p => p.id === socket.id);
    if (!localPlayer || localPlayer.isReady) return;

    let targetTeam = localPlayer.team === 1 ? 2 : 1;
    let targetTeamCount = currentLobbyData.players.filter(p => p.team === targetTeam).length;
    
    if (targetTeamCount < (currentLobbyData.maxPlayers / 2)) {
        socket.emit('changeTeam', { roomId: myRoomCode, team: targetTeam });
    } else {
        alert("That team is full!");
    }
}

function uiChangeMode(mode) {
    if (isHost) socket.emit('changeMode', { roomId: myRoomCode, mode: mode });
}

// Map Cycling (Host Only)
let localMapIndex = 0;
function cycleMap() {
    if (!isHost) return;
    do {
        localMapIndex = (localMapIndex + 1) % mapsData.length;
    } while (selectedMapIndex === 2); // Skip raid maps
    
    // In a full implementation, emit the map index to the server to sync to clients.
    // For now, this drives the local preview.
    const mapNameDisplay = document.getElementById('map-name');
    const minimapImage = document.getElementById('minimap-image');
    if (mapNameDisplay) mapNameDisplay.innerText = 'MAP: ' + mapsData[localMapIndex].name;
    if (minimapImage && images[mapsData[localMapIndex].bgImg]) {
        minimapImage.src = images[mapsData[localMapIndex].bgImg].src;
    }
}

// --- HUD REWRITE (CENTRALIZED SCORES + LOCAL STATS) ---
function updateHUD() {
    if (typeof players === 'undefined' || !currentLobbyData) return;
    
    // 1. Update Team Scores (Assuming engine tracks team1Score and team2Score globally)
    const scoreT1 = document.getElementById('score-t1');
    const scoreT2 = document.getElementById('score-t2');
    if (scoreT1 && typeof team1Score !== 'undefined') scoreT1.innerText = team1Score;
    if (scoreT2 && typeof team2Score !== 'undefined') scoreT2.innerText = team2Score;

    // 2. Update Local Player HUD
    let localTank = players.find(p => p.owner === myOwnerId);
    
    if (localTank && !localTank.isDead) {
        const hpFill = document.getElementById('local-hp');
        const hpTrail = document.getElementById('local-hp-trail');
        
        if (hpFill) {
            let percent = Math.min(100, Math.max(0, (localTank.hp / localTank.maxHp) * 100)) + '%'; 
            hpFill.style.width = percent;
            if(hpTrail) hpTrail.style.width = percent; 
            hpFill.style.background = (localTank.hp / localTank.maxHp) > 0.3 ? '#00ff00' : '#ff0000';
        }
    } else {
        const hpFill = document.getElementById('local-hp');
        const hpTrail = document.getElementById('local-hp-trail');
        if (hpFill) hpFill.style.width = '0%';
        if (hpTrail) hpTrail.style.width = '0%';
    }
}

function updateCooldownUI() {
    if (typeof players === 'undefined' || !currentLobbyData) return;
    const now = Date.now();
    
    let localTank = players.find(p => p.owner === myOwnerId);
    if (!localTank || localTank.isDead) return;

    const skills = ['c', 'x', 'z'];
    
    // Ammo Text X
    let ammoTextXEl = document.getElementById(`local-ammo-x`);
    if (ammoTextXEl) {
        if (localTank.config.id === 'dreadnaught') {
            ammoTextXEl.innerText = localTank.mgReloading ? '0' : Math.floor(localTank.mgAmmo);
            ammoTextXEl.style.color = localTank.mgReloading ? '#ff3333' : 'gold';
            if (!localTank.mgReloading) localTank.maxCooldowns.x = 100;
        } else if (localTank.config.id === 'tempest') {
            let stacks = localTank.tempestStacks || 0;
            ammoTextXEl.innerText = `${Math.floor(stacks)}/9`;
            ammoTextXEl.style.color = stacks >= 3 ? '#aaffff' : '#777777';
        } else {
            ammoTextXEl.innerText = '';
        }
    }

    // Ammo Text C
    let ammoTextCEl = document.getElementById(`local-ammo-c`);
    if (ammoTextCEl) {
        if (localTank.config.id === 'abyss') {
            let charges = Math.floor(localTank.abyssCharges || 0);
            ammoTextCEl.innerText = `${charges}/50`;
            ammoTextCEl.style.color = charges >= 50 ? '#ff3333' : '#ffffff';
        } else {
            ammoTextCEl.innerText = '';
        }
    }

    // Cooldown Fills
    skills.forEach(skill => {
        let percent = 1;
        
        if (localTank.config.id === 'seraph' && skill === 'z') {
            percent = localTank.energy / 100;
        } else if (localTank.config.id === 'scorpion' && skill === 'x' && (localTank.hookState === 'pulling' || localTank.hookState === 'fired')) {
            percent = 0; 
        } else if (now < localTank.cooldowns[skill]) {
            let elapsed = localTank.maxCooldowns[skill] - (localTank.cooldowns[skill] - now);
            percent = Math.max(0, elapsed / localTank.maxCooldowns[skill]);
        }

        const fillEl = document.getElementById(`local-fill-${skill}`);
        const iconEl = document.getElementById(`local-cd-${skill}`);
        
        if (fillEl && iconEl) {
            fillEl.style.height = `${percent * 100}%`;
            if (percent >= 1) {
                iconEl.style.borderColor = localTank.config.color;
                iconEl.style.boxShadow = `0 0 15px ${localTank.config.color}`;
                fillEl.style.background = `rgba(${hexToRgb(localTank.config.color)}, 0.4)`;
            } else {
                iconEl.style.borderColor = '#555';
                iconEl.style.boxShadow = 'none';
                fillEl.style.background = 'rgba(255,255,255,0.2)';
            }
        }
    });
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}

// --- CINEMATIC MENU LOGIC ---
function initSlideshow() {
    const slides = document.querySelectorAll('.bg-slide');
    if(slides.length === 0) return;
    let currentSlide = 0;
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 8000); 
}

function initPlayDropdown() {
    const btnPlay = document.getElementById('btn-master-play');
    const dropdown = document.getElementById('play-dropdown');
    
    if(btnPlay && dropdown) {
        btnPlay.addEventListener('click', (e) => {
            e.stopPropagation(); 
            dropdown.style.display = (dropdown.style.display === 'none' || dropdown.style.display === '') ? 'flex' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if(!btnPlay.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
        });
    }
}

function updateMainMenuProfile() {
    const usernameDisplay = document.getElementById('menu-username');
    if (usernameDisplay) {
        const savedName = localStorage.getItem('tank_username');
        if (savedName) usernameDisplay.innerText = savedName;
    }
}

// --- AUTOMATIC COMPATIBILITY BINDINGS ---
window.addEventListener('DOMContentLoaded', () => {
    initSlideshow();
    initPlayDropdown();
    updateMainMenuProfile();

    const btnMapSelect = document.getElementById('btn-map-select');
    if (btnMapSelect) btnMapSelect.onclick = () => cycleMap();

    const btnLaunch = document.getElementById('btn-launch-game');
    if (btnLaunch) {
        btnLaunch.onclick = () => {
            if (btnLaunch.disabled) return;
            if (isHost && typeof socket !== 'undefined') {
                socket.emit('launchGame', myRoomCode);
            }
        };
    }
});
