class Tank {
    constructor(owner, config, x, y, angle, controls, isAI = false, difficulty = 'NORMAL') {
        this.owner = owner; this.config = config; 
        this.x = x; this.y = y; this.angle = angle; 
        this.isAI = isAI;
        this.difficulty = difficulty; 
        
        this.speed = 2.5 * (config.speedMod || 1); 
        this.rotSpeed = 0.045 * (config.speedMod || 1); 
        this.maxHp = config.maxHp || 100;
        this.hp = this.maxHp; 
        this.radius = 25 * (config.scaleMod || 1); 
        this.scaleMod = config.scaleMod || 1;
        
        this.controls = controls; this.isDead = false;
        this.invulnTimer = 0; this.stunTimer = 0; this.recoil = 0;
        this.dashState = 0; this.dashTimer = 0;
        this.dashAngle = 0; 
        
        this.kbX = 0; this.kbY = 0; this.kbTimer = 0; this.kbType = null;
        this.electrocutedTimer = 0;
        this.afterStunSlow = 0;
        this.destroSlowTimer = 0;
        this.poisons = []; this.isSlowed = false;

        this.zHeight = 0;
        this.zRotation = 0;

        // Tempest Internal Trackers
        this.tempestStacks = 0; // X-Skill Ammo
        this.tempestShieldHp = 0;
        this.tempestShieldTimer = 0;
        
        this.tempestSpeedStacks = 0; // Orbital Passive Trackers
        this.tempestSpeedTimer = 0;
        this.tempestOrbitalAngle = 0;
        this.tempestOrbitalCooldowns = [0, 0, 0];
        this.passiveAuraRadius = 220; 

        // Match Statistics Tracker
        this.matchStats = { totalDamage: 0, bouncedDamage: 0, xSkillDamage: 0, shieldGenerated: 0 };

        this.maxCooldowns = { 
            c: config.id === 'tempest' ? 750 : (config.id === 'abyss' ? 150 : (config.id === 'phantom' ? 2500 : (config.id === 'dreadnaught' ? 2000 : (config.id === 'seraph' ? 1750 : 1500)))), 
            x: config.id === 'tempest' ? 300 : (config.id === 'abyss' ? 12000 : (config.id === 'phantom' ? 9000 : (config.id === 'seraph' ? 14000 : (config.id === 'scorpion' || config.id === 'destroyer' ? 9000 : (config.id === 'orion' ? 16000 : 8000))))), 
            z: config.id === 'tempest' ? 24000 : (config.id === 'abyss' ? 10000 : (config.id === 'phantom' ? 14000 : (config.id === 'destroyer' ? 16000 : (config.id === 'pyro' ? 12000 : (config.id === 'orion' ? 18000 : 10000)))))
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

        this.zHoldTimer = 0;
        this.zHeldLastFrame = false;
        this.portalA = null;
        this.portalB = null;
        this.portalTimer = 0;

        this.energy = 0; this.zReady = false; this.zFiring = false; this.zChargeTimer = 0; this.cShots = 0;
        this.destroAiming = false; this.destroAimDist = 100; this.destroLocked = false;
    }

    addPoison(dps, durationFrames) { this.poisons.push({ dps: dps, life: durationFrames }); }

    activateFireShield() {
        this.fireShieldActive = true; this.fireShieldHp = 20; this.fireShieldTimer = 300; 
        this.matchStats.shieldGenerated += 20; 
        floatingTexts.push({x: this.x, y: this.y - 40, text: "SHIELD UP!", life: 60, color: '#ffaa00'});
    }

    think() {
        if (!players[0] || players[0].isDead || this.stunTimer > 0 || this.dashState === 2) return;
        
        let target = players[0]; 
        const now = Date.now();

        let isHitAndRunTank = ['phantom', 'pyro', 'scorpion', 'tempest'].includes(this.config.id);
        let cReady = now >= this.cooldowns.c;

        let myOrb = null;
        if (this.config.id === 'abyss') {
            myOrb = hazards.find(h => h.type === 'void_orb' && h.owner === this.owner);
            if (myOrb) target = myOrb; 
        }

        let isLowHp = (this.hp / this.maxHp) < 0.35;
        let tacticalTargetX = target.x;
        let tacticalTargetY = target.y;
        let seekingCover = false;

        if (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') {
            if (isLowHp) {
                seekingCover = true;
                let bestCoverDist = Infinity;
                let bestCoverX = this.x;
                let bestCoverY = this.y;

                for (let w of currentMap.walls) {
                    let centerX = w.x + w.w / 2; let centerY = w.y + w.h / 2;
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
                if (bestCoverDist < Infinity) { tacticalTargetX = bestCoverX; tacticalTargetY = bestCoverY; }
            }
        }

        let targetVx = target.x - (target.lastX || target.x);
        let targetVy = target.y - (target.lastY || target.y);
        let distToPlayer = Math.hypot(target.x - this.x, target.y - this.y);
        let leadDist = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? distToPlayer / 10 : distToPlayer / 15; 
        let predictedX = target.x + (targetVx * leadDist);
        let predictedY = target.y + (targetVy * leadDist);
        let aimWobble = this.difficulty === 'EASY' ? Math.sin(frameCount * 0.02) * 0.6 : (this.difficulty === 'NORMAL' ? Math.sin(frameCount * 0.03) * 0.25 : 0);
        if (myOrb) aimWobble = 0; 
        let aimAtPlayerAngle = Math.atan2(predictedY - this.y, predictedX - this.x) + aimWobble;

        let dodgeAngleOffset = 0; let dodgeAngle = null;

        if (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') {
            for (let p of projectiles) {
                if (p.owner !== this.owner && !p.dead) {
                    let pdx = this.x - p.x; let pdy = this.y - p.y;
                    let pDist = Math.hypot(pdx, pdy);
                    if (pDist < 250) { 
                        let dot = (p.vx * -pdx + p.vy * -pdy) / (pDist * p.speed);
                        if (dot > 0.85) { 
                            if (this.difficulty === 'HARD_1') {
                                let cross = p.vx * -pdy - p.vy * -pdx; dodgeAngleOffset = cross > 0 ? 0.4 : -0.4;
                            } else {
                                dodgeAngle = Math.atan2(p.vy, p.vx) + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
                            }
                            break; 
                        }
                    }
                }
            }
        }

        let targetAngle = aimAtPlayerAngle;

        if ((this.difficulty === 'HARD' || this.difficulty === 'HARD_1') && isHitAndRunTank && !cReady && !myOrb && !this.destroAiming) {
            if (seekingCover) { targetAngle = Math.atan2(tacticalTargetY - this.y, tacticalTargetX - this.x); } 
            else { targetAngle = Math.atan2(this.y - predictedY, this.x - predictedX); }
        } 
        
        targetAngle += dodgeAngleOffset;

        let obstacleAhead = false; let obstacleBehind = false; let sensorDist = 80;
        let lookAheadX = this.x + Math.cos(this.angle) * sensorDist; let lookAheadY = this.y + Math.sin(this.angle) * sensorDist;
        let lookBehindX = this.x - Math.cos(this.angle) * sensorDist; let lookBehindY = this.y - Math.sin(this.angle) * sensorDist;

        if (lookAheadX < 50 || lookAheadX > canvas.width - 50 || lookAheadY < 50 || lookAheadY > canvas.height - 50) obstacleAhead = true;
        if (lookBehindX < 50 || lookBehindX > canvas.width - 50 || lookBehindY < 50 || lookBehindY > canvas.height - 50) obstacleBehind = true;

        for (let w of currentMap.walls) {
            if (lookAheadX > w.x - 30 && lookAheadX < w.x + w.w + 30 && lookAheadY > w.y - 30 && lookAheadY < w.y + w.h + 30) obstacleAhead = true;
            if (lookBehindX > w.x - 30 && lookBehindX < w.x + w.w + 30 && lookBehindY > w.y - 30 && lookBehindY < w.y + w.h + 30) obstacleBehind = true;
        }
        for (let r of currentMap.rocks) {
            if (Math.hypot(lookAheadX - r.x, lookAheadY - r.y) < r.r + 30) obstacleAhead = true;
            if (Math.hypot(lookBehindX - r.x, lookBehindY - r.y) < r.r + 30) obstacleBehind = true;
        }

        let bankingShot = false;
        if ((this.difficulty === 'HARD' || this.difficulty === 'HARD_1') && obstacleAhead && (this.config.id === 'phantom' || this.config.id === 'pyro' || this.config.id === 'orion' || this.config.id === 'tempest')) {
            if (!isHitAndRunTank || cReady) { targetAngle += 0.6; bankingShot = true; }
        }

        keys[this.controls.up] = false; keys[this.controls.down] = false; keys[this.controls.left] = false; keys[this.controls.right] = false;
        keys[this.controls.c] = false; keys[this.controls.x] = false; keys[this.controls.z] = false;

        let angleDiff = targetAngle - this.angle; 
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        if (angleDiff > 0.1) keys[this.controls.right] = true; 
        else if (angleDiff < -0.1) keys[this.controls.left] = true;

        if (!this.destroAiming) {
            if (dodgeAngle !== null && this.difficulty === 'HARD') {
                let diff = dodgeAngle - this.angle; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                if (diff > 0.2) keys[this.controls.right] = true; else if (diff < -0.2) keys[this.controls.left] = true;
                keys[this.controls.up] = true;
            } else if (seekingCover) {
                let distToTactical = Math.hypot(tacticalTargetX - this.x, tacticalTargetY - this.y);
                if (distToTactical > 30) {
                    let coverAngleDiff = Math.atan2(tacticalTargetY - this.y, tacticalTargetX - this.x) - this.angle;
                    coverAngleDiff = Math.atan2(Math.sin(coverAngleDiff), Math.cos(coverAngleDiff));
                    if (Math.abs(coverAngleDiff) < Math.PI / 2) {
                        if (!obstacleAhead) keys[this.controls.up] = true; else { keys[this.controls.down] = true; keys[this.controls.left] = true; } 
                    } else {
                        if (!obstacleBehind) keys[this.controls.down] = true; else { keys[this.controls.up] = true; keys[this.controls.right] = true; }
                    }
                }
            } else if (obstacleAhead && (!isHitAndRunTank || cReady) && !bankingShot) {
                keys[this.controls.up] = false; keys[this.controls.down] = true; keys[this.controls.left] = true; keys[this.controls.right] = false;
            } else if (obstacleAhead && isHitAndRunTank && !cReady) {
                keys[this.controls.up] = false; keys[this.controls.down] = true; keys[this.controls.right] = true; 
            } else {
                if (myOrb) {
                    if (distToPlayer > 250) keys[this.controls.up] = true; else if (distToPlayer < 100) keys[this.controls.down] = true;
                } else if (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') {
                    if (isHitAndRunTank) {
                        if (!cReady) { keys[this.controls.up] = true; } 
                        else { if (distToPlayer > 300) keys[this.controls.up] = true; else if (distToPlayer < 150) keys[this.controls.down] = true; }
                    } else {
                        if (distToPlayer < 320 && !obstacleBehind) keys[this.controls.down] = true; 
                        else if (distToPlayer > 450) keys[this.controls.up] = true; 
                    }
                } else {
                    let desiredDist = 150;
                    if (distToPlayer > desiredDist + 100) keys[this.controls.up] = true; 
                    else if (distToPlayer < desiredDist) keys[this.controls.down] = true; 
                    else if (Math.random() < (this.difficulty === 'EASY' ? 0.02 : 0.05)) keys[this.controls.up] = true;
                }
            }

            let isStuckMoving = (keys[this.controls.up] || keys[this.controls.down]);
            if (this.x === this.lastX && this.y === this.lastY && isStuckMoving && !bankingShot) {
                this.stuckTimer = (this.stuckTimer || 0) + 1;
                if (this.stuckTimer > 20) { keys[this.controls.up] = !keys[this.controls.up]; keys[this.controls.down] = !keys[this.controls.down]; keys[this.controls.left] = true; }
            } else { this.stuckTimer = 0; }
        } else { keys[this.controls.up] = false; keys[this.controls.down] = false; keys[this.controls.left] = false; keys[this.controls.right] = false; }
        
        this.lastX = this.x; this.lastY = this.y;

        let combatAngleDiff = aimAtPlayerAngle - this.angle;
        combatAngleDiff = Math.atan2(Math.sin(combatAngleDiff), Math.cos(combatAngleDiff));

        let triggerHappy = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? 0.08 : (this.difficulty === 'NORMAL' ? 0.04 : 0.01);
        let acceptableCombatAngle = (this.difficulty === 'HARD' || this.difficulty === 'HARD_1') ? 0.3 : 0.4;

        if (Math.abs(combatAngleDiff) < acceptableCombatAngle && distToPlayer < 700 && (!obstacleAhead || bankingShot)) {
            if (this.difficulty === 'EASY' && frameCount % 2 === 0) return; 
            if (seekingCover && Math.random() > 0.3) return; 

            keys[this.controls.c] = true; 
            
            if (this.config.id === 'abyss' && myOrb) {
                if (now > this.cooldowns.z) keys[this.controls.z] = true;
            } else {
                if (this.config.id === 'destroyer' || this.config.id === 'abyss') {
                    if (this.destroAiming) { keys[this.controls.x] = true; if (this.destroAimDist >= distToPlayer - 40) keys[this.controls.x] = false; } 
                    else if (Math.random() < triggerHappy && distToPlayer > 200 && now > this.cooldowns.x) { keys[this.controls.x] = true; }
                } else if (Math.random() < triggerHappy) { keys[this.controls.x] = true; }
                if (distToPlayer < 450 && Math.random() < triggerHappy) keys[this.controls.z] = true;
            }
        }
    }

    update() {
        if (this.isDead) return;
        if (this.isAI && players[0] && !players[0].isDead) { this.think(); }

        // --- NEW: Tempest Orbital Passive Mechanics ---
        if (this.config.id === 'tempest') {
            if (this.tempestSpeedTimer > 0) {
                this.tempestSpeedTimer--;
                if (this.tempestSpeedTimer <= 0) {
                    this.tempestSpeedStacks = 0;
                }
            }
            
            // Base speed + 70% per stack
            let orbitalSpeed = 0.03 * (1 + (this.tempestSpeedStacks * 0.70));
            this.tempestOrbitalAngle += orbitalSpeed;
            
            // Handle orbital collision
            const now = Date.now();
            let hitboxes = [];
            for (let i = 0; i < 3; i++) {
                let angleOffset = this.tempestOrbitalAngle + (i * ((Math.PI * 2) / 3));
                hitboxes.push({
                    x: this.x + Math.cos(angleOffset) * this.passiveAuraRadius,
                    y: this.y + Math.sin(angleOffset) * this.passiveAuraRadius
                });
            }
            
            players.forEach(enemy => {
                if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                    hitboxes.forEach((hb, index) => {
                        if (Math.hypot(enemy.x - hb.x, enemy.y - hb.y) < enemy.radius + 20) {
                            if (now > this.tempestOrbitalCooldowns[index]) {
                                enemy.hp -= 7;
                                if (typeof recordDamage === 'function') recordDamage(this.owner, 7);
                                this.tempestOrbitalCooldowns[index] = now + 250; // 0.25s cd per specific tornado
                                createParticles(enemy.x, enemy.y, 5, '#aaffff', 1.5, 0.4);
                                floatingTexts.push({x: enemy.x, y: enemy.y - 40, text: "-7", life: 30, color: '#aaffff'});
                                if (enemy.hp <= 0 && !enemy.isDead) { enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1); }
                            }
                        }
                    });
                }
            });
        }

        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.electrocutedTimer > 0) this.electrocutedTimer--;
        if (this.phantomMarkTimer > 0) { this.phantomMarkTimer--; if (this.phantomMarkTimer <= 0) this.phantomMarks = 0; }
        if (this.phantomShockTimer > 0) this.phantomShockTimer--;

        if (this.portalTimer > 0) {
            this.portalTimer--;
            if (this.portalTimer <= 0) { this.portalA = null; this.portalB = null; this.cooldowns.z = Date.now() + 18000; }
        }

        if (this.config.id === 'phantom') {
            if (this.phantomEvasiveTimer > 0) {
                this.phantomEvasiveTimer--; this.ghostToggleTimer--;
                if (this.ghostToggleTimer <= 0) { this.isGhost = !this.isGhost; this.ghostToggleTimer = Math.floor(Math.random() * (120 - 30 + 1) + 30); }
                if (this.phantomEvasiveTimer <= 0) { this.isGhost = false; floatingTexts.push({x: this.x, y: this.y - 40, text: "Evasive Maneuvers Deactivated", life: 60, color: '#9d00ff'}); }
            } else { this.isGhost = false; }
        }

        if (this.zHeight > 0) { this.stunTimer = Math.max(this.stunTimer, 2); this.zRotation += 0.05; } 
        else { this.zRotation = 0; }

        if (this.kbTimer > 0) {
            let oldX = this.x; let oldY = this.y;
            this.x += this.kbX; this.y += this.kbY;
            this.checkWallCollisions(); 
            if (this.kbType === 'wall_slam') {
                let movedDist = Math.hypot(this.x - oldX, this.y - oldY); let intendedDist = Math.hypot(this.kbX, this.kbY);
                let hitEdge = this.x <= this.radius || this.x >= canvas.width - this.radius || this.y <= this.radius || this.y >= canvas.height - this.radius;
                if (movedDist < intendedDist - 2 || hitEdge) {
                    this.kbType = null; this.stunTimer = Math.max(this.stunTimer, 120); this.afterStunSlow = 90;
                    floatingTexts.push({x: this.x, y: this.y - 40, text: "CRITICALLY JAMMED!", life: 90, color: '#ff3333'}); createKaboom(this.x, this.y, 1.5);
                }
            }
            this.kbX *= 0.85; this.kbY *= 0.85; this.kbTimer--;
            if (this.kbTimer <= 0) this.kbType = null;
        }

        if (this.stunTimer > 0 && this.zHeight === 0) {
            this.stunTimer--;
            if (this.stunTimer % 8 === 0) createParticles(this.x + (Math.random()-0.5)*30, this.y + (Math.random()-0.5)*30, 2, '#00ffff', 1.2, 0.4);
        } else if (this.stunTimer > 0) {
            this.stunTimer--;
        }

        this.isSlowed = false;
        for (let i = this.poisons.length - 1; i >= 0; i--) {
            let p = this.poisons[i]; let poisonDamage = p.dps / 60; this.hp -= poisonDamage; 
            if (typeof recordDamage === 'function') recordDamage(this.owner === 1 ? 2 : 1, poisonDamage); 
            p.life--; if (p.life <= 0) this.poisons.splice(i, 1);
        }
        
        hazards.forEach(h => {
            if (h.owner !== this.owner && Math.hypot(this.x - h.x, this.y - h.y) < this.radius + h.radius) {
                if (h.type === 'poison_pool') { this.hp -= 0.5 / 60; this.isSlowed = true; } 
                else if (h.type === 'seraph_aoe') {
                    this.isSlowed = true; this.electrocutedTimer = Math.max(this.electrocutedTimer, 5);
                    if (h.life % 60 === 0) {
                        this.hp -= 3.5; this.stunTimer = Math.max(this.stunTimer, 30);
                        if (typeof recordDamage === 'function') recordDamage(h.owner, 3.5); 
                        floatingTexts.push({x: this.x, y: this.y - 40, text: "SHOCKED!", life: 40, color: '#00ffff'});
                        let ownerTank = players.find(p => p.owner === h.owner);
                        if (ownerTank && ownerTank.config.id === 'seraph' && !ownerTank.zReady) ownerTank.energy = Math.min(100, ownerTank.energy + 5);
                    }
                }
            }
        });
        
        if (this.hp <= 0 && !this.isDead) { this.isDead = true; createKaboom(this.x, this.y, 2.0 * this.scaleMod); handleDeath(this.owner === 1 ? 0 : 1); return; }

        let currentSpeed = this.isSlowed ? this.speed * 0.5 : this.speed;
        
        if (this.stunTimer <= 0 && this.afterStunSlow > 0) { this.afterStunSlow--; currentSpeed *= 0.1; }
        if (this.stunTimer <= 0 && this.destroSlowTimer > 0) { this.destroSlowTimer--; currentSpeed *= 0.2; }
        if (this.fireSlowTimer > 0) { this.fireSlowTimer--; currentSpeed *= 0.3; }

        if (this.abyssSlowTimer > 0) {
            this.abyssSlowTimer--;
            let domainActive = hazards.some(h => h.type === 'abyss_domain' && h.owner !== this.owner);
            if (!domainActive || this.abyssSlowTimer <= 0) {
                this.abyssSlowStacks = 0; this.abyssSlowTimer = 0;
            } else {
                let slowMultiplier = 1 - (this.abyssSlowStacks * 0.08); 
                currentSpeed *= Math.max(0.2, slowMultiplier); 
                if (frameCount % 10 === 0) { createParticles(this.x, this.y, 1, '#ff0000', 1.2, 0.3); }
            }
        } else { this.abyssSlowStacks = 0; }

        if (this.fireShieldActive) {
            this.fireShieldTimer--;
            if (this.fireShieldHp <= 0 || this.fireShieldTimer <= 0) {
                this.fireShieldActive = false;
            } else {
                this.stunTimer = 0; this.kbTimer = 0; this.kbX = 0; this.kbY = 0;
                this.poisons = []; this.isSlowed = false; this.electrocutedTimer = 0;
                if (this.hookState === 'pulled') this.hookState = 'ready';
                
                players.forEach(enemy => {
                    if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                        if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius + 45) {
                            let shieldDmg = 3 / 60; enemy.hp -= shieldDmg; 
                            if (typeof recordDamage === 'function') recordDamage(this.owner, shieldDmg); 
                            if (Math.random() > 0.8) createParticles(enemy.x, enemy.y, 1, '#ffaa00', 1, 0.2);
                            if (enemy.hp <= 0 && !enemy.isDead) { enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1); }
                        }
                    }
                });
            }
        }

        if (this.flameTimer > 0) {
            this.flameTimer--; currentSpeed *= 1.4; const tip = this.getTip();
            if (this.flameTimer % 2 === 0) {
                for(let i=0; i<3; i++) {
                    let pAngle = this.angle + (Math.random() - 0.5) * 0.7; let pSpeed = Math.random() * 6 + 3;
                    particles.push({ x: tip.x, y: tip.y, vx: Math.cos(pAngle)*pSpeed, vy: Math.sin(pAngle)*pSpeed, life: Math.random() * 0.3 + 0.2, size: Math.random() * 8 + 4, color: Math.random() > 0.4 ? '#ff4500' : '#ffaa00' });
                }
            }
            players.forEach(enemy => {
                if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                    let dx = enemy.x - tip.x; let dy = enemy.y - tip.y;
                    if (Math.hypot(dx, dy) < 100) { 
                        let angleToEnemy = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(Math.atan2(Math.sin(angleToEnemy - this.angle), Math.cos(angleToEnemy - this.angle)));
                        if (angleDiff < 0.8) { 
                            let flameDmg = 3.5 / 60; enemy.hp -= flameDmg; 
                            if (typeof recordDamage === 'function') recordDamage(this.owner, flameDmg); 
                            updateHUD();
                            if (Math.random() > 0.7) createParticles(enemy.x, enemy.y, 1, '#ff4500', 1, 0.2); 
                            if (enemy.hp <= 0 && !enemy.isDead) { enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1); }
                        }
                    }
                }
            });
        }

        if (this.config.id === 'seraph') {
            if (this.energy >= 100 && !this.zReady) { this.energy = 100; this.zReady = true; }
            if (this.zReady && keys[this.controls.z] && this.stunTimer <= 0 && this.dashState === 0) {
                this.zChargeTimer++;
                if (this.zChargeTimer > 0 && this.zChargeTimer < 30) {
                    const tip = this.getTip(); createParticles(tip.x + (Math.random()-0.5)*40, tip.y + (Math.random()-0.5)*40, 1, '#00ffff', 1, 0.2);
                }
                if (this.zChargeTimer >= 30) {
                    this.zFiring = true; this.energy -= 10 / 60; 
                    if (this.energy <= 0) { this.energy = 0; this.zReady = false; this.zFiring = false; this.zChargeTimer = 0; }
                }
            } else { this.zChargeTimer = 0; this.zFiring = false; if (this.energy <= 0) this.zReady = false; }

            if (this.zFiring) {
                const tip = this.getTip(); let endX = tip.x; let endY = tip.y;
                for (let i = 0; i < 800; i += 5) {
                    let testX = tip.x + Math.cos(this.angle) * i; let testY = tip.y + Math.sin(this.angle) * i;
                    let hitWall = false;
                    for (let w of currentMap.walls) { if (testX >= w.x && testX <= w.x + w.w && testY >= w.y && testY <= w.y + w.h) { hitWall = true; break; } }
                    if (hitWall) break; let hitRock = false;
                    for (let r of currentMap.rocks) { if (Math.hypot(testX - r.x, testY - r.y) <= r.r) { hitRock = true; break; } }
                    if (hitRock) break; endX = testX; endY = testY;
                }
                players.forEach(enemy => {
                    if (enemy.owner !== this.owner && !enemy.isDead && enemy.invulnTimer <= 0) {
                        if (distToSegment({x: enemy.x, y: enemy.y}, tip, {x: endX, y: endY}) < enemy.radius + 15) { 
                            if (frameCount % 30 === 0) { 
                                enemy.hp -= 2.0; 
                                if (typeof recordDamage === 'function') recordDamage(this.owner, 2.0); 
                                enemy.electrocutedTimer = 30; createParticles(enemy.x, enemy.y, 3, '#00ffff', 1.5, 0.3);
                                if (enemy.hp <= 0 && !enemy.isDead) { enemy.isDead = true; createKaboom(enemy.x, enemy.y, 2.0); handleDeath(enemy.owner === 1 ? 0 : 1); }
                            }
                        }
                    }
                });
                this.beamStartX = tip.x; this.beamStartY = tip.y; this.beamEndX = endX; this.beamEndY = endY;
            }
        }

        if (this.hookState === 'pulling') {
            if (this.hookTarget && !this.hookTarget.isDead && this.hookTimer > 0) {
                let frontX = this.x + Math.cos(this.angle) * 55 * this.scaleMod; let frontY = this.y + Math.sin(this.angle) * 55 * this.scaleMod;
                let dx = frontX - this.hookTarget.x; let dy = frontY - this.hookTarget.y; let dist = Math.hypot(dx, dy);
                if (dist > 20) { this.hookTarget.x += (dx / dist) * 11; this.hookTarget.y += (dy / dist) * 11; createParticles(this.hookTarget.x, this.hookTarget.y, 1, '#00ff66', 1, 0.3); } 
                else { this.hookState = 'ready'; this.hookTarget.stunTimer = 90; floatingTexts.push({x: this.hookTarget.x, y: this.hookTarget.y - 45, text: "JAMMED!", life: 75, color: '#00ffff'}); this.cooldowns.x = Date.now() + this.maxCooldowns.x; this.hookTarget = null; }
                this.hookTimer--;
                if (this.hookTimer <= 0 && this.hookState === 'pulling') { this.hookState = 'ready'; if (this.hookTarget) this.hookTarget.stunTimer = 90; this.cooldowns.x = Date.now() + this.maxCooldowns.x; this.hookTarget = null; }
            } else { this.hookState = 'ready'; this.hookTarget = null; }
        }

        if (this.config.id === 'dreadnaught') {
            const now = Date.now();
            if (this.mgReloading && now > this.cooldowns.x) { this.mgReloading = false; this.mgAmmo = this.mgMaxAmmo; }
            if (!this.mgReloading && keys[this.controls.x] && this.dashState === 0 && this.stunTimer <= 0) { if (now > this.cooldowns.x) this.fireMG(now); }
        }

        if (this.burstsLeft > 0 && this.stunTimer <= 0) {
            this.burstTimer--;
            if (this.burstTimer <= 0) {
                const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 0.5);
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle + (Math.random() - 0.5) * 0.3, 14, 3, 3, '#00ff66', 'toxic_bullet', 0));
                this.burstsLeft--; this.burstTimer = 6; this.recoil = 2;
            }
        }

        if (this.dashState === 3 && this.stunTimer <= 0) {
            currentSpeed = 16; this.dashTimer--;
            if (frameCount % 3 === 0) { hazards.push({ owner: this.owner, type: 'fire_trail', x: this.x, y: this.y, radius: 30, life: 300, maxLife: 300 }); }
            players.forEach(enemy => {
                if (enemy.owner !== this.owner && !enemy.isDead && !this.ghostHitTanks.includes(enemy.owner)) {
                    if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
                        enemy.hp -= 15; this.ghostHitTanks.push(enemy.owner);
                        if (typeof recordDamage === 'function') recordDamage(this.owner, 15, false, true); 
                        createParticles(enemy.x, enemy.y, 10, '#ff4500', 2, 0.5);
                        floatingTexts.push({x: enemy.x, y: enemy.y - 40, text: "-15 BURN!", life: 40, color: '#ff3300'});
                        if (enemy.hp <= 0 && !enemy.isDead) { enemy.isDead = true; handleDeath(enemy.owner === 1 ? 0 : 1); }
                    }
                }
            });
            this.x += Math.cos(this.angle) * currentSpeed; this.y += Math.sin(this.angle) * currentSpeed;
            if (this.dashTimer <= 0) { this.dashState = 0; this.isGhosting = false; }
            this.checkWallCollisions(); this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x)); this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            return; 
        }

        if (this.dashState === 1 && this.stunTimer <= 0) {
            this.dashTimer--; createParticles(this.x - Math.cos(this.angle)*20, this.y - Math.sin(this.angle)*20, 2, this.config.color, 1, 0.5);
            if (this.dashTimer <= 0) { this.dashState = 2; this.dashTimer = 15; createKaboom(this.x - Math.cos(this.angle)*25, this.y - Math.sin(this.angle)*25, 0.5); }
            return; 
        }
        
        if (this.dashState === 2 && this.stunTimer <= 0) {
            currentSpeed = 12; this.dashTimer--; createParticles(this.x, this.y, 1, '#fff', 3, 0.4); 
            if (this.dashTimer <= 0) { this.dashState = 0; if (this.config.id === 'pyro') this.flameTimer = 300; }
        }

        if (this.dashState !== 2 && this.dashState !== 3 && this.hookState !== 'pulling' && this.stunTimer <= 0) { 
            if (keys[this.controls.left]) this.angle -= this.rotSpeed;
            if (keys[this.controls.right]) this.angle += this.rotSpeed;

            if (!this.zFiring) {
                let throttle = 0;
                if (keys[this.controls.up]) throttle += 1;
                if (keys[this.controls.down]) throttle -= 1;
                if (this.config.id === 'phantom' && this.phantomEvasiveTimer > 0) { currentSpeed *= 1.18; }
                if (throttle !== 0) { this.x += Math.cos(this.angle) * throttle * currentSpeed; this.y += Math.sin(this.angle) * throttle * currentSpeed; }
            }
        } else if (this.dashState === 2) {
            this.x += Math.cos(this.angle) * currentSpeed; this.y += Math.sin(this.angle) * currentSpeed;
        }

        if (this.recoil > 0.1) { this.x -= Math.cos(this.angle) * this.recoil; this.y -= Math.sin(this.angle) * this.recoil; this.recoil *= 0.8; }

        this.checkWallCollisions();
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.dashState === 0 && this.stunTimer <= 0 && !this.zFiring) {
            const now = Date.now();
            
            if (keys[this.controls.c] && now > this.cooldowns.c && this.burstsLeft === 0) {
                if (this.config.id === 'tempest') {
                    this.cooldowns.c = now + this.maxCooldowns.c; 
                    this.recoil = 4; 
                    const tip = this.getTip();
                    createMuzzleFlash(tip.x, tip.y, this.angle, 1.0);
                    projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 18, 5, 3.5, '#aaffff', 'tempest_c', 0));
                } else if (this.config.id === 'abyss') {
                    this.cooldowns.c = now + 150; 
                    this.kbX -= Math.cos(this.angle) * 0.5; this.kbY -= Math.sin(this.angle) * 0.5; this.kbTimer = 5;

                    const tip = this.getTip();
                    let isDomainActive = hazards.some(h => h.type === 'abyss_domain' && h.owner === this.owner);
                    
                    if (isDomainActive) {
                        projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle + (Math.random() - 0.5) * 0.15, 20, 5, 0.5, '#000000', 'abyss_rapid_empowered', 0));
                        createMuzzleFlash(tip.x, tip.y, this.angle, 1.2);
                    } else {
                        projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle + (Math.random() - 0.5) * 0.15, 18, 3, 0.5, '#4a0080', 'abyss_rapid', 0));
                        createMuzzleFlash(tip.x, tip.y, this.angle, 0.8);
                    }
                } else {
                    this.fireC(now);
                }
            }

            if (this.config.id === 'orion') {
                if (keys[this.controls.z] && now > this.cooldowns.z) {
                    this.zHoldTimer++;
                    this.zHeldLastFrame = true;
                    if (this.zHoldTimer === 15) {
                        this.recoil = 8; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
                        projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 16, 6, 3, '#ff33cc', 'orion_z_lift', 0));
                        this.cooldowns.z = now + this.maxCooldowns.z; 
                    }
                } else if (!keys[this.controls.z] && this.zHeldLastFrame) {
                    if (this.zHoldTimer > 0 && this.zHoldTimer < 15 && now > this.cooldowns.z) {
                        if (!this.portalA) { this.portalA = { x: this.x, y: this.y }; createParticles(this.x, this.y, 15, '#ff33cc', 2, 0.5); } 
                        else if (!this.portalB) { this.portalB = { x: this.x, y: this.y }; createParticles(this.x, this.y, 15, '#ff33cc', 2, 0.5); this.portalTimer = 600; }
                    }
                    this.zHeldLastFrame = false; this.zHoldTimer = 0;
                }
            }
            
            if (this.config.id === 'destroyer' || this.config.id === 'abyss') {
                if (keys[this.controls.x] && now > this.cooldowns.x && !this.destroLocked) {
                    this.destroAiming = true; this.destroAimDist = Math.min(600, this.destroAimDist + 6); this.xHeld = true;
                } else if (!keys[this.controls.x] && this.destroAiming) {
                    this.destroAiming = false; this.cooldowns.x = now + this.maxCooldowns.x;
                    
                    if (this.config.id === 'destroyer') {
                        let targets = []; let cx = this.x + Math.cos(this.angle) * this.destroAimDist; let cy = this.y + Math.sin(this.angle) * this.destroAimDist;
                        for(let i=0; i<8; i++) { let r = Math.random() * 80; let a = Math.random() * Math.PI * 2; targets.push({x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r}); }
                        hazards.push({ owner: this.owner, type: 'destro_strike_manager', targets: targets, launched: [], timer: 0, state: 'launching', tank: this, life: 9999 });
                    } else if (this.config.id === 'abyss') {
                        let targetX = this.x + Math.cos(this.angle) * this.destroAimDist; let targetY = this.y + Math.sin(this.angle) * this.destroAimDist;
                        let orbThrow = new Projectile(this.owner, this.x, this.y, this.angle, 15, 0, 0, '#1a0033', 'abyss_orb_throw', 0);
                        orbThrow.targetX = targetX; orbThrow.targetY = targetY; orbThrow.throwDist = this.destroAimDist; orbThrow.startX = this.x; orbThrow.startY = this.y;
                        projectiles.push(orbThrow); createMuzzleFlash(this.x, this.y, this.angle, 2.0);
                        this.cooldowns.z -= 3500;
                        if (this.cooldowns.z > Date.now()) floatingTexts.push({x: this.x, y: this.y - 60, text: "-3.5s Z-CD!", life: 40, color: '#ff0000'});
                    }
                    this.destroAimDist = 100;
                }
                
                let isMoving = keys[this.controls.up] || keys[this.controls.down] || keys[this.controls.left] || keys[this.controls.right];
                if (isMoving && this.destroAiming) { this.destroAiming = false; this.destroAimDist = 100; }
            } else if (this.config.id !== 'dreadnaught') {
                if (keys[this.controls.x]) { if (!this.xHeld) { this.fireX(now); this.xHeld = true; } } else { this.xHeld = false; }
            }

            if (this.config.id !== 'seraph' && this.config.id !== 'orion') { if (keys[this.controls.z] && now > this.cooldowns.z) this.fireZ(now); }
        }
    }

    checkWallCollisions() {
        for (let w of currentMap.walls) {
            let testX = this.x; let testY = this.y;
            if (this.x < w.x) testX = w.x; else if (this.x > w.x + w.w) testX = w.x + w.w;
            if (this.y < w.y) testY = w.y; else if (this.y > w.y + w.h) testY = w.y + w.h;
            let distance = Math.hypot(this.x - testX, this.y - testY);
            if (distance < this.radius) {
                let push = this.radius - distance;
                this.x += ((this.x - testX) / distance) * push; this.y += ((this.y - testY) / distance) * push;
            }
        }
        for (let r of currentMap.rocks) {
            let dx = this.x - r.x; let dy = this.y - r.y; let dist = Math.hypot(dx, dy);
            if (dist < this.radius + r.r) { let push = (this.radius + r.r) - dist; this.x += (dx / dist) * push; this.y += (dy / dist) * push; }
        }
    }

    getTip() { const offset = (this.config.img.width * 0.12 * this.scaleMod) / 2; return { x: this.x + Math.cos(this.angle)*offset, y: this.y + Math.sin(this.angle)*offset }; }

    fireC(now) {
        this.cooldowns.c = now + this.maxCooldowns.c; 
        this.recoil = 4; const tip = this.getTip();
        
        if (this.config.id === 'scorpion') { this.burstsLeft = 3; this.burstTimer = 0; } 
        else if (this.config.id === 'dreadnaught') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 11, 8, 14, '#ff4500', 'dread_c', 2));
        } else if (this.config.id === 'seraph') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5); this.cShots++;
            let p = new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 5, '#00ffff', 'seraph_c', 1);
            p.isFifth = (this.cShots % 5 === 0); projectiles.push(p);
        } else if (this.config.id === 'pyro') {
            this.pyroCShots++;
            if (this.pyroCShots % 4 === 0) {
                floatingTexts.push({x: this.x, y: this.y - 40, text: "SUPERCHARGED FIRE MISSILES", life: 60, color: '#ff0000'});
                createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 14, 6, 15, '#ff0000', 'firebolt', 0));
            } else {
                createMuzzleFlash(tip.x, tip.y, this.angle);
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 7, '#ff4500', 'bullet', 1));
            }
        } else if (this.config.id === 'phantom') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 14, 5, 9, '#9d00ff', 'phantom_bounce', 1));
        } else if (this.config.id === 'orion') {
            createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 5, 4, '#ff33cc', 'orion_c', 3));
        } else {
            createMuzzleFlash(tip.x, tip.y, this.angle);
            if (this.config.id === 'grizzly' || this.config.id === 'destroyer') {
                if (this.config.id === 'grizzly') playSound(sfx.basicShot);
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 10, '#b533ff', 'bullet', 0));
            } else {
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 4, 7, '#ff4500', 'bullet', 1));
            }
        }
    }
        
    fireMG(now) {
        this.cooldowns.x = now + 100; 
        const w = this.config.img.width * 0.12 * this.scaleMod; const h = this.config.img.height * 0.12 * this.scaleMod;
        const fwd = w * 0.25; const side = h * 0.35;
        let px1 = this.x + Math.cos(this.angle)*fwd - Math.sin(this.angle)*side; let py1 = this.y + Math.sin(this.angle)*fwd + Math.cos(this.angle)*side;
        let px2 = this.x + Math.cos(this.angle)*fwd - Math.sin(this.angle)*(-side); let py2 = this.y + Math.sin(this.angle)*fwd + Math.cos(this.angle)*(-side);
        createMuzzleFlash(px1, py1, this.angle, 0.3); createMuzzleFlash(px2, py2, this.angle, 0.3); 
        projectiles.push(new Projectile(this.owner, px1, py1, this.angle + (Math.random() - 0.5) * 0.2, 18, 2, 0.6, '#ffcc00', 'mg', 0));
        projectiles.push(new Projectile(this.owner, px2, py2, this.angle + (Math.random() - 0.5) * 0.2, 18, 2, 0.6, '#ffcc00', 'mg', 0));
        this.mgAmmo -= 2;
        if (this.mgAmmo <= 0) { this.mgAmmo = 0; this.mgReloading = true; this.maxCooldowns.x = 15000; this.cooldowns.x = now + 15000; }
    }

    fireX(now) {
        if (this.config.id === 'tempest') {
            if (now < this.cooldowns.x || this.tempestStacks < 3) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            this.tempestStacks -= 3;
            this.recoil = 6;
            const tip = this.getTip();
            createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            for (let i = 0; i < 3; i++) {
                let spreadAngle = this.angle - 0.7 + (1.4 / 2) * i; 
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, spreadAngle, 12, 10, 0, '#aaffff', 'tempest_x', 0));
            }
            return;
        }

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
            this.recoil = 5;
            const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            for (let i = 0; i < 5; i++) {
                let spreadAngle = this.angle - 0.3 + (0.6 / 4) * i;
                projectiles.push(new Projectile(this.owner, tip.x, tip.y, spreadAngle, 16, 3, 1.5, '#9d00ff', 'phantom_sg', 0, now));
            }
            return;
        }

        if (this.config.id === 'pyro') {
            if (now < this.cooldowns.x) return;
            this.cooldowns.x = now + this.maxCooldowns.x;
            this.dashState = 3; this.dashTimer = 15; this.isGhosting = true; this.ghostHitTanks = [];
            this.dashCount++; if (this.dashCount % 3 === 0) this.activateFireShield();
            return; 
        }

        if (this.config.id === 'scorpion') {
            if (this.hookState !== 'ready' || now < this.cooldowns.x) return;
            this.recoil = 6; this.hookState = 'fired'; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 1.5);
            let arrow = new Projectile(this.owner, tip.x, tip.y, this.angle, 15, 5, 5, '#00ff66', 'arrow', 0);
            projectiles.push(arrow); this.activeArrow = arrow; return;
        }

        if (now < this.cooldowns.x) return;
        this.cooldowns.x = now + this.maxCooldowns.x; this.recoil = 7;
        
        if (this.config.id === 'grizzly') {
            playSound(sfx.cluster); const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            for (let i = 0; i < 5; i++) projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle - 0.4 + (0.8 / 4) * i, 8, 4, 6, '#ff6600', 'rocket', 3));
        } else if (this.config.id === 'seraph') {
            const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 10, 6, 3, '#00ffff', 'seraph_x', 1));
        }
    }

    fireZ(now) {
        if (this.config.id === 'tempest') {
            this.cooldowns.z = now + this.maxCooldowns.z;
            this.recoil = 5; 
            const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2.5);
            for (let i = 0; i < 3; i++) {
                let spreadAngle = this.angle - 0.5 + (1.0 / 2) * i;
                let p = new Projectile(this.owner, tip.x, tip.y, spreadAngle, 4, 15, 12, '#ffffff', 'tempest_z', 0);
                p.side = (i === 0) ? 'left' : (i === 1 ? 'center' : 'right');
                projectiles.push(p);
            }
            return;
        }

        if (this.config.id === 'phantom') {
            this.cooldowns.z = now + this.maxCooldowns.z; this.phantomEvasiveTimer = 360; this.isGhost = true;
            this.ghostToggleTimer = Math.floor(Math.random() * (120 - 30 + 1) + 30);
            floatingTexts.push({x: this.x, y: this.y - 40, text: "Evasive Maneuvers Activated", life: 60, color: '#9d00ff'}); return;
        }

        if (this.config.id === 'dreadnaught') {
            if (hazards.filter(h => h.owner === this.owner && h.type === 'mine').length >= 6) return; 
            this.cooldowns.z = now + this.maxCooldowns.z;
            hazards.push({ owner: this.owner, type: 'mine', x: this.x, y: this.y, radius: 15, life: 999999, age: 0, visible: true, triggering: false, triggerTimer: 0 }); return;
        }

        this.cooldowns.z = now + this.maxCooldowns.z;
        if (this.config.id === 'grizzly') {
            this.recoil = 12; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 3);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 9, 8, 15, '#8a2be2', 'missile', 0));
        } else if (this.config.id === 'pyro') {
            this.dashState = 1; this.dashTimer = 18; this.dashCount++; if (this.dashCount % 3 === 0) this.activateFireShield();
        } else if (this.config.id === 'scorpion') {
            hazards.push({ owner: this.owner, type: 'poison_pool', x: this.x, y: this.y, radius: 70, life: 1200 });
            createParticles(this.x, this.y, 20, '#00ff66', 2, 1.5);
        } else if (this.config.id === 'destroyer') {
            this.recoil = 10; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 3.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 16, 10, 20, '#ff0000', 'destro_missile', 0));
        } else if (this.config.id === 'abyss') {
            this.recoil = 8; const tip = this.getTip(); createMuzzleFlash(tip.x, tip.y, this.angle, 2.0);
            projectiles.push(new Projectile(this.owner, tip.x, tip.y, this.angle, 12, 6, 4, '#000000', 'abyss_z', 1)); 
        }
    }

    draw() {
        if (this.isDead) return;
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 10) % 2 === 0) return;
        
        if (this.config.id === 'tempest') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.passiveAuraRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(170, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]);
            ctx.lineDashOffset = -frameCount * 0.5;
            ctx.stroke();
            
            // Render the 3 Orbiting Tornadoes
            if (images.tempestTyphoon && images.tempestTyphoon.complete) {
                for (let i = 0; i < 3; i++) {
                    let angleOffset = this.tempestOrbitalAngle + (i * ((Math.PI * 2) / 3));
                    let tx = this.x + Math.cos(angleOffset) * this.passiveAuraRadius;
                    let ty = this.y + Math.sin(angleOffset) * this.passiveAuraRadius;
                    
                    ctx.save();
                    ctx.translate(tx, ty);
                    
                    let spinSpeedMult = 1 + (this.tempestSpeedStacks * 0.70);
                    let visualScale = 0.16 * (1 + (this.tempestSpeedStacks * 0.05)); 
                    
                    ctx.scale(Math.floor((frameCount * spinSpeedMult) / 6) % 2 === 0 ? -1 : 1, 1);
                    
                    const w = images.tempestTyphoon.width * visualScale; 
                    const h_img = images.tempestTyphoon.height * visualScale;
                    
                    ctx.shadowBlur = 15; ctx.shadowColor = '#aaffff';
                    ctx.drawImage(images.tempestTyphoon, -w/2, -h_img/2, w, h_img);
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        if (this.poisons.length > 0) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI*2); ctx.fillStyle = 'rgba(0, 255, 102, 0.3)'; ctx.fill(); }

        if (this.config.id === 'pyro' && this.fireShieldActive) {
            ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 69, 0, 0.15)'; ctx.fill(); ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3;
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff4500'; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -Date.now() / 20; ctx.stroke(); ctx.restore();
        }

        if ((this.config.id === 'destroyer' || this.config.id === 'abyss') && this.destroAiming) {
            let aimColor = this.config.id === 'abyss' ? 'rgba(74, 0, 128, 0.1)' : 'rgba(255, 0, 0, 0.1)'; let strokeColor = this.config.id === 'abyss' ? 'rgba(74, 0, 128, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            ctx.beginPath(); ctx.arc(this.x + Math.cos(this.angle) * this.destroAimDist, this.y + Math.sin(this.angle) * this.destroAimDist, 80, 0, Math.PI*2);
            ctx.fillStyle = aimColor; ctx.fill(); ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.angle) * this.destroAimDist, this.y + Math.sin(this.angle) * this.destroAimDist);
            ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (this.electrocutedTimer > 0) {
            ctx.save();
            for(let i=0; i<3; i++) {
                if (Math.random() > 0.3) {
                    ctx.beginPath(); ctx.moveTo(this.x + (Math.random()-0.5)*this.radius*2.5, this.y + (Math.random()-0.5)*this.radius*2.5);
                    ctx.lineTo(this.x + (Math.random()-0.5)*this.radius*2.5, this.y + (Math.random()-0.5)*this.radius*2.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; ctx.stroke();
                }
            }
            ctx.restore();
        }

        if (this.phantomShockTimer > 0) {
            ctx.save();
            for(let i=0; i<3; i++) {
                if (Math.random() > 0.3) {
                    ctx.beginPath(); ctx.moveTo(this.x + (Math.random()-0.5)*this.radius*2.5, this.y + (Math.random()-0.5)*this.radius*2.5);
                    ctx.lineTo(this.x + (Math.random()-0.5)*this.radius*2.5, this.y + (Math.random()-0.5)*this.radius*2.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#9d00ff'; ctx.stroke();
                }
            }
            ctx.restore();
        }

        if (this.phantomMarks > 0) {
            ctx.save(); ctx.shadowBlur = 15 + Math.sin(Date.now() / 150) * 10; ctx.shadowColor = '#9d00ff'; 
            let icon = (images.phantomp2 && images.phantomp2.complete) ? images.phantomp2 : images.phantomp;
            if (icon && icon.complete) { ctx.drawImage(icon, this.x - this.radius - 25, this.y - this.radius - 25, 32, 32); }
            ctx.shadowBlur = 5; ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(this.phantomMarks, this.x - this.radius + 10, this.y - this.radius - 3); ctx.restore();
        }
        
        if (this.stunTimer > 0) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2); ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.stroke(); }

        ctx.save(); 
        
        if (this.zHeight > 0) {
            let shadowScale = Math.max(0.2, 1 - (this.zHeight / 200)); let shadowAlpha = Math.max(0.1, 0.6 - (this.zHeight / 300));
            ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius * shadowScale * 1.5, this.radius * shadowScale * 0.8, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`; ctx.fill();
        }

        ctx.translate(this.x, this.y - this.zHeight); 
        
        if (this.config.id === 'seraph') {
            ctx.save(); ctx.fillStyle = '#222'; ctx.fillRect(-25, -45, 50, 6);
            ctx.fillStyle = this.zReady ? '#fff' : '#00ffff';
            if (this.zReady) { ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; } else { ctx.shadowBlur = 0; }
            ctx.fillRect(-25, -45, (this.energy / 100) * 50, 6); ctx.restore();
        }

        ctx.rotate(this.angle + this.zRotation);

        ctx.shadowBlur = this.dashState === 2 || this.dashState === 3 || this.dashState === 4 ? 30 : 15;
        ctx.shadowColor = this.stunTimer > 0 ? '#00ffff' : this.config.color;
        
        let visualScaleMod = this.scaleMod;
        if (this.zHeight > 0) { visualScaleMod += (this.zHeight / 400); }

        const w = this.config.img.width * 0.12 * visualScaleMod; 
        const h = this.config.img.height * 0.12 * visualScaleMod;
        
        let imgToDraw = this.config.img;
        if (this.config.id === 'phantom') {
            if (this.isGhost) {
                if (images.phantomB && images.phantomB.complete) imgToDraw = images.phantomB;
                ctx.globalAlpha = 0.4; ctx.filter = 'brightness(1.5)';
            } else {
                if (images.phantomA && images.phantomA.complete) imgToDraw = images.phantomA;
                ctx.filter = 'brightness(0.7)';
            }
        }
        
        if (this.zHeight > 0) ctx.filter = 'drop-shadow(0px 20px 10px rgba(0,0,0,0.5))';

        ctx.drawImage(imgToDraw, -w / 2, -h / 2, w, h); 
        ctx.filter = 'none'; ctx.globalAlpha = 1.0; ctx.restore();
    }
}
