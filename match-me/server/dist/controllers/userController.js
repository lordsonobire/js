"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMyProfile = exports.getUserBio = exports.getUserProfile = exports.getUserById = exports.getMe = void 0;
const db_1 = __importDefault(require("../db"));
const getMe = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const user = await db_1.default.query('SELECT id, email, created_at FROM users WHERE id = $1', [userId]);
        const profile = await db_1.default.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user: user.rows[0], profile: profile.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMe = getMe;
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        // Basic info: name and profile picture link
        const profile = await db_1.default.query('SELECT user_id, first_name, last_name, avatar_url FROM profiles WHERE user_id = $1', [userId]);
        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Must return "name" as combined first/last or just names? 
        // Spec: "returns the user's name and link to the profile picture."
        // Let's combine for convenience, or return fields. Code: first_name + " " + last_name
        const p = profile.rows[0];
        res.json({
            id: p.user_id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            avatar_url: p.avatar_url
        });
    }
    catch (err) {
        console.error(err);
        // If invalid ID syntax (like non-int), pg throws error. Handle gracefully?
        res.status(404).json({ message: 'User not found' });
    }
};
exports.getUserById = getUserById;
const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        // Spec: "returns the users 'about me' type information"
        const profile = await db_1.default.query('SELECT user_id, bio FROM profiles WHERE user_id = $1', [userId]);
        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ id: profile.rows[0].user_id, bio: profile.rows[0].bio });
    }
    catch (err) {
        res.status(404).json({ message: 'User not found' });
    }
};
exports.getUserProfile = getUserProfile;
const getUserBio = async (req, res) => {
    try {
        const userId = req.params.id;
        // Spec: "returns the users biographical data (the data used to power recommendations)."
        const profile = await db_1.default.query('SELECT user_id, interests, location, gender, birthdate FROM profiles WHERE user_id = $1', [userId]);
        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(profile.rows[0]);
    }
    catch (err) {
        res.status(404).json({ message: 'User not found' });
    }
};
exports.getUserBio = getUserBio;
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { first_name, last_name, bio, gender, location, interests, avatar_url } = req.body;
        // TODO: Validate inputs?
        const q = `
      UPDATE profiles 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          bio = COALESCE($3, bio),
          gender = COALESCE($4, gender),
          location = COALESCE($5, location),
          interests = COALESCE($6, interests),
          avatar_url = COALESCE($7, avatar_url),
          updated_at = NOW()
      WHERE user_id = $8
      RETURNING *
    `;
        const result = await db_1.default.query(q, [first_name, last_name, bio, gender, location, interests ? JSON.stringify(interests) : null, avatar_url, userId]); // Handle JSON stringify if interests is object
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMyProfile = updateMyProfile;
