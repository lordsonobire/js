const express = require('express');
const router = express.Router();
const path = require('path');

// ROUTER: Serves all the front-end HTML pages for the app.

// Main home page
router.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/index.html'))
);

// Front desk page for race creation
router.get('/front-desk', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/front-desk.html'))
);

// Admin page for flag control
router.get('/admin', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/admin.html'))
);

// Flag display page (front-end)
router.get('/flag', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/flag.html'))
);

// Next race queue view
router.get('/next-race', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/next-race.html'))
);

// Main race control center
router.get('/race-control', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/race-control.html'))
);

// Race countdown screen
router.get('/race-countdown', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/html/race-countdown.html'))
);

const raceService = require('../services/raceService');

// Leaderboard route:

router.get('/leader-board', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/leader-board.html'));
});

// Lap line tracking page
router.get('/lap-line-tracker', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/lap-line-tracker.html'));
});

// Export router so it can be used in the main Express app
module.exports = router;
