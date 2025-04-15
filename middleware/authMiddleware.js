const User = require('../models/User'); // Adjust path if needed

// middleware/authMiddleware.js
const protect = (req, res, next) => {
    console.log(`Protect Middleware checking path: ${req.originalUrl}`); // Log path
    console.log('Session User (in protect):', req.session.user); // Log session user
    if (req.session.user) {
        req.user = req.session.user; // Ensure req.user is set
        console.log('Protect Middleware: User found, proceeding.');
        next();
    } else {
        req.session.returnTo = req.originalUrl;
        console.log(`Protect Middleware: User NOT found. Redirecting to login.`);
        res.redirect('/auth/login');
    }
};

const isAdmin = (req, res, next) => {
     // Make sure this also uses req.session.user or req.user correctly
    if (req.user && req.user.role === 'admin') { // Check req.user which should be set by 'protect'
        next();
    } else {
        console.log(`IsAdmin Middleware: Access denied for user:`, req.user); // Add Log
        res.status(403).send('Forbidden: Admin access required.');
        // Or redirect: res.redirect('/');
    }
};


// Middleware to load user data from DB onto req.user (optional but good practice)
const loadUser = async (req, res, next) => {
    if (req.session.user) {
        try {
            // Fetch fresh user data, excluding password
            req.user = await User.findById(req.session.user._id).select('-password');
            if (!req.user) {
               // User in session but not DB? Log them out.
               req.session.destroy();
               return res.redirect('/auth/login');
            }
             // Make user available in locals too (redundant if done in server.js)
            res.locals.user = req.user;
        } catch (error) {
            console.error("Error loading user:", error);
            // Decide how to handle - maybe proceed without full user object?
        }
    }
    next();
};


module.exports = { protect, isAdmin, loadUser };