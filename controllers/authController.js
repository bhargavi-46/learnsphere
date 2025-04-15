const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getSignup = (req, res) => res.render('auth/signup', { title: 'Sign Up' });

exports.postSignup = async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    // Basic validation
    if (password !== confirmPassword) {
        // Add flash messages or error handling
        return res.status(400).render('auth/signup', { title: 'Sign Up', error: 'Passwords do not match' });
    }
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).render('auth/signup', { title: 'Sign Up', error: 'Email or Username already exists' });
        }
        // Create new user (password hashing handled by pre-save hook)
        const user = new User({ username, email, password });
        await user.save();

        // Log the user in immediately after signup
        req.session.user = { _id: user._id, username: user.username, email: user.email, role: user.role };
        req.session.save(err => { // Ensure session is saved before redirect
            if (err) {
                console.error("Session save error:", err);
                // Handle error appropriately
            }
            res.redirect('/'); // Redirect to home page
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).render('auth/signup', { title: 'Sign Up', error: 'Server error during signup.' });
    }
};

exports.getLogin = (req, res) => res.render('auth/login', { title: 'Login' });

// controllers/authController.js

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        // ... (existing checks for user and password match) ...

        if (!user || !(await user.matchPassword(password))) {
             return res.status(401).render('auth/login', {
                 title: 'Login',
                 error: 'Invalid credentials',
                 page: 'login' // Pass page indicator
             });
        }

        // Store user info in session
        req.session.user = { _id: user._id, username: user.username, email: user.email, role: user.role };

        req.session.save(err => { // Ensure session is saved before redirect
           if (err) {
                console.error("Session save error:", err);
                // Handle error appropriately
                return res.status(500).send("Session error");
           }
           // Redirect to intended URL or role-based dashboard
           const returnTo = req.session.returnTo;
           delete req.session.returnTo; // Clear the stored URL

           // **** START: Modified Redirect Logic ****
           if (user.role === 'admin') {
               res.redirect(returnTo || '/admin/dashboard'); // Admin default dashboard
           } else {
               // Option 1: Redirect users to their dashboard
               res.redirect(returnTo || '/user/dashboard');
               // Option 2: Redirect users to browse courses (if you prefer)
               // res.redirect(returnTo || '/courses');
           }
           // **** END: Modified Redirect Logic ****
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).render('auth/login', {
            title: 'Login',
            error: 'Server error during login.',
            page: 'login'
        });
    }
};

// ... (rest of authController.js) ...

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout Error:", err);
            return res.status(500).send("Could not log out.");
        }
        res.redirect('/');
    });
};