class Tank {
    class Tank {
    // Add "isAI = false" to the parameters
    constructor(owner, config, x, y, angle, controls, isAI = false) {
        this.owner = owner; 
        this.config = config; 
        this.x = x; 
        this.y = y; 
        this.angle = angle;
        this.isAI = isAI; // Save it to the tank
        // ... leave all the other constructor variables exactly as they are
        
        this.speed = 2.5 * (config.speedMod || 1); 
        this.rotSpeed = 0.045 * (config.speedMod || 1); 
        this.maxHp = config.maxHp || 100;
        this.hp = this.maxHp; 
        this.radius = 25 * (config.scaleMod || 1); 
        this.scaleMod = config.scaleMod || 1;
        
        this.controls = controls;
        this.isDead = false;
        this.invulnTimer = 0; 
        this.stunTimer = 0;
        this.recoil = 0;
        this.dashState = 0; this.dashTimer = 0;
        
        // Knockback forces & Electric FX
        this.kbX = 0; this.kbY = 0; this.kbTimer = 0;
        this.electrocutedTimer = 0;

        this.maxCooldowns = { 
            c: config.id === 'dreadnaught' ? 2000 : (config.id === 'seraph' ? 1750 : 1500), 
            x: config.id === 'scorpion' ? 9000 : 8000, 
            z: 10000 
        };
        this.cooldowns = { c: 0, x: 0, z: 0 };
        this.poisons = []; this.isSlowed = false;

        this.flameTimer = 0; 
        this.burstsLeft = 0; this.burstTimer = 0;
        this.hookState = 'ready'; this.hookTarget = null;
        this.hookTimer = 0; this.activeArrow = null; 

        this.mgMaxAmmo = config.id === 'dreadnaught' ? 150 : 100;
        this.mgAmmo = this.mgMaxAmmo;
        this.mgReloading = false;

        // Seraph Variables
        this.energy = 0;
        this.zReady = false;
        this.zFiring = false;
        this.zChargeTimer = 0;
        this.cShots = 0;
    }

    addPoison(dps, durationFrames) {
        this.poisons.push({ dps: dps, life: durationFrames });
    }

    update() {
        if (this.isDead) return;

        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.electrocutedTimer > 0) this.electrocutedTimer--;
        
        // Knockback resolution
        if (this.kbTimer > 0) {
            this.x += this.kbX;
            this.y += this.kbY;
            this.kbX *= 0.85; 
            this.kbY *= 0.85;
            this.kbTimer--;
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            if (this.stunTimer % 8 === 0) {
                createParticles(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, 2, '#00ffff', 1.2, 0.4);
            }
        }

        this.isSlowed = false;
        for (let i = this.poisons.length - 1; i >= 0; i--) {
            let p = this.poisons[i];
            this.hp -= p.dps / 60; 
            p.life--;
            if (p.life <= 0) this.poisons.splice(i, 1);
        }
        
        hazards.forEach(h => {
            if (h.owner !== this.owner && Math.hypot(this.x - h.x, this.y - h.y) < this.radius + h.radius) {
                if (h.type === 'poison_pool') {
                    this.hp -= 0.5 / 60; 
                    this.isSlowed = true; 
                } else if (h.type === 'seraph_aoe') {
                    this.isSlowed = true;
                    this.electrocutedTimer = Math.max(this.electrocutedTimer, 5);
                    if (h.life % 60 === 0) {
                        this.hp -= 2;
                        this.stunTimer = Math.max(this.stunTimer, 30);
                        floatingTexts.push({x: this.x, y: this.y - 40, text: "SHOCKED!", life: 40, color: '#00ffff'});
                        
                        let ownerTank = players.find(p => p.owner === h.owner);
                        if (ownerTank && ownerTank.config.id === 'seraph' && !ownerTank.zReady) {
                            ownerTank.energy = Math.min(100, ownerTank.energy + 5);
                        }
                    }
                }
            }
        });
        
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true; createKaboom(this.x, this.y, 2.0 * this.scaleMod); 
            handleDeath(this.owner === 1 ? 0 : 1); return; 
        }

        let currentSpeed = this.isSlowed ? this.speed * 0.5 : this.speed;

        // Pyro Dash & Flamethrower Buff 
        if (this.flameTimer > 0) {
            this.flameTimer--;
            currentSpeed *= 1.3;
            const tip = this.getTip();
            
            if (this.flameTimer % 2 === 0) {
                for(let i=0; i<3; i++) {
                    let pAngle = this.angle + (Math.random() - 0.5) * 0.7; 
                    let pSpeed = Math.random() * 6 + 3;
                    particles.push({
                        x: tip.x, y: tip.y, vx: Math.cos(pAngle)*pSpeed, vy: Math.sin(pAngle)*pSpeed,
                        life: Math.random() * 0.3 + 0.2, size: Math.random() * 8 + 4, color: Math.random() > 0.4 ? '#ff4500' : '#ffaa00'
                    });
                }
            }

            players.forEach(enemy => {
                if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                    let dx = enemy.x - tip.x; let dy = enemy.y - tip.y;
                    if (Math.hypot(dx, dy) < 100) { 
                        let angleToEnemy = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(Math.atan2(Math.sin(angleToEnemy - this.angle), Math.cos(angleToEnemy - this.angle)));
                        if (angleDiff < 0.8) { 
                            enemy.hp -= 3.5 / 60; 
                            updateHUD();
                            if (Math.random() > 0.7) createParticles(enemy.x, enemy.y, 1, '#ff4500', 1, 0.2); 
                            if (enemy.hp <= 0 && !enemy.isDead) {
                                enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1);
                            }
                        }
                    }
                }
            });
        }

        // Seraph Energy & Beam Logic
        if (this.config.id === 'seraph') {
            if (this.energy >= 100 && !this.zReady) {
                this.energy = 100;
                this.zReady = true;
            }

            if (this.zReady && keys[this.controls.z] && this.stunTimer <= 0 && this.dashState === 0) {
                this.zChargeTimer++;
                if (this.zChargeTimer > 0 && this.zChargeTimer < 30) {
                    const tip = this.getTip();
                    createParticles(tip.x + (Math.random()-0.5)*40, tip.y + (Math.random()-0.5)*40, 1, '#00ffff', 1, 0.2);
                }
                if (this.zChargeTimer >= 30) {
                    this.zFiring = true;
                    this.energy -= 10 / 60; 
                    if (this.energy <= 0) {
                        this.energy = 0;
                        this.zReady = false;
                        this.zFiring = false;
                        this.zChargeTimer = 0;
                    }
                }
            } else {
                this.zChargeTimer = 0;
                this.zFiring = false;
                if (this.energy <= 0) {
                    this.zReady = false;
                }
            }

            if (this.zFiring) {
                const tip = this.getTip();
                let endX = tip.x; let endY = tip.y;
                const maxBeamLength = 800;

                for (let i = 0; i < maxBeamLength; i += 5) {
                    let testX = tip.x + Math.cos(this.angle) * i;
                    let testY = tip.y + Math.sin(this.angle) * i;

                    let hitWall = false;
                    for (let w of currentMap.walls) {
                        if (testX >= w.x && testX <= w.x + w.w && testY >= w.y && testY <= w.y + w.h) { hitWall = true; break; }
                    }
                    if (hitWall) break;

                    let hitRock = false;
                    for (let r of currentMap.rocks) {
                        if (Math.hypot(testX - r.x, testY - r.y) <= r.r) { hitRock = true; break; }
                    }
                    if (hitRock) break;

                    endX = testX; endY = testY;
                }

                // Beam damages enemies
                players.forEach(enemy => {
                    if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                        let dist = distToSegment({x: enemy.x, y: enemy.y}, tip, {x: endX, y: endY});
                        if (dist < enemy.radius + 15) { 
                            if (frameCount % 30 === 0) { 
                                enemy.hp -= 2.0;
                                enemy.electrocutedTimer = 30; // Apply zap FX directly on hit
                                createParticles(enemy.x, enemy.y, 3, '#00ffff', 1.5, 0.3);
                                if (enemy.hp <= 0 && !enemy.isDead) {
                                    enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1);
                                }
                            }
                        }
                    }
                });

                this.beamStartX = tip.x; this.beamStartY = tip.y;
                this.beamEndX = endX; this.beamEndY = endY;
            }
        }

        if (this.hookState === 'pulling') {
            if (this.hookTarget && !this.hookTarget.isDead && this.hookTimer > 0) {
                let frontX = this.x + Math.cos(this.angle) * 55 * this.scaleMod;
                let frontY = this.y + Math.sin(this.angle) * 55 * this.scaleMod;
                let dx = frontX - this.hookTarget.x; let dy = frontY - this.hookTarget.y;
                let dist = Math.hypot(dx, dy);
                
                if (dist > 20) { 
                    this.hookTarget.x += (dx / dist) * 11; this.hookTarget.y += (dy / dist) * 11;
                    createParticles(this.hookTarget.x, this.hookTarget.y, 1, '#00ff66', 1, 0.3);
                } else {
                    this.hookState = 'ready'; this.hookTarget.stunTimer = 90; 
                    floatingTexts.push({x: this.hookTarget.x, y: this.hookTarget.y - 45, text: "JAMMED!", life: 75, color: '#00ffff'});
                    this.cooldowns.x = Date.now() + this.maxCooldowns.x; this.hookTarget = null;
                }
                this.hookTimer--;
                if (this.hookTimer <= 0 && this.hookState === 'pulling') {
                    this.hookState = 'ready';
                    if (this.hookTarget) this.hookTarget.stunTimer = 90;
                    this.cooldowns.x = Date.now() + this.maxCooldowns.x; this.hookTarget = null;
                }
            } else {
                this.hookState = 'ready'; this.hookTarget = null;
            }
        }

        if (this.config.id === 'dreadnaught') {
            const now = Date.now();
            if (this.mgReloading && now > this.cooldowns.x) {
                this.mgReloading = false;
                this.mgAmmo = this.mgMaxAmmo;
            }
            if (!this.mgReloading && keys[this.controls.x] && this.dashState === 0 && this.stunTimer <= 0) {
                if (now > this.cooldowns.x) this.fireMG(now);
            }
        }

        if (this.burstsLeft > 0 && this.stunTimer <= 0) {
            this.burstTimer--;
            if (this.burstTimer <= 0) {
                const tip = this.getTip();
                createMuzzleFlash(tip.x, tip.y, this.angle, 0.5);
                let spread = (Math.random() - 0.5) * 0.3; 
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle + spread, 14, 3, 3, '#00ff66', 'toxic_bullet', 0));
                this.burstsLeft--; this.burstTimer = 6; this.recoil = 2;
            }
        }

        if (this.dashState === 1 && this.stunTimer <= 0) {
            this.dashTimer--;
            createParticles(this.x - Math.cos(this.angle)*20, this.y - Math.sin(this.angle)*20, 2, this.config.color, 1, 0.5);
            if (this.dashTimer <= 0) {
                this.dashState = 2; this.dashTimer = 15; 
                createKaboom(this.x - Math.cos(this.angle)*25, this.y - Math.sin(this.angle)*25, 0.5); 
            }
            return; 
        }
        
        if (this.dashState === 2 && this.stunTimer <= 0) {
            currentSpeed = 12; this.dashTimer--;
            createParticles(this.x, this.y, 1, '#fff', 3, 0.4); 
            if (this.dashTimer <= 0) {
                this.dashState = 0;
                if (this.config.id === 'pyro') this.flameTimer = 180; 
            }
        }

        if (this.dashState !== 2 && this.hookState !== 'pulling' && this.stunTimer <= 0) { 
            if (keys[this.controls.left]) this.angle -= this.rotSpeed;
            if (keys[this.controls.right]) this.angle += this.rotSpeed;

            if (!this.zFiring) {
                let throttle = 0;
                if (keys[this.controls.up]) throttle += 1;
                if (keys[this.controls.down]) throttle -= 1;

                if (throttle !== 0) {
                    this.x += Math.cos(this.angle) * throttle * currentSpeed;
                    this.y += Math.sin(this.angle) * throttle * currentSpeed;
                }
            }
        } else if (this.dashState === 2) {
            this.x += Math.cos(this.angle) * currentSpeed; this.y += Math.sin(this.angle) * currentSpeed;
        }

        if (this.recoil > 0.1) {
            this.x -= Math.cos(this.angle) * this.recoil; this.y -= Math.sin(this.angle) * this.recoil;
            this.recoil *= 0.8;
        }

        this.checkWallCollisions();

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.dashState === 0 && this.stunTimer <= 0 && !this.zFiring) {
            const now = Date.now();
            
            if (keys[this.controls.c] && now > this.cooldowns.c && this.burstsLeft === 0) this.fireC(now);
            
            if (this.config.id !== 'dreadnaught') {
                if (keys[this.controls.x]) {
                    if (!this.xHeld) { this.fireX(now); this.xHeld = true; }
                } else { this.xHeld = false; }
            }

            if (this.config.id !== 'seraph') {
                if (keys[this.controls.z] && now > this.cooldowns.z) this.fireZ(now);
            }
        }
    }

    checkWallCollisions() {
        for (let w of currentMap.walls) {
            let testX = this.x; let testY = this.y;
            if (this.x < w.x) testX = w.x; else if (this.x > w.x + w.w) testX = w.x + w.w;
            if (this.y < w.y) testY = w.y; else if (this.y > w.y + w.h) testY = w.y + w.h;
            let distX = this.x - testX; let distY = this.y - testY;
            let distance = Math.hypot(distX, distY);
            if (distance < this.radius) {
                let push = this.radius - distance;
                let normX = distX / distance; let normY = distY / distance;
                this.x += normX * push; this.y += normY * push;
            }
        }
        
        for (let r of currentMap.rocks) {
            let dx = this.x - r.x;
            let dy = this.y - r.y;
            let dist = Math.hypot(dx, dy);
            if (dist < this.radius + r.r) {
                let push = (this.radius + r.r) - dist;
                this.x += (dx / dist) * push;
                this.y += (dy / dist) * push;
            }
        }
    }

    getTip() {
        const offset = (this.config.img.width * 0.12 * this.scaleMod) / 2;
        return { x: this.x + Math.cos(this.angle)*offset, y: this.y + Math.sin(this.angle)*offset };
    }

    fireC(now) {
        this.cooldowns.c = now + this.maxCooldowns.c; 
        this.recoil = 4;
        const tip = this.getTip();
        
        if (this.config.id === 'scorpion') {
            this.burstsLeft = 3; this.burstTimer = 0; 
        } else if (this.config.id === 'dreadnaught') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 11, 8, 14, '#ff4500', 'dread_c', 2));
        } else if (this.config.id === 'seraph') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            this.cShots++;
            let isFifth = (this.cShots % 5 === 0);
            let p = new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 5, '#00ffff', 'seraph_c', 1);
            p.isFifth = isFifth;
            projectiles.push(p);
        } else {
            createMuzzleFlash(tip.x, tip.y, this.angle);
            if (this.config.id === 'grizzly') projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 10, '#b533ff', 'bullet', 0));
            else projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 7, '#ff4500', 'bullet', 1));
        }
    }

    fireMG(now) {
        this.cooldowns.x = now + 100; 
        const w = this.config.img.width * 0.12 * this.scaleMod;
        const h = this.config.img.height * 0.12 * this.scaleMod;
        
        const fwd = w * 0.25; const side = h * 0.35;
        let px1 = this.x + Math.cos(this.angle)*fwd - Math.sin(this.angle)*side;
        let py1 = this.y + Math.sin(this.angle)*fwd + Math.cos(this.angle)*side;
        let px2 = this.x + Math.cos(this.angle)*fwd - Math.sin(this.angle)*(-side);
        let py2 = this.y + Math.sin(this.angle)*fwd + Math.cos(this.angle)*(-side);

        createMuzzleFlash(px1, py1, this.angle, 0.3); 
        createMuzzleFlash(px2, py2, this.angle, 0.3); 

        let spread1 = (Math.random() - 0.5) * 0.2; let spread2 = (Math.random() - 0.5) * 0.2;

        projectiles.push(new Projectile(this.owner, px1, py1, this.angle + spread1, 18, 2, 0.6, '#ffcc00', 'mg', 0));
        projectiles.push(new Projectile(this.owner, px2, py2, this.angle + spread2, 18, 2, 0.6, '#ffcc00', 'mg', 0));
        
        this.mgAmmo -= 2;
        if (this.mgAmmo <= 0) {
            this.mgAmmo = 0; this.mgReloading = true;
            this.maxCooldowns.x = 15000; this.cooldowns.x = now + 15000;
        }
    }

    fireX(now) {
        if (this.config.id === 'scorpion') {
            if (this.hookState !== 'ready' || now < this.cooldowns.x) return;
            this.recoil = 6; this.hookState = 'fired';
            const tip = this.getTip();
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            let arrow = new Projectile(this.owner, tip.x, tip.y, this.angle, 15, 5, 5, '#00ff66', 'arrow', 0);
            projectiles.push(arrow); this.activeArrow = arrow;
            return;
        }

        if (now < this.cooldowns.x) return;
        this.cooldowns.x = now + this.maxCooldowns.x;
        this.recoil = 7;
        
        if (this.config.id === 'grizzly') {
            const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            for (let i = 0; i < 5; i++) {
                let rAngle = this.angle - 0.4 + (0.8 / 4) * i;
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, rAngle, 8, 4, 6, '#ff6600', 'rocket', 3));
            }
        } else if (this.config.id === 'pyro') {
            const w = this.config.img.width * 0.12; const h = this.config.img.height * 0.12;
            const pods = [ {x: 0.15, y: -0.38}, {x: -0.20, y: -0.38}, {x: 0.15, y: 0.38}, {x: -0.20, y: 0.38} ];
            pods.forEach((pod, index) => {
                const px = this.x + (pod.x * w * Math.cos(this.angle) - pod.y * h * Math.sin(this.angle));
                const py = this.y + (pod.x * w * Math.sin(this.angle) + pod.y * h * Math.cos(this.angle));
                createMuzzleFlash(px, py, this.angle, 1);
                for(let i=0; i<2; i++) {
                    let r = new Projectile(this.owner, px, py, this.angle + (Math.random()-0.5)*0.5, 7 + Math.random()*2, 3, 6, '#ff4500', 'swarm', 0);
                    r.baseAngle = this.angle; r.timer = index * 5; projectiles.push(r);
                }
            });
        } else if (this.config.id === 'seraph') {
            const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 10, 6, 3, '#00ffff', 'seraph_x', 1));
        }
    }

    fireZ(now) {
        if (this.config.id === 'dreadnaught') {
            let activeMines = hazards.filter(h => h.owner === this.owner && h.type === 'mine').length;
            if (activeMines >= 6) return; 
            this.cooldowns.z = now + this.maxCooldowns.z;
            // Dreadnaught mines logic upgraded inside hazards loop
            hazards.push({ owner: this.owner, type: 'mine', x: this.x, y: this.y, radius: 15, life: 999999, age: 0, visible: true, triggering: false, triggerTimer: 0 });
            return;
        }

        this.cooldowns.z = now + this.maxCooldowns.z;
        if (this.config.id === 'grizzly') {
            this.recoil = 12; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 3);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 9, 8, 15, '#8a2be2', 'missile', 0));
        } else if (this.config.id === 'pyro') {
            this.dashState = 1; this.dashTimer = 30;
        } else if (this.config.id === 'scorpion') {
            hazards.push({ owner: this.owner, type: 'poison_pool', x: this.x, y: this.y, radius: 70, life: 1200 });
            createParticles(this.x, this.y, 20, '#00ff66', 2, 1.5);
        }
    }

    draw() {
        if (this.isDead) return;
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 10) % 2 === 0) return;
        
        if (this.poisons.length > 0) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0, 255, 102, 0.3)'; ctx.fill();
        }

        // Hit visual FX for Seraph's electricity
        if (this.electrocutedTimer > 0) {
            ctx.save();
            for(let i=0; i<3; i++) {
                if (Math.random() > 0.3) {
                    ctx.beginPath();
                    let sx = this.x + (Math.random()-0.5)*this.radius*2.5;
                    let sy = this.y + (Math.random()-0.5)*this.radius*2.5;
                    let ex = this.x + (Math.random()-0.5)*this.radius*2.5;
                    let ey = this.y + (Math.random()-0.5)*this.radius*2.5;
                    ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; ctx.stroke();
                }
            }
            ctx.restore();
        }
        
        if (this.stunTimer > 0) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2);
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.stroke();
        }

        ctx.save(); ctx.translate(this.x, this.y); 
        
        // Seraph HUD Bar
        if (this.config.id === 'seraph') {
            ctx.save();
            ctx.fillStyle = '#222';
            ctx.fillRect(-25, -45, 50, 6);
            ctx.fillStyle = this.zReady ? '#fff' : '#00ffff';
            if (this.zReady) { ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; } 
            else { ctx.shadowBlur = 0; }
            ctx.fillRect(-25, -45, (this.energy / 100) * 50, 6);
            ctx.restore();
        }

        ctx.rotate(this.angle);
        ctx.shadowBlur = this.dashState === 2 ? 30 : 15;
        ctx.shadowColor = this.stunTimer > 0 ? '#00ffff' : this.config.color;
        const w = this.config.img.width * 0.12 * this.scaleMod; 
        const h = this.config.img.height * 0.12 * this.scaleMod;
        ctx.drawImage(this.config.img, -w / 2, -h / 2, w, h); ctx.restore();
    }
}
