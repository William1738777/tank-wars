// --- MENU LOGIC ---
let gameMode = '2P'; // Global tracker for our game mode

function showMenu(menuId) {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    const spMenu = document.getElementById('sp-menu');
    if (spMenu) spMenu.style.display = 'none';
    
    const targetMenu = document.getElementById(menuId);
    if (targetMenu) targetMenu.style.display = 'flex';
}

function startMode(mode) {
    gameMode = mode;
    
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    const spMenu = document.getElementById('sp-menu');
    if (spMenu) spMenu.style.display = 'none';
    const selectScreen = document.getElementById('select-screen');
    if (selectScreen) selectScreen.style.display = 'flex';
    
    // Reset Player 1 UI
    p1Ready = false;
    const btnP1Ready = document.getElementById('btn-p1-ready');
    if (btnP1Ready) btnP1Ready.style.display = 'block';
    const p1ReadyText = document.getElementById('p1-ready-text');
    if (p1ReadyText) p1ReadyText.style.display = 'none';
    const p1Panel = document.getElementById('p1-panel');
    if (p1Panel) p1Panel.style.borderColor = '#333';

    // Restoring Player 2 elements to default
    const p2Panel = document.getElementById('p2-panel');
    if (p2Panel) {
        p2Panel.style.display = 'block';
        p2Panel.style.borderColor = '#333';
    }
    const mapSelectorUi = document.getElementById('map-selector-ui');
    if (mapSelectorUi) mapSelectorUi.style.display = 'flex';
    const p2ReadyText = document.getElementById('p2-ready-text');
    if (p2ReadyText) p2ReadyText.style.display = 'none';

    if (gameMode === 'RAID') {
        if (p2Panel) p2Panel.style.display = 'none';
        if (mapSelectorUi) mapSelectorUi.style.display = 'none';
        
        selectedMapIndex = 2; // Assuming index 2 is 'raid_facility'
        if (typeof mapsData !== 'undefined') currentMap = mapsData[selectedMapIndex];
        
        p2Ready = true; 
    }
    else if (gameMode === 'ARCADE') {
        const btnP2Ready = document.getElementById('btn-p2-ready');
        if (btnP2Ready) btnP2Ready.style.display = 'block';
        
        const p2Title = document.getElementById('p2-title');
        if (p2Title) {
            p2Title.innerHTML = `
                PLAYER 2 (CPU) 
                <select id="diff-select" style="background:#222; color:#fff; border:1px solid #555; margin-left:10px;">
                    <option value="EASY">EASY</option>
                    <option value="NORMAL" selected>NORMAL</option>
                    <option value="HARD">HARD (Aggressive)</option>
                    <option value="HARD_1">HARD 1 (Kiting)</option>
                </select>`;
        }
        
        const hudP2Name = document.getElementById('hud-p2-name');
        if (hudP2Name) hudP2Name.innerText = 'CPU';
        p2Ready = false;
        
        if (btnP2Ready) {
            btnP2Ready.onclick = function() {
                const diffSelect = document.getElementById('diff-select');
                if (diffSelect) aiDifficulty = diffSelect.value;
                toggleReady(2);
            };
        }
        
        if(selectedMapIndex === 2) {
            selectedMapIndex = 0;
            if (typeof mapsData !== 'undefined') currentMap = mapsData[selectedMapIndex];
        }
    } else {
        const btnP2Ready = document.getElementById('btn-p2-ready');
        if (btnP2Ready) {
            btnP2Ready.style.display = 'block';
            btnP2Ready.onclick = function() { toggleReady(2); };
        }
        const p2Title = document.getElementById('p2-title');
        if (p2Title) p2Title.innerText = 'PLAYER 2 (ARROWS + L, ;, \')';
        const hudP2Name = document.getElementById('hud-p2-name');
        if (hudP2Name) hudP2Name.innerText = 'PLAYER 2';
        p2Ready = false;
        
        if(selectedMapIndex === 2) {
            selectedMapIndex = 0;
            if (typeof mapsData !== 'undefined') currentMap = mapsData[selectedMapIndex];
        }
    }
    
    const mapNameDisplay = document.getElementById('map-name-display') || document.getElementById('map-name');
    if (mapNameDisplay && typeof currentMap !== 'undefined') {
        mapNameDisplay.innerText = (mapNameDisplay.id === 'map-name' ? 'MAP: ' : '') + currentMap.name;
    }
    
    updateDisplays();
    drawMinimap();
    checkAllReady(); // Force check the button state on load
}

function checkAllReady() {
    let allReady = false;
    if (gameMode === 'RAID') {
        allReady = p1Ready;
    } else {
        allReady = p1Ready && p2Ready;
    }

    const btnLaunch = document.getElementById('btn-launch-game');
    if (btnLaunch) {
        if (allReady) {
            // Both are ready
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !isHost) {
                btnLaunch.innerText = "WAITING FOR HOST...";
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.borderColor = '#555';
                btnLaunch.style.color = '#aaa';
                btnLaunch.style.cursor = 'not-allowed';
            } else {
                btnLaunch.innerText = "START";
                btnLaunch.disabled = false;
                btnLaunch.style.background = '#ff4500';
                btnLaunch.style.borderColor = '#ff4500';
                btnLaunch.style.color = '#fff';
                btnLaunch.style.cursor = 'pointer';
            }
        } else {
            // Still waiting for someone to ready up
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !isHost) {
                btnLaunch.innerText = "WAITING FOR HOST...";
            } else {
                btnLaunch.innerText = "START";
            }
            btnLaunch.disabled = true;
            btnLaunch.style.background = '#555';
            btnLaunch.style.borderColor = '#555';
            btnLaunch.style.color = '#aaa';
            btnLaunch.style.cursor = 'not-allowed';
        }
    }
}

function cycleTank(playerNum, dir) {
    if (typeof tanksData === 'undefined') return;
    
    // Prevent players from changing each other's tanks online
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame) {
        if (isHost && playerNum === 2) return;
        if (!isHost && playerNum === 1) return;
    }

    if (playerNum === 1 && !p1Ready) {
        do {
            p1Selection = (p1Selection + dir + tanksData.length) % tanksData.length;
        } while (tanksData[p1Selection].npcOnly);
    }
    else if (playerNum === 2 && !p2Ready) {
        do {
            p2Selection = (p2Selection + dir + tanksData.length) % tanksData.length;
        } while (tanksData[p2Selection].npcOnly);
    }
    updateDisplays();

    // Broadcast change to the other player via internet
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame && typeof socket !== 'undefined') {
        socket.emit('syncSelection', { roomId: myRoomCode, p1Selection, p2Selection, selectedMapIndex, p1Ready, p2Ready });
    }
}

function cycleMap(dir) {
    if (gameMode === 'RAID') return; 
    if (typeof mapsData === 'undefined') return;
    
    // Only Host can change map
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !isHost) return;

    do {
        selectedMapIndex = (selectedMapIndex + dir + mapsData.length) % mapsData.length;
    } while (selectedMapIndex === 2);
    
    currentMap = mapsData[selectedMapIndex];
    
    const mapNameDisplay = document.getElementById('map-name-display') || document.getElementById('map-name');
    if (mapNameDisplay) {
        mapNameDisplay.innerText = (mapNameDisplay.id === 'map-name' ? 'MAP: ' : '') + currentMap.name;
    }
    drawMinimap();

    if (typeof isOnlineGame !== 'undefined' && isOnlineGame && typeof socket !== 'undefined') {
        socket.emit('syncSelection', { roomId: myRoomCode, p1Selection, p2Selection, selectedMapIndex, p1Ready, p2Ready });
    }
}

function drawMinimap() {
    const mCanvas = document.getElementById('minimapCanvas');
    if(!mCanvas) return;
    const mCtx = mCanvas.getContext('2d');
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    
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
    if (typeof tanksData === 'undefined') return;
    
    const t1 = tanksData[p1Selection];
    if (t1) {
        const p1Display = document.getElementById('p1-display');
        if (p1Display) p1Display.innerHTML = `<img src="${t1.img.src}"><h2>${t1.name}</h2><p style="font-size:0.8rem; color:#ccc;">${t1.desc}</p>`;
        
        const p1Name = document.getElementById('p1-name');
        if (p1Name) p1Name.innerText = t1.name;
        
        const p1Preview = document.getElementById('p1-preview');
        if (p1Preview && t1.img && t1.img.src) {
            p1Preview.innerHTML = `<img src="${t1.img.src}" style="width:100%; height:100%; object-fit:contain; padding:10px; box-sizing:border-box;">`;
        }
    }
    
    const t2 = tanksData[p2Selection];
    if (t2) {
        const p2Display = document.getElementById('p2-display');
        if (p2Display) p2Display.innerHTML = `<img src="${t2.img.src}"><h2>${t2.name}</h2><p style="font-size:0.8rem; color:#ccc;">${t2.desc}</p>`;
        
        const p2Name = document.getElementById('p2-name');
        if (p2Name) p2Name.innerText = t2.name;
        
        const p2Preview = document.getElementById('p2-preview');
        if (p2Preview && t2.img && t2.img.src) {
            p2Preview.innerHTML = `<img src="${t2.img.src}" style="width:100%; height:100%; object-fit:contain; padding:10px; box-sizing:border-box;">`;
        }
    }
}

function toggleReady(playerNum) {
    // Prevent clicking the other person's ready button online
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame) {
        if (isHost && playerNum === 2) return;
        if (!isHost && playerNum === 1) return;
    }

    if (playerNum === 1) {
        p1Ready = true;
        const btnP1Ready = document.getElementById('btn-p1-ready');
        if (btnP1Ready) btnP1Ready.style.display = 'none';
        const p1ReadyText = document.getElementById('p1-ready-text');
        if (p1ReadyText) p1ReadyText.style.display = 'block';
        const p1Panel = document.getElementById('p1-panel');
        if (p1Panel) p1Panel.style.borderColor = '#00ff00';
    } else {
        p2Ready = true;
        const btnP2Ready = document.getElementById('btn-p2-ready');
        if (btnP2Ready) btnP2Ready.style.display = 'none';
        const p2ReadyText = document.getElementById('p2-ready-text');
        if (p2ReadyText) p2ReadyText.style.display = 'block';
        const p2Panel = document.getElementById('p2-panel');
        if (p2Panel) p2Panel.style.borderColor = '#00ff00';
    }
    
    // Broadcast ready state
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame && typeof socket !== 'undefined') {
        socket.emit('syncSelection', { roomId: myRoomCode, p1Selection, p2Selection, selectedMapIndex, p1Ready, p2Ready });
    }

    // See if the START button should unlock
    checkAllReady();
}

function updateHUD() {
    if (typeof players === 'undefined') return;
    
    // Player 1 HP Updates
    if (players[0] && !players[0].isDead) {
        const p1Hp = document.getElementById('p1-hp');
        const p1Trail = document.getElementById('p1-hp-trail');
        if (p1Hp) {
            let percent = Math.min(100, Math.max(0, (players[0].hp / players[0].maxHp) * 100)) + '%'; 
            p1Hp.style.width = percent;
            if(p1Trail) p1Trail.style.width = percent; // Trail follows naturally due to CSS transition delay
            p1Hp.style.background = (players[0].hp / players[0].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
        }
    } else if (players[0]) {
        const p1Hp = document.getElementById('p1-hp');
        const p1Trail = document.getElementById('p1-hp-trail');
        if (p1Hp) p1Hp.style.width = '0%';
        if (p1Trail) p1Trail.style.width = '0%';
    }
    
    if (gameMode === 'RAID') {
        const hudP2Box = document.getElementById('hud-p2-box');
        if (hudP2Box) hudP2Box.style.display = 'none';
        const hudScore = document.getElementById('hud-score');
        if (hudScore) hudScore.style.display = 'none';
        const p2Skills = document.getElementById('p2-skills');
        if (p2Skills) p2Skills.style.display = 'none';
    } else {
        // Player 2 HP Updates
        if (players[1] && !players[1].isDead) {
            const p2Hp = document.getElementById('p2-hp');
            const p2Trail = document.getElementById('p2-hp-trail');
            if (p2Hp) {
                let percent = Math.min(100, Math.max(0, (players[1].hp / players[1].maxHp) * 100)) + '%'; 
                p2Hp.style.width = percent;
                if(p2Trail) p2Trail.style.width = percent;
                p2Hp.style.background = (players[1].hp / players[1].maxHp) > 0.3 ? '#00ff00' : '#ff0000';
            }
        } else if (players[1]) {
            const p2Hp = document.getElementById('p2-hp');
            const p2Trail = document.getElementById('p2-hp-trail');
            if (p2Hp) p2Hp.style.width = '0%';
            if (p2Trail) p2Trail.style.width = '0%';
        }
    }
}

function updateCooldownUI() {
    if (typeof players === 'undefined') return;
    const now = Date.now();
    
    players.forEach((p, index) => {
        if (p.isAI) return;
        
        const pPrefix = index === 0 ? 'p1' : 'p2';
        const skills = ['c', 'x', 'z'];
        
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

// --- AUTOMATIC COMPATIBILITY BINDINGS ---
window.addEventListener('DOMContentLoaded', () => {
    const btnP1Next = document.getElementById('btn-p1-next');
    if (btnP1Next) btnP1Next.onclick = () => cycleTank(1, 1);

    const btnP2Next = document.getElementById('btn-p2-next');
    if (btnP2Next) btnP2Next.onclick = () => cycleTank(2, 1);

    const btnP1Ready = document.getElementById('btn-p1-ready');
    if (btnP1Ready) btnP1Ready.onclick = () => toggleReady(1);
    
    const btnP2Ready = document.getElementById('btn-p2-ready');
    if (btnP2Ready) btnP2Ready.onclick = () => toggleReady(2);

    const btnMapSelect = document.getElementById('btn-map-select');
    if (btnMapSelect) btnMapSelect.onclick = () => cycleMap(1);

    // Networked Launch Logic
    const btnLaunch = document.getElementById('btn-launch-game');
    if (btnLaunch) {
        btnLaunch.onclick = () => {
            if (btnLaunch.disabled) return;
            if (typeof isOnlineGame !== 'undefined' && isOnlineGame && typeof socket !== 'undefined') {
                if (isHost) {
                    socket.emit('launchGame', myRoomCode);
                    if (typeof startGame === 'function') startGame();
                }
            } else {
                if (typeof startGame === 'function') startGame();
            }
        };
    }

    const btnToggleAI = document.getElementById('btn-toggle-ai');
    if (btnToggleAI) {
        btnToggleAI.onclick = () => {
            if (gameMode === 'ARCADE') {
                gameMode = '2P';
                btnToggleAI.innerText = "Toggle AI: OFF";
            } else {
                gameMode = 'ARCADE';
                btnToggleAI.innerText = "Toggle AI: ON";
            }
            startMode(gameMode);
        };
    }
});
