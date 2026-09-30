const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, optionalToken } = require('../middleware/authMiddleware');

router.get('/:id', optionalToken, userController.getUserById);
router.post('/:id/follow', authenticateToken, userController.toggleFollow);

module.exports = router;
