const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { pool, isMySQLConnected, inMemoryStore } = require('../config/db');

// @route   GET /api/users
// @desc    Get user list to follow / discover
router.get('/', async (req, res) => {
    try {
        if (isMySQLConnected()) {
            const [users] = await pool.query('SELECT id, username, bio, avatar_url FROM users ORDER BY id DESC LIMIT 10');
            return res.json(users);
        } else {
            const users = inMemoryStore.users.map(u => ({
                id: u.id,
                username: u.username,
                bio: u.bio,
                avatar_url: u.avatar_url
            }));
            return res.json(users);
        }
    } catch (err) {
        console.error('Fetch Users Error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// @route   GET /api/users/:username
// @desc    Get user profile with followers and following counts
router.get('/:username', async (req, res) => {
    try {
        const username = req.params.username;

        if (isMySQLConnected()) {
            const query = `
                SELECT 
                    u.id, u.username, u.email, u.bio, u.avatar_url, u.created_at,
                    (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
                    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
                    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count
                FROM users u
                WHERE u.username = ?
            `;
            const [rows] = await pool.query(query, [username]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'User profile not found.' });
            }
            return res.json(rows[0]);
        } else {
            const user = inMemoryStore.users.find(u => u.username === username);
            if (!user) {
                return res.status(404).json({ error: 'User profile not found.' });
            }

            const followersCount = inMemoryStore.follows.filter(f => f.following_id === user.id).length;
            const followingCount = inMemoryStore.follows.filter(f => f.follower_id === user.id).length;
            const postsCount = inMemoryStore.posts.filter(p => p.user_id === user.id).length;

            return res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                avatar_url: user.avatar_url,
                followers_count: followersCount,
                following_count: followingCount,
                posts_count: postsCount
            });
        }
    } catch (err) {
        console.error('Fetch Profile Error:', err);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

// @route   POST /api/users/:id/follow
// @desc    Follow or unfollow a user
router.post('/:id/follow', authenticateToken, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const followerId = req.user.id;

        if (targetUserId === followerId) {
            return res.status(400).json({ error: 'You cannot follow yourself.' });
        }

        if (isMySQLConnected()) {
            const [existing] = await pool.query(
                'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
                [followerId, targetUserId]
            );

            if (existing.length > 0) {
                // Unfollow
                await pool.query(
                    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
                    [followerId, targetUserId]
                );
                return res.json({ message: 'Unfollowed user', is_following: false });
            } else {
                // Follow
                await pool.query(
                    'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
                    [followerId, targetUserId]
                );
                return res.json({ message: 'Followed user', is_following: true });
            }
        } else {
            const index = inMemoryStore.follows.findIndex(f => f.follower_id === followerId && f.following_id === targetUserId);
            if (index > -1) {
                inMemoryStore.follows.splice(index, 1);
                return res.json({ message: 'Unfollowed user', is_following: false });
            } else {
                inMemoryStore.follows.push({
                    id: inMemoryStore.follows.length + 1,
                    follower_id: followerId,
                    following_id: targetUserId
                });
                return res.json({ message: 'Followed user', is_following: true });
            }
        }
    } catch (err) {
        console.error('Follow Toggle Error:', err);
        res.status(500).json({ error: 'Failed to toggle follow status.' });
    }
});

module.exports = router;
