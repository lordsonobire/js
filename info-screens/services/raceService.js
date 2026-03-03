const fs = require('fs');
const path = require('path');

// Check if running in dev mode
const isDev = process.env.npm_lifecycle_event === 'dev';
const RACE_DURATION = isDev ? 60 * 1000 : 60 * 10000; // 1 min in dev, 10 mins in prod

const filePath = path.join(__dirname, '../data/races.json');
let races = [];
const raceTimers = new Map();
let idCounter = 0;

// Debounce save to avoid excessive writes
let saveTimeout = null;
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveRaces(), 500);
}

// Load races from JSON file
async function loadRaces() {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    races = JSON.parse(data).races || [];
  } catch {
    races = [];
  }
}

// Save races to JSON file
async function saveRaces() {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify({ races }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save races:', err);
  }
}

// Get all races
function getRaces() {
  return races;
}

// Get race by ID
function getRaceById(raceId) {
  return races.find(race => race.id.toString() === raceId.toString());
}

// Add new race
function addRace(name) {
  const race = {
    id: `${Date.now()}-${++idCounter}`,
    name,
    drivers: [],
    state: 'PENDING',
    flag: 'danger',
    fastestLap: null,
    remainingTime: RACE_DURATION
  };
  races.push(race);
  debouncedSave();
  return race;
}

// Delete a race (clears associated timer to prevent memory leak)
function deleteRace(raceId) {
  const index = races.findIndex(race => race.id.toString() === raceId.toString());
  if (index === -1) return { success: false, message: 'Race not found' };

  // Clean up timer before deleting
  if (raceTimers.has(raceId)) {
    clearInterval(raceTimers.get(raceId));
    raceTimers.delete(raceId);
  }

  races.splice(index, 1);
  debouncedSave();
  return { success: true };
}

// Add driver to race
function addDriver(raceId, name, car) {
  const race = getRaceById(raceId);
  if (!race) return null;

  if (race.state !== 'PENDING') {
    return { success: false, message: 'Cannot add drivers after race has started' };
  }

  if (race.drivers.length >= 8) {
    return { success: false, message: 'Maximum of 8 drivers allowed per race' };
  }

  // Input validation
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
    return { success: false, message: 'Driver name must be 1-50 characters' };
  }

  const carNum = Number(car);
  if (!Number.isInteger(carNum) || carNum < 1 || carNum > 999) {
    return { success: false, message: 'Car number must be between 1 and 999' };
  }

  if (race.drivers.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, message: 'Driver with this name already exists' };
  }

  if (race.drivers.some(d => d.carNumber === carNum)) {
    return { success: false, message: 'Driver with this car number already exists' };
  }

  const driver = {
    id: `${Date.now()}-${++idCounter}`,
    name: name.trim(),
    carNumber: carNum,
    laps: [],
    lapCount: 0,
    fastestLap: null,
    position: race.drivers.length + 1
  };

  race.drivers.push(driver);
  debouncedSave();
  return { success: true, driver };
}

// Update driver
function updateDriver(raceId, driverId, driverData) {
  const race = getRaceById(raceId);
  if (!race) return { success: false, message: 'Race not found' };
  if (race.state !== 'PENDING') return { success: false, message: 'Cannot edit drivers after race has started' };

  const driverIndex = race.drivers.findIndex(d => d.id.toString() === driverId.toString());
  if (driverIndex === -1) return { success: false, message: 'Driver not found' };

  // Input validation
  if (typeof driverData.name !== 'string' || driverData.name.trim().length === 0 || driverData.name.trim().length > 50) {
    return { success: false, message: 'Driver name must be 1-50 characters' };
  }

  const carNum = Number(driverData.carNumber);
  if (!Number.isInteger(carNum) || carNum < 1 || carNum > 999) {
    return { success: false, message: 'Car number must be between 1 and 999' };
  }

  // Check duplicates excluding current driver
  const duplicateName = race.drivers.some(d => d.id !== driverId && d.name.toLowerCase() === driverData.name.toLowerCase());
  if (duplicateName) return { success: false, message: 'Driver with this name already exists' };

  const duplicateCar = race.drivers.some(d => d.id !== driverId && d.carNumber === carNum);
  if (duplicateCar) return { success: false, message: 'Driver with this car number already exists' };

  race.drivers[driverIndex] = {
    ...race.drivers[driverIndex],
    name: driverData.name.trim(),
    carNumber: carNum
  };

  debouncedSave();
  return { success: true, driver: race.drivers[driverIndex] };
}

// Delete driver
function deleteDriver(raceId, driverId) {
  const race = getRaceById(raceId);
  if (!race) return { success: false, message: 'Race not found' };
  if (race.state !== 'PENDING') return { success: false, message: 'Cannot delete drivers after race has started' };

  const index = race.drivers.findIndex(d => d.id === driverId);
  if (index === -1) return { success: false, message: 'Driver not found' };

  race.drivers.splice(index, 1);
  debouncedSave();
  return { success: true };
}

// Get next pending race
function getNextRace() {
  return races.find(r => r.state === 'PENDING') || null;
}

// Record a lap
function recordLap(raceId, driverId, timestamp, lapTime) {
  const race = getRaceById(raceId);
  if (!race) return null;

  const driver = race.drivers.find(d => d.id.toString() === driverId.toString());
  if (!driver) return null;

  // Validate lap time is a positive number
  if (typeof lapTime !== 'number' || lapTime <= 0) return null;

  const newLap = { time: timestamp, lapTime };
  driver.laps.push(newLap);
  driver.lapCount++;

  if (!driver.fastestLap || lapTime < driver.fastestLap.lapTime) {
    driver.fastestLap = newLap;
  }

  if (!race.fastestLap || lapTime < race.fastestLap.lapTime) {
    race.fastestLap = {
      lapTime,
      time: timestamp,
      driverId: driver.id,
      driverName: driver.name,
      carNumber: driver.carNumber
    };
  }

  debouncedSave();
  return newLap;
}

// Update race state
function updateRaceState(raceId, state) {
  const race = getRaceById(raceId);
  if (!race) return { success: false, message: 'Race not found' };

  const validStates = ['PENDING', 'SAFE_TO_START', 'STARTED', 'FINISHED'];
  if (!validStates.includes(state)) {
    return { success: false, message: 'Invalid race state' };
  }

  const MIN_DRIVERS = isDev ? 1 : 2;
  if ((state === 'SAFE_TO_START' || state === 'STARTED') && race.drivers.length < MIN_DRIVERS) {
    return { success: false, message: `Race must have at least ${MIN_DRIVERS} drivers to start` };
  }

  race.state = state;
  debouncedSave();
  return { success: true };
}

// Update race flag
function updateRaceFlag(raceId, flag) {
  const race = getRaceById(raceId);
  if (!race) return false;

  const validFlags = ['safe', 'hazard', 'danger', 'finish'];
  if (!validFlags.includes(flag)) return false;

  race.flag = flag;
  debouncedSave();
  return true;
}

// Start race timer
function startRaceTimer(raceId, io) {
  const race = getRaceById(raceId);
  if (!race) return false;

  // Reset remainingTime in dev mode
  if (isDev || race.remainingTime === undefined || race.remainingTime === null) {
    race.remainingTime = RACE_DURATION;
  }

  if (raceTimers.has(raceId)) clearInterval(raceTimers.get(raceId));

  io.emit('race-time-update', { raceId, remainingTime: race.remainingTime });

  const timer = setInterval(() => {
    const currentRace = getRaceById(raceId);
    if (!currentRace || currentRace.state !== 'STARTED') {
      clearInterval(timer);
      raceTimers.delete(raceId);
      return;
    }

    currentRace.remainingTime -= 1000;

    if (currentRace.remainingTime <= 0) {
      currentRace.remainingTime = 0;
      currentRace.state = 'FINISHED';
      saveRaces();
      io.emit('race-time-finished', { raceId });
      clearInterval(timer);
      raceTimers.delete(raceId);
    } else {
      debouncedSave();
      io.emit('race-time-update', { raceId, remainingTime: currentRace.remainingTime });
    }
  }, 1000);

  raceTimers.set(raceId, timer);
  return true;
}

// Resume timers for active races
function resumeRaceTimers(io) {
  races.forEach(race => {
    if (race.state === 'STARTED' && race.remainingTime > 0) {
      startRaceTimer(race.id, io);
    }
  });
}

// Clean up all timers (for graceful shutdown)
function cleanupTimers() {
  for (const [raceId, timer] of raceTimers) {
    clearInterval(timer);
  }
  raceTimers.clear();
}

// Initial load (sync for startup — only runs once)
try {
  const data = fs.readFileSync(filePath, 'utf8');
  races = JSON.parse(data).races || [];
} catch {
  races = [];
}

module.exports = {
  RACE_DURATION,
  getRaces,
  getRaceById,
  addRace,
  saveRaces,
  deleteRace,
  addDriver,
  updateDriver,
  deleteDriver,
  getNextRace,
  recordLap,
  updateRaceState,
  updateRaceFlag,
  startRaceTimer,
  resumeRaceTimers,
  cleanupTimers,
  loadRaces
};
