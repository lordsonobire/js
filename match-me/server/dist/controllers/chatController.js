"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.getChats = void 0;
const db_1 = __importDefault(require("../db"));
const getChats = async (req, res) => {
    try {
        const userId = req.user.user_id;
        // Spec: Users must be able to see a list of all of their chats, with the most recent chats appearing first.
        // Also show unread indicators?
        // We need to query distinct conversations and get the last message time.
        // A chat is defined by a pair of users.
        // We find all messages where I am sender or receiver.
        // Group by the "other" user.
        // This query might be complex. Simplified approach:
        // 1. Find all connections (chat partners).
        // 2. For each, find last message?
        // OR
        // Distinct on "other user" from messages table.
        const q = `
            SELECT DISTINCT ON (other_user_id)
                CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
                content as last_message,
                created_at as last_message_time,
                (SELECT count(*) FROM messages m2 WHERE m2.receiver_id = $1 AND m2.sender_id = (CASE WHEN messages.sender_id = $1 THEN messages.receiver_id ELSE messages.sender_id END) AND m2.read_at IS NULL) as unread_count
            FROM messages
            WHERE sender_id = $1 OR receiver_id = $1
            ORDER BY other_user_id, created_at DESC
        `;
        // The above DISTINCT ON sorts by other_user_id, then created_at DESC. So it picks the MOST RECENT message for each pair.
        // But we want to Sort the FINAL list by last_message_time DESC.
        // We can wrap it.
        const wrappedQ = `
            SELECT * FROM (
                ${q}
            ) as sub
            ORDER BY last_message_time DESC
        `;
        // Actually, we also need the profile info of the other user (Name, Avatar).
        // Let's join or fetch separately. Join is better.
        const finalQ = `
            SELECT 
                sub.*,
                p.first_name,
                p.last_name,
                p.avatar_url
            FROM (${q}) as sub
            JOIN profiles p ON p.user_id = sub.other_user_id
            ORDER BY sub.last_message_time DESC
        `;
        const result = await db_1.default.query(finalQ, [userId]);
        // Spec requires: "Users must be able to see a list of all of their chats"
        // Return structured data
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getChats = getChats;
const getMessages = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const otherUserId = req.params.id; // Chat partner ID
        const limit = 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        // "The chat history must be visible to both users. You'll need to paginate this"
        const q = `
            SELECT * FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `;
        const result = await db_1.default.query(q, [userId, otherUserId, limit, offset]);
        // Reverse to show chronological order on client? Or client handles it.
        // Usually API returns newest first (DESC) for pagination, client reverses.
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMessages = getMessages;
