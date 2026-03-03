import { describe, it, expect, beforeEach } from 'vitest';

// We test the pure business logic functions by requiring the module
// The module loads races from file on startup, so we test against its in-memory state

const {
  getRaces,
  addRace,
  deleteRace,
  addDriver,
  updateDriver,
  deleteDriver,
  getRaceById,
  getNextRace,
  recordLap,
  updateRaceState,
  updateRaceFlag,
  RACE_DURATION
} = require('../services/raceService');

describe('raceService', () => {
  let testRace;

  beforeEach(() => {
    // Clean up all existing races
    const races = getRaces();
    while (races.length > 0) {
      deleteRace(races[0].id);
    }
    // Create a fresh test race
    testRace = addRace('Test Grand Prix');
  });

  describe('addRace', () => {
    it('creates a race with correct structure', () => {
      expect(testRace).toHaveProperty('id');
      expect(testRace.name).toBe('Test Grand Prix');
      expect(testRace.state).toBe('PENDING');
      expect(testRace.flag).toBe('danger');
      expect(testRace.drivers).toEqual([]);
      expect(testRace.fastestLap).toBeNull();
      expect(testRace.remainingTime).toBe(RACE_DURATION);
    });

    it('adds race to the races list', () => {
      const races = getRaces();
      expect(races.length).toBeGreaterThanOrEqual(1);
      expect(races.some(r => r.id === testRace.id)).toBe(true);
    });
  });

  describe('getRaceById', () => {
    it('returns the race when found', () => {
      const found = getRaceById(testRace.id);
      expect(found).not.toBeNull();
      expect(found.name).toBe('Test Grand Prix');
    });

    it('returns undefined for nonexistent ID', () => {
      const found = getRaceById('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('deleteRace', () => {
    it('removes the race from the list', () => {
      const result = deleteRace(testRace.id);
      expect(result.success).toBe(true);
      expect(getRaceById(testRace.id)).toBeUndefined();
    });

    it('returns failure for nonexistent race', () => {
      const result = deleteRace('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('addDriver', () => {
    it('adds a driver to the race', () => {
      const result = addDriver(testRace.id, 'Max Verstappen', 1);
      expect(result.success).toBe(true);
      expect(result.driver.name).toBe('Max Verstappen');
      expect(result.driver.carNumber).toBe(1);
    });

    it('enforces max 8 drivers', () => {
      for (let i = 1; i <= 8; i++) {
        addDriver(testRace.id, `Driver ${i}`, i);
      }
      const result = addDriver(testRace.id, 'Driver 9', 9);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum');
    });

    it('rejects duplicate driver names', () => {
      addDriver(testRace.id, 'Lewis Hamilton', 44);
      const result = addDriver(testRace.id, 'lewis hamilton', 77);
      expect(result.success).toBe(false);
      expect(result.message).toContain('name already exists');
    });

    it('rejects duplicate car numbers', () => {
      addDriver(testRace.id, 'Driver A', 44);
      const result = addDriver(testRace.id, 'Driver B', 44);
      expect(result.success).toBe(false);
      expect(result.message).toContain('car number already exists');
    });

    it('validates driver name length', () => {
      const result = addDriver(testRace.id, 'A'.repeat(51), 1);
      expect(result.success).toBe(false);
    });

    it('validates car number range', () => {
      const result = addDriver(testRace.id, 'Test Driver', 0);
      expect(result.success).toBe(false);

      const result2 = addDriver(testRace.id, 'Test Driver', 1000);
      expect(result2.success).toBe(false);
    });

    it('returns null for nonexistent race', () => {
      const result = addDriver('nonexistent', 'Driver', 1);
      expect(result).toBeNull();
    });
  });

  describe('updateRaceState', () => {
    it('updates state successfully', () => {
      addDriver(testRace.id, 'Driver 1', 1);
      addDriver(testRace.id, 'Driver 2', 2);
      const result = updateRaceState(testRace.id, 'SAFE_TO_START');
      expect(result.success).toBe(true);
      expect(getRaceById(testRace.id).state).toBe('SAFE_TO_START');
    });

    it('rejects invalid state', () => {
      const result = updateRaceState(testRace.id, 'INVALID_STATE');
      expect(result.success).toBe(false);
    });

    it('returns failure for nonexistent race', () => {
      const result = updateRaceState('nonexistent', 'STARTED');
      expect(result.success).toBe(false);
    });
  });

  describe('updateRaceFlag', () => {
    it('updates flag successfully', () => {
      const result = updateRaceFlag(testRace.id, 'safe');
      expect(result).toBe(true);
      expect(getRaceById(testRace.id).flag).toBe('safe');
    });

    it('rejects invalid flag', () => {
      const result = updateRaceFlag(testRace.id, 'invalid_flag');
      expect(result).toBe(false);
    });
  });

  describe('recordLap', () => {
    it('records a lap for a driver', () => {
      addDriver(testRace.id, 'Driver 1', 1);
      const driver = getRaceById(testRace.id).drivers[0];
      const lap = recordLap(testRace.id, driver.id, Date.now(), 65000);
      expect(lap).not.toBeNull();
      expect(lap.lapTime).toBe(65000);
    });

    it('tracks fastest lap at driver level', () => {
      addDriver(testRace.id, 'Driver 1', 1);
      const driver = getRaceById(testRace.id).drivers[0];
      recordLap(testRace.id, driver.id, Date.now(), 70000);
      recordLap(testRace.id, driver.id, Date.now(), 65000);
      recordLap(testRace.id, driver.id, Date.now(), 68000);

      const updated = getRaceById(testRace.id).drivers[0];
      expect(updated.fastestLap.lapTime).toBe(65000);
    });

    it('tracks fastest lap at race level', () => {
      addDriver(testRace.id, 'Driver 1', 1);
      addDriver(testRace.id, 'Driver 2', 2);
      const drivers = getRaceById(testRace.id).drivers;

      recordLap(testRace.id, drivers[0].id, Date.now(), 70000);
      recordLap(testRace.id, drivers[1].id, Date.now(), 65000);

      const race = getRaceById(testRace.id);
      expect(race.fastestLap.lapTime).toBe(65000);
      expect(race.fastestLap.driverName).toBe('Driver 2');
    });

    it('rejects invalid lap time', () => {
      addDriver(testRace.id, 'Driver 1', 1);
      const driver = getRaceById(testRace.id).drivers[0];
      const result = recordLap(testRace.id, driver.id, Date.now(), -100);
      expect(result).toBeNull();
    });
  });

  describe('getNextRace', () => {
    it('returns first pending race', () => {
      const next = getNextRace();
      expect(next).not.toBeNull();
      expect(next.state).toBe('PENDING');
    });

    it('returns null when no pending races', () => {
      deleteRace(testRace.id);
      const next = getNextRace();
      expect(next).toBeNull();
    });
  });
});
