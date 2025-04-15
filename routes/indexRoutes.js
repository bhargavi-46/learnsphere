const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController'); // Still need courseController

// Use the new function for the home page
router.get('/', courseController.getHomePage);

// Maybe add other general routes here later (e.g., /about, /contact)

module.exports = router;