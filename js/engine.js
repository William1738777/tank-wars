// --- GLOBAL VARIABLES & STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let frameCount = 0; 

let gameState = 'MENU'; 
let p1Selection = 0, p2Selection = 5; 
let p1Ready = false, p2Ready = false;
let selectedMapIndex = 0; let currentMap = mapsData[selectedMapIndex];
let players = []; let p1Score = 0; let p2Score = 0;
let projectiles = []; let particles = []; let flashes = []; let hazards = []; let floatingTexts = []; 

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Dynamically load the PNG for the Abyssal Domain overlay
if (typeof images !== 'undefined' && !images.auraThing) {
    images.auraThing = new Image();
    images.auraThing.src = 'aurathing.png';
}

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
            
            loser.destroAiming = false; loser.destroLocked = false; loser.destroAimDist = 100;
            loser.afterStunSlow = 0; loser.destroSlowTimer = 0; loser.kbType = null;
            
            // Reset Pyro specials
            loser.fireShieldActive = false;
            loser.isGhosting = false;
            loser.fireTrailTicks = 0;

            // Reset Phantom specials
            loser.phantomEvasiveTimer = 0;
            loser.isGhost = false; 
            loser.ghostToggleTimer = 0;
            loser.phantomMarks = 0;
            loser.phantomMarkTimer = 0;
            loser.phantomShockTimer = 0;
            
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
    players.forEach(p => p.inFireTrail = false); 

    if (players[0] && players[1] && !players[0].isDead && !players[1].isDead) {
        if (!players[0].isGhosting && !players[1].isGhosting) {
            let dx = players[1].x - players[0].x; let dy = players[1].y - players[0].y;
            let dist = Math.hypot(dx, dy); let minDist = players[0].radius + players[1].radius;
            if (dist < minDist) {
                let overlap = minDist - dist; let nx = dx / dist; let ny = dy / dist;
                players[0].x -= nx * (overlap / 2); players[0].y -= ny * (overlap / 2);
                players[1].x += nx * (overlap / 2); players[1].y += ny * (overlap / 2);
            }
        }
    }

    updateHUD(); updateCooldownUI();

    for (let i = hazards.length - 1; i >= 0; i--) {
        let h = hazards[i];
        
        // Hazard Particle initialization and physics
        if (h.type === 'dark_boom') {
            if (!h.initialized) {
                h.particles = [];
                for (let j = 0; j < 35; j++) {
                    const isSmoke = Math.random() > 0.5;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (Math.random() * 9) + 4;
                    let pColor = isSmoke ? (Math.random() > 0.5 ? '#000000' : '#1a1a1a') : (Math.random() > 0.5 ? '#ff0000' : '#8b0000');
                    h.particles.push({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, x: 0, y: 0, size: Math.random() * 7 + 3, color: pColor });
                }
                h.initialized = true;
            } else {
                h.particles.forEach(part => {
                    part.x += part.vx; part.y += part.vy;
                    part.vx *= 0.92; part.vy *= 0.92;
                });
            }
        } else if (h.type === 'abyss_domain') {
            if (!h.initialized) {
                h.particles = [];
                for (let j = 0; j < 45; j++) {
                    h.particles.push({
                        angle: Math.random() * Math.PI * 2,
                        radius: 120 + Math.random() * 100,
                        speed: (Math.random() * 0.03) + 0.01,
                        size: Math.random() * 6 + 2,
                        isBlack: Math.random() > 0.4 
                    });
                }
                h.initialized = true;
            } else {
                h.particles.forEach(p => {
                    p.angle -= p.speed; 
                    p.radius -= 0.5; 
                    if (p.radius < 30) p.radius = h.radius * 0.9 + Math.random() * 50; 
                });
            }
            
            h.tickTimer--;
            players.forEach(tank => {
                if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0) {
                    if (Math.hypot(tank.x - h.x, tank.y - h.y) < h.radius) {
                        tank.hp -= h.dps / 60;
                        if (h.tickTimer <= 0) {
                            tank.hp -= 2; 
                            floatingTexts.push({x: tank.x, y: tank.y - 40, text: "DOMAIN BURST!", life: 40, color: '#ff3333'});
                        }
                    }
                }
            });

            if (h.tickTimer <= 0) {
                h.dps *= 2; 
                h.tickTimer = 120; 
                h.shockwaves = h.shockwaves || [];
                h.shockwaves.push({ life: 60, maxLife: 60 });
            }
            if (h.shockwaves) {
                h.shockwaves.forEach(s => s.life--);
                h.shockwaves = h.shockwaves.filter(s => s.life > 0);
            }
        } else if (h.type === 'black_hole') {
            players.forEach(tank => {
                if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0) {
                    let dx = h.x - tank.x; let dy = h.y - tank.y;
                    let dist = Math.hypot(dx, dy);
                    // Add "&& dist > 0.1" to prevent the NaN coordinate corruption
                    if (dist < h.radius && dist > 0.1) {
                        tank.x += (dx / dist) * 2;
                        tank.y += (dy / dist) * 2;
                        tank.hp -= 1 / 60;
                    }
                }
            });
            if (h.life <= 1) { 
                hazards.push({ owner: h.owner, type: 'dark_boom', x: h.x, y: h.y, radius: 0, life: 60, maxLife: 60 });
                players.forEach(tank => {
                    if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0 && Math.hypot(tank.x - h.x, tank.y - h.y) < h.radius) {
                        tank.hp -= 5;
                        floatingTexts.push({x: tank.x, y: tank.y - 40, text: "EVENT HORIZON!", life: 50, color: '#ff0000'});
                    }
                });
            }
        }
        
        if (h.type === 'fire_trail') {
            players.forEach(tank => {
                if (tank.owner !== h.owner && !tank.isDead && tank.invulnTimer <= 0) {
                    if (Math.hypot(tank.x - h.x, tank.y - h.y) < tank.radius + h.radius) tank.inFireTrail = true;
                }
            });
        } else if (h.type === 'mine') {
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
        } else if (h.type === 'seraph_emitter' && h.life % 60 === 0) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) projectiles.push(new Projectile(h.owner, h.x, h.y, angle, 6, 3, 1.5, '#00ffff', 'seraph_spark', 1));
            createParticles(h.x, h.y, 8, '#00ffff', 1.5, 0.3);
        } else if (h.type === 'destro_strike_manager') {
            if (h.state === 'launching') {
                h.timer--;
                let moving = false;
                if (h.tank && !h.tank.isDead) moving = keys[h.tank.controls.up] || keys[h.tank.controls.down] || keys[h.tank.controls.left] || keys[h.tank.controls.right];
                else moving = true; 

                if (moving) {
                    h.state = 'falling_delay'; h.timer = 48;
                } else if (h.timer <= 0) {
                    h.timer = 5; 
                    if (h.targets.length > 0) {
                        let t = h.targets.pop(); h.launched.push(t);
                        projectiles.push(new Projectile(h.owner, h.tank.x, h.tank.y - 10, -Math.PI/2, 18, 2, 0, '#fff', 'destro_up', 0));
                        createMuzzleFlash(h.tank.x, h.tank.y - 10, -Math.PI/2, 1.5);
                    }
                    if (h.targets.length === 0) { h.state = 'falling_delay'; h.timer = 48; }
                }
            } else if (h.state === 'falling_delay') {
                h.timer--;
                if (h.timer <= 0) { h.state = 'falling'; h.timer = 0; }
            } else if (h.state === 'falling') {
                h.timer--;
                if (h.timer <= 0) {
                    if (h.launched.length > 0) {
                        let t = h.launched.shift(); 
                        let p = new Projectile(h.owner, t.x, t.y - 800, Math.PI/2, 20, 8, 12, '#ff4500', 'destro_rocket', 0);
                        p.targetY = t.y; projectiles.push(p);
                        h.timer = Math.floor(Math.random() * 6 + 12); 
                    } else {
                        h.life = 0; 
                    }
                }
            }
        }
        
        h.life--; if (h.life <= 0) hazards.splice(i, 1);
    }

    players.forEach((tank, tIndex) => {
        if (tank.inFireTrail && tank.invulnTimer <= 0) {
            tank.fireTrailTicks++;
            let multiplier = Math.pow(1.2, Math.floor(tank.fireTrailTicks / 30));
            tank.hp -= (1 / 60) * multiplier;
            
            if (Math.random() < 0.1) createParticles(tank.x, tank.y, 1, '#ff3300', 1.5, 0.3);
            if (tank.hp <= 0 && !tank.isDead) { tank.isDead = true; createKaboom(tank.x, tank.y, 2.0 * tank.scaleMod); handleDeath(tIndex); }
        } else {
            tank.fireTrailTicks = 0;
        }
    });

    let processedShotgunCasts = [];

    for (let i = 0; i < projectiles.length; i++) {
        let pA = projectiles[i]; if (pA.dead) continue;
        pA.update();

        if (pA.type === 'destro_rocket' || pA.type === 'destro_up') continue;

        // Projectile vs Hazard (Void Orb Interception)
        hazards.forEach(h => {
            if (h.type === 'void_orb' && !pA.dead) {
                if (Math.hypot(pA.x - h.x, pA.y - h.y) < h.radius + pA.radius) {
                    if (pA.type === 'abyss_z') {
                        hazards.push({ owner: pA.owner, type: 'black_hole', x: h.x, y: h.y, radius: 150, life: 240 });
                        pA.triggerExplosion();
                        h.life = 0;
                    } else if (pA.type === 'abyss_rapid' && pA.owner === h.owner) {
                        h.orbHp -= 1;
                        pA.triggerExplosion();
                        createParticles(h.x, h.y, 3, '#ff0000', 1.5, 0.3);
                        if (h.orbHp <= 0) {
                            h.life = 0;
                            hazards.push({ owner: h.owner, type: 'abyss_domain', x: h.x, y: h.y, radius: 170, life: 720, dps: 0.5, tickTimer: 120 });
                            floatingTexts.push({x: h.x, y: h.y - 40, text: "DOMAIN EXPANSION!", life: 80, color: '#ff0000'});
                        }
                    } else if (pA.owner !== h.owner) {
                        h.orbHp -= pA.damage;
                        pA.triggerExplosion();
                        if (h.orbHp <= 0) {
                            h.life = 0;
                            hazards.push({ owner: h.owner, type: 'dark_boom', x: h.x, y: h.y, radius: 0, life: 60, maxLife: 60 });
                            floatingTexts.push({x: h.x, y: h.y - 40, text: "ORB DESTROYED!", life: 50, color: '#777'});
                        }
                    }
                }
            }
        });

        // Projectile vs Player
        players.forEach((tank, tIndex) => {
            if (pA.owner !== tank.owner && !pA.dead && !tank.isDead && tank.invulnTimer <= 0) {
                
                if (tank.config.id === 'phantom' && tank.isGhost) return;

                if (Math.hypot(pA.x - tank.x, pA.y - tank.y) < tank.radius + pA.radius) {
                    
                    let shooter = players.find(p => p.owner === pA.owner);
                    if (shooter && shooter.config.id === 'grizzly') playSound(sfx.tankHit);

                    let startHp = tank.hp;

                    if (tank.config.id === 'pyro' && tank.fireShieldActive) {
                        tank.fireShieldHp -= pA.damage;
                        floatingTexts.push({x: tank.x, y: tank.y - 40, text: "BLOCKED!", life: 20, color: '#ffaa00'});
                    } else {
                        if (pA.type.startsWith('seraph_')) tank.electrocutedTimer = 30;

                        if (pA.type === 'firebolt') {
                            tank.hp -= pA.damage;
                            let angle = Math.atan2(tank.y - pA.y, tank.x - pA.x);
                            tank.kbX = Math.cos(angle) * 12;
                            tank.kbY = Math.sin(angle) * 12;
                            tank.kbTimer = 15;
                            tank.fireSlowTimer = 90; 
                        } else if (pA.type === 'toxic_bullet') { 
                            tank.hp -= pA.damage; tank.addPoison(0.5, 300); 
                        } else if (pA.type === 'arrow') {
                            tank.hp -= pA.damage; tank.addPoison(1.0, 300); floatingTexts.push({x: tank.x, y: tank.y - 40, text: "HOOKED!", life: 50, color: '#00ff66'});
                            let ownerTank = players.find(p => p.owner === pA.owner);
                            if (ownerTank) { ownerTank.hookState = 'pulling'; ownerTank.hookTarget = tank; ownerTank.hookTimer = 60; }
                        } else if (pA.type === 'seraph_spark') {
                            tank.hp -= pA.damage;
                            if (Math.random() < 0.10) { tank.stunTimer = Math.max(tank.stunTimer, 30); floatingTexts.push({x: tank.x, y: tank.y - 40, text: "ZAPPED!", life: 40, color: '#00ffff'}); }
                        } else if (pA.type === 'destro_missile') {
                            tank.hp -= pA.damage; tank.kbX = Math.cos(pA.angle) * 20; tank.kbY = Math.sin(pA.angle) * 20; tank.kbTimer = 15; tank.kbType = 'wall_slam';
                        } else if (pA.type === 'abyss_z') {
                            tank.hp -= pA.damage;
                            if (pA.hasBounced) {
                                hazards.push({ owner: pA.owner, type: 'black_hole', x: tank.x, y: tank.y, radius: 150, life: 240 });
                            } else {
                                tank.isSlowed = true;
                                tank.afterStunSlow = Math.max(tank.afterStunSlow || 0, 180); 
                            }
                        } else if (pA.type === 'abyss_rapid') {
                            tank.hp -= pA.damage;
                            let angle = Math.atan2(tank.y - pA.y, tank.x - pA.x);
                            // Increased knockback multiplier from 1.5 to 3.0
                            tank.kbX = Math.cos(angle) * 3.0; 
                            tank.kbY = Math.sin(angle) * 3.0; 
                            tank.kbTimer = 5;
                        } else { 
                            tank.hp -= pA.damage; 
                        }

                        if (shooter && shooter.config.id === 'phantom') {
                            if (pA.type === 'phantom_bounce') shooter.cooldowns.c -= (shooter.maxCooldowns.c * 0.6); 
                            if (pA.type === 'phantom_sg') shooter.cooldowns.c -= 500; 
                            shooter.cooldowns.x -= 1000;

                            let applyMark = false;
                            if (pA.type === 'phantom_bounce') {
                                applyMark = true;
                            } else if (pA.type === 'phantom_sg') {
                                if (!processedShotgunCasts.includes(pA.castId)) {
                                    applyMark = true;
                                    processedShotgunCasts.push(pA.castId);
                                }
                            }

                            if (applyMark) {
                                tank.phantomMarkTimer = 300;
                                tank.phantomMarks++;

                                if (tank.phantomMarks >= 3) {
                                    tank.hp -= 5;
                                    tank.phantomMarks = 0; 
                                    tank.phantomShockTimer = 30;
                                    floatingTexts.push({ x: tank.x, y: tank.y - 55, text: "PLASMA ELECTROCUTION!", life: 60, color: '#9d00ff', fontSize: '14px' });
                                    createParticles(tank.x, tank.y, 10, '#9d00ff', 2, 0.5);
                                }
                            }
                        }
                    }

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
        if (h.type === 'fire_trail') {
            let lifeRatio = h.life / h.maxLife; 
            let p = 1 - lifeRatio; 
            ctx.save(); ctx.translate(h.x, h.y); ctx.globalCompositeOperation = 'screen';
            let scale = 1.0; let alpha = 1.0; let c1, c2, c3;
            if (p < 0.3) { scale = 1.2 - (0.2 * (p / 0.3)); alpha = 1.0 - (0.1 * (p / 0.3)); c1 = '#ffffff'; c2 = '#ffeb3b'; c3 = '#f44336'; } 
            else if (p < 0.7) { scale = 1.0 - (0.4 * ((p - 0.3) / 0.4)); alpha = 0.9 - (0.4 * ((p - 0.3) / 0.4)); c1 = '#ffeb3b'; c2 = '#ff9800'; c3 = '#8b0000'; } 
            else { scale = 0.6 - (0.4 * ((p - 0.7) / 0.3)); alpha = 0.5 - (0.5 * ((p - 0.7) / 0.3)); c1 = '#f44336'; c2 = '#8b0000'; c3 = 'transparent'; }
            ctx.globalAlpha = Math.max(0, alpha); let drawRad = h.radius * scale * 1.5; 
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, drawRad));
            grad.addColorStop(0, c1); grad.addColorStop(0.5, c2); grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, Math.max(1, drawRad), 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (h.type === 'poison_pool' && images.goo.complete) {
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
            h.launched.forEach(t => { let size = 30 + Math.sin(Date.now() / 100) * 5; ctx.drawImage(images.target, t.x - size/2, t.y - size/2, size, size); });
        } 
        // --- NEW: ABYSS CUSTOM VFX TRANSLATIONS ---
        else if (h.type === 'black_hole') {
            let age = 240 - h.life; 
            ctx.save(); ctx.translate(h.x, h.y);

            let grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
            grad.addColorStop(0, '#000000');
            grad.addColorStop(0.4, 'rgba(15, 0, 0, 0.95)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI*2); ctx.fill();

            let vibrateX = (Math.random() - 0.5) * 3;
            let vibrateY = (Math.random() - 0.5) * 3;
            ctx.shadowBlur = 40; ctx.shadowColor = '#ff0000';
            
            ctx.beginPath(); ctx.arc(vibrateX, vibrateY, 25, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
            ctx.beginPath(); ctx.arc(vibrateX, vibrateY, 40, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; ctx.fill();

            ctx.lineWidth = 3; ctx.lineCap = 'round';
            for (let i = 0; i < 24; i++) {
                let pAge = (age + i * 5) % 40; 
                let pRatio = pAge / 40; 
                let dist = (1 - pRatio) * 200; 
                let angle = (i * (Math.PI * 2) / 24) + (age * 0.01); 
                
                let startX = Math.cos(angle) * dist;
                let startY = Math.sin(angle) * dist;
                let streakLength = 15 + (1 - pRatio) * 30; 
                let endX = Math.cos(angle) * (dist + streakLength);
                let endY = Math.sin(angle) * (dist + streakLength);

                ctx.strokeStyle = pRatio < 0.2 ? '#ff3333' : '#ff0000';
                ctx.globalAlpha = Math.sin(pRatio * Math.PI); 
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
            }
            
            ctx.globalAlpha = 1; ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                let rAge = (age + i * 20) % 60;
                let radius = (1 - (rAge / 60)) * 180;
                ctx.strokeStyle = `rgba(255, 0, 0, ${rAge / 60})`;
                ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        } 
        else if (h.type === 'dark_boom') {
            let age = h.maxLife - h.life;
            let p = age / 60; 
            ctx.save(); ctx.translate(h.x, h.y);

            if (p <= 1) {
                if (age < 10) {
                    ctx.fillStyle = `rgba(255, 0, 0, ${1 - age/10})`;
                    ctx.beginPath(); ctx.arc(0, 0, 80 * (1 - age/10), 0, Math.PI*2); ctx.fill();
                }

                ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
                if (p < 0.6) {
                    let r1 = p * 400; 
                    ctx.strokeStyle = `rgba(255, 0, 0, ${1 - (p / 0.6)})`; ctx.lineWidth = 12 * (1 - (p / 0.6));
                    ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI*2); ctx.stroke();
                }
                if (p > 0.1 && p < 0.8) {
                    let r2 = (p - 0.1) * 350;
                    ctx.strokeStyle = `rgba(139, 0, 0, ${1 - ((p - 0.1) / 0.7)})`; ctx.lineWidth = 8 * (1 - ((p - 0.1) / 0.7));
                    ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI*2); ctx.stroke();
                }
            }

            if (h.particles) {
                ctx.shadowBlur = 10;
                h.particles.forEach(part => {
                    ctx.globalAlpha = Math.max(0, 1 - (age / 100)); 
                    ctx.fillStyle = part.color;
                    ctx.shadowColor = (part.color === '#000000' || part.color === '#1a1a1a') ? '#000' : '#ff0000';
                    ctx.beginPath(); ctx.arc(part.x, part.y, part.size, 0, Math.PI*2); ctx.fill();
                });
            }
            ctx.restore();
        } 
        else if (h.type === 'abyss_domain') {
            let age = 720 - h.life;
            ctx.save(); ctx.translate(h.x, h.y);

            let alpha = Math.min(1, age / 30);
            ctx.globalAlpha = alpha;

            let grad = ctx.createRadialGradient(0, 0, 50, 0, 0, h.radius);
            grad.addColorStop(0, '#000000');
            grad.addColorStop(0.7, 'rgba(15, 0, 0, 0.95)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, h.radius + 20, 0, Math.PI*2); ctx.fill();

            if (images.auraThing && images.auraThing.complete) {
                ctx.save();
                ctx.rotate(age * 0.005);
                ctx.filter = 'brightness(150%) contrast(150%) saturate(200%)'; 
                ctx.shadowBlur = 30 + Math.sin(age * 0.1) * 15; 
                ctx.shadowColor = '#ff0000';
                const drawSize = h.radius * 2; 
                ctx.drawImage(images.auraThing, -drawSize/2, -drawSize/2, drawSize, drawSize);
                
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.5 * alpha;
                ctx.drawImage(images.auraThing, -drawSize/2, -drawSize/2, drawSize, drawSize);
                ctx.restore();
            } else {
                ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
                ctx.save(); ctx.rotate(-age * 0.01); ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 4; ctx.setLineDash([25, 15, 5, 15]); ctx.beginPath(); ctx.arc(0, 0, h.radius * 0.8, 0, Math.PI*2); ctx.stroke(); ctx.restore();
            }

            ctx.shadowBlur = 40; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#000000';
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();

            if (h.particles) {
                ctx.shadowBlur = 10;
                h.particles.forEach(p => {
                    let wobbleDist = p.radius + Math.sin(age * 0.1 + p.angle) * 15;
                    let px = Math.cos(p.angle) * wobbleDist;
                    let py = Math.sin(p.angle) * wobbleDist;

                    ctx.fillStyle = p.isBlack ? '#000000' : '#8b0000';
                    ctx.shadowColor = p.isBlack ? 'transparent' : '#ff0000';

                    ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2); ctx.fill();
                    
                    if (p.isBlack) {
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(px, py);
                        ctx.lineTo(Math.cos(p.angle + 0.1) * (wobbleDist + 5), Math.sin(p.angle + 0.1) * (wobbleDist + 5));
                        ctx.stroke();
                    }
                });
            }
            ctx.restore();
        } 
        else if (h.type === 'void_orb') {
            if (images.abyssOrb && images.abyssOrb.complete) {
                ctx.save(); ctx.translate(h.x, h.y);
                ctx.rotate(Date.now() / 500);
                ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
                ctx.drawImage(images.abyssOrb, -20, -20, 40, 40);
                ctx.restore();
                ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; 
                ctx.fillText(Math.ceil(h.orbHp), h.x, h.y - 30);
            }
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

    ctx.textAlign = 'center';
    floatingTexts.forEach(t => { 
        ctx.font = t.fontSize ? `bold ${t.fontSize} sans-serif` : 'bold 20px sans-serif'; 
        ctx.fillStyle = t.color || '#fff'; 
        ctx.globalAlpha = Math.max(0, t.life / 60); 
        ctx.fillText(t.text, t.x, t.y); 
    });
    ctx.globalAlpha = 1.0;
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
