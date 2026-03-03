# Projects

A collection of full-stack and utility projects built during my studies.

## What's in here

| Project | What it is | Stack |
|---------|-----------|-------|
| [match-me](./web/match-me/) | Dating/matching app with recommendations, real-time chat, connections | Go, React, PostgreSQL, WebSockets |
| [info-screens](./info-screens/) | Racetrack management system with 7 live display screens | Node.js, Express, Socket.IO |
| [neon-arena](./multi-player/neon-arena/) | Multiplayer browser game with orb collection and abilities | Node.js, Socket.IO, Vite |
| [frontend-framework](./frontend-framework/) | Custom SPA framework from scratch — virtual DOM, state, routing | Vanilla JS |
| [ancient-history](./ancient-history/) | Date classification utility | Node.js |

Each project has its own README with setup instructions. Most can be run with `docker-compose up --build` from their directory.

## Tests

```bash
cd info-screens && npm test           # 24 tests
cd multi-player/neon-arena && npm test # 7 tests
cd frontend-framework && npm test      # 18 tests
cd ancient-history && npm test         # 11 tests
```

match-me has its own docker-compose — see [web/match-me/README.md](./web/match-me/README.md) for setup.
