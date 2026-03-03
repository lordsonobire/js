import { describe, it, expect } from 'vitest';

const { GAME_CONSTANTS } = require('../shared/constants.js');

describe('GAME_CONSTANTS', () => {
  it('has positive canvas dimensions', () => {
    expect(GAME_CONSTANTS.CANVAS_WIDTH).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.CANVAS_HEIGHT).toBeGreaterThan(0);
  });

  it('has valid player config', () => {
    expect(GAME_CONSTANTS.PLAYER_SIZE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.PLAYER_SPEED).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.MAX_PLAYERS).toBeGreaterThanOrEqual(2);
    expect(GAME_CONSTANTS.MIN_PLAYERS).toBeGreaterThanOrEqual(2);
    expect(GAME_CONSTANTS.MIN_PLAYERS).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_PLAYERS);
  });

  it('has valid orb config', () => {
    expect(GAME_CONSTANTS.ORB_SIZE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.MAX_ORBS).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.INITIAL_ORB_COUNT).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_ORBS);
    expect(GAME_CONSTANTS.SCORE_PER_ORB).toBeGreaterThan(0);
  });

  it('has valid timing config', () => {
    expect(GAME_CONSTANTS.GAME_DURATION).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.TICK_RATE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.PULSE_COOLDOWN).toBeGreaterThan(0);
  });

  it('has valid speed boost config', () => {
    expect(GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER).toBeGreaterThan(1);
    expect(GAME_CONSTANTS.SPEED_BOOST_DURATION).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.SPEED_ORB_CHANCE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.SPEED_ORB_CHANCE).toBeLessThan(1);
  });

  it('has valid spawn probability ranges', () => {
    expect(GAME_CONSTANTS.ORB_SCARCE_SPAWN_CHANCE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.ORB_SCARCE_SPAWN_CHANCE).toBeLessThanOrEqual(1);
    expect(GAME_CONSTANTS.ORB_NORMAL_SPAWN_CHANCE).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.ORB_NORMAL_SPAWN_CHANCE).toBeLessThanOrEqual(1);
    expect(GAME_CONSTANTS.ORB_SCARCE_SPAWN_CHANCE).toBeGreaterThan(GAME_CONSTANTS.ORB_NORMAL_SPAWN_CHANCE);
  });

  it('has valid interpolation config', () => {
    expect(GAME_CONSTANTS.LERP_BASE_FACTOR).toBeGreaterThan(0);
    expect(GAME_CONSTANTS.LERP_BASE_FACTOR).toBeLessThanOrEqual(1);
    expect(GAME_CONSTANTS.HARD_SNAP_DISTANCE).toBeGreaterThan(GAME_CONSTANTS.SOFT_CORRECTION_DISTANCE);
  });
});
