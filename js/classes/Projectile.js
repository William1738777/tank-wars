class Projectile {
    constructor(owner, x, y, angle, speed, radius, damage, color, type, bounces) {
        this.owner = owner; this.x = x; this.y = y; this.angle = angle;
        this.vx = Math.cos(angle)*speed; this.vy = Math.sin(angle)*speed;
        this.speed = speed; this.radius = radius; this.damage = damage; 
        this.color = color; this.type = type; this.bounces = bounces;
        this.life = type === 'missile' ? 70 : (type === 'arrow' ? 45 : 999); 
        this.dead = false; this.isFifth = false; 
        this.projectileHp = type === 'mg' ? 1 : 3;
    }

    update() {
        if (this.type === 'destro_missile') {
            createParticles(this.x, this.y, 2, '#ff4500', 2, 0.3);
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.dead = true;
            return; 
        }
        
        if (this.type === 'destro_rocket') {
            this.x += this.vx; this.y += this.vy;
            if (this.y >= this.targetY) { this.y = this.targetY; this.triggerExplosion(); }
            return;
        }

        if (this.type === 'destro_up') {
            this.x += this.vx; this.y += this.vy; this.life--;
            if (this.life <= 0) this.dead = true;
            createParticles(this.x, this.y + 10, 1, '#ffaa00', 1, 0.2);
            return;
        }

        if (this.type === 'swarm') {
            this.timer++;
            if (this.timer % 6 === 0) this.targetAngle = this.baseAngle + (Math.random() - 0.5) * 1.5;
            if(this.targetAngle) this.angle += (this.targetAngle - this.angle) * 0.25;
            this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        }

        this.lastX = this.x; this.lastY = this.y;
        this.x += this.vx; this.y += this.vy; this.life--;

        if (this.type === 'seraph_c' || this.type === 'seraph_x' || this.type === 'seraph_spark') {
            createParticles(this.x + (Math.random()-0.5)*15, this.y + (Math.random()-0.5)*15, 1, '#00ffff', 1.5, 0.3);
            if (Math.random() > 0.5) createParticles(this.x, this.y, 1, '#fff', 2, 0.2);
        } else if (this.type === 'toxic_bullet') {
            createParticles(this.x, this.y, 1, 'rgba(0, 255, 102, 0.5)', 2, 0.2); 
        } else if (this.type === 'dread_c') {
            createParticles(this.x, this.y, 2, '#ff4500', 3, 0.4);
        } else if (this.type !== 'bullet' && this.type !== 'arrow' && this.type !== 'mg' && Math.random() > 0.2) {
            createParticles(this.x, this.y, 1, 'rgba(150, 150, 150, 0.7)', 4, 0.4);
        }

        let collided = false;
        if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -1; collided = true; } 
        else if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx *= -1; collided = true; }
        if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -1; collided = true; } 
        else if (this.y + this.radius > canvas.height) { this.y = canvas.height - this.radius; this.vy *= -1; collided = true; }

        if (!collided) {
            for (let w of currentMap.walls) {
                if (this.x + this.radius > w.x && this.x - this.radius < w.x + w.w &&
                    this.y + this.radius > w.y && this.y - this.radius < w.y + w.h) {
                    let hitHoriz = this.lastX + this.radius <= w.x || this.lastX - this.radius >= w.x + w.w;
                    let hitVert = this.lastY + this.radius <= w.y || this.lastY - this.radius >= w.y + w.h;
                    if (hitHoriz) { this.vx *= -1; this.x = this.lastX < w.x ? w.x - this.radius : w.x + w.w + this.radius; }
                    if (hitVert) { this.vy *= -1; this.y = this.lastY < w.y ? w.y - this.radius : w.y + w.h + this.radius; }
                    if (!hitHoriz && !hitVert) { this.vx *= -1; this.vy *= -1; }
                    collided = true; break;
                }
            }
        }
        
        if (!collided) {
            for (let r of currentMap.rocks) {
                let dx = this.x - r.x; let dy = this.y - r.y;
                let dist = Math.hypot(dx, dy);
                if (dist < this.radius + r.r) {
                    let nx = dx / dist; let ny = dy / dist;
                    let dot = this.vx * nx + this.vy * ny;
                    this.vx = this.vx - 2 * dot * nx;
                    this.vy = this.vy - 2 * dot * ny;
                    this.x += nx * ((this.radius + r.r) - dist);
                    this.y += ny * ((this.radius + r.r) - dist);
                    collided = true; break;
                }
            }
        }

        if (collided) {
            if (this.bounces > 0) { this.angle = Math.atan2(this.vy, this.vx); this.bounces--; } 
            else { this.triggerExplosion(); }
        } else if (this.life <= 0 && !this.dead) { this.triggerExplosion(); }
    }

    triggerExplosion() {
        this.dead = true;
        if (this.type === 'arrow') {
            let ownerTank = players.find(p => p.owner === this.owner);
            if (ownerTank && ownerTank.hookState === 'fired') {
                ownerTank.hookState = 'ready';
                ownerTank.cooldowns.x = Date.now() + ownerTank.maxCooldowns.x;
            }
        }

        if (this.type === 'mg' || this.type === 'bullet') {
            createParticles(this.x, this.y, 4, '#fff', 1, 0.3);
        } else if (this.type === 'toxic_bullet' || this.type === 'arrow') {
            createParticles(this.x, this.y, 8, '#00ff66', 1.5, 0.5); 
        } else if (this.type === 'seraph_c') {
            createParticles(this.x, this.y, 8, '#00ffff', 1.5, 0.5);
            if (this.isFifth) hazards.push({ owner: this.owner, type: 'seraph_aoe', x: this.x, y: this.y, radius: 140, life: 480 });
        } else if (this.type === 'seraph_x') {
            createParticles(this.x, this.y, 15, '#00ffff', 2.0, 0.5);
            hazards.push({ owner: this.owner, type: 'seraph_emitter', x: this.x, y: this.y, radius: 10, life: 240 });
        } else if (this.type === 'destro_missile') {
            createKaboom(this.x, this.y, 2.5);
        } else if (this.type === 'destro_rocket') {
            createKaboom(this.x, this.y, 1.5);
            players.forEach(tank => {
                if (tank.owner !== this.owner && !tank.isDead && tank.invulnTimer <= 0) {
                    if (Math.hypot(tank.x - this.x, tank.y - this.y) < tank.radius + 60) {
                        tank.hp -= 12;
                        tank.stunTimer = Math.max(tank.stunTimer, 15);
                        let angle = Math.atan2(tank.y - this.y, tank.x - this.x);
                        tank.kbX = Math.cos(angle) * 8; tank.kbY = Math.sin(angle) * 8; tank.kbTimer = 10;
                        tank.destroSlowTimer = Math.max(tank.destroSlowTimer || 0, 120);
                        floatingTexts.push({x: tank.x, y: tank.y - 40, text: "BOMBED!", life: 50, color: '#ff4500'});
                    }
                }
            });
        } else if (this.type === 'firebolt') {
            createKaboom(this.x, this.y, 1.2);
            createParticles(this.x, this.y, 10, '#ff0000', 1.5, 0.4);
        } else {
            createKaboom(this.x, this.y, this.type === 'missile' ? 1.5 : 1.0);
        }
        
        if (this.type === 'missile') {
            for (let j = 0; j < 5; j++) {
                let crAngle = this.angle - 0.4 + (0.8 / 4) * j;
                projectiles.push(new Projectile(this.owner, this.x, this.y, crAngle, 7, 4, 5, '#ff6600', 'rocket', 1));
            }
        }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        if (this.type === 'missile') {
            const w = images.missile.width * 0.15; const h = images.missile.height * 0.15;
            ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.drawImage(images.missile, -w/2, -h/2, w, h);
        } else if (this.type === 'swarm' || this.type === 'rocket') {
            const scale = 0.07; const w = images.cluster.width * scale; const h = images.cluster.height * scale;
            ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.drawImage(images.cluster, -w/2, -h/2, w, h);
        } else if (this.type === 'arrow') {
            const scale = 0.12; const w = images.arrow.width * scale; const h = images.arrow.height * scale;
            ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.drawImage(images.arrow, -w/2, -h/2, w, h);
        } else if (this.type === 'dread_c') {
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2);
            ctx.fillStyle = '#ff6600'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff3300'; ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI*2); ctx.fillStyle = '#ffeeaa'; ctx.fill();
        } else if (this.type === 'mg') {
            ctx.beginPath(); ctx.rect(-3, -1, 6, 2); 
            ctx.fillStyle = this.color; ctx.shadowBlur = 5; ctx.shadowColor = this.color; ctx.fill();
        } else if (this.type === 'seraph_c' && images.lightning.complete) {
            const scale = 0.15; const w = images.lightning.width * scale; const h = images.lightning.height * scale;
            ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.drawImage(images.lightning, -w/2, -h/2, w, h);
        } else if ((this.type === 'seraph_spark' || this.type === 'seraph_x') && images.static.complete) {
            const scale = 0.15; const w = images.static.width * scale; const h = images.static.height * scale;
            ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.drawImage(images.static, -w/2, -h/2, w, h);
        } else if (this.type === 'destro_missile' && images.destroMissile.complete) {
            const w = images.destroMissile.width * 0.08; 
            const h = images.destroMissile.height * 0.08;
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000'; ctx.drawImage(images.destroMissile, -w/2, -h/2, w, h);
        } else if ((this.type === 'destro_rocket' || this.type === 'destro_up') && images.destroRocket.complete) {
            ctx.rotate(Math.PI/2); 
            const w = images.destroRocket.width * 0.15; const h = images.destroRocket.height * 0.15;
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffaa00'; ctx.drawImage(images.destroRocket, -w/2, -h/2, w, h);
        } else if (this.type === 'firebolt') {
            if (images.firebolt.complete) {
                const scale = 0.15;
                const w = images.firebolt.width * scale;
                const h = images.firebolt.height * scale;
                ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000'; 
                ctx.drawImage(images.firebolt, -w/2, -h/2, w, h);
            }
        } else if (this.type !== 'destro_rocket' && this.type !== 'destro_up') {
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2);
            ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fill();
        }
        ctx.restore();
    }
}
