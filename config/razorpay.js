const Razorpay = require('razorpay');

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
    throw new Error("Razorpay Key ID or Key Secret not found in environment variables.");
}

const instance = new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
});

module.exports = instance;