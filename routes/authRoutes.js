// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Make sure controller is required
const { protect } = require('../middleware/authMiddleware');

// GET Routes
router.get('/signup', authController.getSignup); // Make sure authController.getSignup is a function
router.get('/login', authController.getLogin);   // Make sure authController.getLogin is a function
router.get('/logout', protect, authController.logout); // Make sure authController.logout is a function

// POST Routes - Check these carefully
router.post('/signup', authController.postSignup); // IS authController.postSignup a valid function exported from authController.js?
router.post('/login', authController.postLogin);   // IS authController.postLogin a valid function exported from authController.js?

module.exports = router;