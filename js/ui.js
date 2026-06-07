// --- MENU LOGIC ---
let gameMode = '2P'; // Global tracker for our game mode

function showMenu(menuId) {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('sp-menu').style.display = 'none';
    document.getElementById(menuId).style.display = 'flex';
}

function startMode(mode) {
    gameMode = mode;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('sp-menu').style.display = 'none';
    document.getElementById('select-screen').style.display = 'flex';
    
    // Restoring elements to default before altering them based on mode
    document.getElementById('p2-panel').style.display = 'block';
    document.getElementById('map-selector-ui').style.display = 'flex';
    document.getElementById('p2-ready-text').style.display = 'none';
    document.getElementById('p2-arrow-left').style.display = 'block';
    document.getElementById('p2-arrow-right').style.display = 'block';

    if (gameMode === 'RAID') {
        // Raid Mode is 1 Player only, lock the map and hide P2 UI
        document.getElementById('p2-panel').style.display = 'none';
        document.getElementById('map-selector-ui').style.display = 'none'; // Lock map selection
        
        selectedMapIndex = 2; // Assuming index 2 is 'raid_facility'
        currentMap = mapsData[selectedMapIndex];
        
        p2Ready = true; // Auto-ready P2 so the game can start when P1 is ready
    }
    else if (gameMode === 'ARCADE') {
        // CPU now allows tank selection!
        document.getElementById('btn-p2-ready').style.display = 'block';
        
        // Add a dropdown to pick difficulty
        document.getElementById('p2-title').innerHTML = `
            PLAYER 2 (CPU) 
            <select id="diff-select" style="background:#222; color:#fff; border:1px solid #555; margin-left:10px;">
                <option value="EASY">EASY</option>
                <option value="NORMAL" selected>NORMAL</option>
                <option value="HARD">HARD (Aggressive)</option>
                <option value="HARD_1">HARD 1 (Kiting)</option>
            </select>`;
        
        document.getElementById('hud-p2-name').innerText = 'CPU';
        p2Ready = false;
        
        // Override the P2 ready button to grab the difficulty before starting
        document.getElementById('btn-p2-ready').onclick = function() {
            aiDifficulty = document.getElementById('diff-select').value;
            toggleReady(2);
        };
    } else {
        // Reset to normal 2P settings
        document.getElementById('btn-p2-ready').style.display = 'block';
        document.getElementById('btn-p2-ready').onclick = function() { toggleReady(2); };
        document.getElementById('p2-title').innerText = 'PLAYER 2 (ARROWS + L, ;, \')';
        document.getElementById('hud-p2-name').innerText = 'PLAYER 2';
        p2Ready = false;
        
        // Ensure 1v1 doesn't accidentally load the giant raid map if they hit 'back'
        if(selectedMapIndex === 2) {
            selectedMapIndex = 0;
            currentMap = mapsData[selectedMapIndex];
        }
    }
    
    document.getElementById('map-name-display').innerText = currentMap.name;
    updateDisplays();
    drawMinimap();
}

function cycleTank(playerNum, dir) {
    if (playerNum === 1 && !p1Ready) p1Selection = (p1Selection + dir + tanksData.length) % tanksData.length;
    else if (playerNum === 2 && !p2Ready) p2Selection = (p2Selection + dir + tanksData.length) % tanksData.length;
    updateDisplays();
}

function cycleMap(dir) {
    if (gameMode === 'RAID') return; // Cannot change map in raid mode
    // Lock out the raid map (index 2) from standard rotation
    do {
        selectedMapIndex = (selectedMapIndex + dir + mapsData.length) % mapsData.length;
    } while (selectedMapIndex === 2);
    
    currentMap = mapsData[selectedMapIndex];
    document.getElementById('map-name-display').innerText = currentMap.name;
    drawMinimap();
}

function drawMinimap() {
    const mCanvas = document.getElementById('minimapCanvas');
    if(!mCanvas) return;
    const mCtx = mCanvas.getContext('2d');
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    
    // Dynamically scale based on map size vs standard canvas width
    let mapDisplayW = currentMap.width || 1000;
    let mapDisplayH = currentMap.height || 700;
    
    const scaleX = mCanvas.width / mapDisplayW;
    const scaleY = mCanvas.height / mapDisplayH;

    mCtx.fillStyle = '#5c3a92';
    currentMap.walls.forEach(w => {
        mCtx.fillRect(w.x * scaleX, w.y * scaleY, w.w * scaleX, w.h * scaleY);
    });

    mCtx.fillStyle = '#4a3c31';
    currentMap.rocks.forEach(r => {
        mCtx.beginPath();
        mCtx.arc(r.x * scaleX, r.y * scaleY, r.r * scaleX, 0, Math.PI * 2);
        mCtx.fill();
    });
}

function updateDisplays() {
    const t1 = tanksData[p1Selection];
    document.getElementById('p1-display').innerHTML = `<img src="${t1.img.src}"><h2>${t1.name}</h2><p style="font-size:0.8rem; color:#ccc;">${t1.desc}</p>`;
    const t2 = tanksData[p2Selection];
    document.getElementById('p2-display').innerHTML = `<img src="${t2.img.src}"><h2>${t2.name}</h2><p style="font-size:0.8rem; color:#ccc;">${t2.desc}</p>`;
}

function toggleReady(playerNum) {
    if (playerNum === 1) {
        p1Ready = true;
        document.getElementById('btn-p1-ready').style.display = 'none';
        document.getElementById('p1-ready-text').style.display = 'block';
        document.getElementById('p1-panel').style.borderColor = '#00ff00';
    } else {
        p2Ready = true;
        document.getElementById('btn-p2-ready').style.display = 'none';
        document.getElementById('p2-ready-text').style.display = 'block';
        document.getElementById('p2-panel').style.borderColor = '#00ff00';
    }
    
    if (gameMode === 'RAID') {
        if (p1Ready) setTimeout(startGame, 800);
    } else {
        if (p1Ready && p2Ready) setTimeout(startGame, 800);
    }
}

function updateHUD() {
    if (players[0] && !players[0].isDead) {
        const p1Hp = document.getElementById('p1-hp');
        p1Hp.style.width = Math.min(100, Math.max(0, (players[0].hp / players[0].maxHp) * 100)) + '%'; 
        p1Hp.style.background = (players[0].hp / players[0].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
    } else if (players[0]) {
        document.getElementById('p1-hp').style.width = '0%';
    }
    
    // Hide standard P2 HUD in Raid Mode as there are multiple enemies
    if (gameMode === 'RAID') {
        document.getElementById('hud-p2-box').style.display = 'none';
        document.getElementById('hud-score').style.display = 'none';
        document.getElementById('p2-skills').style.display = 'none';
    } else {
        if (players[1] && !players[1].isDead) {
            const p2Hp = document.getElementById('p2-hp');
            p2Hp.style.width = Math.min(100, Math.max(0, (players[1].hp / players[1].maxHp) * 100)) + '%'; 
            p2Hp.style.background = (players[1].hp / players[1].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
        } else if (players[1]) {
            document.getElementById('p2-hp').style.width = '0%';
        }
    }
}

function updateCooldownUI() {
    const now = Date.now();
    players.forEach((p, index) => {
        // Only track UI cooldowns for human players (P1, or P2 in Local Multiplayer)
        if (p.isAI) return;
        
        const pPrefix = index === 0 ? 'p1' : 'p2';
        const skills = ['c', 'x', 'z'];
        
        // Handling Ammo text for X skill (Dreadnaught Machine Gun & Tempest Stacks)
        let ammoTextXEl = document.getElementById(`${pPrefix}-ammo-x`);
        if (ammoTextXEl) {
            if (p.config.id === 'dreadnaught') {
                ammoTextXEl.innerText = p.mgReloading ? '0' : Math.floor(p.mgAmmo);
                ammoTextXEl.style.color = p.mgReloading ? '#ff3333' : 'gold';
                if (!p.mgReloading) p.maxCooldowns.x = 100;
            } else if (p.config.id === 'tempest') {
                let stacks = p.tempestStacks || 0;
                ammoTextXEl.innerText = `${Math.floor(stacks)}/9`;
                ammoTextXEl.style.color = stacks >= 3 ? '#aaffff' : '#777777';
            } else {
                ammoTextXEl.innerText = '';
            }
        }

        // Handling Ammo text for C skill (Abyss Tank Rapid Fire Charges)
        let ammoTextCEl = document.getElementById(`${pPrefix}-ammo-c`);
        if (ammoTextCEl) {
            if (p.config.id === 'abyss') {
                let charges = Math.floor(p.abyssCharges || 0);
                ammoTextCEl.innerText = `${charges}/50`;
                ammoTextCEl.style.color = charges >= 50 ? '#ff3333' : '#ffffff';
            } else {
                ammoTextCEl.innerText = '';
            }
        }

        skills.forEach(skill => {
            let percent = 1;
            
            if (p.config.id === 'seraph' && skill === 'z') {
                percent = p.energy / 100;
            } else if (p.config.id === 'scorpion' && skill === 'x' && (p.hookState === 'pulling' || p.hookState === 'fired')) {
                percent = 0; 
            } else if (now < p.cooldowns[skill]) {
                let elapsed = p.maxCooldowns[skill] - (p.cooldowns[skill] - now);
                percent = Math.max(0, elapsed / p.maxCooldowns[skill]);
            }

            const fillEl = document.getElementById(`${pPrefix}-fill-${skill}`);
            const iconEl = document.getElementById(`${pPrefix}-cd-${skill}`);
            
            if (fillEl && iconEl) {
                fillEl.style.height = `${percent * 100}%`;
                if (percent >= 1) {
                    iconEl.style.borderColor = p.config.color;
                    iconEl.style.boxShadow = `0 0 15px ${p.config.color}`;
                    fillEl.style.background = `rgba(${hexToRgb(p.config.color)}, 0.4)`;
                } else {
                    iconEl.style.borderColor = '#555';
                    iconEl.style.boxShadow = 'none';
                    fillEl.style.background = 'rgba(255,255,255,0.2)';
                }
            }
        });
    });
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}
