require('dotenv').config();
const express = require('express');
const path = require('path'); // Ensure path is required
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Route Imports
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // Keep if using Razorpay later
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from 'public' folder - Should come early
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration - AFTER static files, BEFORE routes that use sessions
app.use(session({
    secret: process.env.SESSION_SECRET, // Ensure SESSION_SECRET is set in .env
    resave: false,
    saveUninitialized: false, // Set to false - don't save sessions that haven't been modified
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // Ensure MONGO_URI is set in .env
        collectionName: 'sessions', // Optional: name for sessions collection in MongoDB
        ttl: 14 * 24 * 60 * 60 // Optional: session time to live in seconds (e.g., 14 days)
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
        httpOnly: true, // Recommended for security (prevents client-side JS access)
        // secure: process.env.NODE_ENV === 'production', // Use true ONLY in production with HTTPS
        // sameSite: 'lax' // Optional: Good default for CSRF protection balance
    }
}));

// Middleware to make user available in views (res.locals) and controllers (req.user)
// Place this AFTER session setup and BEFORE routes
app.use((req, res, next) => {
    // Log session details on EVERY request for debugging
    console.log(`[${new Date().toISOString()}] Request Path: ${req.path}`); // Log requested path
    console.log('--> Session ID:', req.sessionID); // Log Session ID
    console.log('--> Session User (from req.session.user):', req.session.user); // Log session user

    // Set user on res.locals for EJS views
    res.locals.user = req.session.user || null;

    // Set user on req object for controllers/middleware
    req.user = req.session.user || null;

    // console.log('--> Set res.locals.user & req.user to:', res.locals.user); // Can uncomment for more verbose logging
    next();
});

// --- Routes --- (Order can matter if paths overlap, but these prefixes are distinct)
app.use('/', indexRoutes);           // Handles routes starting with /
app.use('/auth', authRoutes);        // Handles routes starting with /auth
app.use('/courses', courseRoutes);   // Handles routes starting with /courses
app.use('/payment', paymentRoutes);  // Handles routes starting with /payment (keep if using)
app.use('/admin', adminRoutes);      // Handles routes starting with /admin
app.use('/user', userRoutes);        // Handles routes starting with /user

// Catch 404 and forward to error handler (Optional but good practice)
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err); // Pass the error to the central handler
});

// Central Error Handling - MUST be defined AFTER all other app.use() and routes calls
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled Error on ${req.path}:`, err.stack || err); // Log the full error with timestamp and path

    // Set locals, only providing error in development
    // res.locals.message = err.message;
    // res.locals.error = process.env.NODE_ENV === 'development' ? err : {}; // Don't leak stack trace in prod

    const errorStatus = err.status || 500;
    const errorMessage = err.message || "Something went wrong!";

    res.status(errorStatus);

    // Render the error page
    res.render('error', { // Make sure you have views/error.ejs
         title: `Error ${errorStatus}`,
         message: errorMessage,
         errorStatus: errorStatus,
         // Try to pass user for layout consistency, even on error pages
         user: req.user || req.session?.user || null // Access req.user first
     });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));