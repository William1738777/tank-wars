// --- ASSET MANAGEMENT ---
const images = {
    grizzly: new Image(), pyro: new Image(), scorpion: new Image(), dreadnaught: new Image(), seraph: new Image(),
    missile: new Image(), cluster: new Image(), arrow: new Image(), bg1: new Image(), bg2: new Image(), goo: new Image(), lightning: new Image(), static: new Image()
};

let loadedCount = 0;
function onAssetLoad() {
    loadedCount++;
    if (loadedCount === 13) { 
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.innerText = "Single Player"; 
            btnStart.disabled = false;
            document.getElementById('btn-mp').style.display = 'block';
            document.getElementById('btn-online').style.display = 'block';
        }
    }
}

// Ensure you move your .png files to the assets/images/ folder!
images.grizzly.onload = onAssetLoad; images.grizzly.src = 'assets/GrizzlyTank.png';
images.pyro.onload = onAssetLoad; images.pyro.src = 'assets/PyroTank.png';
images.scorpion.onload = onAssetLoad; images.scorpion.src = 'assets/ScorpionTank.png';
images.dreadnaught.onload = onAssetLoad; images.dreadnaught.src = 'assets/DreadnaughtTank.png';
images.seraph.onload = onAssetLoad; images.seraph.src = 'assets/SeraphTank.png'; 
images.missile.onload = onAssetLoad; images.missile.src = 'assets/Missile.png';
images.cluster.onload = onAssetLoad; images.cluster.src = 'assets/ClusterRocket.png';
images.arrow.onload = onAssetLoad; images.arrow.src = 'assets/CorrosiveArrow.png';
images.bg1.onload = onAssetLoad; images.bg1.src = 'assets/BGbattle.png'; // Make sure the caps match!
images.bg2.onload = onAssetLoad; images.bg2.src = 'assets/BGbattle2.png';
images.goo.onload = onAssetLoad; images.goo.src = 'assets/GreenGoo.png';
images.lightning.onload = onAssetLoad; images.lightning.src = 'assets/Lightning.png';
images.static.onload = onAssetLoad; images.static.src = 'assets/Static.png';

// --- GAME CONFIG & DATA ---
const tanksData = [
    { id: 'grizzly', name: 'GRIZZLY', img: images.grizzly, color: '#b533ff', desc: 'Normal [C | \']: Cannon (10)<br>Skill 1 [X | ;]: Cluster (6)<br>Skill 2 [Z | L]: Heavy Missile (15)' },
    { id: 'pyro', name: 'PYRO', img: images.pyro, color: '#ff4500', desc: 'Normal [C | \']: Ricochet (7)<br>Skill 1 [X | ;]: Swarm (6)<br>Skill 2 [Z | L]: Dash & Flamethrower (+Speed/AoE)' },
    { id: 'scorpion', name: 'SCORPION', img: images.scorpion, color: '#00ff66', desc: 'Normal [C | \']: Toxic Burst (3x3)<br>Skill 1 [X | ;]: Hook Arrow (Pull & Jam)<br>Skill 2 [Z | L]: Poison Leak (DoT)' },
    { id: 'dreadnaught', name: 'DREADNAUGHT', img: images.dreadnaught, color: '#8b5a2b', desc: 'Normal [C | \']: Heavy Shell (14)<br>Skill 1 [X | ;]: Dual MG (0.6/shot)<br>Skill 2 [Z | L]: Field Mine (20 Dmg/Knockback)', maxHp: 150, speedMod: 0.5, scaleMod: 1.2 },
    { id: 'seraph', name: 'SERAPH', img: images.seraph, color: '#00ffff', desc: 'Normal [C | \']: Shock Bullet (5 Dmg, 5th shot AoE)<br>Skill 1 [X | ;]: Spark Missile (Emitter)<br>Skill 2 [Z | L]: Lightning Beam (Hold, requires Energy)', maxHp: 100 }
];

const mapsData = [
    {
        id: 'dusk', name: 'DUSK', bgImg: 'bg1',
        walls: [
            {x: 350, y: 150, w: 20, h: 150}, {x: 630, y: 150, w: 20, h: 150},
            {x: 350, y: 400, w: 20, h: 150}, {x: 630, y: 400, w: 20, h: 150},
            {x: 450, y: 340, w: 100, h: 20}
        ],
        rocks: []
    },
    {
        id: 'plains', name: 'PLAINS', bgImg: 'bg2',
        walls: [
            {x: 350, y: 50, w: 300, h: 20}, 
            {x: 350, y: 630, w: 300, h: 20}  
        ],
        rocks: [
            {x: 250, y: 200, r: 40}, {x: 750, y: 200, r: 40}, 
            {x: 250, y: 500, r: 40}, {x: 750, y: 500, r: 40}, 
            {x: 500, y: 350, r: 60} 
        ]
    }
];

const spawnPoints = [
    {x: 100, y: 350}, {x: 900, y: 350}, 
    {x: 150, y: 150}, {x: 850, y: 550}  
];
