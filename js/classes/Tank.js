class Tank {
    constructor(owner, config, x, y, angle, controls, isAI = false, difficulty = 'NORMAL') {
        this.owner = owner; this.config = config; 
        this.x = x; this.y = y; this.angle = angle; 
        this.isAI = isAI;
        this.difficulty = difficulty; // 'EASY', 'NORMAL', 'HARD', or 'HARD_1'
        
        this.speed = 2.5 * (config.speedMod || 1); 
        this.rotSpeed = 0.045 * (config.speedMod || 1); 
        this.maxHp = config.maxHp || 100;
        this.hp = this.maxHp; 
        this.radius = 25 * (config.scaleMod || 1); 
        this.scaleMod = config.scaleMod || 1;
        
        this.controls = controls; this.isDead = false;
        this.invulnTimer = 0; this.stunTimer = 0; this.recoil = 0;
        this.dashState = 0; this.dashTimer = 0;
        
        this.kbX = 0; this.kbY = 0; this.kbTimer = 0; this.kbType = null;
        this.electrocutedTimer = 0;
        this.afterStunSlow = 0;
        this.destroSlowTimer = 0;
        this.poisons = []; this.isSlowed = false;

        // Orion Z-Axis rendering variables
        this.zHeight = 0;
        this.zRotation = 0;

        this.maxCooldowns = { 
            c: config.id === 'abyss' ? 150 : (config.id === 'phantom' ? 2500 : (config.id === 'dreadnaught' ? 2000 : (config.id === 'seraph' ? 1750 : 1500))), 
            x: config.id === 'abyss' ? 12000 : (config.id === 'phantom' ? 9000 : (config.id === 'seraph' ? 14000 : (config.id === 'scorpion' || config.id === 'destroyer' ? 9000 : (config.id === 'orion' ? 16000 : 8000)))), 
            z: config.id === 'abyss' ? 10000 : (config.id === 'phantom' ? 14000 : (config.id === 'destroyer' ? 16000 : (config.id === 'pyro' ? 12000 : (config.id === 'orion' ? 18000 : 10000))))
        };
        this.cooldowns = { c: 0, x: 0, z: 0 };
        this.flameTimer = 0; this.burstsLeft = 0; this.burstTimer = 0;
        this.hookState = 'ready'; this.hookTarget = null; this.hookTimer = 0; this.activeArrow = null; 
        this.mgMaxAmmo = config.id === 'dreadnaught' ? 150 : 100; this.mgAmmo = this.mgMaxAmmo; this.mgReloading = false;

        this.phantomEvasiveTimer = 0; this.isGhost = false; this.ghostToggleTimer = 0;
        this.phantomMarks = 0; this.phantomMarkTimer = 0; this.phantomShockTimer = 0;

        this.dashCount = 0; this.fireShieldActive = false; this.fireShieldHp = 0; this.fireShieldTimer = 0;
        this.isGhosting = false; this.ghostHitTanks = []; this.fireTrailTicks = 0; this.inFireTrail = false;
        this.pyroCShots = 0; this.fireSlowTimer = 0;

        this.abyssSlowStacks = 0;
        this.abyssSlowTimer = 0;

        // Orion Specific Variables
        this.zHoldTimer = 0;
        this.zHeldLastFrame = false;
        this.portalA = null;
        this.portalB = null;
        this.portalTimer = 0;

        this.energy = 0; this.zReady = false; this.zFiring = false; this.zChargeTimer = 0; this.cShots = 0;
        this.destroAiming = false; this.destroAimDist = 100; this.destroLocked = false;
    }

    addPoison(dps, durationFrames) { 
        this.poisons.push({ dps: dps, life: durationFrames }); 
    }

    activateFireShield() {
        this.fireShieldActive = true; this.fireShieldHp = 20; this.fireShieldTimer = 300; 
        floatingTexts.push({x: this.x, y: this.y - 40, text: "SHIELD UP!", life: 60, color: '#ffaa00'});
    }

    isLineOfSightClear(x1, y1, x2, y2) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let distance = Math.hypot(dx, dy);
        let steps = Math.ceil(distance / 16);
        
        for (let i = 1; i < steps; i++) {
            let t = i / steps;
            let checkX = x1 + dx * t;
            let checkY = y1 + dy * t;
            
            if (typeof currentMap !== 'undefined' && currentMap) {
                // Check Map Obstacles
                for (let w of currentMap.walls) {
                    if (checkX >= w.x && checkX <= w.x + w.w && checkY >= w.y && checkY <= w.y + w.h) {
                        return false;
                    }
                }
                // Check Map Rocks
                for (let r of currentMap.rocks) {
                    if (Math.hypot(checkX - r.x, checkY - r.y) < r.r) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    think() {
        if (!players[0] || players[0].isDead || this.stunTimer > 0 || this.dashState === 2) return;
        
        let target = players[0]; 
        const now = Date.now();

        // Clear keys cleanly at the beginning to prevent logical inputs bleeding together
        for (let k in this.controls) { keys[this.controls[k]] = false; }

        let isHitAndRunTank = ['phantom', 'pyro', 'scorpion'].includes(this.config.id);
        let cReady = now >= this.cooldowns.c;

        // --- 1. ABYSS TARGETING OVERRIDE ---
        let myOrb = null;
        if (this.config.id === 'abyss') {
            myOrb = hazards.find(h => h.type === 'void_orb' && h.owner === this.owner);
            if (myOrb) target = myOrb; 
        }

        // --- 2. TACTICAL COVER ANALYSIS ---
        let isLowHp = (this.hp / this.maxHp) < 0.35;
        let tacticalTargetX = target.x;
        let tacticalTargetY = target.y;
        let seekingCover = false;

        if ((this.difficulty === 'HARD' || this.difficulty === 'HARD_1') && isLowHp) {
            seekingCover = true;
            let bestCoverDist = Infinity;
            let bestCoverX = this.x;
            let bestCoverY = this.y;

            if (typeof currentMap !== 'undefined' && currentMap) {
                for (let w of currentMap.walls) {
                    let centerX = w.x + w.w / 2;
                    let centerY = w.y + w.h / 2;
                    let angleFromPlayer = Math.atan2(centerY - target.y, centerX - target.x);
                    let coverX = centerX + Math.cos(angleFromPlayer) * (Math.max(w.w, w.h) + 60);
                    let coverY = centerY + Math.sin(angleFromPlayer) * (Math.max(w.w, w.h) + 60);
                    let distToCover = Math.hypot(coverX - this.x, coverY - this.y);
                    if (coverX > 50 && coverX < canvas.width - 50 && coverY > 50 && coverY < canvas.height - 50) {
                        if (distToCover < bestCoverDist) { bestCoverDist = distToCover; bestCoverX = coverX; bestCoverY = coverY; }
                    }
                }
                for (let r of currentMap.rocks) {
                    let angleFromPlayer = Math.atan2(r.y - target.y, r.x - target.x);
                    let coverX = r.x + Math.cos(angleFromPlayer) * (r.r + 60);
                    let coverY = r.y + Math.sin(angleFromPlayer) * (r.r + 60);
                    let distToCover = Math.hypot(coverX - this.x, coverY - this.y);
                    if (coverX > 50 && coverX < canvas.width - 50 && coverY > 50 && coverY < canvas.height - 50) {
                        if (distToCover < bestCoverDist) { bestCoverDist = distToCover; bestCoverX = coverX; bestCoverY = coverY; }
                    }
                }
            }
            if (bestCoverDist < Infinity) { tacticalTargetX = bestCoverX; tacticalTargetY = bestCoverY; }
        }

        // --- 3. PREDICTIVE AIM COMPUTATION ---
        let targetVx = target.x - (target.lastX || target.x);
        let targetVy = target.y - (target.lastY || target.y);
        let distToPlayer = Math.hypot(target.x - this.x, target.y - this.y);
        let leadDist = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? distToPlayer / 10 : distToPlayer / 15; 
        
        let predictedX = target.x + (targetVx * leadDist);
        let predictedY = target.y + (targetVy * leadDist);

        let aimWobble = this.difficulty === 'EASY' ? Math.sin(frameCount * 0.02) * 0.6 : (this.difficulty === 'NORMAL' ? Math.sin(frameCount * 0.03) * 0.25 : 0);
        if (myOrb) aimWobble = 0; 

        let dxAim = predictedX - this.x;
        let dyAim = predictedY - this.y;
        let aimAtPlayerAngle = Math.atan2(dyAim, dxAim) + aimWobble;

        // --- 4. VECTOR BLENDED MOVEMENT FORCES ---
        let moveX = 0;
        let moveY = 0;

        if (seekingCover) {
            let distToCover = Math.hypot(tacticalTargetX - this.x, tacticalTargetY - this.y);
            if (distToCover > 30) {
                moveX = (tacticalTargetX - this.x) / distToCover;
                moveY = (tacticalTargetY - this.y) / distToCover;
            }
        } else if (myOrb) {
            if (distToPlayer > 250) { moveX = dxAim / distToPlayer; moveY = dyAim / distToPlayer; }
            else if (distToPlayer < 100) { moveX = -dxAim / distToPlayer; moveY = -dyAim / distToPlayer; }
        } else if (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') {
            if (isHitAndRunTank) {
                if (!cReady) {
                    moveX = -dxAim / distToPlayer; moveY = -dyAim / distToPlayer;
                } else {
                    if (distToPlayer > 300) { moveX = dxAim / distToPlayer; moveY = dyAim / distToPlayer; }
                    else if (distToPlayer < 150) { moveX = -dxAim / distToPlayer; moveY = -dyAim / distToPlayer; }
                }
            } else {
                if (distToPlayer < 320) { moveX = -dxAim / distToPlayer; moveY = -dyAim / distToPlayer; }
                else if (distToPlayer > 450) { moveX = dxAim / distToPlayer; moveY = dyAim / distToPlayer; }
            }
        } else {
            let desiredDist = 150;
            if (distToPlayer > desiredDist + 100) { moveX = dxAim / distToPlayer; moveY = dyAim / distToPlayer; }
            else if (distToPlayer < desiredDist) { moveX = -dxAim / distToPlayer; moveY = -dyAim / distToPlayer; }
            else if (Math.random() < (this.difficulty === 'EASY' ? 0.02 : 0.05)) { moveX = dxAim / distToPlayer; moveY = dyAim / distToPlayer; }
        }

        if (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') {
            if (typeof projectiles !== 'undefined') {
                for (let p of projectiles) {
                    if (p.owner !== this.owner && !p.dead) {
                        let pDist = Math.hypot(this.x - p.x, this.y - p.y);
                        if (pDist < 250) {
                            let dot = (p.vx * -(this.x - p.x) + p.vy * -(this.y - p.y)) / (pDist * p.speed);
                            if (dot > 0.85) {
                                let perpX = -p.vy / p.speed;
                                let perpY = p.vx / p.speed;
                                let cross = p.vx * -(this.y - p.y) - p.vy * -(this.x - p.x);
                                let sideDir = cross > 0 ? 1 : -1;
                                moveX += perpX * sideDir * 2.5;
                                moveY += perpY * sideDir * 2.5;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Sub-Vector C: Proximity Obstacle Avoidance Forces
        let sensorDist = this.radius + 5; 
        let lookAheadX = this.x + Math.cos(this.angle) * sensorDist;
        let lookAheadY = this.y + Math.sin(this.angle) * sensorDist;
        let obstacleAhead = false;

        if (lookAheadX < this.radius + 5 || lookAheadX > canvas.width - (this.radius + 5) || 
            lookAheadY < this.radius + 5 || lookAheadY > canvas.height - (this.radius + 5)) {
            obstacleAhead = true;
        }

        if (typeof currentMap !== 'undefined' && currentMap) {
            for (let w of currentMap.walls) {
                if (lookAheadX > w.x - 5 && lookAheadX < w.x + w.w + 5 && 
                    lookAheadY > w.y - 5 && lookAheadY < w.y + w.h + 5) {
                    obstacleAhead = true;
                    let wallCenterX = w.x + w.w / 2;
                    let wallCenterY = w.y + w.h / 2;
                    moveX += (this.x - wallCenterX) * 0.1;
                    moveY += (this.y - wallCenterY) * 0.1;
                }
            }
            for (let r of currentMap.rocks) {
                if (Math.hypot(lookAheadX - r.x, lookAheadY - r.y) < r.r + 5) {
                    obstacleAhead = true;
                    let pushAngle = Math.atan2(this.y - r.y, this.x - r.x);
                    moveX += Math.cos(pushAngle) * 2.0;
                    moveY += Math.sin(pushAngle) * 2.0;
                }
            }
        }

        // --- 5. STEERING ENGINE ---
        if (!this.destroAiming) {
            let finalNavAngle = (moveX === 0 && moveY === 0) ? aimAtPlayerAngle : Math.atan2(moveY, moveX);
            
            let bankingShot = false;
            if ((this.difficulty === 'HARD' || this.difficulty === 'HARD_1') && obstacleAhead && ['phantom', 'pyro', 'orion'].includes(this.config.id)) {
                if (!isHitAndRunTank || cReady) { finalNavAngle += 0.6; bankingShot = true; }
            }

            let angleDiff = finalNavAngle - this.angle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            if (angleDiff > 0.1) keys[this.controls.right] = true;
            else if (angleDiff < -0.1) keys[this.controls.left] = true;

            if (moveX !== 0 || moveY !== 0) {
                if (Math.abs(angleDiff) < Math.PI / 2.2) {
                    keys[this.controls.up] = true;
                } else if (Math.abs(angleDiff) > (Math.PI * 0.7) && !seekingCover) {
                    keys[this.controls.down] = true;
                }
            }

            let isStuckMoving = (keys[this.controls.up] || keys[this.controls.down]);
            if (this.x === this.lastX && this.y === this.lastY && isStuckMoving && !bankingShot) {
                this.stuckTimer = (this.stuckTimer || 0) + 1;
                if (this.stuckTimer > 20) {
                    keys[this.controls.up] = !keys[this.controls.up];
                    keys[this.controls.down] = !keys[this.controls.down];
                    keys[this.controls.left] = true;
                }
            } else {
                this.stuckTimer = 0;
            }
        }

        this.lastX = this.x;
        this.lastY = this.y;

        // --- 6. TARGET LINE OF SIGHT & WEAPONS TRIGGERING ---
        let combatAngleDiff = aimAtPlayerAngle - this.angle;
        combatAngleDiff = Math.atan2(Math.sin(combatAngleDiff), Math.cos(combatAngleDiff));

        let triggerHappy = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? 0.08 : (this.difficulty === 'NORMAL' ? 0.04 : 0.01);
        let acceptableCombatAngle = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? 0.3 : 0.4;

        if (Math.abs(combatAngleDiff) < acceptableCombatAngle && distToPlayer < 700) {
            if (this.difficulty === 'EASY' && frameCount % 2 === 0) return;
            if (seekingCover && Math.random() > 0.3) return;
            
            let isShotClear = this.isLineOfSightClear(this.x, this.y, target.x, target.y);
            if (isShotClear) {
                keys[this.controls.c] = true;
                
                if (this.config.id === 'abyss' && myOrb) {
                    if (now > this.cooldowns.z) keys[this.controls.z] = true;
                } else {
                    if (this.config.id === 'destroyer' || this.config.id === 'abyss') {
                        if (this.destroAiming) {
                            keys[this.controls.x] = true;
                            if (this.destroAimDist >= distToPlayer - 40) keys[this.controls.x] = false;
                        } else if (Math.random() < triggerHappy && distToPlayer > 200 && now > this.cooldowns.x) {
                            keys[this.controls.x] = true;
                        }
                    } else {
                        if (Math.random() < triggerHappy && now > this.cooldowns.x) {
                            keys[this.controls.x] = true;
                        }
                        if (this.config.id === 'seraph') {
                            if (this.energy >= 100) keys[this.controls.z] = true;
                        } else {
                            if (Math.random() < triggerHappy && now > this.cooldowns.z) {
                                keys[this.controls.z] = true;
                            }
                        }
                    }
                }
            }
        }
    }

    getTip() {
        const offset = (this.config.img.width * 0.12 * this.scaleMod) / 2;
        return { x: this.x + Math.cos(this.angle) * offset, y: this.y + Math.sin(this.angle) * offset };
    }

    fireC(now) {
        this.cooldowns.c = now + this.maxCooldowns.c; 
        this.recoil = 4; 
        const tip = this.getTip();
        
        if (this.config.id === 'scorpion') {
            this.burstsLeft = 3; 
            this.burstTimer = 0;
        } else if (this.config.id === 'dreadnaught') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 11, 8, 14, '#ff4500', 'dread_c', 2));
        } else if (this.config.id === 'seraph') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            this.cShots++;
            let p = new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 5, 8, '#00ffff', 'seraph_c', 0);
            projectiles.push(p);
        } else if (this.config.id === 'abyss') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 14, 4, 4, '#4a0080', 'abyss_c', 0));
        } else if (this.config.id === 'orion') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.2);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 6, 6, '#ff33cc', 'orion_c', 3));
        } else if (this.config.id === 'pyro') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.2);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 10, 5, 7, '#ff4500', 'pyro_c', 0));
        } else if (this.config.id === 'grizzly') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 5, 8, '#00ff00', 'grizzly_c', 1));
        } else if (this.config.id === 'destroyer') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.4);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 9, 7, 12, '#ffcc00', 'destro_c', 0));
        } else if (this.config.id === 'phantom') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.1);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 13, 4, 7, '#aaaaaa', 'phantom_c', 0));
        } else {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 5, 8, this.config.color, 'basic', 0));
        }
        playSound(sfx.basicShot);
    }

    fireX(now) {
        if (this.config.id === 'orion') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            setTimeout(() => { playSound(sfx.orionX); }, 2500);
            hazards.push({ owner: this.owner, type: 'orion_chrono', x: this.x, y: this.y, radius: 175, life: 300, maxLife: 300 });
            return;
        }
        if (this.config.id === 'phantom') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            this.recoil = 2;
            this.isGhost = true;
            this.ghostToggleTimer = 180; 
            floatingTexts.push({x: this.x, y: this.y - 40, text: "PHANTOM FORM", life: 60, color: '#aaaaaa'});
            return;
        }
        if (this.config.id === 'abyss') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            let targetX = this.x + Math.cos(this.angle) * 200;
            let targetY = this.y + Math.sin(this.angle) * 200;
            hazards.push({ owner: this.owner, type: 'void_orb', x: targetX, y: targetY, radius: 30, life: 480, hits: 0 });
            playSound(sfx.abyssBlackHole);
            return;
        }
        if (this.config.id === 'destroyer') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            this.destroAiming = true;
            this.destroAimDist = 100;
            return;
        }
        if (this.config.id === 'scorpion') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            const tip = this.getTip();
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 16, 6, 5, '#ffff00', 'scorpion_hook', 0));
            this.hookState = 'fired';
            return;
        }
        
        this.cooldowns.x = now + this.maxCooldowns.x;
    }

    fireMG(now) {
        this.cooldowns.x = now + 80; 
        const tip = this.getTip();
        let sideAngle = this.angle + Math.PI / 2;
        let px1 = tip.x + Math.cos(sideAngle) * 8;
        let py1 = tip.y + Math.sin(sideAngle) * 8;
        projectiles.push(new Projectile(this.owner, px1, py1, this.angle + (Math.random() - 0.5) * 0.1, 16, 2, 0.6, '#ffcc00', 'mg', 0));
        this.mgAmmo -= 1;
        if (this.mgAmmo <= 0) {
            this.mgAmmo = 0;
            this.mgReloading = true;
            this.cooldowns.x = now + 4000; 
        }
    }

    fireZ(now) {
        if (this.config.id === 'destroyer') {
            if (hazards.filter(h => h.owner === this.owner && h.type === 'mine').length >= 6) return;
            this.cooldowns.z = now + this.maxCooldowns.z;
            hazards.push({ owner: this.owner, type: 'mine', x: this.x, y: this.y, radius: 15, life: 999999, age: 0, visible: true, triggering: false, triggerTimer: 0 });
            return;
        }
        
        this.cooldowns.z = now + this.maxCooldowns.z;
        if (this.config.id === 'grizzly') {
            this.recoil = 12;
            const tip = this.getTip();
            createMuzzleFlash(tip.x, tip.y, this.angle, 3);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 9, 8, 15, '#8a2be2', 'missile', 0));
        } else if (this.config.id === 'pyro') {
            this.dashState = 1;
            this.dashTimer = 18;
            this.dashCount++;
            if (this.dashCount % 3 === 0) this.activateFireShield();
        } else if (this.config.id === 'abyss') {
            playSound(sfx.abyssDom);
            hazards.push({ owner: this.owner, type: 'void_domain', x: this.x, y: this.y, radius: 220, life: 300 });
        } else if (this.config.id === 'seraph') {
            if (this.energy >= 100) {
                this.zFiring = true;
                this.energy = 0;
                this.zReady = false;
            }
        }
    }

    takeDamage(amount, type) {
        if (this.isDead || this.invulnTimer > 0) return;
        
        if (this.fireShieldActive && this.fireShieldHp > 0) {
            this.fireShieldHp -= amount;
            if (this.fireShieldHp <= 0) {
                this.fireShieldActive = false;
                floatingTexts.push({x: this.x, y: this.y - 40, text: "SHIELD BROKEN", life: 45, color: '#ff3333'});
            }
            return;
        }

        this.hp -= amount;
        playSound(sfx.tankHit);

        if (this.config.id === 'seraph' && !this.zFiring) {
            this.energy = Math.min(100, this.energy + amount * 1.5);
            if (this.energy >= 100) this.zReady = true;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            createKaboom(this.x, this.y, 2.0);
            handleDeath(this.owner === 1 ? 0 : 1);
        }
    }

    checkWallCollisions() {
        if (typeof currentMap === 'undefined' || !currentMap) return;
        
        for (let w of currentMap.walls) {
            let closestX = Math.max(w.x, Math.min(this.x, w.x + w.w));
            let closestY = Math.max(w.y, Math.min(this.y, w.y + w.h));
            let distance = Math.hypot(this.x - closestX, this.y - closestY);
            if (distance < this.radius) {
                let overlap = this.radius - distance;
                let angle = Math.atan2(this.y - closestY, this.x - closestX);
                if (distance === 0) angle = this.angle + Math.PI; 
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }
        for (let r of currentMap.rocks) {
            let distance = Math.hypot(this.x - r.x, this.y - r.y);
            if (distance < this.radius + r.r) {
                let overlap = (this.radius + r.r) - distance;
                let angle = Math.atan2(this.y - r.y, this.x - r.x);
                this.x += Math.cos(angle) * overlap;
                this.y += Math.sin(angle) * overlap;
            }
        }
    }

    update() {
        if (this.isDead) return;

        if (this.isAI) {
            this.think();
        }

        const now = Date.now();

        if (this.stunTimer > 0) {
            this.stunTimer--;
            if (this.stunTimer % 8 === 0) {
                createParticles(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30, 2, '#00ffff', 1.2, 0.4);
            }
        }

        this.isSlowed = false;
        for (let i = this.poisons.length - 1; i >= 0; i--) {
            let p = this.poisons[i];
            this.hp -= p.dps / 60;
            p.life--;
            if (p.life <= 0) this.poisons.splice(i, 1);
        }

        if (this.config.id === 'dreadnaught') {
            if (this.mgReloading && now > this.cooldowns.x) {
                this.mgReloading = false;
                this.mgAmmo = this.mgMaxAmmo;
            }
            if (!this.mgReloading && keys[this.controls.x] && this.dashState === 0 && this.stunTimer <= 0) {
                this.fireMG(now);
            }
        }

        if (this.burstsLeft > 0 && this.stunTimer <= 0) {
            this.burstTimer--;
            if (this.burstTimer <= 0) {
                const tip = this.getTip();
                createMuzzleFlash(tip.x, tip.y, this.angle, 0.5);
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle + (Math.random() - 0.5) * 0.3, 14, 3, 3, '#00ff66', 'toxic_bullet', 0));
                this.burstsLeft--;
                this.burstTimer = 6;
                this.recoil = 2;
            }
        }

        let currentSpeed = this.speed;
        if (this.stunTimer > 0) currentSpeed = 0;
        if (this.isSlowed || this.destroSlowTimer > 0) currentSpeed *= 0.5;

        if (this.stunTimer <= 0 && !this.destroAiming) {
            if (keys[this.controls.left]) this.angle -= this.rotSpeed;
            if (keys[this.controls.right]) this.angle += this.rotSpeed;
        }

        let throttle = 0;
        if (this.stunTimer <= 0 && this.dashState === 0) {
            if (keys[this.controls.up]) throttle = 1;
            if (keys[this.controls.down]) throttle = -0.6;
        }

        if (this.dashState === 1) { 
            currentSpeed = this.speed * 2.5;
            throttle = 1;
            this.dashTimer--;
            if (this.dashTimer <= 0) this.dashState = 0;
        }

        if (throttle !== 0) {
            this.x += Math.cos(this.angle) * throttle * currentSpeed;
            this.y += Math.sin(this.angle) * throttle * currentSpeed;
        }

        if (this.recoil > 0.1) {
            this.x -= Math.cos(this.angle) * this.recoil;
            this.y -= Math.sin(this.angle) * this.recoil;
            this.recoil *= 0.8;
        }

        this.checkWallCollisions();
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.dashState === 0 && this.stunTimer <= 0 && !this.zFiring) {
            if (keys[this.controls.c] && now > this.cooldowns.c) {
                this.fireC(now);
            }
            if (keys[this.controls.x] && now > this.cooldowns.x && this.config.id !== 'dreadnaught') {
                this.fireX(now);
            }
            if (keys[this.controls.z] && now > this.cooldowns.z) {
                this.fireZ(now);
            }
        }

        if (this.zFiring) {
            const tip = this.getTip();
            this.beamStartX = tip.x;
            this.beamStartY = tip.y;
            this.beamEndX = tip.x;
            this.beamEndY = tip.y;
            
            if (typeof currentMap !== 'undefined' && currentMap) {
                for (let i = 0; i < 800; i += 5) {
                    let testX = tip.x + Math.cos(this.angle) * i;
                    let testY = tip.y + Math.sin(this.angle) * i;
                    let hitObstacle = false;
                    for (let w of currentMap.walls) {
                        if (testX >= w.x && testX <= w.x + w.w && testY >= w.y && testY <= w.y + w.h) {
                            hitObstacle = true; break;
                        }
                    }
                    for (let r of currentMap.rocks) {
                        if (Math.hypot(testX - r.x, testY - r.y) <= r.r) {
                            hitObstacle = true; break;
                        }
                    }
                    if (hitObstacle) break;
                    this.beamEndX = testX;
                    this.beamEndY = testY;
                }
            }

            players.forEach(enemy => {
                if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                    if (typeof distToSegment !== 'undefined') {
                        let d = distToSegment({x: enemy.x, y: enemy.y}, {x: this.beamStartX, y: this.beamStartY}, {x: this.beamEndX, y: this.beamEndY});
                        if (d < enemy.radius + 15) {
                            enemy.takeDamage(0.5, 'laser');
                        }
                    }
                }
            });

            if (frameCount % 3 === 0) {
                this.energy -= 2;
                if (this.energy <= 0) {
                    this.energy = 0;
                    this.zFiring = false;
                }
            }
        }

        if (this.destroAiming) {
            if (keys[this.controls.up]) this.destroAimDist = Math.min(400, this.destroAimDist + 5);
            if (keys[this.controls.down]) this.destroAimDist = Math.max(80, this.destroAimDist - 5);
            if (!keys[this.controls.x]) {
                this.destroAiming = false;
                let targets = [];
                let cx = this.x + Math.cos(this.angle) * this.destroAimDist;
                let cy = this.y + Math.sin(this.angle) * this.destroAimDist;
                for(let i = 0; i < 8; i++) {
                    let r = Math.random() * 80;
                    let a = Math.random() * Math.PI * 2;
                    targets.push({x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r});
                }
                hazards.push({ owner: this.owner, type: 'destro_strike_manager', targets: targets, launched: [], timer: 0, state: 'launching', tank: this, life: 9999 });
            }
        }

        if (this.isGhost && this.ghostToggleTimer > 0) {
            this.ghostToggleTimer--;
            if (this.ghostToggleTimer <= 0) this.isGhost = false;
        }

        if (this.fireShieldActive && this.fireShieldTimer > 0) {
            this.fireShieldTimer--;
            if (this.fireShieldTimer <= 0) this.fireShieldActive = false;
        }
    }

    draw() {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.config.id === 'seraph') {
            ctx.fillStyle = '#222'; 
            ctx.fillRect(-25, -45, 50, 6);
            ctx.fillStyle = this.zReady ? '#fff' : '#00ffff';
            if (this.zReady) { ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; } else { ctx.shadowBlur = 0; }
            ctx.fillRect(-25, -45, (this.energy / 100) * 50, 6); 
        }

        ctx.rotate(this.angle + this.zRotation);

        ctx.shadowBlur = this.dashState === 1 ? 30 : 15;
        ctx.shadowColor = this.stunTimer > 0 ? '#00ffff' : this.config.color;
        
        let visualScaleMod = this.scaleMod;
        if (this.zHeight > 0) visualScaleMod += (this.zHeight / 400);

        const w = this.config.img.width * 0.12 * visualScaleMod; 
        const h = this.config.img.height * 0.12 * visualScaleMod;
        
        let imgToDraw = this.config.img;
        if (this.config.id === 'phantom') {
            if (this.isGhost) {
                if (typeof images !== 'undefined' && images.phantomB && images.phantomB.complete) {
                    imgToDraw = images.phantomB;
                }
                ctx.globalAlpha = 0.4; 
                ctx.filter = 'brightness(1.5)';
            }
        }

        ctx.drawImage(imgToDraw, -w / 2, -h / 2, w, h);
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
        ctx.restore();

        if (this.fireShieldActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffaa00';
            ctx.stroke();
            ctx.restore();
        }

        if (this.destroAiming) {
            ctx.save();
            let targetX = this.x + Math.cos(this.angle) * this.destroAimDist;
            let targetY = this.y + Math.sin(this.angle) * this.destroAimDist;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 40, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
        }
    }
}
