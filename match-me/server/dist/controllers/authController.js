"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        // Check if user exists
        const userExist = await db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }
        // Hash password
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        // Create user
        const newUser = await db_1.default.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at', [email, passwordHash]);
        // Create empty profile link
        const userId = newUser.rows[0].id;
        await db_1.default.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);
        const user = newUser.rows[0];
        // Create token
        const token = jsonwebtoken_1.default.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
        res.status(201).json({ ...user, token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'All input is required' });
    }
    try {
        const result = await db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (user && (await bcrypt_1.default.compare(password, user.password_hash))) {
            const token = jsonwebtoken_1.default.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
            return res.status(200).json({ ...user, token });
        }
        res.status(400).json({ message: 'Invalid Credentials' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = login;
