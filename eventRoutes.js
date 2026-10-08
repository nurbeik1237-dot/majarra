/* ==========================================================================
   MAJARRA COMMUNITY CENTER - ADMIN DYNAMIC EVENTS (FORM BUILDER) ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect all routes below with JWT

// Event routes
router.get(['/', '/list', '/events', '/events/list'], bookingController.getAllEventsAdmin);
router.get(['/registrations', '/events/registrations'], bookingController.getEventRegistrationsAdmin);

// Registration status update (PUT & POST)
router.put(['/registrations/:id/status', '/events/registrations/:id/status'], bookingController.updateEventRegistrationStatus);
router.post(['/registrations/:id/status', '/events/registrations/:id/status'], bookingController.updateEventRegistrationStatus);

// Registration delete
router.delete(['/registrations/:id', '/events/registrations/:id'], bookingController.deleteEventRegistration);

// Event ID specific routes
router.get(['/:id/registrations', '/events/:id/registrations'], bookingController.getEventRegistrationsAdmin);
router.get(['/:id/details', '/events/:id/details'], bookingController.getEventByIdAdmin);
router.get(['/:id/export', '/events/:id/export'], bookingController.exportEventRegistrationsCSV);

router.post(['/', '/create', '/events', '/events/create'], bookingController.createEventAdmin);
router.put(['/:id', '/events/:id'], bookingController.updateEventAdmin);
router.delete(['/:id', '/events/:id'], bookingController.deleteEventAdmin);

module.exports = router;
