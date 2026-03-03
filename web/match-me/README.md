# Match-Me

Dating/matching app where users get recommended to each other based on location, interests, age, and what they're looking for. Profiles are private by default — you can only see someone if the algorithm matched you or you're already connected.

Built with a Go backend, React frontend, PostgreSQL, and WebSockets for real-time chat.

## Running it

You need [Docker](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env
docker-compose up --build
```

Then seed the database with test users (otherwise it's empty and there's nobody to match with):

```bash
docker exec -it match_me_backend ./seeder -clean
```

This creates 100 users across different cities. All of them use `password123` as the password, so you can log in as any of them to test.

- Frontend: http://localhost:3001
- API: http://localhost:3000

## Running without Docker

Need Go 1.18+, Node 16+, and PostgreSQL.

```bash
# Create the database
createdb match_me

# Backend
cd server-go
# Create .env with your DATABASE_URL, JWT_SECRET, PORT=3000
go run cmd/seeder/main.go -clean
go run main.go

# Frontend (separate terminal)
cd client
npm install
npm run dev
# Opens on localhost:5173
```

## How matching works

The algorithm scores candidates on a few things:
- **Location** — must match (this is strict, no match = skip)
- **Gender preference** — filtered if you set one
- **Age** — closer age = higher score
- **Shared interests** — each common interest adds points
- **Looking for** — bonus if you're both looking for the same thing (friendship, chat, etc.)

Top 10 scores get shown as recommendations. You can connect, dismiss, or view their profile.

## Stack

Go (gorilla/mux) / React + TypeScript + Vite / PostgreSQL / WebSockets
