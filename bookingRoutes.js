/* ==========================================================================
   MAJARRA COMMUNITY CENTER - ADMIN BOOKINGS ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect all routes below with JWT

router.get('/', bookingController.getAllBookings);
router.get('/stats', bookingController.getStats);
router.post('/manual', bookingController.createManualBooking);

// Dynamic Event Engine Admin Routes
router.get('/events', bookingController.getAllEventsAdmin);
router.get('/events/list', bookingController.getAllEventsAdmin);
router.get('/events/registrations', bookingController.getEventRegistrationsAdmin);
router.get('/events/:id/registrations', bookingController.getEventRegistrationsAdmin);
router.get('/events/:id/details', bookingController.getEventByIdAdmin);
router.post('/events', bookingController.createEventAdmin);
router.post('/events/create', bookingController.createEventAdmin);
router.put('/events/:id', bookingController.updateEventAdmin);
router.delete('/events/:id', bookingController.deleteEventAdmin);
router.get('/events/:id/export', bookingController.exportEventRegistrationsCSV);
router.put('/events/registrations/:id/status', bookingController.updateEventRegistrationStatus);
router.delete('/events/registrations/:id', bookingController.deleteEventRegistration);

// Booking ID specific routes
router.get('/:id', bookingController.getBookingById);
router.put('/:id/status', bookingController.updateBookingStatus);
router.put('/:id', bookingController.updateBookingDetails);
router.delete('/:id', bookingController.deleteBooking);


module.exports = router;
