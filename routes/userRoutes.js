// routes/userRoutes.js
const express = require('express');
const router = express.Router();
// Assuming controller is now in controllers/user/userController.js
const userController = require('../controllers/user/userController');
const { protect } = require('../middleware/authMiddleware'); // Only need protect, not isAdmin

// Route for the user dashboard
router.get('/dashboard', protect, userController.getUserDashboard);

// Add other user-specific routes here later (e.g., /profile)

module.exports = router;