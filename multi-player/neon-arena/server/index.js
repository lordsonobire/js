const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const fs = require('fs');
const { GAME_CONSTANTS } = require('../shared/constants.js');

const logFile = path.join(__dirname, '../server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
function log(msg) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    logStream.write(formattedMsg);
}

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000', `http://localhost:${process.env.PORT || 3000}`];

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Game State
let players = {};
let orbs = [];
let gameStarted = false;
let isPaused = false;
let gameTimer = GAME_CONSTANTS.GAME_DURATION;
let gameLoopInterval = null;
let orbsDirty = false; // Track when orbs change to avoid redundant broadcasts

app.use(express.static(path.join(__dirname, '../dist')));

io.on('connection', (socket) => {
    log(`New connection: ${socket.id} from ${socket.handshake.address}`);

    socket.on('join', (name) => {
        // Sanitize name: strip HTML/script tags, trim, enforce length
        if (typeof name !== 'string') return;
        name = name.replace(/[<>&"'/]/g, '').trim().slice(0, 15);
        if (!name) {
            socket.emit('error', 'Invalid name');
            return;
        }

        log(`${socket.id} attempting to join as: ${name}`);

        // Check if name is taken by a DIFFERENT socket
        const nameTaken = Object.values(players).some(p => p.name === name && p.id !== socket.id);

        if (nameTaken) {
            log(`Join rejected: Name "${name}" already taken by another player`);
            socket.emit('error', 'Name already taken');
            return;
        }

        if (Object.keys(players).length >= GAME_CONSTANTS.MAX_PLAYERS && !players[socket.id]) {
            log(`Join rejected: Game full`);
            socket.emit('error', 'Game full');
            return;
        }

        // Determine if this is the first player
        const isFirstPlayer = Object.keys(players).length === 0;

        // Emoji Pool
        const emojis = ['👾', '🚀', '🤖', '🦖', '👻', '🐱', '🦄', '💀', '👽', '🎃', '👺', '🤡', '🤠', '🐼'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        // Add or update player
        players[socket.id] = {
            id: socket.id,
            name: name,
            x: players[socket.id]?.x || Math.random() * (GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PLAYER_SIZE),
            y: players[socket.id]?.y || Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.PLAYER_SIZE),
            score: players[socket.id]?.score || 0,
            color: players[socket.id]?.color || `hsl(${Math.random() * 360}, 100%, 60%)`, // Brighter colors
            emoji: players[socket.id]?.emoji || randomEmoji,
            isReady: players[socket.id]?.isReady || false,
            lastPulse: players[socket.id]?.lastPulse || 0,
            keys: { up: false, down: false, left: false, right: false },
            isHost: players[socket.id]?.isHost || isFirstPlayer
        };

        log(`Player ${name} (${socket.id}) joined/updated. Host: ${players[socket.id].isHost}`);
        io.emit('playerJoined', players);
        socket.emit('init', { players, orbs, gameStarted, GAME_CONSTANTS });
    });

    socket.on('playerReady', () => {
        if (players[socket.id]) {
            players[socket.id].isReady = true;
            log(`Player ${players[socket.id].name} is ready`);
            io.emit('playerUpdate', players);
        }
    });

    socket.on('playerUnready', () => {
        if (players[socket.id] && !gameStarted) {
            players[socket.id].isReady = false;
            log(`Player ${players[socket.id].name} is no longer ready`);
            io.emit('playerUpdate', players);
        }
    });

    socket.on('startGame', () => {
        const player = players[socket.id];
        if (!player) return;

        if (!player.isHost) {
            log(`Start game rejected: ${player.name} is not host`);
            return;
        }

        const playerIds = Object.keys(players);
        log(`Start game requested by ${player.name}. Players: ${playerIds.length}, Game Started: ${gameStarted}`);
        if (playerIds.length >= GAME_CONSTANTS.MIN_PLAYERS && !gameStarted) {
            startGame();
        }
    });

    socket.on('inputUpdate', (input) => {
        if (!gameStarted || isPaused) return;
        const player = players[socket.id];
        if (!player) return;
        if (!input || typeof input !== 'object') return;
        player.keys = {
            up: !!input.up,
            down: !!input.down,
            left: !!input.left,
            right: !!input.right,
        };
    });

    socket.on('pulse', () => {
        if (!gameStarted || isPaused) return;
        const player = players[socket.id];
        if (!player) return;

        const now = Date.now();
        if (now - player.lastPulse >= GAME_CONSTANTS.PULSE_COOLDOWN) {
            player.lastPulse = now;
            io.emit('playerPulse', socket.id);

            // Push other players away
            Object.values(players).forEach(other => {
                if (other.id === player.id) return;
                const dx = other.x - player.x;
                const dy = other.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < GAME_CONSTANTS.PULSE_RADIUS) {
                    const angle = Math.atan2(dy, dx);
                    other.x += Math.cos(angle) * GAME_CONSTANTS.PULSE_FORCE;
                    other.y += Math.sin(angle) * GAME_CONSTANTS.PULSE_FORCE;

                    // Boundary check for pushed player
                    other.x = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PLAYER_SIZE, other.x));
                    other.y = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.PLAYER_SIZE, other.y));
                }
            });
        }
    });

    socket.on('disconnect', () => {
        log(`User disconnected: ${socket.id}`);
        const player = players[socket.id];

        if (player) {
            const wasHost = player.isHost;
            const name = player.name;
            delete players[socket.id];

            if (wasHost) {
                const remainingIds = Object.keys(players);
                if (remainingIds.length > 0) {
                    players[remainingIds[0]].isHost = true;
                    log(`Host migrated to ${players[remainingIds[0]].name}`);
                }
            }

            // Emit full players object to sync host status
            io.emit('playerLeft', { id: socket.id, name, players });

            // If game was running and players drop below minimum, reset game
            if (gameStarted && Object.keys(players).length < GAME_CONSTANTS.MIN_PLAYERS) {
                log('Not enough players to continue. Resetting game.');
                resetGame();
            } else if (Object.keys(players).length === 0) {
                // Even if not started, if everyone leaves, clean up
                resetGame();
            }
        }
    });

    socket.on('pauseGame', () => {
        if (!gameStarted || !players[socket.id]) return;
        isPaused = true;
        io.emit('gamePaused', players[socket.id].name);
    });

    socket.on('resumeGame', () => {
        if (!players[socket.id]) return;
        isPaused = false;
        io.emit('gameResumed', players[socket.id].name);
        // Reset lastTick to avoid huge delta jump is handled in loop or we can do it here if we expose lastTick
        // For simplicity, we'll let loop handle the large delta or better, just re-sync logic
    });

    socket.on('quitGame', () => {
        const player = players[socket.id];
        if (player) {
            const wasHost = player.isHost;
            const name = player.name;
            delete players[socket.id];

            if (wasHost) {
                const remainingIds = Object.keys(players);
                if (remainingIds.length > 0) {
                    players[remainingIds[0]].isHost = true;
                    log(`Host migrated to ${players[remainingIds[0]].name}`);
                }
            }

            io.emit('playerQuit', name);
            // Sync players
            io.emit('playerLeft', { id: socket.id, name, players });

            if (gameStarted && Object.keys(players).length < GAME_CONSTANTS.MIN_PLAYERS) {
                log('Not enough players to continue. Resetting game.');
                resetGame();
            } else if (Object.keys(players).length === 0) {
                // Clean up
                resetGame();
            }
        }
    });
});

function spawnOrb() {
    if (orbs.length < GAME_CONSTANTS.MAX_ORBS) {
        const isSpeed = Math.random() < GAME_CONSTANTS.SPEED_ORB_CHANCE;
        orbs.push({
            id: crypto.randomUUID(),
            x: Math.random() * (GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.ORB_SIZE),
            y: Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.ORB_SIZE),
            type: isSpeed ? 'speed' : 'normal'
        });
        orbsDirty = true;
    }
}

function checkCollisions(player) {
    const prevLength = orbs.length;
    orbs = orbs.filter(orb => {
        const pCenterX = player.x + GAME_CONSTANTS.PLAYER_SIZE / 2;
        const pCenterY = player.y + GAME_CONSTANTS.PLAYER_SIZE / 2;
        const oCenterX = orb.x + GAME_CONSTANTS.ORB_SIZE / 2;
        const oCenterY = orb.y + GAME_CONSTANTS.ORB_SIZE / 2;

        const distance = Math.sqrt((pCenterX - oCenterX) ** 2 + (pCenterY - oCenterY) ** 2);
        if (distance < (GAME_CONSTANTS.PLAYER_SIZE + GAME_CONSTANTS.ORB_SIZE) / 2) {
            if (orb.type === 'speed') {
                player.speedConfig = { multiplier: GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER, expires: Date.now() + GAME_CONSTANTS.SPEED_BOOST_DURATION };
                io.emit('powerupCollected', { id: player.id, type: 'speed' });
            } else {
                player.score += GAME_CONSTANTS.SCORE_PER_ORB;
                io.emit('scoreUpdate', { id: player.id, score: player.score });
            }
            return false;
        }
        return true;
    });
    if (orbs.length !== prevLength) orbsDirty = true;
}

function startGame() {
    gameStarted = true;
    isPaused = false;
    gameTimer = GAME_CONSTANTS.GAME_DURATION;
    orbs = [];
    for (let i = 0; i < GAME_CONSTANTS.INITIAL_ORB_COUNT; i++) spawnOrb();

    io.emit('gameStarted', { players, orbs, gameTimer, GAME_CONSTANTS });

    let lastTick = Date.now();
    let timerAccumulator = 0;

    gameLoopInterval = setInterval(() => {
        if (isPaused) {
            lastTick = Date.now(); // Keep ticking time forward so we don't jump when resumed
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastTick;
        lastTick = now;

        // Update timer every second
        timerAccumulator += deltaTime;
        if (timerAccumulator >= 1000) {
            if (gameTimer > 0) {
                gameTimer--;
                io.emit('timerUpdate', gameTimer);
            } else {
                endGame();
                return;
            }
            timerAccumulator -= 1000;
        }

        // Orb Replenishment Logic
        if (orbs.length < GAME_CONSTANTS.ORB_SCARCE_THRESHOLD) {
            if (Math.random() < GAME_CONSTANTS.ORB_SCARCE_SPAWN_CHANCE) spawnOrb();
        } else if (orbs.length < GAME_CONSTANTS.MAX_ORBS) {
            if (Math.random() < GAME_CONSTANTS.ORB_NORMAL_SPAWN_CHANCE) spawnOrb();
        }

        // Apply movement for all players
        Object.values(players).forEach(player => {
            let speed = GAME_CONSTANTS.PLAYER_SPEED;
            if (player.speedConfig && player.speedConfig.expires > now) {
                speed *= player.speedConfig.multiplier;
            } else {
                player.speedConfig = null; // Clean up expired
            }

            if (player.keys.up) player.y -= speed;
            if (player.keys.down) player.y += speed;
            if (player.keys.left) player.x -= speed;
            if (player.keys.right) player.x += speed;

            // Boundary checks
            player.x = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PLAYER_SIZE, player.x));
            player.y = Math.max(0, Math.min(GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.PLAYER_SIZE, player.y));

            checkCollisions(player);
        });

        // High frequency state broadcast — only include orbs when they change
        if (orbsDirty) {
            io.emit('gameState', { players, orbs });
            orbsDirty = false;
        } else {
            io.emit('gameState', { players });
        }
    }, 1000 / GAME_CONSTANTS.TICK_RATE);
}

function endGame() {
    gameStarted = false;
    clearInterval(gameLoopInterval);
    const playerArray = Object.values(players);
    const winner = playerArray.reduce((prev, current) => (prev.score > current.score) ? prev : current, { name: 'None', score: -1 });
    const standings = playerArray
        .map(p => ({ name: p.name, score: p.score, color: p.color, emoji: p.emoji }))
        .sort((a, b) => b.score - a.score);
    io.emit('gameOver', { winner, standings });
}

function resetGame() {
    gameStarted = false;
    isPaused = false;
    clearInterval(gameLoopInterval);

    // Notify clients to return to lobby if they are still connected
    // We don't clear players immediately here because we want them to go back to lobby
    // But usually resetGame is called when everyone left or not enough players

    // Important: We should NOT clear players{} if there are still people connected!
    // We only clear if they actually disconnected. 
    // If we are resetting because < 2 players, the remaining player stays in lobby to wait for more.

    orbs = [];
    gameTimer = GAME_CONSTANTS.GAME_DURATION;

    // Reset individual player state (score, position, etc) for new game
    Object.values(players).forEach(p => {
        p.score = 0;
        p.isReady = false;
        p.x = Math.random() * (GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PLAYER_SIZE);
        p.y = Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - GAME_CONSTANTS.PLAYER_SIZE);
    });

    log(`Resetting game and emitting gameReset to ${Object.keys(players).length} remaining players`);
    io.emit('gameReset', { players });
}

server.listen(PORT, '0.0.0.0', () => {
    log(`Server running on port ${PORT}`);
});
