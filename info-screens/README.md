# Info-Screens

Racetrack information system for managing kart races. Handles creating races, adding drivers, tracking laps, live leaderboards, and flag signals — all synced in real-time across multiple browser tabs via Socket.IO.

Built with Node.js, Express, and Socket.IO.

## Running it

```bash
# Docker
cp .env.example .env
docker-compose up --build

# Or locally
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000/ for the landing page with links to all screens.

## Screens

| Screen | Path | What it does |
|--------|------|-------------|
| Front Desk | `/front-desk` | Create races, add/remove drivers |
| Race Control | `/race-control` | Start/stop races, set flags |
| Next Race | `/next-race` | Public display showing upcoming race info |
| Leader Board | `/leader-board` | Live standings and fastest laps |
| Lap Tracker | `/lap-line-tracker` | Record laps as cars pass |
| Countdown | `/race-countdown` | Big timer display |

Each screen requires an access code (configured in `.env`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FRONT_DESK_ACCESS_CODE` | Access code for front desk |
| `RACE_CONTROL_ACCESS_CODE` | Access code for race control |
| `LAP_TRACKER_ACCESS_CODE` | Access code for lap tracker |
| `PORT` | Server port (default 3000) |
| `ALLOWED_ORIGINS` | CORS origins |

## Tests

```bash
npm test
```

24 tests covering race CRUD, driver management, lap recording, and state transitions.
