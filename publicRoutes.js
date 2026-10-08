/* ==========================================================================
   MAJARRA COMMUNITY CENTER - PUBLIC ROUTES
   - Calendar Events & Halls Configs
   - Live Availability Check & Booking Tracking
   - Booking Submission with Multer File Attachment Support
   ========================================================================== */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const publicController = require('../controllers/publicController');
const { bookingSubmitLimiter } = require('../middleware/rateLimiter');
const { validateBookingInput } = require('../middleware/bookingValidation');

// Configure Multer storage
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'majarra-doc-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

router.get('/calendar-events', publicController.getPublicCalendarEvents);
router.get('/calendar/public', publicController.getPublicCalendarSlots);
router.get('/public-calendar', publicController.getPublicCalendarSlots);
router.get('/events', publicController.getPublicCalendarEvents);
router.get('/all-bookings-sync', publicController.getAllBookingsSync);
router.get('/halls', publicController.getPublicHalls);
router.get('/settings', publicController.getPublicSettings);
router.get('/site-info', publicController.getPublicSettings);
router.get('/bio', publicController.getPublicBioData);
router.get('/bio-events', publicController.getPublicBioData);
router.get('/check-availability', publicController.checkAvailability);
router.post('/check-availability', publicController.checkAvailability);
router.post('/check-conflict', publicController.checkAvailability);
router.get('/track', publicController.trackBooking);
router.get('/track/:id', publicController.trackBooking);
router.get('/track-booking', publicController.trackBooking);
router.get('/track-booking/:id', publicController.trackBooking);
router.get('/bookings/track', publicController.trackBooking);
router.get('/bookings/track/:id', publicController.trackBooking);

// SSR Voucher HTML and PDF Endpoints
router.get('/:id/voucher', publicController.renderVoucherHTML);
router.get('/:id/voucher/pdf', publicController.downloadVoucherPDF);

// Public Booking Submission (with optional attachment file & Zod validation)
router.post('/', bookingSubmitLimiter, upload.single('attachment'), validateBookingInput, publicController.submitBooking);
router.post('/bookings', bookingSubmitLimiter, upload.single('attachment'), validateBookingInput, publicController.submitBooking);
router.post('/bookings/submit', bookingSubmitLimiter, upload.single('attachment'), validateBookingInput, publicController.submitBooking);

module.exports = router;
