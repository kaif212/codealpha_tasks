const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken, optionalToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, postController.createPost);
router.get('/', optionalToken, postController.getPosts);
router.delete('/:id', authenticateToken, postController.deletePost);
router.post('/:id/like', authenticateToken, postController.toggleLike);
router.post('/:id/share', postController.sharePost);

module.exports = router;
