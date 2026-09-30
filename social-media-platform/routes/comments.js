const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { pool, isMySQLConnected, inMemoryStore } = require('../config/db');

// @route   GET /api/comments/:postId
// @desc    Get comments for a specific post
router.get('/:postId', async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);

        if (isMySQLConnected()) {
            const query = `
                SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username, u.avatar_url
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ?
                ORDER BY c.id ASC
            `;
            const [comments] = await pool.query(query, [postId]);
            return res.json(comments);
        } else {
            const comments = inMemoryStore.comments
                .filter(c => c.post_id === postId)
                .map(c => {
                    const u = inMemoryStore.users.find(usr => usr.id === c.user_id);
                    return {
                        id: c.id,
                        content: c.content,
                        created_at: c.created_at,
                        user_id: c.user_id,
                        username: u ? u.username : (c.username || 'User'),
                        avatar_url: u ? u.avatar_url : (c.avatar_url || '')
                    };
                });
            return res.json(comments);
        }
    } catch (err) {
        console.error('Fetch Comments Error:', err);
        res.status(500).json({ error: 'Failed to retrieve comments.' });
    }
});

// @route   POST /api/comments/:postId
// @desc    Add comment to a post
router.post('/:postId', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Comment content cannot be empty.' });
        }

        if (isMySQLConnected()) {
            const [result] = await pool.query(
                'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
                [postId, userId, content]
            );

            return res.status(201).json({
                message: 'Comment added successfully!',
                comment_id: result.insertId
            });
        } else {
            const user = inMemoryStore.users.find(u => u.id === userId);
            const newComment = {
                id: inMemoryStore.comments.length + 1,
                post_id: postId,
                user_id: userId,
                username: user ? user.username : 'User',
                avatar_url: user ? user.avatar_url : '',
                content,
                created_at: new Date().toISOString()
            };

            inMemoryStore.comments.push(newComment);
            return res.status(201).json({
                message: 'Comment added successfully!',
                comment: newComment
            });
        }
    } catch (err) {
        console.error('Add Comment Error:', err);
        res.status(500).json({ error: 'Failed to post comment.' });
    }
});

module.exports = router;
