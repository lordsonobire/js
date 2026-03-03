document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentRaceId = null;

    // DOM Elements
    const elements = {
        leaderboardBody: document.getElementById('leaderboard-body'),
        raceName: document.getElementById('race-name'),
        raceTimeRemaining: document.getElementById('race-time-remaining'),
        flagStatus: document.getElementById('flag-status'),
        raceEndNotification: document.getElementById('race-end-notification'),
        message: document.getElementById('message')
    };

    // Initialize
    socket.on('connect', () => {
        loadCurrentRace();
    });
    socket.on('race-started', handleRaceStarted);
    socket.on('race-time-update', handleRaceTimeUpdate);
    socket.on('race-time-finished', handleRaceEnd);
    socket.on('race_update', handleRaceUpdate);
    socket.on('lap_recorded', handleLapRecorded);
    socket.on('flag-update', handleFlagUpdate);
    socket.on('races-update', handleRacesListUpdate);

    // Functions
    function handleFlagUpdate(data) {
        if (data.raceId === currentRaceId) {
            updateFlagStatus(data.flag);
        }
    }
    function loadCurrentRace() {
        socket.emit('get-all-races', {}, (response) => {
            if (response.success && response.races) {
                handleRacesListUpdate(response.races);
            } else {
                renderEmptyState();
            }
        });
    }

    function handleRacesListUpdate(races) {
        if (!races || !races.length) {
            renderEmptyState();
            return;
        }

        const current = races.find(r => r.state === 'STARTED' || r.state === 'ACTIVE')
            || races.find(r => r.state === 'SAFE_TO_START');

        if (current) {
            // Only switch if it's a different race
            if (currentRaceId !== current.id) {
                currentRaceId = current.id;
                requestRaceData(currentRaceId);
            }
        } else {
            // No active or safe-to-start race found -> Clear screen
            renderEmptyState();
            currentRaceId = null;
        }
    }

    function requestRaceData(raceId) {
        // Use socket instead of fetch to comply with "No API calls" rule
        socket.emit('select-race', { raceId }, (response) => {
            if (response.success && response.race) {
                initializeLeaderboard(response.race);
                socket.emit('join_race', raceId);
            } else {
                displayMessage('Failed to load race data', 'error');
            }
        });
    }

    function initializeLeaderboard(raceData) {
        elements.raceName.textContent = raceData.name || 'Race';
        document.title = raceData.name || 'Race Leaderboard';

        updateFlagStatus(raceData.flag || 'green');
        updateRaceTime(raceData.remainingTime || 0);
        renderLeaderboard(raceData.drivers || []);

        if (raceData.state === 'FINISHED' || raceData.state === 'ENDED') {
            elements.raceEndNotification.style.display = 'block';
        } else {
            elements.raceEndNotification.style.display = 'none';
        }
    }

    function renderEmptyState() {
        elements.raceName.textContent = 'No Active Race';
        document.title = 'Race Leaderboard';

        // Reset time and flag
        elements.raceTimeRemaining.textContent = '--:--';
        elements.flagStatus.className = 'flag';
        elements.flagStatus.textContent = '-';

        // Empty table message
        elements.leaderboardBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #aaa;">
                    Waiting for race session to start...
                </td>
            </tr>
        `;

        elements.raceEndNotification.style.display = 'none';
    }

    function renderLeaderboard(drivers) {
        const driversWithLaps = drivers.filter(d => d.fastestLap?.lapTime);
        const driversWithoutLaps = drivers.filter(d => !d.fastestLap?.lapTime);

        driversWithLaps.sort((a, b) => a.fastestLap.lapTime - b.fastestLap.lapTime);

        const sortedDrivers = [...driversWithLaps, ...driversWithoutLaps];

        elements.leaderboardBody.innerHTML = sortedDrivers.map((driver, index) => `
            <tr data-driver-id="${driver.id}">
                <td>${index + 1}</td>
                <td>${escapeHTML(driver.carNumber) || '-'}</td>
                <td>${escapeHTML(driver.name)}</td>
                <td class="lap-count">${driver.laps?.length || 0}</td>
                <td class="fastest-lap">${formatLapTime(driver.fastestLap?.lapTime)}</td>
            </tr>
        `).join('');
    }

    function formatLapTime(ms) {
        if (!ms || ms === Infinity) return '-';

        // Convert milliseconds to seconds with 3 decimal places
        const seconds = (ms / 1000).toFixed(3);
        return seconds;
    }

    function updateRaceTime(remainingTime) {
        if (!elements.raceTimeRemaining || remainingTime == null) return;

        const timeInSeconds = Math.max(0, remainingTime >= 1000 ? Math.floor(remainingTime / 1000) : remainingTime);
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;

        elements.raceTimeRemaining.textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateFlagStatus(flag) {
        if (!flag) return;
        // Backend sends 'safe', 'hazard', 'danger', 'finish'
        // CSS now supports .flag-safe, .flag-hazard, .flag-danger, .flag-finish
        elements.flagStatus.className = `flag flag-${flag.toLowerCase()}`;
        elements.flagStatus.textContent = flag.toUpperCase();
    }

    function handleRaceStarted(data) {
        // Requirement: Leader board changes to the current race
        if (data?.raceId) {
            currentRaceId = data.raceId;
            requestRaceData(currentRaceId);
        }
    }

    function handleRaceTimeUpdate(data) {
        if (data.raceId === currentRaceId) {
            updateRaceTime(data.remainingTime);
        }
    }

    function handleRaceEnd() {
        elements.raceEndNotification.style.display = 'block';
    }

    function handleRaceUpdate(raceData) {
        if (raceData?.drivers) {
            renderLeaderboard(raceData.drivers);
        }
    }

    function handleLapRecorded(lapData) {
        if (lapData.raceId !== currentRaceId) return;

        requestRaceData(currentRaceId);
    }

    function displayMessage(message, type) {
        if (elements.message) {
            elements.message.textContent = message;
            elements.message.className = type;
            elements.message.style.display = 'block';
            setTimeout(() => elements.message.style.display = 'none', 3000);
        }
    }
});
