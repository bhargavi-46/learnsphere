// routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware'); // Make sure 'protect' middleware is required

// Browse All Courses - Publicly accessible
// GET /courses
router.get('/', courseController.getCourses);

// My Courses - Requires user to be logged in
// GET /courses/my-courses
router.get('/my-courses', protect, courseController.getMyCourses);

// --- SEARCH ROUTE ---
// Handles GET requests like /courses/search?query=whatever
// *** IMPORTANT: Define this BEFORE the '/:id' route ***
// GET /courses/search
router.get('/search', courseController.searchCourses); // Uses the new controller function

// Enroll in Free Course - Requires user to be logged in (Handles POST from form)
// POST /courses/:id/enroll-free
// Needs to come *after* specific string routes like /search, /my-courses if they use POST
// But it's fine here as it has a parameter and uses POST
router.post('/:id/enroll-free', protect, courseController.enrollFreeCourse);

// View Single Course - Publicly accessible view
// This will now only match if the path is not '/search', '/my-courses', etc.
// GET /courses/:id
router.get('/:id', courseController.getCourse);


module.exports = router;