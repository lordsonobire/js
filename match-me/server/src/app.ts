import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import matchRoutes from './routes/matchRoutes';
import chatRoutes from './routes/chatRoutes';

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', userRoutes);
app.use('/', matchRoutes);
app.use('/', chatRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/', (req: Request, res: Response) => {
    res.send('Match-Me API Running');
});

// TODO: Routes

import http from 'http';
import { Server } from 'socket.io';
import pool from './db';
import jwt from 'jsonwebtoken';

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Store user socket map
const userSockets = new Map<number, string>();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        (socket as any).user = decoded;
        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

io.on('connection', (socket) => {
    const userId = (socket as any).user.user_id;
    console.log(`User connected: ${userId}`);
    userSockets.set(userId, socket.id);

    socket.on('join_chat', (chatId) => {
        // Optional: Room logic if needed, but we can direct message using socket ID
    });

    socket.on('send_message', async (data) => {
        // data: { receiverId, content }
        const { receiverId, content } = data;

        try {
            // Save to DB
            const result = await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
                [userId, receiverId, content]
            );
            const message = result.rows[0];

            // Emit to receiver if online
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', message);
            }
            // Emit back to sender (confirm sent/update UI)
            socket.emit('new_message', message);

        } catch (err) {
            console.error("Msg error", err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        userSockets.delete(userId);
    });
});

const start = () => {
    server.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
};

start();

export default app;
