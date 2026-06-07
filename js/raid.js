class RaidManager {
    constructor() {
        this.active = false;
        this.alliesReleased = false;
        this.respawnQueue = [];
        this.bunkers = [
            { x: 2350, y: 700, w: 200, h: 150 }, // Top Turret Bunker
            { x: 2350, y: 1200, w: 200, h: 150 } // Bottom Turret Bunker
        ];
    }

    init() {
        this.active = true;
        this.alliesReleased = false;
        this.respawnQueue = [];

        // 1. Spawn USF Grizzlies (Allies - Team 0)
        let usfConfig = tanksData.find(t => t.id === 'usf_grizzly');
        for (let i = 0; i < 12; i++) {
            let row = i % 4;
            let col = Math.floor(i / 4);
            let spawnX = 350 + (col * 100);
            let spawnY = 800 + (row * 120);
            
            let ally = new Tank(100 + i, usfConfig, spawnX, spawnY, 0, {}, true, 'NORMAL');
            ally.team = 0; 
            ally.isHolding = true; // Custom state we will add to Tank.js
            players.push(ally);
        }

        // 2. Spawn Snow Pyros (Aggressive Rushers - Team 1)
        let snowPyroConfig = tanksData.find(t => t.id === 'snow_pyro');
        for (let i = 0; i < 5; i++) {
            let enemy = new Tank(200 + i, snowPyroConfig, 1800 + (i * 80), 800 + (i * 100), Math.PI, {}, true, 'HARD');
            enemy.team = 1;
            players.push(enemy);
        }

        // 3. Spawn Snow Grizzlies (Support - Team 1)
        let snowGrizzlyConfig = tanksData.find(t => t.id === 'snow_grizzly');
        for (let i = 0; i < 15; i++) {
            let row = i % 5;
            let col = Math.floor(i / 5);
            let enemy = new Tank(300 + i, snowGrizzlyConfig, 2000 + (col * 120), 750 + (row * 100), Math.PI, {}, true, 'NORMAL');
            enemy.team = 1;
            players.push(enemy);
        }

        // 4. Spawn Turrets (Team 1)
        let heavyTurretConf = tanksData.find(t => t.id === 'facility_turret');
        let lightTurretConf = tanksData.find(t => t.id === 'small_turret');
        
        let t1 = new Tank(400, heavyTurretConf, 2450, 775, Math.PI, {}, true, 'HARD'); t1.team = 1;
        let t2 = new Tank(401, heavyTurretConf, 2450, 1275, Math.PI, {}, true, 'HARD'); t2.team = 1;
        players.push(t1, t2);

        // (Add the 4 light turrets at defensive choke points)
        for(let i=0; i<4; i++) {
            let lt = new Tank(402 + i, lightTurretConf, 2300, 600 + (i * 250), Math.PI, {}, true, 'NORMAL');
            lt.team = 1;
            players.push(lt);
        }
    }

    update() {
        if (!this.active) return;

        // Check if player has moved to release the allied line
        if (!this.alliesReleased && players[0]) {
            let p1 = players[0];
            if (p1.x !== p1.lastX || p1.y !== p1.lastY) {
                this.alliesReleased = true;
                players.forEach(p => { if (p.team === 0) p.isHolding = false; });
            }
        }

        // Process 5-second Respawn Queue
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            let rq = this.respawnQueue[i];
            rq.timer--;
            if (rq.timer <= 0) {
                // Revive the tank
                rq.tank.hp = rq.tank.maxHp;
                rq.tank.isDead = false;
                rq.tank.x = rq.spawnX;
                rq.tank.y = rq.spawnY;
                rq.tank.isHolding = false;
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    drawBunkers(ctx) {
        if (!this.active) return;
        ctx.fillStyle = '#444444';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 4;
        
        this.bunkers.forEach(b => {
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            // Draw a metal grate pattern for aesthetics
            ctx.beginPath();
            for(let i = b.x + 20; i < b.x + b.w; i += 20) {
                ctx.moveTo(i, b.y); ctx.lineTo(i, b.y + b.h);
            }
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    queueRespawn(tank) {
        // Do not respawn turrets or the main player
        if (tank.config.speedMod === 0 || tank.owner === 1) return; 
        
        // 5 seconds = 300 frames (assuming 60fps)
        this.respawnQueue.push({
            tank: tank,
            timer: 300,
            spawnX: tank.team === 0 ? 200 : 2800, // Allies spawn left, enemies right
            spawnY: 1000 + (Math.random() - 0.5) * 400
        });
    }
}

const raidManager = new RaidManager();
