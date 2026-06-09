// --- ASSET MANAGEMENT ---
const images = {
    grizzly: new Image(), pyro: new Image(), scorpion: new Image(), dreadnaught: new Image(), seraph: new Image(), destroyer: new Image(), phantomA: new Image(), phantomB: new Image(), abyss: new Image(), orion: new Image(), tempest: new Image(), blackout: new Image(),
    missile: new Image(), cluster: new Image(), arrow: new Image(), bg1: new Image(), bg2: new Image(), RaidModeBG: new Image(), goo: new Image(), lightning: new Image(), static: new Image(),
    destroRocket: new Image(), destroMissile: new Image(), target: new Image(), firebolt: new Image(), phantomMissile: new Image(), phantomSGMissile: new Image(), phantomp: new Image(), phantomp2: new Image(),
    abyssOrb: new Image(), abyssProj: new Image(), auraThing: new Image(), orionProj: new Image(), tempestProj: new Image(), tempestTyphoon: new Image(), tempestWindCutter: new Image(), blackoutProj: new Image(),
    
    // NEW RAID ASSETS
    snowGrizzly: new Image(), snowPyro: new Image(), usfGrizzly: new Image(), turret: new Image(), smallTurret: new Image()
};

let loadedCount = 0;
function onAssetLoad() {
    loadedCount++;
    // Increased to 42 to account for the 5 new Raid Mode assets
    if (loadedCount === 42) { 
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.innerText = "Single Player"; 
            btnStart.disabled = false;
            document.getElementById('btn-mp').style.display = 'block';
            document.getElementById('btn-online').style.display = 'block';
        }
    }
}

// Tank Assets
images.grizzly.onload = onAssetLoad; images.grizzly.src = 'assets/GrizzlyTank.png';
images.pyro.onload = onAssetLoad; images.pyro.src = 'assets/PyroTank.png';
images.scorpion.onload = onAssetLoad; images.scorpion.src = 'assets/ScorpionTank.png';
images.dreadnaught.onload = onAssetLoad; images.dreadnaught.src = 'assets/DreadnaughtTank.png';
images.seraph.onload = onAssetLoad; images.seraph.src = 'assets/SeraphTank.png'; 
images.destroyer.onload = onAssetLoad; images.destroyer.src = 'assets/DestroyerTank.png';
images.abyss.onload = onAssetLoad; images.abyss.src = 'assets/AbyssTank.png';
images.orion.onload = onAssetLoad; images.orion.src = 'assets/OrionTank.png';
images.tempest.onload = onAssetLoad; images.tempest.src = 'assets/TempestTank.png';
images.blackout.onload = onAssetLoad; images.blackout.src = 'assets/BlackoutTank.png';

// Global Projectiles & Hazards
images.missile.onload = onAssetLoad; images.missile.src = 'assets/Missile.png';
images.cluster.onload = onAssetLoad; images.cluster.src = 'assets/ClusterRocket.png';
images.arrow.onload = onAssetLoad; images.arrow.src = 'assets/CorrosiveArrow.png';
images.goo.onload = onAssetLoad; images.goo.src = 'assets/GreenGoo.png';
images.lightning.onload = onAssetLoad; images.lightning.src = 'assets/Lightning.png';
images.static.onload = onAssetLoad; images.static.src = 'assets/Static.png';
images.destroRocket.onload = onAssetLoad; images.destroRocket.src = 'assets/DestroRocket.png';
images.destroMissile.onload = onAssetLoad; images.destroMissile.src = 'assets/DestroMissile.png';
images.target.onload = onAssetLoad; images.target.src = 'assets/Target.png';
images.firebolt.onload = onAssetLoad; images.firebolt.src = 'assets/Firebolt.png';

// Environments
images.bg1.onload = onAssetLoad; images.bg1.src = 'assets/BGbattle.png'; 
images.bg2.onload = onAssetLoad; images.bg2.src = 'assets/BGbattle2.png';
images.RaidModeBG.onload = onAssetLoad; images.RaidModeBG.src = 'assets/RaidModeBG.png';

// Phantom Specific Assets
images.phantomA.onload = onAssetLoad; images.phantomA.src = 'assets/PhantomFormA.png';
images.phantomB.onload = onAssetLoad; images.phantomB.src = 'assets/PhantomFormB.png';
images.phantomMissile.onload = onAssetLoad; images.phantomMissile.src = 'assets/PhantomMissile.png';
images.phantomSGMissile.onload = onAssetLoad; images.phantomSGMissile.src = 'assets/PhantomSGMissile.png';
images.phantomp.onload = onAssetLoad; images.phantomp.src = 'assets/Phantomp.png';
images.phantomp2.onload = onAssetLoad; images.phantomp2.src = 'assets/Phantomp2.png';

// Abyss Specific Assets
images.abyssOrb.onload = onAssetLoad; images.abyssOrb.src = 'assets/AbyssOrbFinal.png';
images.abyssProj.onload = onAssetLoad; images.abyssProj.src = 'assets/AbyssProjectile.png';
images.auraThing.onload = onAssetLoad; images.auraThing.src = 'assets/aurathing.png'; 

// Orion Specific Assets
images.orionProj.onload = onAssetLoad; images.orionProj.src = 'assets/Orion projectile.png';

// Tempest Specific Assets
images.tempestProj.onload = onAssetLoad; images.tempestProj.src = 'assets/TempestProjectile.png';
images.tempestTyphoon.onload = onAssetLoad; images.tempestTyphoon.src = 'assets/TempestTyphoon.png';
images.tempestWindCutter.onload = onAssetLoad; images.tempestWindCutter.src = 'assets/TempestWindCutter.png';

// Blackout Specific Assets
images.blackoutProj.onload = onAssetLoad; images.blackoutProj.src = 'assets/BlackoutProjectile.png';

// NEW RAID ASSETS
images.snowGrizzly.onload = onAssetLoad; images.snowGrizzly.src = 'assets/SnowGrizzly.png';
images.snowPyro.onload = onAssetLoad; images.snowPyro.src = 'assets/SnowPyro.png';
images.usfGrizzly.onload = onAssetLoad; images.usfGrizzly.src = 'assets/USFGrizzly.png';
images.turret.onload = onAssetLoad; images.turret.src = 'assets/Turret.png';
images.smallTurret.onload = onAssetLoad; images.smallTurret.src = 'assets/TurretSmall.png';

// --- GAME CONFIG & DATA ---
const tanksData = [
    { id: 'grizzly', name: 'GRIZZLY', img: images.grizzly, color: '#b533ff', desc: 'Normal [C | \']: Cannon (10)<br>Skill 1 [X | ;]: Cluster (6)<br>Skill 2 [Z | L]: Heavy Missile (15)' },
    { id: 'pyro', name: 'PYRO', img: images.pyro, color: '#ff4500', desc: 'Normal [C | \']: Ricochet (7, 4th shot Firebolt)<br>Skill 1 [X | ;]: Instant Dash (Leaves Fire Trail)<br>Skill 2 [Z | L]: Dash & Flamethrower (Passive: Shield on 3rd dash)' },
    { id: 'scorpion', name: 'SCORPION', img: images.scorpion, color: '#00ff66', desc: 'Normal [C | \']: Toxic Burst (3x3)<br>Skill 1 [X | ;]: Hook Arrow (Pull & Jam)<br>Skill 2 [Z | L]: Poison Leak (DoT)' },
    { id: 'dreadnaught', name: 'DREADNAUGHT', img: images.dreadnaught, color: '#8b5a2b', desc: 'Normal [C | \']: Heavy Shell (14)<br>Skill 1 [X | ;]: Dual MG (0.6/shot)<br>Skill 2 [Z | L]: Field Mine (20 Dmg/Knockback)', maxHp: 150, speedMod: 0.5, scaleMod: 1.2 },
    { id: 'seraph', name: 'SERAPH', img: images.seraph, color: '#00ffff', desc: 'Normal [C | \']: Shock Bullet (5 Dmg, 5th shot AoE)<br>Skill 1 [X | ;]: Spark Missile (Emitter)<br>Skill 2 [Z | L]: Lightning Beam (Hold, requires Energy)', maxHp: 100 },
    { id: 'destroyer', name: 'DESTROYER', img: images.destroyer, color: '#888888', desc: 'Normal [C | \']: Cannon (10)<br>Skill 1 [X | ;]: Mortar Strike (Hold to Lock)<br>Skill 2 [Z | L]: Ghost Missile (Pierces Walls, Wall-Slam Stun)', speedMod: 0.85, maxHp: 120 },
    { id: 'phantom', name: 'PHANTOM', img: images.phantomA, color: '#9d00ff', desc: 'Normal [C | \']: Bouncing Missiles (60% Hit Refund)<br>Skill 1 [X | ;]: Plasma Shotgun<br>Skill 2 [Z | L]: Evasive Maneuvers' },
    { id: 'abyss', name: 'ABYSS', img: images.abyss, color: '#1a0033', desc: 'Normal [C | \']: Shadow Bolt (Hold for Rapid Fire)<br>Skill 1 [X | ;]: Void Orb (Deploy trap, shoot 15x for Domain)<br>Skill 2 [Z | L]: Event Horizon (Bouncing Black Hole)' },
    { id: 'orion', name: 'ORION', img: images.orion, color: '#ff33cc', desc: 'Normal [C | \']: Shockwave Missile (Bounces/Portals)<br>Skill 1 [X | ;]: Chronosphere (Slow & Reflect)<br>Skill 2 [Z | L]: Quantum Portals (Tap) / Anti-Grav Lift (Hold)' },
    { id: 'tempest', name: 'TEMPEST', img: images.tempest, color: '#aaffff', desc: 'Normal [C | \']: Wind Shot Dash (Alternates Shoot/Dash)<br>Skill 1 [X | ;]: Typhoon\'s Embrace (Consumes 3 Marks, Shields, Trap)<br>Skill 2 [Z | L]: Windcutter (Slow Converging Crescents)', maxHp: 60, speedMod: 1.45 },
    { id: 'blackout', name: 'BLACKOUT', img: images.blackout, color: '#33ff33', desc: 'Normal [C | \']: Snipe (High speed, random dmg, disrupts aim)<br>Skill 1 [X | ;]: Teleport Anchor (Teleport resets C. Hold to clear)<br>Skill 2 [Z | L]: Mark Trap (Hold to aim, triggers on step)' },
    
    // --- RAID MODE UNITS (Set to npcOnly so they don't appear in select screen) ---
    { id: 'usf_grizzly', name: 'USF GRIZZLY', img: images.usfGrizzly, color: '#33aa33', desc: 'Allied Frontline', maxHp: 100, npcOnly: true },
    { id: 'snow_grizzly', name: 'SNOW GRIZZLY', img: images.snowGrizzly, color: '#aaddff', desc: 'Enemy Support (No Heavy Missile)', maxHp: 100, aiNoZ: true, npcOnly: true },
    { id: 'snow_pyro', name: 'SNOW PYRO', img: images.snowPyro, color: '#ff4444', desc: 'Enemy Rusher', maxHp: 100, npcOnly: true },
    { id: 'facility_turret', name: 'HEAVY TURRET', img: images.turret, color: '#aaaaaa', desc: 'Stationary Defense', maxHp: 1000, speedMod: 0, scaleMod: 10, npcOnly: true },
    { id: 'small_turret', name: 'LIGHT TURRET', img: images.smallTurret, color: '#888888', desc: 'Stationary Defense', maxHp: 350, speedMod: 0, scaleMod: 6, npcOnly: true }
];

// --- AUDIO ASSETS ---
const sfx = {
    basicShot: new Audio('assets/TankBasicShot.mp3'),
    tankHit: new Audio('assets/TankHit.mp3'),
    orionX: new Audio('assets/OrionX.mp3'),
    abyssBlackHole: new Audio('assets/AbyssBlackHole.mp3'),
    abyssDom: new Audio('assets/AbyssDom.mp3'),
    cluster: new Audio('assets/Cluster.mp3')
};

function playSound(audio) {
    audio.currentTime = 0; 
    audio.play().catch(e => console.log(e)); 
}

const mapsData = [
    {
        id: 'dusk', name: 'DUSK', bgImg: 'bg1', width: 1000, height: 700,
        walls: [ {x: 350, y: 150, w: 20, h: 150}, {x: 630, y: 150, w: 20, h: 150}, {x: 350, y: 400, w: 20, h: 150}, {x: 630, y: 400, w: 20, h: 150}, {x: 450, y: 340, w: 100, h: 20} ], rocks: []
    },
    {
        id: 'plains', name: 'PLAINS', bgImg: 'bg2', width: 1000, height: 700,
        walls: [ {x: 350, y: 50, w: 300, h: 20}, {x: 350, y: 630, w: 300, h: 20} ],
        rocks: [ {x: 250, y: 200, r: 40}, {x: 750, y: 200, r: 40}, {x: 250, y: 500, r: 40}, {x: 750, y: 500, r: 40}, {x: 500, y: 350, r: 60} ]
    },
    {
        id: 'raid_facility', name: 'RAID: ENEMY FACILITY', bgImg: 'RaidModeBG', width: 3000, height: 2000,
        walls: [ 
            // Top and Bottom enclosing walls for the facility on the right
            {x: 2300, y: 400, w: 700, h: 40},
            {x: 2300, y: 1560, w: 700, h: 40},
            // Left-side facing wall of the facility with 2 entrance gaps
            {x: 2300, y: 440, w: 40, h: 360},  // Top segment
            {x: 2300, y: 1000, w: 40, h: 200}, // Middle segment between doors
            {x: 2300, y: 1400, w: 40, h: 160}, // Bottom segment
            // Inner defensive barricades
            {x: 2600, y: 750, w: 150, h: 40},
            {x: 2600, y: 1250, w: 150, h: 40}
        ],
        rocks: [ 
            // Cover scattered approaching the facility
            {x: 1800, y: 800, r: 80}, {x: 1800, y: 1200, r: 80},
            {x: 1400, y: 1000, r: 120}, {x: 2100, y: 500, r: 60}, {x: 2100, y: 1500, r: 60}
        ]
    }
];

const spawnPoints = [ {x: 100, y: 350}, {x: 900, y: 350}, {x: 150, y: 150}, {x: 850, y: 550} ];
