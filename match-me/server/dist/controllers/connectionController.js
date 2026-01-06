"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnect = exports.respondToConnection = exports.requestConnection = exports.getConnections = void 0;
const db_1 = __importDefault(require("../db"));
const getConnections = async (req, res) => {
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
        const result = await db_1.default.query(q, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getConnections = getConnections;
const requestConnection = async (req, res) => {
    try {
        const requesterId = req.user.user_id;
        const { targetId } = req.body;
        if (!targetId || requesterId === targetId) {
            return res.status(400).json({ message: "Invalid target" });
        }
        // Check if already connected or pending
        const check = await db_1.default.query('SELECT * FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)', [requesterId, targetId]);
        if (check.rows.length > 0) {
            return res.status(409).json({ message: "Connection already exists or pending" });
        }
        await db_1.default.query('INSERT INTO connections (requester_id, recipient_id, status) VALUES ($1, $2, $3)', [requesterId, targetId, 'pending']);
        res.status(201).json({ message: "Request sent" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.requestConnection = requestConnection;
const respondToConnection = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { requesterId, action } = req.body; // action: 'accept' or 'reject'
        if (action === 'accept') {
            const result = await db_1.default.query("UPDATE connections SET status = 'accepted' WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'", [requesterId, userId]);
            if (result.rowCount === 0)
                return res.status(404).json({ message: "Request not found" });
            res.json({ message: "Accepted" });
        }
        else if (action === 'reject') {
            const result = await db_1.default.query("DELETE FROM connections WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'", [requesterId, userId]);
            if (result.rowCount === 0)
                return res.status(404).json({ message: "Request not found" });
            res.json({ message: "Rejected" });
        }
        else {
            res.status(400).json({ message: "Invalid action" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.respondToConnection = respondToConnection;
const disconnect = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { targetId } = req.body;
        await db_1.default.query("DELETE FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)", [userId, targetId]);
        res.json({ message: "Disconnected" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.disconnect = disconnect;
