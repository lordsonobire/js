/* Server entry point for Race Management System */

require('dotenv').config();

/* Validate required environment variables */

const requiredEnvVars = [
  'FRONT_DESK_ACCESS_CODE',
  'RACE_CONTROL_ACCESS_CODE',
  'LAP_TRACKER_ACCESS_CODE'
];

/* Global Error Handlers */
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR (Uncaught Exception):', err);
  // Keep running in dev, but log heavily
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:');
  missingVars.forEach((varName) => console.error(`  - ${varName}`));
  console.error('\nPlease set these variables in a .env file.');
  process.exit(1);
}

console.log('✓ All required environment variables are set');

/* App & Server setup */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

/* Middleware */

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

/* Access Code Verification API */

const accessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again later.' }
});

app.post('/api/verify-access', accessLimiter, async (req, res) => {
  const { page, accessCode } = req.body;

  const delay = () => new Promise((resolve) => setTimeout(resolve, 500));
  let isValid = false;

  switch (page) {
    case 'front-desk':
      isValid = accessCode === process.env.FRONT_DESK_ACCESS_CODE;
      break;
    case 'race-control':
      isValid = accessCode === process.env.RACE_CONTROL_ACCESS_CODE;
      break;
    case 'lap-line-tracker':
      isValid = accessCode === process.env.LAP_TRACKER_ACCESS_CODE;
      break;
  }

  if (!isValid) {
    await delay();
    return res.json({
      success: false,
      message: 'Incorrect access code'
    });
  }

  res.json({ success: true });
});

/* Web Routes */

const webRoutes = require('./routes/web');
app.use('/', webRoutes);

/* Race API */

app.get('/api/race/:id', async (req, res) => {
  try {
    const raceId = req.params.id;

    const dataPath = path.join(__dirname, 'data', 'races.json');
    const data = await fs.promises.readFile(dataPath, 'utf8');
    const racesData = JSON.parse(data);

    const race = racesData.races.find(
      (r) => r.id.toString() === raceId
    );

    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    res.json(race);
  } catch (error) {
    console.error('Error fetching race:', error);
    res.status(500).json({ error: 'Failed to load race data' });
  }
});

/* Socket.IO Setup */

const raceSocketHandler = require('./sockets/race');
raceSocketHandler(io);

/* Server Start & Error Handling */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('👉 Stop the other process or change PORT in .env');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

/* Graceful Shutdown */

const { cleanupTimers, saveRaces } = require('./services/raceService');

process.on('SIGINT', async () => {
  console.log('\n Shutting down server...');
  cleanupTimers();
  await saveRaces();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit if server.close() takes too long
  setTimeout(() => process.exit(0), 3000);
});
