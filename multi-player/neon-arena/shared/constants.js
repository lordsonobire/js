const GAME_CONSTANTS = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    PLAYER_SIZE: 30,
    ORB_SIZE: 15,
    PLAYER_SPEED: 5,
    MAX_PLAYERS: 4,
    MIN_PLAYERS: 2,
    GAME_DURATION: 120, // 2 minutes
    SCORE_PER_ORB: 10,
    PULSE_COOLDOWN: 3000, // 3 seconds
    PULSE_RADIUS: 150,
    PULSE_FORCE: 15,
    MAX_ORBS: 40,

    // Reconciliation thresholds
    HARD_SNAP_DISTANCE: 200,
    SOFT_CORRECTION_DISTANCE: 10,
    SOFT_CORRECTION_FACTOR: 0.05,

    // Interpolation
    LERP_BASE_FACTOR: 0.1,
    MAX_DELTA_FRAMES: 6, // Cap deltaTime to ~100ms

    // Speed boost
    SPEED_BOOST_MULTIPLIER: 1.5,
    SPEED_BOOST_DURATION: 5000, // ms
    SPEED_ORB_CHANCE: 0.1,

    // Orb spawning
    ORB_SCARCE_THRESHOLD: 8,
    ORB_SCARCE_SPAWN_CHANCE: 0.1,
    ORB_NORMAL_SPAWN_CHANCE: 0.02,
    INITIAL_ORB_COUNT: 12,

    // Server tick rate
    TICK_RATE: 60,
};

// Support both CommonJS (server) and ES modules (client)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GAME_CONSTANTS };
} else if (typeof window !== 'undefined') {
    window.GAME_CONSTANTS = GAME_CONSTANTS;
}
