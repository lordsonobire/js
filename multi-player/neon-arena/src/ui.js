let isReady = false;

export function setupUI(callbacks) {
    const joinBtn = document.getElementById('join-btn');
    const nameInput = document.getElementById('player-name');
    const readyBtn = document.getElementById('ready-btn');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const quitBtn = document.getElementById('quit-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    const submitJoin = () => {
        const name = nameInput.value.trim();
        if (name) callbacks.onJoin(name);
    };
    joinBtn.onclick = submitJoin;
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitJoin();
    });

    readyBtn.onclick = () => {
        isReady = !isReady;
        if (isReady) {
            callbacks.onReady();
            readyBtn.innerText = 'UNREADY';
            readyBtn.style.borderColor = 'var(--neon-green, #0f0)';
        } else {
            callbacks.onUnready();
            readyBtn.innerText = 'READY';
            readyBtn.style.borderColor = '';
        }
    };

    startBtn.onclick = () => callbacks.onStart();
    pauseBtn.onclick = () => callbacks.onPause();
    resumeBtn.onclick = () => callbacks.onResume();
    quitBtn.onclick = () => callbacks.onQuit();
    playAgainBtn.onclick = () => location.reload();

    // ESC for pause
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menu = document.getElementById('menu-overlay');
            if (menu.classList.contains('hidden')) {
                callbacks.onPause();
            } else {
                callbacks.onResume();
            }
        }
    });
}

export function resetReadyState() {
    isReady = false;
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.innerText = 'READY';
        readyBtn.style.borderColor = '';
    }
}

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

export function showError(msg) {
    const err = document.getElementById('error-msg');
    err.innerText = msg;
    setTimeout(() => err.innerText = '', 3000);
}

export function updateLobby(players, myId) {
    const list = document.getElementById('player-list');
    list.innerHTML = '';

    const playerArray = Object.values(players);
    playerArray.forEach(p => {
        const card = document.createElement('div');
        card.className = `player-card ${p.isReady ? 'ready' : ''}`;
        card.style.borderColor = p.color;

        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'player-card-emoji';
        emojiDiv.textContent = p.emoji || '👾';

        const nameDiv = document.createElement('div');
        nameDiv.style.fontWeight = 'bold';
        nameDiv.style.color = p.color;
        nameDiv.textContent = `${p.name} ${p.id === myId ? '(YOU)' : ''} ${p.isHost ? '👑' : ''}`;

        const statusDiv = document.createElement('div');
        statusDiv.textContent = p.isReady ? 'READY' : 'WAITING...';
        statusDiv.style.color = p.isReady ? 'var(--neon-green, #0f0)' : 'rgba(255,255,255,0.5)';

        card.appendChild(emojiDiv);
        card.appendChild(nameDiv);
        card.appendChild(statusDiv);
        list.appendChild(card);
    });

    const startBtn = document.getElementById('start-btn');
    const me = players[myId];
    const amIHost = me && me.isHost;
    const allReady = playerArray.length >= 2 && playerArray.every(p => p.isReady);

    if (amIHost && allReady) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }

    // Update player count
    const lobbyNote = document.querySelector('.lobby-note');
    if (lobbyNote) {
        lobbyNote.textContent = `Players: ${playerArray.length}/4 — Waiting for ${Math.max(0, 2 - playerArray.length)} more...`;
        if (playerArray.length >= 2) {
            lobbyNote.textContent = `Players: ${playerArray.length}/4 — Ready up!`;
        }
    }

    // Critical Fix: If I am connected but not in the player list (e.g. kicked or desync), 
    // I should not be in the lobby staring at a broken Ready button.
    // I should go back to Join Screen.
    // We only check this if myId is set (meaning I think I am connected)
    if (myId && !players[myId]) {
        console.warn('Local player not found in lobby list. Redirecting to join screen.');
        showScreen('join-screen');
        // Re-enable join button in case it was stuck
        const joinBtn = document.getElementById('join-btn');
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.innerText = 'JOIN MATCH';
        }
    }
}

export function updateTimer(seconds) {
    const timerEl = document.getElementById('timer');
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerEl.innerText = `${m}:${s}`;

    if (seconds <= 10) {
        timerEl.classList.add('urgent');
    } else {
        timerEl.classList.remove('urgent');
    }
}

export function updateScoreboard(players) {
    const sb = document.getElementById('scoreboard');
    sb.innerHTML = '';
    const sorted = Object.values(players).sort((a, b) => b.score - a.score);
    sorted.forEach(p => {
        const item = document.createElement('div');
        item.id = `score-${p.id}`;
        item.className = 'score-item';
        item.style.borderRight = `4px solid ${p.color}`;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score-val';
        scoreSpan.textContent = p.score;

        item.textContent = `${p.name}: `;
        item.appendChild(scoreSpan);
        sb.appendChild(item);
    });
}

export function updateScoreboardRealtime(id, score) {
    const scoreItem = document.getElementById(`score-${id}`);
    if (scoreItem) {
        scoreItem.querySelector('.score-val').innerText = score;
    }
    // Re-sort scoreboard by score
    const sb = document.getElementById('scoreboard');
    const items = Array.from(sb.children);
    items.sort((a, b) => {
        const sa = parseInt(a.querySelector('.score-val').innerText) || 0;
        const sb2 = parseInt(b.querySelector('.score-val').innerText) || 0;
        return sb2 - sa;
    });
    items.forEach(item => sb.appendChild(item));
}

export function showMenu(title, info) {
    const overlay = document.getElementById('menu-overlay');
    if (title === null) {
        overlay.classList.add('hidden');
    } else {
        document.getElementById('menu-title').innerText = title;
        document.getElementById('menu-info').innerText = info;
        overlay.classList.remove('hidden');
    }
}

export function showNotification(message) {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const note = document.createElement('div');
    note.className = 'notification-toast';
    note.innerText = message;
    container.appendChild(note);

    // Trigger reflow
    note.offsetHeight;
    note.classList.add('show');

    setTimeout(() => {
        note.classList.remove('show');
        setTimeout(() => note.remove(), 500);
    }, 3000);
}

export function showCountdown() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        document.getElementById('app').appendChild(overlay);

        const steps = ['3', '2', '1', 'GO!'];
        let i = 0;

        function showNext() {
            if (i >= steps.length) {
                overlay.remove();
                resolve();
                return;
            }
            overlay.innerHTML = '';
            const text = document.createElement('div');
            text.className = 'countdown-text';
            text.textContent = steps[i];
            overlay.appendChild(text);
            i++;
            setTimeout(showNext, 800);
        }

        showNext();
    });
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
}

export function showWinner(data) {
    const overlay = document.getElementById('winner-screen');
    const info = document.getElementById('winner-info');
    info.innerHTML = '';

    const winner = data.winner || data;
    const standings = data.standings;

    const h3 = document.createElement('h3');
    h3.style.color = winner.color;
    h3.style.fontSize = '2rem';
    h3.textContent = `${winner.emoji || '👾'} ${winner.name} WINS!`;

    info.appendChild(h3);

    if (standings && standings.length > 0) {
        const standingsDiv = document.createElement('div');
        standingsDiv.className = 'final-standings';

        standings.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'standing-row';

            const rank = document.createElement('span');
            rank.className = 'standing-rank';
            rank.textContent = `#${i + 1}`;

            const name = document.createElement('span');
            name.className = 'standing-name';
            name.style.color = p.color;
            name.textContent = `${p.emoji || '👾'} ${p.name}`;

            const score = document.createElement('span');
            score.className = 'standing-score';
            score.textContent = p.score;

            row.appendChild(rank);
            row.appendChild(name);
            row.appendChild(score);
            standingsDiv.appendChild(row);
        });

        info.appendChild(standingsDiv);
    } else {
        const p = document.createElement('p');
        p.textContent = `Final Score: ${winner.score}`;
        info.appendChild(p);
    }

    overlay.classList.remove('hidden');
}
