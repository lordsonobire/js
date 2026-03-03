// Synthetic Audio System using Web Audio API
// This ensures sounds work OFFLINE without external file dependencies.

const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

const sounds = {
    collect: () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Randomly select one of 5 harmonic variations for a range of sounds
        const variations = [
            { start: 600, end: 1200, type: 'sine' },
            { start: 800, end: 1600, type: 'sine' },
            { start: 500, end: 1000, type: 'triangle' },
            { start: 1000, end: 2000, type: 'sine' },
            { start: 700, end: 1400, type: 'triangle' }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];

        osc.type = v.type;
        osc.frequency.setValueAtTime(v.start, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(v.end, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    },

    // Low frequency boom for Pulse
    pulse: () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // rougher sound
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    },

    // Gentle chirp for join
    join: () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    },

    // Rising scale for game start
    start: () => {
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
    },

    // Victory fanfare
    win: () => {
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        [523, 659, 784, 1046, 784, 1046].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square'; // 8-bit style
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }
};

export function playSound(name) {
    if (sounds[name]) {
        try {
            sounds[name]();
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }
}
