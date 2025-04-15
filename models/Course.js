// models/Course.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: {
        type: Number,
        required: [true, 'Price is required'], // Add custom error message
        default: 0,
        min: [0, 'Price cannot be negative'] // Add minimum value validation
    },
    thumbnailUrl: { type: String, required: true },
    videoUrl: { type: String, required: true }, // URL from Azure Blob Storage
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);