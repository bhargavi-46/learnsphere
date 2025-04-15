const multer = require('multer');
const path = require('path');

// Configure Multer for memory storage (easier to stream to Azure)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept images and videos only
    if (file.mimetype.startsWith('image') || file.mimetype.startsWith('video')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 } // Example: 500MB limit - adjust as needed!
});

// Middleware to handle thumbnail and video upload fields
const uploadCourseFiles = upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

module.exports = { uploadCourseFiles };