// --- ASSET MANAGEMENT ---
const images = {
    grizzly: new Image(), pyro: new Image(), scorpion: new Image(), dreadnaught: new Image(), seraph: new Image(), destroyer: new Image(), phantomA: new Image(), phantomB: new Image(), abyss: new Image(),
    missile: new Image(), cluster: new Image(), arrow: new Image(), bg1: new Image(), bg2: new Image(), goo: new Image(), lightning: new Image(), static: new Image(),
    destroRocket: new Image(), destroMissile: new Image(), target: new Image(), firebolt: new Image(), phantomMissile: new Image(), phantomSGMissile: new Image(), phantomp: new Image(), phantomp2: new Image(),
    abyssOrb: new Image(), abyssProj: new Image()
};

let loadedCount = 0;
function onAssetLoad() {
    loadedCount++;
    if (loadedCount === 27) { // Increased to 27 for Abyss assets
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.innerText = "Single Player"; 
            btnStart.disabled = false;
            document.getElementById('btn-mp').style.display = 'block';
            document.getElementById('btn-online').style.display = 'block';
        }
    }
}

// Assets
images.grizzly.onload = onAssetLoad; images.grizzly.src = 'assets/GrizzlyTank.png';
images.pyro.onload = onAssetLoad; images.pyro.src = 'assets/PyroTank.png';
images.scorpion.onload = onAssetLoad; images.scorpion.src = 'assets/ScorpionTank.png';
images.dreadnaught.onload = onAssetLoad; images.dreadnaught.src = 'assets/DreadnaughtTank.png';
images.seraph.onload = onAssetLoad; images.seraph.src = 'assets/SeraphTank.png'; 
images.destroyer.onload = onAssetLoad; images.destroyer.src = 'assets/DestroyerTank.png';
images.abyss.onload = onAssetLoad; images.abyss.src = 'assets/AbyssTank.png';

images.missile.onload = onAssetLoad; images.missile.src = 'assets/Missile.png';
images.cluster.onload = onAssetLoad; images.cluster.src = 'assets/ClusterRocket.png';
images.arrow.onload = onAssetLoad; images.arrow.src = 'assets/CorrosiveArrow.png';
images.bg1.onload = onAssetLoad; images.bg1.src = 'assets/BGbattle.png'; 
images.bg2.onload = onAssetLoad; images.bg2.src = 'assets/BGbattle2.png';
images.goo.onload = onAssetLoad; images.goo.src = 'assets/GreenGoo.png';
images.lightning.onload = onAssetLoad; images.lightning.src = 'assets/Lightning.png';
images.static.onload = onAssetLoad; images.static.src = 'assets/Static.png';

images.destroRocket.onload = onAssetLoad; images.destroRocket.src = 'assets/DestroRocket.png';
images.destroMissile.onload = onAssetLoad; images.destroMissile.src = 'assets/DestroMissile.png';
images.target.onload = onAssetLoad; images.target.src = 'assets/Target.png';
images.firebolt.onload = onAssetLoad; images.firebolt.src = 'assets/Firebolt.png';

// Phantom Assets
images.phantomA.onload = onAssetLoad; images.phantomA.src = 'assets/PhantomFormA.png';
images.phantomB.onload = onAssetLoad; images.phantomB.src = 'assets/PhantomFormB.png';
images.phantomMissile.onload = onAssetLoad; images.phantomMissile.src = 'assets/PhantomMissile.png';
images.phantomSGMissile.onload = onAssetLoad; images.phantomSGMissile.src = 'assets/PhantomSGMissile.png';
images.phantomp.onload = onAssetLoad; images.phantomp.src = 'assets/Phantomp.png';
images.phantomp2.onload = onAssetLoad; images.phantomp2.src = 'assets/Phantomp2.png';

// Abyss Assets
images.abyssOrb.onload = onAssetLoad; images.abyssOrb.src = 'assets/AbyssOrbFinal.png';
images.abyssProj.onload = onAssetLoad; images.abyssProj.src = 'assets/AbyssProjectile.png';

// --- GAME CONFIG & DATA ---
const tanksData = [
    { id: 'grizzly', name: 'GRIZZLY', img: images.grizzly, color: '#b533ff', desc: 'Normal [C | \']: Cannon (10)<br>Skill 1 [X | ;]: Cluster (6)<br>Skill 2 [Z | L]: Heavy Missile (15)' },
    { id: 'pyro', name: 'PYRO', img: images.pyro, color: '#ff4500', desc: 'Normal [C | \']: Ricochet (7, 4th shot Firebolt)<br>Skill 1 [X | ;]: Instant Dash (Leaves Fire Trail)<br>Skill 2 [Z | L]: Dash & Flamethrower (Passive: Shield on 3rd dash)' },
    { id: 'scorpion', name: 'SCORPION', img: images.scorpion, color: '#00ff66', desc: 'Normal [C | \']: Toxic Burst (3x3)<br>Skill 1 [X | ;]: Hook Arrow (Pull & Jam)<br>Skill 2 [Z | L]: Poison Leak (DoT)' },
    { id: 'dreadnaught', name: 'DREADNAUGHT', img: images.dreadnaught, color: '#8b5a2b', desc: 'Normal [C | \']: Heavy Shell (14)<br>Skill 1 [X | ;]: Dual MG (0.6/shot)<br>Skill 2 [Z | L]: Field Mine (20 Dmg/Knockback)', maxHp: 150, speedMod: 0.5, scaleMod: 1.2 },
    { id: 'seraph', name: 'SERAPH', img: images.seraph, color: '#00ffff', desc: 'Normal [C | \']: Shock Bullet (5 Dmg, 5th shot AoE)<br>Skill 1 [X | ;]: Spark Missile (Emitter)<br>Skill 2 [Z | L]: Lightning Beam (Hold, requires Energy)', maxHp: 100 },
    { id: 'destroyer', name: 'DESTROYER', img: images.destroyer, color: '#888888', desc: 'Normal [C | \']: Cannon (10)<br>Skill 1 [X | ;]: Mortar Strike (Hold to Lock)<br>Skill 2 [Z | L]: Ghost Missile (Pierces Walls, Wall-Slam Stun)', speedMod: 0.85, maxHp: 120 },
    { id: 'phantom', name: 'PHANTOM', img: images.phantomA, color: '#9d00ff', desc: 'Normal [C | \']: Bouncing Missiles (60% Hit Refund)<br>Skill 1 [X | ;]: Plasma Shotgun<br>Skill 2 [Z | L]: Evasive Maneuvers' },
    { id: 'abyss', name: 'ABYSS', img: images.abyss, color: '#1a0033', desc: 'Normal [C | \']: Shadow Bolt (Hold to Rapid Fire stored charges)<br>Skill 1 [X | ;]: Void Orb (Deploy trap, shoot 15x for Domain)<br>Skill 2 [Z | L]: Event Horizon (Bouncing Black Hole)' }
];

// --- AUDIO ASSETS ---
const sfx = {
    basicShot: new Audio('assets/TankBasicShot.mp3'),
    tankHit: new Audio('assets/TankHit.mp3'),
    cluster: new Audio('assets/Cluster.mp3')
};

function playSound(audio) {
    audio.currentTime = 0; 
    audio.play().catch(e => console.log(e)); // Catches errors if browser blocks autoplay
}

const mapsData = [
    {
        id: 'dusk', name: 'DUSK', bgImg: 'bg1',
        walls: [ {x: 350, y: 150, w: 20, h: 150}, {x: 630, y: 150, w: 20, h: 150}, {x: 350, y: 400, w: 20, h: 150}, {x: 630, y: 400, w: 20, h: 150}, {x: 450, y: 340, w: 100, h: 20} ], rocks: []
    },
    {
        id: 'plains', name: 'PLAINS', bgImg: 'bg2',
        walls: [ {x: 350, y: 50, w: 300, h: 20}, {x: 350, y: 630, w: 300, h: 20} ],
        rocks: [ {x: 250, y: 200, r: 40}, {x: 750, y: 200, r: 40}, {x: 250, y: 500, r: 40}, {x: 750, y: 500, r: 40}, {x: 500, y: 350, r: 60} ]
    }
];

const spawnPoints = [ {x: 100, y: 350}, {x: 900, y: 350}, {x: 150, y: 150}, {x: 850, y: 550} ];
