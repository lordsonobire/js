document.addEventListener('DOMContentLoaded', async () => {
    async function verifyAccess() {
        const accessCode = prompt('Enter access code for Lap Line Tracker:');
        if (!accessCode) {
            alert('Access code required');
            window.location.href = '/';
            return false;
        }

        try {
            const response = await fetch('/api/verify-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page: 'lap-line-tracker', accessCode })
            });

            const result = await response.json();
            if (result.success) {
                return true;
            } else {
                alert(result.message || 'Invalid access code');
                return await verifyAccess(); // Recursive retry
            }
        } catch (error) {
            console.error('Access verification error:', error);
            alert('Error verifying access');
            window.location.href = '/';
            return false;
        }
    }

    const granted = await verifyAccess();
    if (granted) {
        initializeLapTracker();
    }
});


function initializeLapTracker() {
    const socket = io();
    let currentRaceId = null;
    let currentRace = null;
    let driverLapData = {};

    function loadCurrentRace() {
        socket.emit('get-all-races', {}, (response) => {
            if (response.success && response.races && response.races.length > 0) {
                let current = response.races.find(r => r.state === 'STARTED' || r.state === 'ACTIVE');
                if (!current) current = response.races.find(r => r.state === 'SAFE_TO_START');
                if (!current) current = response.races[0];
                if (current) {
                    currentRaceId = current.id;
                    fetch(`/api/race/${currentRaceId}`)
                        .then(res => res.json())
                        .then(raceData => {
                            currentRace = raceData;
                            document.getElementById('race-name').textContent = raceData.name || 'Race';
                            createDriverButtons();
                            socket.emit('join_race', currentRaceId);
                            updateRaceTime(raceData.remainingTime || 0);
                            checkRaceFinished(raceData);
                        });
                } else {
                    displayMessage('No current race available', 'error');
                }
            } else {
                displayMessage('No races found', 'error');
            }
        });
    }

    loadCurrentRace();

    socket.on('race-started', async (data) => {
        if (data && data.raceId) {
            currentRaceId = data.raceId;
            fetch(`/api/race/${currentRaceId}`)
                .then(res => res.json())
                .then(raceData => {
                    currentRace = raceData;
                    document.getElementById('race-name').textContent = raceData.name || 'Race';
                    createDriverButtons();
                });
        }
    });

    socket.on('race-time-update', (data) => {
        if (data.raceId === currentRaceId) {
            updateRaceTime(data.remainingTime);
        }
    });

    socket.on('race-time-finished', (data) => {
        if (data.raceId === currentRaceId) {
            handleRaceEnd();
        }
    });

    function setupSocketIO() {
        socket.on('race_update', (raceData) => {
            if (raceData.id === currentRaceId) {
                currentRace = raceData;
                updateUI();
                checkRaceFinished(raceData);
            }
        });

        socket.on('lap_recorded', (lapData) => {
            if (lapData.raceId === currentRaceId) {
                const driver = currentRace.drivers.find(d => d.id === lapData.driverId);
                if (driver) {
                    driver.lapCount = (driver.lapCount || 0) + 1;
                    if (!driver.laps) driver.laps = [];
                    driver.laps.push({lapTime: lapData.lapTime, timestamp: lapData.timestamp});

                    // Update fastest lap for driver
                    if (!driver.fastestLap || lapData.lapTime < driver.fastestLap.lapTime) {
                        driver.fastestLap = {lapTime: lapData.lapTime, timestamp: lapData.timestamp};
                    }

                    // Update race fastest lap
                    let allLaps = [];
                    currentRace.drivers.forEach(d => {
                        if (d.laps) allLaps = allLaps.concat(d.laps);
                    });
                    const fastest = allLaps.reduce((min, l) => (!min || l.lapTime < min.lapTime) ? l : min, null);
                    currentRace.fastestLap = fastest;
                    updateUI();
                }
            }
        });
    }

    function createDriverButtons() {
        const container = document.getElementById('lap-buttons');
        container.innerHTML = '';

        if (!currentRace || !currentRace.drivers || currentRace.drivers.length === 0) {
            container.innerHTML = '<p>No drivers in this race</p>';
            return;
        }

        currentRace.drivers.forEach(driver => {
            const button = document.createElement('button');
            button.className = 'lap-button';
            button.dataset.driverId = driver.id;
            button.innerHTML = `
                <div class="car-number">${driver.carNumber || driver.car || 'N/A'}</div>
            `;

            button.addEventListener('click', () => recordLap(driver.id));
            container.appendChild(button);
        });
    }

    function updateUI() {
        if (!currentRace || !currentRace.drivers) return;

        currentRace.drivers.forEach(driver => {
            const button = document.querySelector(`button[data-driver-id="${driver.id}"]`);
            if (button) {
                button.innerHTML = `
                    <div class="car-number">${escapeHTML(driver.carNumber || driver.car || 'N/A')}</div>
                `;
            }
        });
    }

    function recordLap(driverId) {
        if (!currentRaceId) {
            displayMessage('No active race', 'error');
            return;
        }

        const timestamp = Date.now();

        if (!driverLapData[driverId]) {
            // First button press - initialize timer
            driverLapData[driverId] = {startTime: timestamp};
            displayMessage('Timer started!', 'success');
            return;
        }

        const driverData = driverLapData[driverId];
        let lapTime;

        if (!driverData.lastLapTime) {
            // Second button press - record first lap
            lapTime = timestamp - driverData.startTime;
            driverData.lastLapTime = timestamp;
        } else {
            // Subsequent button presses - record lap times
            lapTime = timestamp - driverData.lastLapTime;
            driverData.lastLapTime = timestamp;
        }

        socket.emit('lap_record', {
            raceId: currentRaceId,
            driverId: driverId,
            timestamp: timestamp,
            lapTime: lapTime
        });

        displayMessage('Lap recorded!', 'success');
    }


    function updateRaceTime(remainingTime) {
        const raceTimeElement = document.getElementById('race-time-remaining');
        if (!raceTimeElement) return;

        let timeInSeconds = remainingTime >= 1000 ? Math.floor(remainingTime / 1000) : remainingTime;
        timeInSeconds = Math.max(0, timeInSeconds);

        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        raceTimeElement.textContent = formattedTime;
    }

    function handleRaceEnd() {
        const container = document.getElementById('lap-buttons');
        container.innerHTML = '<p class="race-finished-message">RACE FINISHED</p>';
        const notification = document.getElementById('race-end-notification');
        if (notification) {
            notification.style.display = 'block';
        }
    }

    function checkRaceFinished(raceData) {
        if (raceData.state === 'FINISHED' || raceData.state === 'ENDED') {
            handleRaceEnd();
        }
    }

    function displayMessage(message, type) {
        const messageElement = document.getElementById('message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = type;
            messageElement.style.display = 'block';
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        }
    }

    setupSocketIO();
}
