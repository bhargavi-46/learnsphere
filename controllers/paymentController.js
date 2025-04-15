// controllers/paymentController.js
const Razorpay = require('../config/razorpay');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid'); // Make sure this is required for createOrder

// --- Create Razorpay Order ---
// Ensure you also have the createOrder function exported correctly if it's in this file
exports.createOrder = async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received request for /payment/create-order`);
    console.log("Request Body:", req.body);
    console.log("Session User (in createOrder):", req.session?.user);

    if (!req.user) {
        console.error("Create Order Error: User not authenticated (req.user is missing).");
        return res.status(401).json({ error: 'User not logged in or session invalid' });
    }
    console.log(`Authenticated User ID: ${req.user._id}`);

    const { courseId } = req.body;
    if (!courseId) {
         console.error("Create Order Error: Course ID is required in request body.");
         return res.status(400).json({ error: 'Course ID is required' });
    }
    console.log(`Attempting to create order for courseId: ${courseId}`);

    try {
        const course = await Course.findById(courseId).lean();
        if (!course) {
            console.error(`Create Order Error: Course not found for ID: ${courseId}`);
            return res.status(404).json({ error: 'Course not found' });
        }

        if (course.price == null || typeof course.price !== 'number' || course.price < 0) {
             console.error(`Create Order Error: Invalid price for course ${courseId}: ${course.price}`);
             return res.status(400).json({ error: 'Course has an invalid price.' });
        }
        if (course.price === 0) {
            console.error(`Create Order Error: Attempted to purchase free course ${courseId}`);
            return res.status(400).json({ error: 'Cannot purchase a free course via payment.' });
        }
        console.log(`Course found: "${course.title}", Price: ${course.price}`);

         const existingEnrollment = await Enrollment.findOne({ user: req.user._id, course: courseId, status: 'completed' });
         if (existingEnrollment) {
             console.warn(`Create Order Warning: User ${req.user._id} already enrolled in course ${courseId}.`);
             return res.status(409).json({ error: 'You are already enrolled in this course.' });
         }

        const amountInPaise = Math.round(course.price * 100);
        if (amountInPaise <= 0) {
             console.error(`Create Order Error: Calculated amount in paise is invalid: ${amountInPaise}`);
             return res.status(400).json({ error: 'Invalid course price resulting in zero or negative amount.' });
        }
        const currency = "INR";
        const receiptId = uuidv4(); // Use full UUID for uniqueness

        const options = {
            amount: amountInPaise,
            currency: currency,
            receipt: receiptId,
            notes: { // IMPORTANT: Ensure notes are passed correctly
                courseId: courseId.toString(),
                userId: req.user._id.toString()
            }
        };
        console.log("[createOrder] Attempting Razorpay.orders.create with options:", options);

        const order = await Razorpay.orders.create(options);

        console.log("[createOrder] Razorpay order created successfully:", order);
        res.status(200).json(order); // Send the full order object back

    } catch (error) {
        console.error("[createOrder] Error caught during Razorpay order creation:", error);
        const errorMessage = error?.error?.description || 'Failed to create payment order. Please try again later.';
        const statusCode = error?.statusCode || 500;
        res.status(statusCode).json({ error: errorMessage });
    }
};


// --- Verify Payment and Handle Webhook ---
// This export pattern using 'exports.functionName' is correct
exports.verifyPayment = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log(`\n\n==================== WEBHOOK RECEIVED ====================`);
    console.log(`[${new Date().toISOString()}] Webhook Body:`, JSON.stringify(req.body, null, 2));

    if (!secret) {
        console.error("[Webhook Error] RAZORPAY_WEBHOOK_SECRET is not configured.");
        return res.status(500).json({ status: 'Webhook secret configuration error' });
    }

    const receivedSignature = req.headers['x-razorpay-signature'];
    if (!receivedSignature) {
        console.warn("[Webhook Warning] Missing 'x-razorpay-signature' header.");
        return res.status(400).json({ status: 'Missing signature' });
    }

    // --- Signature Verification ---
    try {
        const requestBodyString = JSON.stringify(req.body);
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(requestBodyString);
        const digest = shasum.digest('hex');

        console.log("[Webhook Info] Generated Digest:", digest);
        console.log("[Webhook Info] Received Signature:", receivedSignature);

        if (digest !== receivedSignature) {
             console.error("[Webhook Error] Invalid signature.");
             return res.status(400).json({ status: 'Invalid signature' });
        }
        console.log("[Webhook Success] Signature verified successfully.");

    } catch (hmacError) {
        console.error("[Webhook Error] Error during signature verification:", hmacError);
        return res.status(500).json({ status: 'Signature verification error' });
    }
    // --- End Signature Verification ---

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    console.log(`[Webhook Info] Event Type: ${event}`);

    // --- Process 'payment.captured' Event ---
    if (event === 'payment.captured' && paymentEntity) {
        console.log(`[Webhook Info] Processing 'payment.captured' for Payment ID: ${paymentEntity.id}`);
        const { order_id, id: payment_id, amount, currency, notes, status } = paymentEntity; // Removed unused error vars here

        console.log(`[Webhook Info] Payment Status from Payload: ${status}`);
        if (status !== 'captured') {
             console.warn(`[Webhook Warning] Received payment event (${payment_id}) but status in payload is '${status}'. Ignoring logic, but acknowledging receipt.`);
             return res.status(200).json({ status: `Received, non-captured status: ${status}` });
        }

        // --- Extract Notes ---
        const { userId, courseId } = notes || {};
        console.log(`[Webhook Info] Extracted Notes - UserID: ${userId}, CourseID: ${courseId}`);
        if (!userId || !courseId) {
            console.error(`[Webhook Error] CRITICAL: Missing userId ('${userId}') or courseId ('${courseId}') in payment notes for Payment ID ${payment_id}. Cannot update enrollment. Notes received:`, notes);
            return res.status(200).json({ status: 'Received, but critical notes data missing.' });
        }
        // --- End Extract Notes ---

        // --- Database Update Logic ---
        try {
             console.log(`[Webhook DB] Attempting to find Course ID: ${courseId}`);
             const course = await Course.findById(courseId);
             if (!course) {
                console.error(`[Webhook DB Error] Course ${courseId} not found in DB for Payment ID ${payment_id}. Enrollment cannot be updated.`);
                return res.status(200).json({ status: 'Received, but associated course not found.'});
             }
             console.log(`[Webhook DB] Found Course: ${course.title}`);

             // Optional Amount Check
             const expectedAmountPaise = Math.round(course.price * 100);
             if (amount !== expectedAmountPaise) {
                console.warn(`[Webhook Warning] Amount mismatch for Payment ${payment_id}. Expected ${expectedAmountPaise}, got ${amount}. Proceeding anyway.`);
             }

             // Find existing enrollment FIRST (for logging)
             try {
                const existingEnrollment = await Enrollment.findOne({ user: userId, course: courseId });
                if (existingEnrollment) {
                    console.log(`[Webhook DB Info] Found existing enrollment. Current status: '${existingEnrollment.status}'. Will attempt to update.`);
                } else {
                    console.log(`[Webhook DB Info] No existing enrollment found. Will attempt to create (upsert).`);
                }
             } catch (findError) {
                 console.error("[Webhook DB Error] Error finding existing enrollment:", findError);
             }

             // *** THE CRUCIAL UPDATE STEP ***
             console.log(`[Webhook DB] Attempting findOneAndUpdate for Enrollment: User '${userId}', Course '${courseId}'`);
             const enrollmentUpdateData = {
                 $set: {
                     razorpayOrderId: order_id,
                     razorpayPaymentId: payment_id,
                     status: 'completed', // *** SETTING STATUS TO COMPLETED ***
                     purchaseDate: new Date()
                 },
                 $setOnInsert: {
                      user: userId,
                      course: courseId
                 }
             };
             const enrollmentOptions = {
                 new: true, // Return the modified document
                 upsert: true, // Create if it doesn't exist
                 setDefaultsOnInsert: true
             };

             const updatedEnrollment = await Enrollment.findOneAndUpdate(
                 { user: userId, course: courseId }, // Filter
                 enrollmentUpdateData,               // Update
                 enrollmentOptions                   // Options
             );

             if (updatedEnrollment) {
                 console.log(`[Webhook DB Success] Enrollment findOneAndUpdate successful.`);
                 console.log(`[Webhook DB Success] Resulting Enrollment Document:`, JSON.stringify(updatedEnrollment, null, 2));
                 if (updatedEnrollment.status === 'completed') {
                     console.log(`[Webhook DB Success] CONFIRMED: Status in updated document is 'completed'.`);
                 } else {
                     console.error(`[Webhook DB ERROR] UNEXPECTED: Status IS NOT 'completed' after update! Actual Status: '${updatedEnrollment.status}'`);
                 }
             } else {
                 console.error(`[Webhook DB Error] CRITICAL: findOneAndUpdate returned null/undefined. Update/Insert failed for User ${userId}, Course ${courseId}.`);
             }

             console.log(`[Webhook] Sending 200 OK response to Razorpay.`);
             res.status(200).json({ status: 'success' });

        } catch (dbError) {
            console.error(`[Webhook DB Error] Overall error during database interaction for Payment ${payment_id}:`, dbError);
            res.status(500).json({ status: 'Database processing error' });
        }
        // --- End Database Update Logic ---

    } else {
        console.log(`[Webhook Info] Received event type '${event}' or missing payment entity. Acknowledging receipt.`);
        res.status(200).json({ status: `ok (unhandled event: ${event})` });
    }
    console.log(`==================== WEBHOOK PROCESSING END ====================\n`);
};

// Make sure there are no other 'module.exports = ...' lines below this in the file.