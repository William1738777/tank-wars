// Initialize Socket.io
const socket = io();

// UI Elements
const btnOnline = document.getElementById('btn-online'); // Assuming you have this on main menu
const lobbyScreen = document.getElementById('lobby-screen');
const selectScreen = document.getElementById('select-screen');
const mainMenu = document.getElementById('main-menu'); // Adjust ID to match your main menu

const gamesList = document.getElementById('games-list');
const btnLobbyBack = document.getElementById('btn-lobby-back');
const btnLobbyCreate = document.getElementById('btn-lobby-create');
const waitingOverlay = document.getElementById('waiting-overlay');
const roomCodeDisplay = document.getElementById('room-code-display');

// Global Network State
let isOnlineGame = false;
let isHost = false;
let myRoomCode = "";

// 1. Enter Lobby
if (btnOnline) {
    btnOnline.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        lobbyScreen.style.display = 'flex';
    });
}

// 2. Go Back
btnLobbyBack.addEventListener('click', () => {
    lobbyScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
});

// 3. Update the list of active games
socket.on('updateGamesList', (games) => {
    gamesList.innerHTML = ''; // Clear old list
    
    let gameCount = 0;
    for (let id in games) {
        gameCount++;
        const game = games[id];
        
        const li = document.createElement('li');
        li.style.padding = "10px";
        li.style.borderBottom = "1px solid #333";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        let statusColor = game.status === 'IN PROGRESS' ? '#ff3333' : '#00ff66';
        
        li.innerHTML = `
            <span>ROOM: <b>${game.id}</b></span>
            <span style="color: ${statusColor}; font-size: 18px;">${game.status}</span>
            <button class="join-btn" data-id="${game.id}" style="padding: 10px 20px; background: #00ff66; cursor: pointer; border: none; font-weight: bold; ${game.status === 'IN PROGRESS' ? 'display:none;' : ''}">JOIN</button>
        `;
        gamesList.appendChild(li);
    }
    
    if (gameCount === 0) {
        gamesList.innerHTML = '<li style="color: #777;">No active games found. Click "Create Game" to host one!</li>';
    }

    // Attach click listeners to new join buttons
    document.querySelectorAll('.join-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomId = e.target.getAttribute('data-id');
            socket.emit('joinGame', roomId);
        });
    });
});

// 4. Create a Game
btnLobbyCreate.addEventListener('click', () => {
    socket.emit('createGame');
});

// Host successfully created game
socket.on('gameCreated', (gameId) => {
    isOnlineGame = true;
    isHost = true;
    myRoomCode = gameId;
    
    lobbyScreen.style.display = 'none';
    selectScreen.style.display = 'flex';
    
    // Lock Player 2's side and show waiting screen
    waitingOverlay.style.display = 'flex';
    roomCodeDisplay.innerText = `ROOM: ${gameId}`;
});

// Joiner successfully connected
socket.on('gameJoined', (gameId) => {
    isOnlineGame = true;
    isHost = false;
    myRoomCode = gameId;
    
    lobbyScreen.style.display = 'none';
    selectScreen.style.display = 'flex';
    
    // Joiner doesn't see "Waiting", they see the select screen immediately
    waitingOverlay.style.display = 'none';
});

// Host receives notification that a player joined
socket.on('playerJoined', (playerId) => {
    // Drop the waiting overlay so the Host can see Player 2 picking their tank!
    waitingOverlay.style.display = 'none';
    console.log("A player joined your room!");
});
