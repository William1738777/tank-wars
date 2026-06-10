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
// Automatically calculate total asset count dynamically
const totalAssets = Object.keys(images).length; 

function onAssetLoad() {
    loadedCount++;
    if (loadedCount >= totalAssets) { 
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.innerText = "Single Player"; 
            btnStart.disabled = false;
        }
        const btnOnline = document.getElementById('btn-online');
        if (btnOnline) {
            btnOnline.style.display = 'block';
        }
    }
}

// AUTOMATED GATEWAY: Attach load and error listeners to every single image dynamically
Object.keys(images).forEach(key => {
    images[key].onload = onAssetLoad;
    images[key].onerror = () => {
        console.warn(`Localtunnel dropped asset: [${key}]. Bypassing to prevent infinite loading screen.`);
        onAssetLoad(); // Advance counter anyway so the game doesn't hang
    };
});

// Assign image sources safely
images.grizzly.src = 'assets/GrizzlyTank.png';
images.pyro.src = 'assets/PyroTank.png';
images.scorpion.src = 'assets/ScorpionTank.png';
images.dreadnaught.src = 'assets/DreadnaughtTank.png';
images.seraph.src = 'assets/SeraphTank.png'; 
images.destroyer.src = 'assets/DestroyerTank.png';
images.abyss.src = 'assets/AbyssTank.png';
images.orion.src = 'assets/OrionTank.png';
images.tempest.src = 'assets/TempestTank.png';
images.blackout.src = 'assets/BlackoutTank.png';

images.missile.src = 'assets/Missile.png';
images.cluster.src = 'assets/ClusterRocket.png';
images.arrow.src = 'assets/CorrosiveArrow.png';
images.goo.src = 'assets/GreenGoo.png';
images.lightning.src = 'assets/Lightning.png';
images.static.src = 'assets/Static.png';
images.destroRocket.src = 'assets/DestroRocket.png';
images.destroMissile.src = 'assets/DestroMissile.png';
images.target.src = 'assets/Target.png';
images.firebolt.src = 'assets/Firebolt.png';

images.bg1.src = 'assets/BGbattle.png'; 
images.bg2.src = 'assets/BGbattle2.png';
images.RaidModeBG.src = 'assets/RaidModeBG.png';

images.phantomA.src = 'assets/PhantomFormA.png';
images.phantomB.src = 'assets/PhantomFormB.png';
images.phantomMissile.src = 'assets/PhantomMissile.png';
images.phantomSGMissile.src = 'assets/PhantomSGMissile.png';
images.phantomp.src = 'assets/Phantomp.png';
images.phantomp2.src = 'assets/Phantomp2.png';

images.abyssOrb.src = 'assets/AbyssOrbFinal.png';
images.abyssProj.src = 'assets/AbyssProjectile.png';
images.auraThing.src = 'assets/aurathing.png'; 

images.orionProj.src = 'assets/Orion projectile.png';

images.tempestProj.src = 'assets/TempestProjectile.png';
images.tempestTyphoon.src = 'assets/TempestTyphoon.png';
images.tempestWindCutter.src = 'assets/TempestWindCutter.png';

images.blackoutProj.src = 'assets/BlackoutProjectile.png';

images.snowGrizzly.src = 'assets/SnowGrizzly.png';
images.snowPyro.src = 'assets/SnowPyro.png';
images.usfGrizzly.src = 'assets/USFGrizzly.png';
images.turret.src = 'assets/Turret.png';
images.smallTurret.src = 'assets/TurretSmall.png';

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
    { id: 'blackout', name: 'BLACKOUT', img: images.blackout, color: '#33ff33', desc: 'Normal [C | \']: Snipe (High speed, random dmg, disrupts aim)<br>Skill 1 [X | ;]: Teleport Anchor (Teleport resets C. Hold to clear)<br>Skill 2 [Z | L]: Mark Trap (Hold to aim, triggers on step)', maxHp: 60 },
    
    // --- RAID MODE UNITS ---
    { id: 'usf_grizzly', name: 'USF GRIZZLY', img: images.usfGrizzly, color: '#33aa33', desc: 'Allied Frontline', maxHp: 100, npcOnly: true },
    { id: 'snow_grizzly', name: 'SNOW GRIZZLY', img: images.snowGrizzly, color: '#aaddff', desc: 'Enemy Support (No Heavy Missile)', maxHp: 100, aiNoZ: true, npcOnly: true },
    { id: 'snow_pyro', name: 'SNOW PYRO', img: images.snowPyro, color: '#ff4444', desc: 'Enemy Rusher', maxHp: 100, npcOnly: true },
    { id: 'facility_turret', name: 'HEAVY TURRET', img: images.turret, color: '#aaaaaa', desc: 'Stationary Defense', maxHp: 1000, speedMod: 0, scaleMod: 3, npcOnly: true },
    { id: 'small_turret', name: 'LIGHT TURRET', img: images.smallTurret, color: '#888888', desc: 'Stationary Defense', maxHp: 350, speedMod: 0, scaleMod: 2, npcOnly: true }
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
            {x: 2300, y: 400, w: 700, h: 40},
            {x: 2300, y: 1560, w: 700, h: 40},
            {x: 2300, y: 440, w: 40, h: 360},  
            {x: 2300, y: 1000, w: 40, h: 200}, 
            {x: 2300, y: 1400, w: 40, h: 160}, 
            {x: 2600, y: 750, w: 150, h: 40},
            {x: 2600, y: 1250, w: 150, h: 40}
        ],
        rocks: [ 
            {x: 1800, y: 800, r: 80}, {x: 1800, y: 1200, r: 80},
            {x: 1400, y: 1000, r: 120}, {x: 2100, y: 500, r: 60}, {x: 2100, y: 1500, r: 60}
        ]
    }
];

const spawnPoints = [ {x: 100, y: 350}, {x: 900, y: 350}, {x: 150, y: 150}, {x: 850, y: 550} ];
