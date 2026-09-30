const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/:postId', commentController.getComments);
router.post('/:postId', authenticateToken, commentController.addComment);

module.exports = router;
