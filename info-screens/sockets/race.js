const {
  getRaces,
  addRace,
  saveRaces,
  deleteRace,
  addDriver,
  updateDriver,
  deleteDriver,
  getNextRace,
  getRaceById,
  updateRaceState,
  updateRaceFlag,
  startRaceTimer,
  resumeRaceTimers
} = require('../services/raceService');

module.exports = (io) => {

  /* Resume race timers ONCE on server boot */
  resumeRaceTimers(io);

  io.on('connection', (socket) => {

    /* RACES */

    socket.on('get-races', (_, cb) => {
      cb({ success: true, races: getRaces() });
    });

    socket.on('get-all-races', (_, cb) => {
      cb({ success: true, races: getRaces() });
    });

    socket.on('get-next-race', (_, cb) => {
      cb({ success: true, race: getNextRace() });
    });

    socket.on('select-race', ({ raceId }, cb) => {
      const race = getRaceById(raceId);
      if (!race) return cb({ success: false, message: 'Race not found' });
      cb({ success: true, race });
    });

    socket.on('create-race', ({ name }, cb) => {
      if (!name?.trim()) {
        return cb({ success: false, message: 'Race name is required' });
      }

      const race = addRace(name.trim());
      io.emit('races-update', getRaces());
      cb({ success: true, race });
    });

    socket.on('delete-race', ({ raceId }, cb) => {
      const result = deleteRace(raceId);
      if (result.success) io.emit('races-update', getRaces());
      cb(result);
    });

    /* RACE ROOMS */

    socket.on('join_race', (raceId) => {
      socket.join(`race_${raceId}`);

      const race = getRaceById(raceId);
      if (race) socket.emit('race_update', race);
    });

    /* DRIVERS */

    socket.on('add-driver', (data, cb) => {
      const { raceId, name, carNumber } = data;

      if (!raceId || !name?.trim() || !carNumber) {
        return cb({ success: false, message: 'Missing required fields' });
      }

      const result = addDriver(raceId, name.trim(), carNumber);
      if (result.success) io.emit('races-update', getRaces());
      cb(result);
    });

    socket.on('update-driver', (data, cb) => {
      const { raceId, driverId, name, carNumber } = data;

      if (!raceId || !driverId || !name?.trim() || !carNumber) {
        return cb({ success: false, message: 'Missing required fields' });
      }

      const result = updateDriver(raceId, driverId, {
        name: name.trim(),
        carNumber
      });

      if (result.success) io.emit('races-update', getRaces());
      cb(result);
    });

    socket.on('delete-driver', ({ raceId, driverId }, cb) => {
      const result = deleteDriver(raceId, driverId);
      if (result.success) io.emit('races-update', getRaces());
      cb(result);
    });

    /* LAPS */

    socket.on('lap_record', ({ raceId, driverId, timestamp, lapTime }) => {
      const race = getRaceById(raceId);
      if (!race || race.state !== 'STARTED') return;

      const driver = race.drivers.find(d => d.id.toString() === driverId.toString());
      if (!driver) return;

      driver.laps.push({ time: timestamp, lapTime });
      driver.lapCount++;

      if (!driver.fastestLap || lapTime < driver.fastestLap.lapTime) {
        driver.fastestLap = { lapTime, time: timestamp };
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

      saveRaces();

      io.to(`race_${raceId}`).emit('lap_recorded', {
        raceId,
        driverId,
        lapTime,
        timestamp
      });
    });

    /* RACE STATE */

    socket.on('safe-to-start', ({ raceId }, cb) => {
      const result = updateRaceState(raceId, 'SAFE_TO_START');
      if (result.success) io.emit('races-update', getRaces());
      cb(result);
    });

    socket.on('start-race', ({ raceId }, cb) => {
      const race = getRaceById(raceId);
      if (!race || race.state === 'STARTED') {
        return cb({ success: false, message: 'Race already started' });
      }

      const result = updateRaceState(raceId, 'STARTED');
      if (!result.success) return cb(result);

      // Set flag to GREEN automatically on start
      // Requirement: Race mode is changed to "Safe"
      updateRaceFlag(raceId, 'safe'); // 'safe' maps to Green in flag.html

      startRaceTimer(raceId, io);

      io.emit('races-update', getRaces());
      io.emit('flag-update', { raceId, flag: 'safe' });
      io.emit('race-started', { raceId });

      cb({ success: true });
    });

    socket.on('end-race', ({ raceId }, cb) => {
      const result = updateRaceState(raceId, 'FINISHED');
      if (result.success) {
        // Set flag to Danger (Red) as per user requirement "When session ended... mode to Danger"
        updateRaceFlag(raceId, 'danger');
        io.emit('races-update', getRaces());
        io.emit('flag-update', { raceId, flag: 'danger' });
      }
      cb(result);
    });

    /* FLAGS */

    socket.on('update-flag', ({ raceId, flag }, cb) => {
      if (!flag) return cb({ success: false });

      let normalized = flag.toLowerCase();
      // Map frontend values to standard values if needed
      // 'green' -> 'safe'
      // 'yellow' -> 'hazard'
      // 'red' -> 'danger'
      // 'finish' -> 'finish'
      const map = {
        'green': 'safe',
        'yellow': 'hazard',
        'red': 'danger',
        'checkered': 'finish'
      };

      if (map[normalized]) normalized = map[normalized];

      const success = updateRaceFlag(raceId, normalized);
      if (success) {
        io.emit('races-update', getRaces());
        io.emit('flag-update', { raceId, flag: normalized });
      }

      cb({ success: !!success });
    });

    socket.on('disconnect', () => {
      // clean exit
    });
  });
};
