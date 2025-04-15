// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// This require statement looks correct
const paymentController = require('../controllers/paymentController');

// Endpoint for frontend to create an order
// This relies on createOrder being exported correctly from paymentController.js
router.post('/create-order', protect, paymentController.createOrder);

// Endpoint for Razorpay Webhook
// Use express.json() middleware specifically for this route
// This usage of paymentController.verifyPayment looks correct
router.post('/webhook', express.json(), paymentController.verifyPayment);

module.exports = router;