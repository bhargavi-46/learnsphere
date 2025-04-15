// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

// Import Controller
const adminController = require('../controllers/adminController');

// Import Middleware
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { uploadCourseFiles } = require('../middleware/uploadMiddleware'); // For handling thumbnail/video uploads

// =========================================================================
// Apply authentication and admin check to ALL routes defined in this file
// Any request to a path starting with /admin/... will first go through these checks
router.use(protect, isAdmin);
// =========================================================================


// --- Admin Dashboard ---
// GET /admin/dashboard
router.get('/dashboard', adminController.getDashboard);


// --- Course Upload ---
// GET /admin/courses/new  (Show the upload form)
router.get('/courses/new', adminController.getUploadCourseForm);

// POST /admin/courses/new (Handle the form submission with file uploads)
// Apply multer middleware *before* the controller function
router.post('/courses/new', uploadCourseFiles, adminController.postUploadCourse);


// --- List & Manage Courses ---
// GET /admin/courses (Show list of all courses for management)
router.get('/courses', adminController.getAdminCourses);


// --- View Enrollments for a Course ---
// GET /admin/courses/:courseId/enrollments
router.get('/courses/:courseId/enrollments', adminController.getViewEnrollments);


// --- Course Edit ---
// GET /admin/courses/:courseId/edit (Show the edit form, pre-filled)
router.get('/courses/:courseId/edit', adminController.getEditCourseForm);

// POST /admin/courses/:courseId/edit (Handle the update submission)
// Apply multer middleware again if editing allows re-uploading files
router.post('/courses/:courseId/edit', uploadCourseFiles, adminController.postUpdateCourse);


// --- Course Delete ---
// POST /admin/courses/:courseId/delete (Handle the deletion request)
// Using POST for simplicity as HTML forms only support GET/POST easily
router.post('/courses/:courseId/delete', adminController.postDeleteCourse);


// Export the router
module.exports = router;