"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', authRoutes_1.default);
app.use('/', userRoutes_1.default);
app.use('/', matchRoutes_1.default);
app.use('/', chatRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Match-Me API Running');
});
// TODO: Routes
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});
// Store user socket map
const userSockets = new Map();
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token)
        return next(new Error("Authentication error"));
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        socket.user = decoded;
        next();
    }
    catch (err) {
        next(new Error("Authentication error"));
    }
});
io.on('connection', (socket) => {
    const userId = socket.user.user_id;
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
            const result = await db_1.default.query("INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *", [userId, receiverId, content]);
            const message = result.rows[0];
            // Emit to receiver if online
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', message);
            }
            // Emit back to sender (confirm sent/update UI)
            socket.emit('new_message', message);
        }
        catch (err) {
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
exports.default = app;
