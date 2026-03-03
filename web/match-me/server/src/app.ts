import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import matchRoutes from './routes/matchRoutes';
import chatRoutes from './routes/chatRoutes';
import socketIo from 'socket.io';
import { getRecommendations, dismissRecommendation } from './controllers/recommendationController';

/**
 * Main Application Entry Point
 * Configures Express server and Socket.IO for real-time communication.
 */
const app: Express = express();
const port = process.env.PORT || 3000;

import http from 'http';
import { Server } from 'socket.io';
import pool from './db';
import jwt from 'jsonwebtoken';

const server = http.createServer(app);

// CORS Configuration to allow frontend access
app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', userRoutes);
app.use('/', matchRoutes);
app.use('/', chatRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Match-Me API Running');
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// TODO: Routes

const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Map to track active user sockets: userId -> Set<socketId>
// This handles multiple tabs/devices for the same user.
const userSockets = new Map<number, Set<string>>();

/**
 * Socket.IO Configuration
 * authentication: Middleware verifies JWT token before connection.
 */
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
        jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
            if (err) return next(new Error('Authentication error'));
            (socket as any).user = decoded;
            next();
        });
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

io.on('connection', (socket) => {
    const userId = (socket as any).user.user_id;
    // console.log(`User connected: ${userId}`);

    // Broadcast 'user_connected' only on first connection
    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
        socket.broadcast.emit('user_connected', userId);
    }
    userSockets.get(userId)?.add(socket.id);

    // Initial list for the connecting user
    socket.emit('get_online_users', Array.from(userSockets.keys()));

    socket.on('join_chat', (chatId) => {
        // Optional: Room logic if needed, but we can direct message using socket ID
    });

    socket.on('send_message', async (data) => {
        const { receiverId, content } = data;

        try {
            // Validate connection
            const connCheck = await pool.query(
                "SELECT * FROM connections WHERE ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)) AND status = 'accepted'",
                [userId, receiverId]
            );

            if (connCheck.rows.length === 0) {
                console.log(`Unauthorized message attempt from ${userId} to ${receiverId}`);
                socket.emit('error', { message: "You are not connected with this user" });
                return;
            }

            // Save to DB
            const result = await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
                [userId, receiverId, content]
            );
            const message = result.rows[0];

            // Emit to receiver if online (all their sockets)
            const receiverSockets = userSockets.get(receiverId);
            if (receiverSockets) {
                receiverSockets.forEach(sId => {
                    io.to(sId).emit('new_message', message);
                });
            }
            // Emit back to sender (confirm sent/update UI)
            socket.emit('new_message', message);

        } catch (err) {
            console.error("Msg error", err);
        }
    });

    // --- Typing Indicators ---
    // Relays typing events to the specific receiver if online.

    socket.on('typing_start', (data) => {
        const { receiverId } = data;
        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets) {
            receiverSockets.forEach(sId => {
                io.to(sId).emit('typing_start', { senderId: userId });
            });
        }
    });

    socket.on('typing_stop', (data) => {
        const { receiverId } = data;
        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets) {
            receiverSockets.forEach(sId => {
                io.to(sId).emit('typing_stop', { senderId: userId });
            });
        }
    });

    socket.on('disconnect', () => {
        // console.log(`User disconnected: ${userId}`);
        const userSocks = userSockets.get(userId);
        if (userSocks) {
            userSocks.delete(socket.id);
            if (userSocks.size === 0) {
                userSockets.delete(userId);
                io.emit('user_disconnected', userId);
            }
        }
    });
});

const start = () => {
    server.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
};

start();

export default app;
