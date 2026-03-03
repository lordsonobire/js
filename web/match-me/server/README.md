# Server

## Getting Started

### Database
This project uses a local PostgreSQL instance located in `postgres_db` running on port **5439**.

**To start the database:**
```bash
pg_ctl -D ./postgres_db -l ./postgres_db.log start -o "-p 5439"
```

**To stop the database:**
```bash
pg_ctl -D ./postgres_db stop
```

**Check status:**
```bash
pg_ctl -D ./postgres_db status
```

### Setup
(Only needed once or after schema changes)
```bash
npm install
npm run db:setup
npm run db:seed
```

### Running the Server
```bash
npm run dev
```

The server runs on http://localhost:3000.
