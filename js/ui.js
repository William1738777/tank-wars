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
    
    // If Arcade mode, the CPU randomly picks a tank and readies up instantly
    if (gameMode === 'ARCADE') {
        p2Selection = Math.floor(Math.random() * tanksData.length);
        document.getElementById('btn-p2-ready').style.display = 'none';
        document.getElementById('p2-ready-text').innerText = 'CPU READY!';
        document.getElementById('p2-ready-text').style.display = 'block';
        document.getElementById('p2-arrow-left').style.display = 'none';
        document.getElementById('p2-arrow-right').style.display = 'none';
        document.getElementById('p2-title').innerText = 'PLAYER 2 (CPU)';
        document.getElementById('hud-p2-name').innerText = 'CPU';
        p2Ready = true;
    } else {
        // Reset to normal 2P settings
        document.getElementById('btn-p2-ready').style.display = 'block';
        document.getElementById('p2-ready-text').style.display = 'none';
        document.getElementById('p2-arrow-left').style.display = 'block';
        document.getElementById('p2-arrow-right').style.display = 'block';
        document.getElementById('p2-title').innerText = 'PLAYER 2 (ARROWS + L, ;, \')';
        document.getElementById('hud-p2-name').innerText = 'PLAYER 2';
        p2Ready = false;
    }
    
    updateDisplays();
    drawMinimap();
}
function cycleTank(playerNum, dir) {
    if (playerNum === 1 && !p1Ready) p1Selection = (p1Selection + dir + tanksData.length) % tanksData.length;
    else if (playerNum === 2 && !p2Ready) p2Selection = (p2Selection + dir + tanksData.length) % tanksData.length;
    updateDisplays();
}

function cycleMap(dir) {
    selectedMapIndex = (selectedMapIndex + dir + mapsData.length) % mapsData.length;
    currentMap = mapsData[selectedMapIndex];
    document.getElementById('map-name-display').innerText = currentMap.name;
    drawMinimap();
}

function drawMinimap() {
    const mCanvas = document.getElementById('minimapCanvas');
    if(!mCanvas) return;
    const mCtx = mCanvas.getContext('2d');
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    
    const scaleX = mCanvas.width / canvas.width;
    const scaleY = mCanvas.height / canvas.height;

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
    if (p1Ready && p2Ready) setTimeout(startGame, 800);
}

function updateHUD() {
    if (players[0] && !players[0].isDead) {
        const p1Hp = document.getElementById('p1-hp');
        p1Hp.style.width = Math.min(100, Math.max(0, (players[0].hp / players[0].maxHp) * 100)) + '%'; 
        p1Hp.style.background = (players[0].hp / players[0].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
    } else if (players[0]) {
        document.getElementById('p1-hp').style.width = '0%';
    }
    
    if (players[1] && !players[1].isDead) {
        const p2Hp = document.getElementById('p2-hp');
        p2Hp.style.width = Math.min(100, Math.max(0, (players[1].hp / players[1].maxHp) * 100)) + '%'; 
        p2Hp.style.background = (players[1].hp / players[1].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
    } else if (players[1]) {
        document.getElementById('p2-hp').style.width = '0%';
    }
}

function updateCooldownUI() {
    const now = Date.now();
    players.forEach((p, index) => {
        const pPrefix = index === 0 ? 'p1' : 'p2';
        const skills = ['c', 'x', 'z'];
        
        // Handling Ammo text for X skill (Dreadnaught Machine Gun)
        let ammoTextXEl = document.getElementById(`${pPrefix}-ammo-x`);
        if (ammoTextXEl) {
            if (p.config.id === 'dreadnaught') {
                ammoTextXEl.innerText = p.mgReloading ? '0' : Math.floor(p.mgAmmo);
                ammoTextXEl.style.color = p.mgReloading ? '#ff3333' : 'gold';
                if (!p.mgReloading) p.maxCooldowns.x = 100;
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
