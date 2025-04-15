// controllers/adminController.js
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
// Import necessary Azure functions AND containerClient for delete operation
const { uploadStreamToBlob, containerClient, getBlobSasUrl } = require('../config/azure');
const { v4: uuidv4 } = require('uuid'); // Might be needed if generating unique names elsewhere

// GET: Admin Dashboard
exports.getDashboard = (req, res) => {
    // You might want to fetch some stats here later
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        page: 'admin', // Ensure 'page' variable is passed for navbar
        user: req.user // Ensure user is passed
    });
};

// GET: Show Upload Course Form
exports.getUploadCourseForm = (req, res) => {
    res.render('admin/upload-course', {
        title: 'Upload New Course',
        page: 'admin', // Pass page variable
        user: req.user // Pass user
        // error: null // Optionally initialize error as null
    });
};

// POST: Handle Course Upload
exports.postUploadCourse = async (req, res) => {
     const { title, description, price } = req.body;
     const thumbnailFile = req.files?.thumbnail?.[0]; // Optional chaining
     const videoFile = req.files?.video?.[0];

    // Basic Validation
    if (!title || !description || !price || !thumbnailFile || !videoFile) {
        return res.status(400).render('admin/upload-course', {
            title: 'Upload New Course',
            error: 'All fields including files are required.',
            page: 'admin', // Pass page variable
            user: req.user // Pass user
        });
    }

    try {
        console.log("Uploading thumbnail...");
        // 1. Upload Thumbnail to Azure Blob Storage
        const thumbnailUrl = await uploadStreamToBlob(
            thumbnailFile.buffer,
            thumbnailFile.originalname,
            thumbnailFile.mimetype
        );
        console.log("Thumbnail upload complete:", thumbnailUrl);

        console.log("Uploading video...");
        // 2. Upload Video to Azure Blob Storage
        const videoUrl = await uploadStreamToBlob(
            videoFile.buffer,
            videoFile.originalname,
            videoFile.mimetype
        );
        console.log("Video upload complete:", videoUrl);

        // 3. Save Course details to MongoDB
        console.log("Saving course to database...");
        const newCourse = new Course({
            title,
            description,
            price: parseFloat(price), // Ensure price is a number
            thumbnailUrl,
            videoUrl,
            uploader: req.user._id // Logged in admin user (req.user set by middleware)
        });

        await newCourse.save();
        console.log("Course saved successfully:", newCourse._id);

        // Redirect or show success message
        res.redirect('/admin/dashboard'); // Redirect to admin dashboard

    } catch (error) {
        console.error("Error uploading course:", error);
        let errorMessage = 'Server error during course upload.';
        if (error.message.includes('Invalid file type')) {
             errorMessage = error.message; // More specific error from multer
        }
        // Re-render upload form with error
        res.status(500).render('admin/upload-course', {
            title: 'Upload New Course',
            error: errorMessage,
            page: 'admin', // Pass page variable
            user: req.user // Pass user
        });
    }
};

// GET: View enrollments for a specific course
exports.getViewEnrollments = async (req, res, next) => { // Add next
     try {
         const courseId = req.params.courseId;
         const course = await Course.findById(courseId).lean();
         if (!course) {
             // Consistent error handling
             const err = new Error('Course not found');
             err.status = 404;
             return next(err);
         }

         const enrollments = await Enrollment.find({ course: courseId, status: 'completed' })
                                           .populate('user', 'username email') // Populate user details
                                           .sort({ purchaseDate: -1 }) // Sort by purchase date
                                           .lean();

         res.render('admin/view-enrollments', { // Ensure this view exists
             title: `Enrollments for ${course.title}`,
             course: course,
             enrollments: enrollments,
             page: 'admin', // Pass page variable
             user: req.user // Pass user
         });

     } catch (error) {
         console.error("Error fetching enrollments:", error);
         next(error); // Pass to central error handler
     }
 };

 // GET: List courses for the admin to manage
 exports.getAdminCourses = async (req, res, next) => { // Add next
     try {
         // Fetch all courses, or filter by uploader if needed later
         const courses = await Course.find().sort({ createdAt: -1 }).lean(); // Show newest first
         res.render('admin/list-courses', { // Ensure this view exists
             title: 'Manage Courses',
             courses: courses,
             page: 'admin', // Pass page variable
             user: req.user, // Pass user
             error: req.query.error // Pass potential error from redirects
         });
     } catch (error) {
         console.error("Error fetching admin courses:", error);
         next(error); // Pass to central error handler
     }
 };

// ==============================================
// --- NEW CONTROLLER FUNCTIONS for Edit/Delete ---
// ==============================================

// GET: Show Edit Form
exports.getEditCourseForm = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.courseId).lean(); // Use lean for rendering
        if (!course) {
            // Redirect back to list with an error query param
            return res.redirect('/admin/courses?error=Course%20not%20found');
        }
        res.render('admin/edit-course', { // Ensure this view exists
            title: `Edit: ${course.title}`,
            course: course, // Pass course data to pre-fill form
            page: 'admin', // Pass page variable
            user: req.user, // Pass user
            error: req.query.error // Pass potential error from redirects
        });
    } catch (error) {
        console.error("Error getting edit course form:", error);
        next(error); // Pass to general error handler
    }
};

// POST: Update Course
exports.postUpdateCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    const { title, description, price } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const videoFile = req.files?.video?.[0];

    try {
        // Fetch the non-lean document so we can update and save it
        const course = await Course.findById(courseId);
        if (!course) {
            // Redirect back to list with an error query param
            return res.redirect('/admin/courses?error=Course%20not%20found%20for%20update');
        }

        // --- Update text fields ---
        course.title = title || course.title;
        course.description = description || course.description;
        // Ensure price is handled correctly (allow 0, check for NaN)
        if (price !== null && price !== undefined && !isNaN(price)) {
             course.price = parseFloat(price);
        } // else keep original price

        // --- Handle optional Thumbnail Re-upload ---
        if (thumbnailFile) {
            console.log(`Updating thumbnail for course ${courseId}...`);
            // Optional: Delete old thumbnail from Azure first (add error handling)
            // try {
            //    if (course.thumbnailUrl) {
            //        const oldThumbBlobName = course.thumbnailUrl.split('/').pop().split('?')[0];
            //        await containerClient.deleteBlob(oldThumbBlobName);
            //        console.log(`Old thumbnail blob ${oldThumbBlobName} deleted.`);
            //    }
            // } catch (deleteError) { console.error("Error deleting old thumbnail:", deleteError); }

            const newThumbnailUrl = await uploadStreamToBlob(thumbnailFile.buffer, thumbnailFile.originalname, thumbnailFile.mimetype);
            course.thumbnailUrl = newThumbnailUrl; // Update the URL
            console.log(`New thumbnail uploaded: ${newThumbnailUrl}`);
        }

        // --- Handle optional Video Re-upload ---
        if (videoFile) {
            console.log(`Updating video for course ${courseId}...`);
            // Optional: Delete old video from Azure first (add error handling)
            // try {
            //    if (course.videoUrl) {
            //        const oldVideoBlobName = course.videoUrl.split('/').pop().split('?')[0];
            //        await containerClient.deleteBlob(oldVideoBlobName);
            //        console.log(`Old video blob ${oldVideoBlobName} deleted.`);
            //    }
            // } catch (deleteError) { console.error("Error deleting old video:", deleteError); }

            const newVideoUrl = await uploadStreamToBlob(videoFile.buffer, videoFile.originalname, videoFile.mimetype);
            course.videoUrl = newVideoUrl; // Update the URL
            console.log(`New video uploaded: ${newVideoUrl}`);
        }

        // --- Save the updated course document ---
        await course.save();
        console.log(`Course ${courseId} updated successfully in database.`);
        res.redirect('/admin/courses'); // Redirect back to the list view

    } catch (error) {
        console.error(`Error updating course ${courseId}:`, error);
        // Redirect back to the edit form with an error message
        // Make sure error messages are URL encoded for safety
        const errorMessage = encodeURIComponent(error.message || 'Update failed due to server error');
        res.redirect(`/admin/courses/${courseId}/edit?error=${errorMessage}`);
        // Or use next(error) for general handler if preferred
        // next(error);
    }
};

// POST: Delete Course
exports.postDeleteCourse = async (req, res, next) => {
    const courseId = req.params.courseId;
    console.log(`Attempting to delete course ${courseId}...`);
    try {
        // Find the course first to get file URLs
        const course = await Course.findById(courseId);
        if (!course) {
             console.warn(`Course ${courseId} not found for deletion.`);
             // Redirect back to list with an error query param
             return res.redirect('/admin/courses?error=Course%20not%20found%20for%20deletion');
        }

        // --- Delete associated files from Azure Blob Storage ---
        // Thumbnail Deletion
        if (course.thumbnailUrl) {
            try {
                const thumbBlobName = course.thumbnailUrl.split('/').pop().split('?')[0];
                console.log(`Deleting thumbnail blob from Azure: ${thumbBlobName}`);
                await containerClient.deleteBlob(thumbBlobName);
                console.log(`Thumbnail blob ${thumbBlobName} deleted successfully.`);
            } catch (azureError) {
                // Log error but continue, maybe the blob was already gone
                console.error(`Error deleting THUMBNAIL blob '${course.thumbnailUrl.split('/').pop().split('?')[0]}' from Azure:`, azureError.message || azureError);
            }
        } else {
            console.log(`No thumbnail URL found for course ${courseId}, skipping Azure delete.`);
        }

        // Video Deletion
        if (course.videoUrl) {
             try {
                 const videoBlobName = course.videoUrl.split('/').pop().split('?')[0];
                 console.log(`Deleting video blob from Azure: ${videoBlobName}`);
                 await containerClient.deleteBlob(videoBlobName);
                 console.log(`Video blob ${videoBlobName} deleted successfully.`);
             } catch (azureError) {
                 // Log error but continue
                 console.error(`Error deleting VIDEO blob '${course.videoUrl.split('/').pop().split('?')[0]}' from Azure:`, azureError.message || azureError);
             }
        } else {
            console.log(`No video URL found for course ${courseId}, skipping Azure delete.`);
        }
        // --- End Azure File Deletion ---


        // --- Optional: Delete associated enrollments ---
        // Be careful with this - consider if you want to keep enrollment history
        // console.log(`Deleting enrollments associated with course ${courseId}...`);
        // const deleteResult = await Enrollment.deleteMany({ course: courseId });
        // console.log(`Deleted ${deleteResult.deletedCount} enrollments.`);


        // --- Delete the course document from MongoDB ---
        console.log(`Deleting course document ${courseId} from MongoDB...`);
        await Course.findByIdAndDelete(courseId);
        console.log(`Course document ${courseId} deleted successfully from MongoDB.`);

        res.redirect('/admin/courses'); // Redirect back to the list view

    } catch (error) {
        console.error(`Error deleting course ${courseId}:`, error);
        next(error); // Pass to central error handler
    }
};
// --- End NEW CONTROLLER FUNCTIONS ---