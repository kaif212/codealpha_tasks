const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, isMySQLConnected, inMemoryStore } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_social_2026';

// @route   POST /api/auth/register
// @desc    Register a new social media user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, bio, avatar_url } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userAvatar = avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80';
        const userBio = bio || 'Passionate tech & digital creator.';

        if (isMySQLConnected()) {
            const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Username or email already taken.' });
            }

            const [result] = await pool.query(
                'INSERT INTO users (username, email, password, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, userBio, userAvatar]
            );

            const token = jwt.sign({ id: result.insertId, username, email }, JWT_SECRET, { expiresIn: '7d' });

            return res.status(201).json({
                message: 'Account created successfully!',
                token,
                user: { id: result.insertId, username, email, bio: userBio, avatar_url: userAvatar }
            });
        } else {
            const existing = inMemoryStore.users.find(u => u.username === username || u.email === email);
            if (existing) {
                return res.status(400).json({ error: 'Username or email already taken.' });
            }

            const newUser = {
                id: inMemoryStore.users.length + 1,
                username,
                email,
                password: hashedPassword,
                bio: userBio,
                avatar_url: userAvatar
            };
            inMemoryStore.users.push(newUser);

            const token = jwt.sign({ id: newUser.id, username, email }, JWT_SECRET, { expiresIn: '7d' });

            return res.status(201).json({
                message: 'Account created successfully!',
                token,
                user: { id: newUser.id, username, email, bio: userBio, avatar_url: userAvatar }
            });
        }
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please fill in both email and password.' });
        }

        let user;

        if (isMySQLConnected()) {
            const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }
            user = rows[0];
        } else {
            user = inMemoryStore.users.find(u => u.email === email);
            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Logged in successfully!',
            token,
            user: { id: user.id, username: user.username, email: user.email, bio: user.bio, avatar_url: user.avatar_url }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;
