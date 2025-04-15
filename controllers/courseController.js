// controllers/courseController.js
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { getBlobSasUrl } = require('../config/azure');

// Function specifically for the Home Page '/'
exports.getHomePage = async (req, res) => {
    let featuredCourses = []; // Initialize
    let errorMessage = null; // Initialize

    try {
        console.log("Fetching courses for HOME page...");
        featuredCourses = await Course.find()
            .sort({ createdAt: -1 }) // Newest first
            .limit(3) // Limit for featured section
            .populate('uploader', 'username') // Get uploader name
            .lean(); // Use lean for performance
        console.log("Featured Courses found:", featuredCourses.length);

    } catch (error) {
        console.error("Error fetching featured courses:", error);
        errorMessage = 'Could not load featured courses at this time.'; // Set error message
    } finally {
        // Always render the index page
        res.render('index', { // Renders views/index.ejs
            title: 'Welcome to LearnSphere',
            courses: featuredCourses, // Pass courses (might be empty)
            user: req.user, // Pass user from res.locals
            page: 'home', // For navbar active state
            error: errorMessage // Pass error message (null if no error)
        });
    }
};

// Function for the Browse Courses page '/courses'
exports.getCourses = async (req, res) => {
    let allCourses = []; // Initialize
    let errorMessage = null; // Initialize

    try {
        console.log("Fetching courses for BROWSE page...");
        allCourses = await Course.find()
            .sort({ createdAt: -1 }) // Or sort by title: .sort({ title: 1 })
            .populate('uploader', 'username')
            .lean();
        console.log("All Courses found:", allCourses.length);

    } catch (error) {
        console.error("Error fetching courses for browse page:", error);
        errorMessage = 'Could not fetch courses at this time.'; // Set error message
    } finally {
        // Always render the courses/index page
        res.render('courses/index', { // Renders views/courses/index.ejs
            title: 'Browse Courses',
            courses: allCourses, // Pass all courses (might be empty)
            user: req.user, // Pass user from res.locals
            page: 'browse', // For navbar active state
            error: errorMessage // Pass error message (null if no error)
        });
    }
};

// Function for the My Courses page '/courses/my-courses'
exports.getMyCourses = async (req, res, next) => { // Add next for error handling
    console.log('getMyCourses called. req.user:', req.user);
    console.log('getMyCourses session user:', req.session?.user);

    let userCourses = [];
    let errorMessage = null;

    if (!req.user || !req.user._id) {
        console.error("getMyCourses Error: User information not found in request.");
        // Use return to stop execution
        return res.redirect('/auth/login');
    }

    try {
        console.log(`Fetching 'My Courses' for user: ${req.user._id}`);
        const enrollments = await Enrollment.find({ user: req.user._id, status: 'completed' })
                                           .sort({ purchaseDate: -1 })
                                           .populate({
                                                path: 'course',
                                                populate: { path: 'uploader', select: 'username' }
                                            })
                                           .lean();

        userCourses = enrollments.map(en => en.course).filter(course => course != null);
        console.log("User courses found:", userCourses.length);

    } catch (error) {
         console.error("Error fetching my courses:", error);
         errorMessage = "Could not retrieve your courses.";
         // Optional: Pass error to central handler instead of just rendering with message
         // error.message = errorMessage;
         // return next(error);
    } finally {
        // Ensure render happens even if try block fails but doesn't throw to next
        // This block might not be reached if error is passed via next(error) in catch
         res.render('user/my-courses', {
             title: 'My Courses',
             courses: userCourses,
             user: req.user,
             page: 'my-courses',
             error: errorMessage
         });
    }
};

// Function for viewing a single course '/courses/:id'
exports.getCourse = async (req, res, next) => {
    const courseId = req.params.id; // Get courseId from route parameter

    // --- Added Check: If ID is not a valid ObjectId format, it's likely not a real ID ---
    // Mongoose's `findById` implicitly does casting, but an early check can prevent confusing CastErrors
    // if (!mongoose.Types.ObjectId.isValid(courseId)) {
    //     console.warn(`[getCourse] Invalid format for course ID received: ${courseId}. Treating as Not Found.`);
    //     const err = new Error("Course not found (Invalid ID Format).");
    //     err.status = 404;
    //     return next(err);
    // }
    // --- End Added Check --- (Note: Mongoose CastError handling is usually sufficient)


    try {
        console.log(`[getCourse] Attempting to find course with ID: ${courseId}`);
        // Fetch the course, populate uploader username, use lean for rendering
        const course = await Course.findById(courseId).populate('uploader', 'username').lean();

        if (!course) {
             console.warn(`[getCourse] Course not found in database for ID: ${courseId}`);
             const err = new Error("Course not found.");
             err.status = 404;
             return next(err); // Pass 404 error to central handler
        }
        console.log(`[getCourse] Found course: ${course.title}`);

        let isEnrolled = false; // Default to not enrolled
        let videoAccessUrl = null; // Default to no video access
        let isFree = course.price === 0;
        let enrollmentError = null; // For errors during access check/video load

        // Check enrollment status if a user is logged in
        if (req.user && req.user._id) {
             console.log(`[getCourse] Checking enrollment for course ${courseId}, user ${req.user._id}`);
             try {
                 const enrollment = await Enrollment.findOne({
                     user: req.user._id,
                     course: courseId,
                     status: 'completed' // Only count completed enrollments
                 }).lean();
                 isEnrolled = !!enrollment; // Convert result to boolean
                 console.log(`[getCourse] User enrollment status (completed): ${isEnrolled}`);
             } catch (enrollmentCheckError) {
                 console.error("[getCourse] Error checking enrollment status:", enrollmentCheckError);
                 isEnrolled = false; // Assume not enrolled on error
                 enrollmentError = "Could not verify enrollment status at this time.";
             }
        } else {
             console.log(`[getCourse] No user logged in, skipping enrollment check for course ${courseId}`);
        }

        // Generate SAS URL if the course is free OR the user is enrolled
        if (isFree || isEnrolled) {
            console.log(`[getCourse] Access granted (Free: ${isFree}, Enrolled: ${isEnrolled}). Attempting to get video URL for course ${courseId}.`);
            try {
                 if (course.videoUrl) {
                    const urlParts = course.videoUrl.split('/');
                    const blobNameWithPotentialSas = urlParts[urlParts.length - 1];
                    const blobName = blobNameWithPotentialSas.split('?')[0]; // Get part before '?'
                    console.log(`[getCourse] Generating SAS URL for blob: ${blobName}`);
                    videoAccessUrl = await getBlobSasUrl(blobName, 'r', 60); // 'r' = read, 60 minutes
                    console.log(`[getCourse] Generated SAS URL successfully.`);
                 } else {
                    console.warn(`[getCourse] Course ${course._id} has no videoUrl set in the database.`);
                    enrollmentError = "Video content is currently unavailable for this course.";
                 }
            } catch (sasError) {
                 console.error(`[getCourse] Error generating SAS URL for course ${course._id}:`, sasError);
                 videoAccessUrl = null; // Ensure URL is null on error
                 enrollmentError = "Could not load video at this time due to a server error.";
            }
        } else {
             console.log(`[getCourse] User not enrolled and course is not free. No video access granted for course ${courseId}.`);
        }

        // Render the view
        res.render('courses/show', {
            title: course.title,
            course,
            isEnrolled,
            isFree,
            videoAccessUrl,
            user: req.user,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            enrollmentError,
            req: req // Pass req object for potential use in EJS (like returnTo URL)
        });

    } catch (error) {
        console.error(`[getCourse] Unexpected error fetching course details for ID ${courseId}:`, error);
        // Check if it's a CastError from Mongoose trying to find an invalid ID format
        if (error.name === 'CastError' && error.path === '_id') {
            console.warn(`[getCourse] CastError encountered for ID: ${courseId}. Treating as Not Found.`);
            error.message = "Course not found (Invalid ID).";
            error.status = 404;
        } else {
            // For other errors, use a generic message
            error.message = "Could not load course details due to a server error.";
            if (!error.status) error.status = 500; // Default to 500 if not set
        }
        next(error); // Pass the error (with potentially updated message/status) to the central handler
    }
};


// --- Function to handle free enrollment ---
exports.enrollFreeCourse = async (req, res, next) => {
    // 'protect' middleware ensures req.user exists
    const courseId = req.params.id;
    const userId = req.user._id;

    console.log(`Attempting free enrollment for user ${userId} in course ${courseId}`);

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            console.error(`Enroll Free Error: Course not found: ${courseId}`);
            const err = new Error("Course not found for enrollment."); err.status = 404; return next(err);
        }
        if (course.price !== 0) {
             console.error(`Enroll Free Error: Attempted free enroll on paid course: ${courseId}`);
             const err = new Error("This course is not free and cannot be enrolled this way."); err.status = 400; return next(err);
        }

        const existingEnrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (existingEnrollment) {
            console.log(`User ${userId} already enrolled in free course ${courseId}. Redirecting.`);
             return res.redirect(`/courses/${courseId}`); // Redirect smoothly
        }

        const updatedEnrollment = await Enrollment.findOneAndUpdate(
            { user: userId, course: courseId }, // Find criteria
            { $set: { status: 'completed', purchaseDate: new Date() }, $setOnInsert: { user: userId, course: courseId } }, // Data to set
            { new: true, upsert: true, setDefaultsOnInsert: true } // Options
        );

        console.log(`Free enrollment successful for user ${userId} in course ${courseId}`);
        res.redirect(`/courses/${courseId}`); // Redirect back to the course page

    } catch (error) {
        console.error(`Error during free enrollment for user ${userId}, course ${courseId}:`, error);
        error.message = "Could not process free enrollment.";
        next(error);
    }
};


// ==============================================
// --- NEW: Function to handle course search ---
// ==============================================
exports.searchCourses = async (req, res, next) => {
    const searchQuery = req.query.query || ''; // Get search term from ?query=...
    let foundCourses = [];
    let errorMessage = null;

    console.log(`[searchCourses] Searching courses for query: "${searchQuery}"`);

    // Basic validation: if search query is empty or only whitespace
    if (!searchQuery.trim()) {
        // Option 1: Redirect back to browse all courses
        // return res.redirect('/courses');

        // Option 2: Show the results page with a specific message
         errorMessage = "Please enter a search term.";
         return res.render('courses/search-results', {
             title: 'Search Courses',
             courses: [], // No courses to show
             searchQuery: '', // Empty query
             user: req.user,
             page: 'browse',
             error: errorMessage
         });
    }

    try {
        // Escape special regex characters in the search query to prevent errors/injection
        const escapedSearchQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Create a case-insensitive regex
        const searchRegex = new RegExp(escapedSearchQuery, 'i');

        // Find courses where title OR description match the regex
        foundCourses = await Course.find({
            $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
            ]
        })
        .populate('uploader', 'username') // Include uploader name
        .sort({ createdAt: -1 }) // Sort results (e.g., newest first)
        .lean(); // Use lean for rendering performance

        console.log(`[searchCourses] Found ${foundCourses.length} courses matching "${searchQuery}"`);

    } catch (error) {
        console.error(`[searchCourses] Error during course search for query "${searchQuery}":`, error);
        errorMessage = "An error occurred while searching for courses.";
        // In case of error, render the results page with the error message
        return res.render('courses/search-results', { // Ensure this view exists
             title: `Search Error`,
             courses: [], // Send empty array on error
             searchQuery: searchQuery,
             user: req.user,
             page: 'browse',
             error: errorMessage
         });
        // Or pass to central handler: next(error);
    }

    // Render the dedicated search results view
    res.render('courses/search-results', { // Ensure this view exists
        title: `Search Results for "${searchQuery}"`,
        courses: foundCourses,
        searchQuery: searchQuery, // Pass query back to display and potentially prefill search box via navbar
        user: req.user,
        page: 'browse', // Use 'browse' page indicator for navbar active state, or create a dedicated 'search' one
        error: errorMessage // Pass null if no error occurred
    });
};