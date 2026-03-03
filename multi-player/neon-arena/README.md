# Neon Arena: Dom Dash

A real-time multiplayer browser game built with Node.js, Socket.IO, and pure DOM manipulation (no Canvas).

## How to Run (Cross-Platform)

This project is set up to run easily on Windows, Mac, and Linux.

### Prerequisites
- [Node.js](https://nodejs.org/) installed (LTS version recommended).

### 1. Install Dependencies
Open your terminal or command prompt in the project folder and run:
```bash
npm install
```

### 2. Run the Game (Two Options)

#### Option A: Quick Start (Play the Game)
**Use this to play the game smoothly on any OS (Windows, Mac, Linux).**
This command builds the project and starts the server automatically.
```bash
npm start
```
- Open your browser and go to: `http://localhost:3000`

#### Option B: Development Mode
**Use this if you are editing the code.**
You will need **two** terminal windows open:

1.  **Terminal 1 (Frontend with Hot-Reload):**
    ```bash
    npm run dev
    ```
    - This runs the Vite server at `http://localhost:5173`

2.  **Terminal 2 (Game Server):**
    ```bash
    node server/index.js
    ```
    - This runs the backend server at `http://localhost:3000`

> **Note for Devs:** Connect to `http://localhost:5173` to see your code changes live. The game will still connect to the server on port 3000.

## How to Play (Publicly via Internet)

To let friends join from anywhere (not just local network):

1.  **Run the Magic Script**:
    ```bash
    sh start-exposed.sh
    ```
    This will start the server and give you a public link (e.g., `https://....serveo.net`) to share with friends!

## Gameplay
- **Join**: Enter a unique name to join the lobby.
- **Host**: The first player to join is the Host and can start the game.
- **Goal**: Collect **Yellow Orbs** (+10 pts) to increase your score.
- **Power-ups**: Watch out for **Pink Orbs**! They give you a **50% Speed Boost** for 5 seconds. ⚡
- **Pulse**: Press **SPACE** or **V** to emit a shockwave that pushes opponents away. (3s cooldown)
- **Win**: The player with the highest score when the timer hits 0:00 wins!
