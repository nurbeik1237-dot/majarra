/* ==========================================================================
   MAJARRA COMMUNITY CENTER - API RATE LIMITER PROTECTION
   ========================================================================== */

const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'تم التجاوز المؤقت لعدد الطلبات المسموحة. يرجى الانتظار قليلاً.'
  }
});

// Strict Login Rate Limiter (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 login attempts per 15 mins
  skip: isLocalhost,
  message: {
    success: false,
    code: 'LOGIN_LIMIT_EXCEEDED',
    message: 'تم تجاوز محاولات الدخول الخاطئة. يرجى الانتظار 15 دقيقة وإعادة المحاولة.'
  }
});

// Strict Booking Submission Limiter (Spam Protection)
const bookingSubmitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 submissions per 10 mins
  message: {
    success: false,
    code: 'BOOKING_SUBMIT_LIMIT',
    message: 'تم تقديم عدة طلبات في وقت قصير. يرجى الانتظار بضع دقائق.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  bookingSubmitLimiter
};
