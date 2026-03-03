let arena = null;
let myId = null;
let playerElements = {};
let orbElements = {};
let keys = { up: false, down: false, left: false, right: false };
let lastInput = { up: false, down: false, left: false, right: false };
let onMoveCallback = null;
let onPulseCallback = null;
let animationId = null;
let GAME_CONSTANTS = {
    PLAYER_SPEED: 5, CANVAS_WIDTH: 1200, CANVAS_HEIGHT: 800, PLAYER_SIZE: 30,
    HARD_SNAP_DISTANCE: 200, SOFT_CORRECTION_DISTANCE: 10, SOFT_CORRECTION_FACTOR: 0.05,
    LERP_BASE_FACTOR: 0.1, MAX_DELTA_FRAMES: 6
};

// State for interpolation
let localState = { x: 0, y: 0 };
let remoteStates = {}; // Stores the latest server state for others
let currentRemotePositions = {}; // Stores the current visual position for others

export function initGame(players, orbs, id, onMove, onPulse, constants) {
    arena = document.getElementById('game-arena');
    myId = id;
    onMoveCallback = onMove;
    onPulseCallback = onPulse;
    if (constants) {
        Object.assign(GAME_CONSTANTS, constants);
    } else if (window.GAME_CONSTANTS) {
        Object.assign(GAME_CONSTANTS, window.GAME_CONSTANTS);
    }

    // Clear arena
    arena.innerHTML = '';
    playerElements = {};
    orbElements = {};
    remoteStates = {};
    currentRemotePositions = {};

    // Initial setup
    const me = players[myId];
    if (me) {
        localState = { x: me.x, y: me.y };
    }

    // Initialize current positions for everyone
    Object.values(players).forEach(p => {
        if (p.id !== myId) {
            currentRemotePositions[p.id] = { x: p.x, y: p.y };
        }
    });

    // Initial render
    updateGameState(players, orbs);

    // Clean up any previous listeners before adding new ones
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    // Reset input state
    keys = { up: false, down: false, left: false, right: false };
    lastInput = { up: false, down: false, left: false, right: false };
    lastTime = 0;

    // Start loop
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function handleKeydown(e) {
    if (e.repeat) return;

    // Prevent scrolling for arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 's' || e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === ' ' || e.key === 'v') {
        onPulseCallback();
        lastPulseTime = Date.now();
    }
}

function handleKeyup(e) {
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 's' || e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
}

let lastTime = 0;

// Module-level speed boost state (avoids window global)
let latestPlayerData = null;
let lastPulseTime = 0;
const PULSE_COOLDOWN_MS = 3000;

function gameLoop(timestamp) {
    try {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 16.67;
        lastTime = timestamp;

        const cappedDelta = Math.min(deltaTime, GAME_CONSTANTS.MAX_DELTA_FRAMES);

        // 1. Client-Side Prediction
        let currentSpeed = GAME_CONSTANTS.PLAYER_SPEED;
        if (latestPlayerData?.speedConfig?.expires > Date.now()) {
            currentSpeed *= latestPlayerData.speedConfig.multiplier;
        }

        const speed = currentSpeed * cappedDelta;

        if (keys.up) localState.y -= speed;
        if (keys.down) localState.y += speed;
        if (keys.left) localState.x -= speed;
        if (keys.right) localState.x += speed;

        localState.x = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PLAYER_SIZE, localState.x));
        localState.y = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.PLAYER_SIZE, localState.y));

        // Render Local Player
        const myEl = playerElements[myId] || document.getElementById(`player-${myId}`);
        if (myEl) {
            myEl.style.transform = `translate3d(${localState.x}px, ${localState.y}px, 0)`;
        }

        // 2. Interpolate Remote Players
        Object.keys(currentRemotePositions).forEach(pid => {
            if (!remoteStates[pid] || !playerElements[pid]) return;

            const target = remoteStates[pid];
            const current = currentRemotePositions[pid];
            const f = Math.min(GAME_CONSTANTS.LERP_BASE_FACTOR * cappedDelta, 1);

            current.x += (target.x - current.x) * f;
            current.y += (target.y - current.y) * f;

            playerElements[pid].style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
        });

        // 3. Send Input to Server (only on change)
        if (JSON.stringify(keys) !== JSON.stringify(lastInput)) {
            onMoveCallback(keys);
            lastInput = { ...keys };
        }

        // 4. Update pulse cooldown indicator
        const cdFill = document.getElementById('pulse-cooldown-fill');
        if (cdFill) {
            const elapsed = Date.now() - lastPulseTime;
            const pct = Math.min(elapsed / PULSE_COOLDOWN_MS, 1);
            cdFill.style.width = `${pct * 100}%`;
            cdFill.style.background = pct >= 1 ? 'var(--neon-green)' : 'var(--neon-blue)';
        }
    } catch (err) {
        console.error('Game loop error:', err);
    }

    animationId = requestAnimationFrame(gameLoop);
}

export function updateGameState(players, orbs) {
    if (!arena) return;

    // Store latest player data for local prediction speed boost check
    if (players[myId]) {
        latestPlayerData = players[myId];
    }

    // Sync remote states
    Object.values(players).forEach(p => {
        if (p.id === myId) {
            // Server Reconciliation:
            // The server position is always "in the past" due to latency.
            // A huge distance means serious desync (or cheating), so we snap.
            // A moderate distance is expected during movement.

            const dist = Math.sqrt(Math.pow(p.x - localState.x, 2) + Math.pow(p.y - localState.y, 2));

            if (dist > GAME_CONSTANTS.HARD_SNAP_DISTANCE) {
                localState.x = p.x;
                localState.y = p.y;
            } else if (dist > GAME_CONSTANTS.SOFT_CORRECTION_DISTANCE) {
                localState.x += (p.x - localState.x) * GAME_CONSTANTS.SOFT_CORRECTION_FACTOR;
                localState.y += (p.y - localState.y) * GAME_CONSTANTS.SOFT_CORRECTION_FACTOR;
            }
        } else {
            // Update target for interpolation
            remoteStates[p.id] = { x: p.x, y: p.y };
            if (!currentRemotePositions[p.id]) {
                currentRemotePositions[p.id] = { x: p.x, y: p.y };
            }
        }
    });

    // Update Elements (Create/Destroy)
    Object.values(players).forEach(p => {
        let el = playerElements[p.id];

        // Redundant check in DOM in case reference was lost but element exists
        if (!el) {
            el = document.getElementById(`player-${p.id}`);
            if (el) playerElements[p.id] = el;
        }

        if (!el) {
            el = document.createElement('div');
            el.id = `player-${p.id}`; // Explicitly set ID
            el.className = 'game-player';
            el.style.backgroundColor = 'transparent'; // Remove background color
            el.style.boxShadow = `0 0 20px -2px ${p.color}, inset 0 0 10px -2px ${p.color}`; // Make glow mostly outward, subtle inner
            el.style.border = `2px solid ${p.color}`; // Add a border instead
            el.dataset.color = p.color; // Store for pulse
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'player-emoji';
            emojiDiv.style.transform = 'scale(1.5)';
            emojiDiv.textContent = p.emoji || '👾';

            const nameTag = document.createElement('span');
            nameTag.className = 'player-name-tag';
            nameTag.style.textShadow = `0 0 5px ${p.color}`;
            nameTag.textContent = p.name;

            el.appendChild(emojiDiv);
            el.appendChild(nameTag);
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
            arena.appendChild(el);
            playerElements[p.id] = el;
        }
        // Note: Position is updated in gameLoop relative to localState for self, or interpolation for others
    });

    // Cleanup disconnected
    Object.keys(playerElements).forEach(id => {
        if (!players[id]) {
            playerElements[id].remove();
            delete playerElements[id];
            delete currentRemotePositions[id];
            delete remoteStates[id];
        }
    });

    // Orbs (No interpolation needed, they are static mostly)
    const currentOrbIds = new Set(orbs.map(o => o.id));
    orbs.forEach(orb => {
        let el = orbElements[orb.id];
        if (!el) {
            el = document.createElement('div');
            el.className = `game-orb ${orb.type === 'speed' ? 'speed' : ''}`; // Add class based on type
            el.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0)`;
            arena.appendChild(el);
            orbElements[orb.id] = el;
        }
    });

    // Check for active powerups on players to add visual flair
    Object.values(players).forEach(p => {
        const el = playerElements[p.id];
        if (el) {
            if (p.speedConfig) {
                el.style.boxShadow = `0 0 25px #fff, 0 0 10px ${p.color}`; // Extra bright
                el.style.border = '2px solid #fff';
            } else {
                el.style.boxShadow = `0 0 15px ${p.color}`;
                el.style.border = `2px solid ${p.color}`; // Restore original border
            }
        }
    });

    Object.keys(orbElements).forEach(id => {
        if (!currentOrbIds.has(id)) {
            orbElements[id].remove();
            delete orbElements[id];
        }
    });
}

export function spawnPulseEffect(id) {
    const el = playerElements[id];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    const pulse = document.createElement('div');
    pulse.className = 'pulse-effect';
    pulse.style.left = `${rect.left - arenaRect.left + rect.width / 2}px`;
    pulse.style.top = `${rect.top - arenaRect.top + rect.height / 2}px`;
    pulse.style.borderColor = el.dataset.color || '#fff';
    arena.appendChild(pulse);
    setTimeout(() => pulse.remove(), 500);
}

export function stopGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    keys = { up: false, down: false, left: false, right: false };
    lastInput = { up: false, down: false, left: false, right: false };
    lastTime = 0;
}
