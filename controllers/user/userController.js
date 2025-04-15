// controllers/user/userController.js
const Enrollment = require('../../models/Enrollment'); // Adjust path if needed
const Course = require('../../models/Course'); // Need course model for population

exports.getUserDashboard = async (req, res, next) => { // Added next
    // req.user should be populated by middleware (session + res.locals/req.user)
    if (!req.user) {
        console.error("getUserDashboard Error: User not found in request.");
        return res.redirect('/auth/login'); // Redirect if somehow user is missing
    }

    let recentEnrollments = [];
    let errorMessage = null;

    try {
        console.log(`Fetching recent enrollments for User Dashboard: ${req.user._id}`);
        // Find enrollments, sort by date, limit, populate course details + uploader
        recentEnrollments = await Enrollment.find({ user: req.user._id, status: 'completed' })
            .sort({ purchaseDate: -1 }) // Show most recent first
            .limit(5) // Limit to, say, 5 courses
            .populate({
                 path: 'course', // Populate the 'course' field in Enrollment doc
                 select: 'title thumbnailUrl description price', // Select specific course fields
                 // Optionally populate the uploader within the course if needed elsewhere on dashboard
                 // populate: { path: 'uploader', select: 'username' }
             })
            .lean(); // Use lean for plain JS objects

        // Filter out any enrollments where the course might have been deleted
        recentEnrollments = recentEnrollments.filter(en => en.course != null);

        console.log("Recent enrollments found for dashboard:", recentEnrollments.length);

        res.render('user/dashboard', {
            title: 'My Dashboard',
            user: req.user,
            enrollments: recentEnrollments, // Pass the fetched enrollments
            page: 'user-dashboard',
            error: errorMessage // Pass null if no error during fetch
        });

    } catch (error) {
        console.error("Error fetching user dashboard data:", error);
        errorMessage = "Could not load dashboard data.";
        // Render the page anyway, but show an error
         res.status(500).render('user/dashboard', {
            title: 'My Dashboard',
            user: req.user,
            enrollments: [], // Send empty array on error
            page: 'user-dashboard',
            error: errorMessage // Pass the error message
         });
         // Or use the central error handler: next(error);
    }
};

// Add other user-specific controller functions here later (e.g., view profile, edit profile)