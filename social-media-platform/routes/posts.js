const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { pool, isMySQLConnected, inMemoryStore } = require('../config/db');

// @route   GET /api/posts
// @desc    Get all social media feed posts with user info, like counts, and comments count
router.get('/', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let currentUserId = null;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_social_2026');
                currentUserId = decoded.id;
            } catch (e) {}
        }

        if (isMySQLConnected()) {
            const query = `
                SELECT 
                    p.id, p.content, p.image_url, p.created_at,
                    u.id AS user_id, u.username, u.avatar_url,
                    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.id DESC
            `;

            const [posts] = await pool.query(query, [currentUserId || 0]);
            return res.json(posts);
        } else {
            const posts = inMemoryStore.posts.map(post => {
                const likesCount = inMemoryStore.likes.filter(l => l.post_id === post.id).length;
                const commentsCount = inMemoryStore.comments.filter(c => c.post_id === post.id).length;
                const isLiked = currentUserId ? inMemoryStore.likes.some(l => l.post_id === post.id && l.user_id === currentUserId) : false;

                return {
                    ...post,
                    likes_count: likesCount,
                    comments_count: commentsCount,
                    is_liked: isLiked ? 1 : 0
                };
            }).reverse();

            return res.json(posts);
        }
    } catch (err) {
        console.error('Fetch Feed Error:', err);
        res.status(500).json({ error: 'Failed to fetch social media feed.' });
    }
});

// @route   POST /api/posts
// @desc    Create a new post
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content, image_url } = req.body;
        const userId = req.user.id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Post content cannot be empty.' });
        }

        if (isMySQLConnected()) {
            const [result] = await pool.query(
                'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
                [userId, content, image_url || null]
            );

            return res.status(201).json({
                message: 'Post created successfully!',
                post_id: result.insertId
            });
        } else {
            const user = inMemoryStore.users.find(u => u.id === userId);
            const newPost = {
                id: inMemoryStore.posts.length + 1,
                user_id: userId,
                username: user ? user.username : 'User',
                avatar_url: user ? user.avatar_url : '',
                content,
                image_url: image_url || null,
                created_at: new Date().toISOString()
            };

            inMemoryStore.posts.push(newPost);
            return res.status(201).json({
                message: 'Post created successfully!',
                post_id: newPost.id
            });
        }
    } catch (err) {
        console.error('Create Post Error:', err);
        res.status(500).json({ error: 'Failed to publish post.' });
    }
});

// @route   POST /api/posts/:id/like
// @desc    Toggle like on a post
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isMySQLConnected()) {
            const [existing] = await pool.query('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);

            if (existing.length > 0) {
                // Unlike
                await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
                return res.json({ message: 'Unliked post', is_liked: false });
            } else {
                // Like
                await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
                return res.json({ message: 'Liked post', is_liked: true });
            }
        } else {
            const likeIndex = inMemoryStore.likes.findIndex(l => l.post_id === postId && l.user_id === userId);
            if (likeIndex > -1) {
                inMemoryStore.likes.splice(likeIndex, 1);
                return res.json({ message: 'Unliked post', is_liked: false });
            } else {
                inMemoryStore.likes.push({
                    id: inMemoryStore.likes.length + 1,
                    post_id: postId,
                    user_id: userId
                });
                return res.json({ message: 'Liked post', is_liked: true });
            }
        }
    } catch (err) {
        console.error('Like Toggle Error:', err);
        res.status(500).json({ error: 'Failed to toggle like.' });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete post by author
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isMySQLConnected()) {
            const [result] = await pool.query('DELETE FROM posts WHERE id = ? AND user_id = ?', [postId, userId]);
            if (result.affectedRows === 0) {
                return res.status(403).json({ error: 'Unauthorized to delete this post or post not found.' });
            }
            return res.json({ message: 'Post deleted successfully.' });
        } else {
            const index = inMemoryStore.posts.findIndex(p => p.id === postId && p.user_id === userId);
            if (index === -1) {
                return res.status(403).json({ error: 'Unauthorized to delete this post or post not found.' });
            }
            inMemoryStore.posts.splice(index, 1);
            return res.json({ message: 'Post deleted successfully.' });
        }
    } catch (err) {
        console.error('Delete Post Error:', err);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

module.exports = router;
