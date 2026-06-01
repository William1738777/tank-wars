// --- GLOBAL VARIABLES & STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let frameCount = 0; 

let gameState = 'MENU'; 
let p1Selection = 0, p2Selection = 5; // Default P2 to Destroyer!
let p1Ready = false, p2Ready = false;
let selectedMapIndex = 0; let currentMap = mapsData[selectedMapIndex];
let players = []; let p1Score = 0; let p2Score = 0;
let projectiles = []; let particles = []; let flashes = []; let hazards = []; let floatingTexts = []; 

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function distToSegment(p, v, w) {
    let l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

// --- ENGINE LOGIC ---
function startGame() {
    document.getElementById('select-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('p1-skills').style.display = 'flex'; document.getElementById('p2-skills').style.display = 'flex';
    
    p1Score = 0; p2Score = 0; frameCount = 0;
    
    players = [
        new Tank(1, tanksData[p1Selection], spawnPoints[0].x, spawnPoints[0].y, 0, {up:'w', down:'s', left:'a', right:'d', c:'c', x:'x', z:'z'}, false),
        new Tank(2, tanksData[p2Selection], spawnPoints[3].x, spawnPoints[3].y, Math.PI, {up:'arrowup', down:'arrowdown', left:'arrowleft', right:'arrowright', c:'\'', x:';', z:'l'}, gameMode === 'ARCADE')
    ];
    
    projectiles = []; particles = []; flashes = []; hazards = []; floatingTexts = [];
    gameState = 'PLAYING'; updateHUD();
}

function handleDeath(loserIndex) {
    let winnerIndex = loserIndex === 0 ? 1 : 0;
    if (winnerIndex === 0) p1Score++; else p2Score++;
    
    document.getElementById('score-p1').innerText = p1Score; document.getElementById('score-p2').innerText = p2Score;
    
    if (p1Score >= 3 || p2Score >= 3) {
        gameState = 'OVER'; const winnerText = p1Score >= 3 ? "PLAYER 1" : "PLAYER 2";
        document.getElementById('victory-title').innerText = `${winnerText} WINS!`;
        document.getElementById('victory-title').style.color = p1Score >= 3 ? '#00aaff' : '#ff3333';
        setTimeout(() => document.getElementById('victory-screen').style.display = 'flex', 1500);
    } else {
        setTimeout(() => {
            let loser = players[loserIndex]; let winner = players[winnerIndex];
            let bestSpawn = spawnPoints[0]; let maxDist = -1;
            for(let sp of spawnPoints) { let dist = Math.hypot(sp.x - winner.x, sp.y - winner.y); if (dist > maxDist) { maxDist = dist; bestSpawn = sp; } }
            
            loser.x = bestSpawn.x; loser.y = bestSpawn.y;
            loser.hp = loser.maxHp; loser.isDead = false; loser.poisons = []; loser.stunTimer = 0;
            loser.hookState = 'ready'; loser.dashState = 0; loser.burstsLeft = 0; loser.flameTimer = 0;
            loser.mgAmmo = loser.mgMaxAmmo; loser.mgReloading = false; loser.invulnTimer = 90; 
            loser.kbX = 0; loser.kbY = 0; loser.kbTimer = 0; loser.electrocutedTimer = 0;
            loser.energy = 0; loser.zReady = false; loser.zFiring = false; loser.zChargeTimer = 0; loser.cShots = 0;
            
            // Reset Destroyer variables
            loser.destroAiming = false; loser.destroLocked = false; loser.destroAimDist = 100;
            loser.afterStunSlow = 0; loser.destroSlowTimer = 0; loser.kbType = null;
            
            updateHUD();
        }, 1500); 
    }
}

function createKaboom(x, y, scale = 1.0) {
    flashes.push({ x, y, radius: 5*scale, maxRadius: 30*scale, life: 1.0 });
    for (let i = 0; i < 25*scale; i++) {
        const isSmoke = Math.random() > 0.5;
        particles.push({ x, y, vx: (Math.random()-0.5)*(isSmoke?6:12)*scale, vy: (Math.random()-0.5)*(isSmoke?6:12)*scale, life: 1.0, size: (Math.random()*4 + 2)*scale, color: isSmoke ? '#444' : (Math.random() > 0.5 ? '#ff3300' : '#ffaa00') });
    }
}

function createParticles(x, y, count, color, sizeMultiplier=1, lifeMultiplier=1) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: (Math.random()*0.5 + 0.5)*lifeMultiplier, size: (Math.random()*3 + 1)*sizeMultiplier, color });
}

function createMuzzleFlash(x, y, angle, size=1) {
    for (let i = 0; i < 8*size; i++) {
        const speed = (Math.random() + 0.5) * 5; const pAngle = angle + (Math.random() - 0.5) * 0.5;
        particles.push({ x, y, vx: Math.cos(pAngle)*speed, vy: Math.sin(pAngle)*speed, life: Math.random()*0.3 + 0.2, size: Math.random()*3*size + 1, color: 'rgba(200, 200, 200, 0.6)' });
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++; players.forEach(p => p.update());

    if (players[0] && players[1] && !players[0].isDead && !players[1].isDead) {
        let dx = players[1].x - players[0].x; let dy = players[1].y - players[0].y;
        let dist = Math.hypot(dx, dy); let minDist = players[0].radius + players[1].radius;
        if (dist < minDist) {
            let overlap = minDist - dist; let nx = dx / dist; let ny = dy / dist;
            players[0].x -= nx * (overlap / 2); players[0].y -= ny * (overlap / 2);
            players[1].x += nx * (overlap / 2); players[1].y += ny * (overlap / 2);
        }
    }

    updateHUD(); updateCooldownUI();

    for (let i = hazards.length - 1; i >= 0; i--) {
        let h = hazards[i];
        
        if (h.type === 'mine') {
            h.age++; if (h.age > 120 && !h.triggering) h.visible = false;
            
            if (h.triggering) {
                h.triggerTimer--;
                if (h.triggerTimer % 5 === 0) createParticles(h.x, h.y, 2, '#ff0000', 1.5, 0.2);
                if (h.triggerTimer <= 0) {
                    players.forEach((tank, tIndex) => {
                        if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0) {
                            if (Math.hypot(tank.x - h.x, tank.y - h.y) < tank.radius + h.radius + 30) {
                                tank.hp -= 20; let angle = Math.atan2(tank.y - h.y, tank.x - h.x);
                                tank.kbX = Math.cos(angle) * 15; tank.kbY = Math.sin(angle) * 15; tank.kbTimer = 15; 
                                tank.stunTimer = 75; floatingTexts.push({x: tank.x, y: tank.y - 40, text: "BLASTED!", life: 60, color: '#ff3333'});
                            }
                        }
                    });
                    createKaboom(h.x, h.y, 2.0); h.life = 0; 
                }
            } else {
                players.forEach(tank => {
                    if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0) {
                        if (Math.hypot(tank.x - h.x, tank.y - h.y) < tank.radius + h.radius) { h.triggering = true; h.visible = true; h.triggerTimer = 15; }
                    }
                });
            }
        }
        
        if (h.type === 'seraph_emitter' && h.life % 60 === 0) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) projectiles.push(new Projectile(h.owner, h.x, h.y, angle, 6, 3, 1.5, '#00ffff', 'seraph_spark', 1));
            createParticles(h.x, h.y, 8, '#00ffff', 1.5, 0.3);
        }

        // --- DESTROYER STRIKE MANAGER ---
        if (h.type === 'destro_strike_manager') {
            if (h.state === 'launching') {
                h.timer--;
                let moving = false;
                if (h.tank && !h.tank.isDead) moving = keys[h.tank.controls.up] || keys[h.tank.controls.down] || keys[h.tank.controls.left] || keys[h.tank.controls.right];
                else moving = true; 

                if (moving || h.targets.length === 0) {
                    h.state = 'falling'; h.timer = 60; // 1 second delay before they plummet
                } else if (h.timer <= 0) {
                    h.timer = Math.floor(Math.random() * 12 + 18); // 0.3-0.5s stagger
                    let t = h.targets.pop(); h.launched.push(t);
                    projectiles.push(new Projectile(h.owner, h.tank.x, h.tank.y - 10, -Math.PI/2, 15, 2, 0, '#fff', 'destro_up', 0));
                    createMuzzleFlash(h.tank.x, h.tank.y - 10, -Math.PI/2, 1.5);
                }
            } else if (h.state === 'falling') {
                h.timer--;
                if (h.timer <= 0) {
                    h.launched.forEach(t => {
                        let p = new Projectile(h.owner, t.x, t.y - 800, Math.PI/2, 20, 8, 12, '#ff4500', 'destro_rocket', 0);
                        p.targetY = t.y; projectiles.push(p);
                    });
                    h.life = 0; // Strike complete
                }
            }
        }
        
        h.life--; if (h.life <= 0) hazards.splice(i, 1);
    }

    for (let i = 0; i < projectiles.length; i++) {
        let pA = projectiles[i]; if (pA.dead) continue;
        pA.update();

        // Destroyer Rockets and Up-visuals don't hit tanks mid-air
        if (pA.type === 'destro_rocket' || pA.type === 'destro_up') continue;

        players.forEach((tank, tIndex) => {
            if (pA.owner !== tank.owner && !pA.dead && !tank.isDead && tank.invulnTimer <= 0) {
                if (Math.hypot(pA.x - tank.x, pA.y - tank.y) < tank.radius + pA.radius) {
                    let startHp = tank.hp;

                    if (pA.type.startsWith('seraph_')) tank.electrocutedTimer = 30;

                    if (pA.type === 'toxic_bullet') { tank.hp -= pA.damage; tank.addPoison(0.5, 300); } 
                    else if (pA.type === 'arrow') {
                        tank.hp -= pA.damage; tank.addPoison(1.0, 300); floatingTexts.push({x: tank.x, y: tank.y - 40, text: "HOOKED!", life: 50, color: '#00ff66'});
                        let ownerTank = players.find(p => p.owner === pA.owner);
                        if (ownerTank) { ownerTank.hookState = 'pulling'; ownerTank.hookTarget = tank; ownerTank.hookTimer = 60; }
                    } else if (pA.type === 'seraph_spark') {
                        tank.hp -= pA.damage;
                        if (Math.random() < 0.10) { tank.stunTimer = Math.max(tank.stunTimer, 30); floatingTexts.push({x: tank.x, y: tank.y - 40, text: "ZAPPED!", life: 40, color: '#00ffff'}); }
                    } else if (pA.type === 'destro_missile') {
                        tank.hp -= pA.damage; tank.kbX = Math.cos(pA.angle) * 20; tank.kbY = Math.sin(pA.angle) * 20; tank.kbTimer = 15; tank.kbType = 'wall_slam';
                    } else { tank.hp -= pA.damage; }

                    if (tank.hp < startHp) { let ownerTank = players.find(p => p.owner === pA.owner); if (ownerTank && ownerTank.config.id === 'seraph' && !ownerTank.zReady) ownerTank.energy = Math.min(100, ownerTank.energy + 5); }
                    pA.triggerExplosion();
                }
            }
        });

        for (let j = i + 1; j < projectiles.length; j++) {
            let pB = projectiles[j]; if (pA.dead || pB.dead) continue;
            if (pA.owner !== pB.owner) {
                if (Math.hypot(pA.x - pB.x, pA.y - pB.y) < pA.radius + pB.radius + 5) { 
                    if (pA.type === 'mg' && pB.type !== 'mg') { pA.triggerExplosion(); pB.projectileHp--; if (pB.projectileHp <= 0) pB.triggerExplosion(); } 
                    else if (pB.type === 'mg' && pA.type !== 'mg') { pB.triggerExplosion(); pA.projectileHp--; if (pA.projectileHp <= 0) pA.triggerExplosion(); } 
                    else if (pA.type !== 'mg' && pB.type !== 'mg') { pA.triggerExplosion(); pB.triggerExplosion(); }
                }
            }
        }
    }
    
    projectiles = projectiles.filter(p => !p.dead);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.04; }); particles = particles.filter(p => p.life > 0);
    flashes.forEach(f => { f.radius += 2; f.life -= 0.1; }); flashes = flashes.filter(f => f.life > 0);
    floatingTexts.forEach(t => { t.y -= 0.5; t.life--; }); floatingTexts = floatingTexts.filter(t => t.life > 0);
}

function draw() {
    if (gameState === 'MENU' || gameState === 'SELECT') return;

    if (images[currentMap.bgImg].complete) ctx.drawImage(images[currentMap.bgImg], 0, 0, canvas.width, canvas.height);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);

    hazards.forEach(h => {
        if (h.type === 'poison_pool' && images.goo.complete) {
            ctx.save(); ctx.translate(h.x, h.y); ctx.globalAlpha = Math.min(h.life / 60, 0.8);
            let drawRadius = h.radius * (1 + Math.sin(h.life * 0.05) * 0.05);
            ctx.drawImage(images.goo, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2); ctx.restore();
        } else if (h.type === 'mine' && h.visible !== false) {
            ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI*2); ctx.fillStyle = '#654321'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#222'; ctx.stroke();
            ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.35, 0, Math.PI*2);
            ctx.fillStyle = h.triggering ? (Math.floor(Date.now() / 50) % 2 === 0 ? '#fff' : '#ff0000') : (Math.floor(Date.now() / 200) % 2 === 0 ? '#ff0000' : '#550000'); ctx.fill();
        } else if (h.type === 'seraph_aoe') {
            ctx.save(); ctx.translate(h.x, h.y); ctx.globalAlpha = Math.min(h.life / 60, 0.6);
            ctx.beginPath(); ctx.arc(0, 0, h.radius, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; ctx.fill(); ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.stroke();
            if (Math.random() > 0.5) { ctx.beginPath(); ctx.moveTo((Math.random()-0.5)*h.radius, (Math.random()-0.5)*h.radius); ctx.lineTo((Math.random()-0.5)*h.radius, (Math.random()-0.5)*h.radius); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
            ctx.restore();
        } else if (h.type === 'seraph_emitter') {
            ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.fill();
        } else if (h.type === 'destro_strike_manager' && images.target.complete) {
            // Draw the target markers pulsating
            h.launched.forEach(t => {
                let size = 30 + Math.sin(Date.now() / 100) * 5;
                ctx.drawImage(images.target, t.x - size/2, t.y - size/2, size, size);
            });
        }
    });

    players.forEach(p => {
        if (p.config.id === 'scorpion' && !p.isDead) {
            ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            if (p.hookState === 'fired' && p.activeArrow && !p.activeArrow.dead) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.activeArrow.x, p.activeArrow.y); ctx.stroke(); } 
            else if (p.hookState === 'pulling' && p.hookTarget && !p.hookTarget.isDead) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.hookTarget.x, p.hookTarget.y); ctx.stroke(); }
            ctx.setLineDash([]); 
        }
    });

    ctx.fillStyle = '#222'; ctx.strokeStyle = '#5c3a92'; ctx.lineWidth = 2;
    currentMap.walls.forEach(w => { ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); });
    
    currentMap.rocks.forEach(r => {
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.fillStyle = '#4a3c31'; ctx.fill(); ctx.strokeStyle = '#2a1c11'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(r.x - r.r*0.2, r.y - r.r*0.2, r.r*0.4, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
    });

    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); });
    flashes.forEach(f => { ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1.0;

    projectiles.forEach(p => p.draw()); players.forEach(p => p.draw());

    players.forEach(p => {
        if (p.config.id === 'seraph' && p.zFiring && p.beamEndX !== undefined && !p.isDead) {
            ctx.beginPath(); ctx.moveTo(p.beamStartX, p.beamStartY); ctx.lineTo(p.beamEndX, p.beamEndY); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10 + Math.random() * 5; ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.beamStartX, p.beamStartY); ctx.lineTo(p.beamEndX, p.beamEndY); ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 4; ctx.shadowBlur = 0; ctx.stroke();
        }
    });

    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    floatingTexts.forEach(t => { ctx.fillStyle = t.color || '#fff'; ctx.globalAlpha = Math.max(0, t.life / 60); ctx.fillText(t.text, t.x, t.y); });
    ctx.globalAlpha = 1.0;
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
