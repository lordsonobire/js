import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

export const getConnections = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;

        // Spec: returns a list connected profiles, containing only the id and nothing else.
        // Connections table has requester_id and recipient_id.
        // If I am requester, friend is recipient. If I am recipient, friend is requester.
        // Status must be 'accepted'.

        const q = `
      SELECT 
        CASE 
          WHEN requester_id = $1 THEN recipient_id 
          ELSE requester_id 
        END AS id
      FROM connections
      WHERE (requester_id = $1 OR recipient_id = $1)
      AND status = 'accepted'
    `;

        const result = await pool.query(q, [userId]);
        res.json(result.rows.map(r => r.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getConnectionRequests = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        // Incoming requests where I am the recipient and status is pending
        const q = `
            SELECT requester_id as id
            FROM connections
            WHERE recipient_id = $1 AND status = 'pending'
        `;
        const result = await pool.query(q, [userId]);
        res.json(result.rows.map(r => r.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Request Connection
 * Sends a friend request to a target user.
 * Prevents duplicate requests or self-requests.
 * Status starts as 'pending'.
 */
export const requestConnection = async (req: AuthRequest, res: Response) => {
    try {
        const requesterId = req.user.user_id;
        const { targetId } = req.body;

        if (!targetId || requesterId === targetId) {
            return res.status(400).json({ message: "Invalid target" });
        }

        // Check if already connected or pending
        const check = await pool.query(
            'SELECT * FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)',
            [requesterId, targetId]
        );

        if (check.rows.length > 0) {
            return res.status(409).json({ message: "Connection already exists or pending" });
        }

        await pool.query(
            'INSERT INTO connections (requester_id, recipient_id, status) VALUES ($1, $2, $3)',
            [requesterId, targetId, 'pending']
        );

        res.status(201).json({ message: "Request sent" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Respond to Connection
 * Accepts or Rejects a pending request.
 * - Accept: Updates status to 'accepted'.
 * - Reject: Deletes the request row entirely.
 */
export const respondToConnection = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const { requesterId, action } = req.body; // action: 'accept' or 'reject'

        if (action === 'accept') {
            const result = await pool.query(
                "UPDATE connections SET status = 'accepted' WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'",
                [requesterId, userId]
            );
            if (result.rowCount === 0) return res.status(404).json({ message: "Request not found" });
            res.json({ message: "Accepted" });
        } else if (action === 'reject') {
            const result = await pool.query(
                "DELETE FROM connections WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'",
                [requesterId, userId]
            );
            if (result.rowCount === 0) return res.status(404).json({ message: "Request not found" });
            res.json({ message: "Rejected" });
        } else {
            res.status(400).json({ message: "Invalid action" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const disconnect = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const { targetId } = req.body;

        await pool.query(
            "DELETE FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)",
            [userId, targetId]
        );
        res.json({ message: "Disconnected" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
