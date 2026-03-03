import { io } from 'socket.io-client';
import { setupUI, updateLobby, showScreen, showError, updateTimer, updateScoreboard, showWinner, showMenu, updateScoreboardRealtime, showNotification, resetReadyState, showCountdown } from './ui.js';
import { initGame, updateGameState, spawnPulseEffect, stopGame } from './game.js';
import { playSound } from './sounds.js';

const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});
let myId = null;
let players = {};
let gameStarted = false;

setupUI({
    onJoin: (name) => {
        socket.emit('join', name);
        // Show a temporary "joining" state if needed
        document.getElementById('join-btn').disabled = true;
        setTimeout(() => {
            if (!gameStarted && document.getElementById('lobby-screen').classList.contains('hidden')) {
                document.getElementById('join-btn').disabled = false;
                document.getElementById('join-btn').innerText = 'JOIN MATCH';
                showError('Join timed out. Try again.');
            }
        }, 10000);
    },
    onReady: () => socket.emit('playerReady'),
    onUnready: () => socket.emit('playerUnready'),
    onStart: () => socket.emit('startGame'),
    onResume: () => socket.emit('resumeGame'),
    onQuit: () => {
        socket.emit('quitGame');
        location.reload();
    },
    onPause: () => socket.emit('pauseGame')
});

socket.on('connect', () => {
    myId = socket.id;
});

socket.on('disconnect', () => {
    showNotification('Connection lost. Reconnecting...');
});

socket.io.on('reconnect', () => {
    myId = socket.id;
    showNotification('Reconnected!');
    // Re-join if we had a name
    const nameInput = document.getElementById('player-name');
    if (nameInput && nameInput.value.trim()) {
        socket.emit('join', nameInput.value.trim());
    }
});

socket.io.on('reconnect_failed', () => {
    showNotification('Could not reconnect. Please refresh.');
});

socket.on('init', (data) => {
    players = data.players;
    if (data.GAME_CONSTANTS) window.GAME_CONSTANTS = data.GAME_CONSTANTS;
    updateLobby(players, myId);

    if (data.gameStarted) {
        initGame(data.players, data.orbs, myId, (input) => socket.emit('inputUpdate', input), () => socket.emit('pulse'), data.GAME_CONSTANTS);
        showScreen('game-screen');
        updateTimer(data.gameTimer);
        updateScoreboard(players);
        gameStarted = true;
    } else {
        showScreen('lobby-screen');
    }

    playSound('join');
});

socket.on('playerJoined', (updatedPlayers) => {
    players = updatedPlayers;
    updateLobby(players, myId);
});

socket.on('playerUpdate', (updatedPlayers) => {
    players = updatedPlayers;
    updateLobby(players, myId);
});

socket.on('error', (msg) => {
    showError(msg);
});

socket.on('gameStarted', (data) => {
    // Only start if I am in the player list
    if (!data.players[myId]) {
        showNotification('Game in progress. Waiting for next round.');
        return;
    }

    gameStarted = true;
    players = data.players;
    lastOrbs = data.orbs || [];
    showScreen('game-screen');
    updateTimer(data.gameTimer);
    updateScoreboard(players);
    playSound('start');

    showCountdown().then(() => {
        initGame(data.players, data.orbs, myId, (input) => socket.emit('inputUpdate', input), () => socket.emit('pulse'), data.GAME_CONSTANTS || { PLAYER_SPEED: 5 });
    });
});

let lastOrbs = [];
socket.on('gameState', (data) => {
    if (!gameStarted) return;
    if (data.orbs) lastOrbs = data.orbs;
    updateGameState(data.players, lastOrbs);
});

socket.on('scoreUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].score = data.score;
        updateScoreboardRealtime(data.id, data.score);
        playSound('collect');
    }
});

socket.on('powerupCollected', (data) => {
    if (players[data.id]) {
        // Play distinct sound if available, otherwise reuse collect
        playSound('collect');
        if (data.id === myId) {
            showNotification("⚡ SPEED BOOST! ⚡");
        }
    }
});

socket.on('timerUpdate', (time) => {
    updateTimer(time);
});

socket.on('playerPulse', (id) => {
    spawnPulseEffect(id);
    playSound('pulse');
});

socket.on('gamePaused', (name) => {
    showMenu('PAUSED', `${name} paused the game`);
});

socket.on('gameResumed', (name) => {
    showMenu(null);
    showNotification(`${name} resumed the game`);
});

socket.on('gameOver', (data) => {
    gameStarted = false;
    stopGame();
    showWinner(data);
    playSound('win');
});

socket.on('playerLeft', (data) => {
    delete players[data.id];
    if (gameStarted) {
        // Handle player leaving mid-game if needed
        showNotification(`${data.name} left the game`);
    } else {
        updateLobby(players, myId);
    }
});

socket.on('playerQuit', (name) => {
    showNotification(`${name} quit the game`);
    // Do NOT reload here unless it's us (which is handled by our own quit click, or disconnection)
    // If the server tells us someone quit, we just show the message and let playerLeft handle the removal
});

socket.on('gameReset', (data) => {
    try {
        gameStarted = false;
        stopGame();
    } catch (e) {
        console.error('Error stopping game:', e);
    }

    // Reset local players data
    if (data && data.players) {
        players = data.players;
        // Also reset local ready state if needed, though server should handle it
    }

    // Force UI updates
    updateLobby(players, myId);
    showScreen('lobby-screen');
    showMenu(null); // Hide any pause menu

    // Reset ready button state (including the closure variable)
    resetReadyState();

    showNotification('Game ended: Not enough players');
});

// --- Background Aesthetics ---
let bgTimers = [];

function initBackground() {
    const bgLayer = document.getElementById('background-layer');
    if (!bgLayer) return;

    // Track active state to allow cleanup
    let bgActive = true;
    const MAX_PLANES = 15;
    const MAX_STREAKS = 15;
    let planeCount = 0;
    let streakCount = 0;

    function createPlane() {
        if (!bgActive || planeCount >= MAX_PLANES) return;
        planeCount++;

        const plane = document.createElement('div');
        plane.className = 'bg-plane';

        const glow = document.createElement('div');
        glow.className = 'bg-plane-glow';
        plane.appendChild(glow);

        const top = Math.random() * 100;
        const duration = 15 + Math.random() * 15;
        const delay = Math.random() * 10;

        const colors = ['var(--neon-blue)', 'var(--neon-pink)', 'var(--neon-green)', 'var(--neon-yellow)'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        plane.style.top = `${top}%`;
        plane.style.animationDuration = `${duration}s`;
        plane.style.animationDelay = `-${delay}s`;
        plane.style.background = `linear-gradient(45deg, ${randomColor}, transparent)`;
        plane.style.boxShadow = `0 0 15px ${randomColor}`;
        plane.style.opacity = (0.2 + Math.random() * 0.5).toString();

        bgLayer.appendChild(plane);

        const timerId = setTimeout(() => {
            if (plane.parentNode) plane.remove();
            planeCount--;
            if (bgActive) createPlane();
        }, duration * 1000);
        bgTimers.push(timerId);
    }

    function createStarStreak() {
        if (!bgActive || streakCount >= MAX_STREAKS) return;
        streakCount++;

        const streak = document.createElement('div');
        streak.className = 'star-streak';

        const top = Math.random() * 100;
        const duration = 0.5 + Math.random() * 2;
        const delay = Math.random() * 5;

        streak.style.top = `${top}%`;
        streak.style.animationDuration = `${duration}s`;
        streak.style.animationDelay = `${delay}s`;

        bgLayer.appendChild(streak);

        const timerId = setTimeout(() => {
            if (streak.parentNode) streak.remove();
            streakCount--;
            if (bgActive) createStarStreak();
        }, (duration + 5) * 1000);
        bgTimers.push(timerId);
    }

    function createNebula() {
        const nebula = document.createElement('div');
        nebula.className = 'nebula-cloud';
        nebula.style.left = `${Math.random() * 80}%`;
        nebula.style.top = `${Math.random() * 80}%`;
        bgLayer.appendChild(nebula);
    }

    // Stagger initial spawns
    for (let i = 0; i < MAX_PLANES; i++) {
        const id = setTimeout(createPlane, i * 1000);
        bgTimers.push(id);
    }
    for (let i = 0; i < MAX_STREAKS; i++) {
        const id = setTimeout(createStarStreak, i * 400);
        bgTimers.push(id);
    }

    createNebula();
    createNebula();

    // Expose cleanup
    window._stopBackground = () => {
        bgActive = false;
        bgTimers.forEach(id => clearTimeout(id));
        bgTimers = [];
    };
}

initBackground();


