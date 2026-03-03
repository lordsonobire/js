import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

export const getChats = async (req: AuthRequest, res: Response) => {
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
            JOIN connections c ON (
                (c.requester_id = $1 AND c.recipient_id = sub.other_user_id) OR
                (c.requester_id = sub.other_user_id AND c.recipient_id = $1)
            )
            WHERE c.status = 'accepted'
            ORDER BY sub.last_message_time DESC
        `;

        const result = await pool.query(finalQ, [userId]);

        // Spec requires: "Users must be able to see a list of all of their chats"
        // Return structured data
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const otherUserId = req.params.id; // Chat partner ID
        const limit = 20;
        const page = parseInt(req.query.page as string) || 1;
        const offset = (page - 1) * limit;

        // Check if connected
        const connCheck = await pool.query(
            "SELECT * FROM connections WHERE ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)) AND status = 'accepted'",
            [userId, otherUserId]
        );

        if (connCheck.rows.length === 0) {
            // Stealth mode: Return 404 if not connected, so they can't probe connections
            return res.status(404).json({ message: "Chat not found" });
        }

        const q = `
            SELECT * FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await pool.query(q, [userId, otherUserId, limit, offset]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const otherUserId = req.params.id;

        // Check if connected
        const connCheck = await pool.query(
            "SELECT * FROM connections WHERE ((requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)) AND status = 'accepted'",
            [userId, otherUserId]
        );

        if (connCheck.rows.length === 0) {
            // Stealth mode
            return res.status(404).json({ message: "Chat not found" });
        }

        await pool.query(
            'UPDATE messages SET read_at = NOW() WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL',
            [userId, otherUserId]
        );

        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
