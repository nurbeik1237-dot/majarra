/* ==========================================================================
   MAJARRA COMMUNITY CENTER - AUTH ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');

// Staff PIN Logins
router.post('/staff-login', authLimiter, authController.staffLogin);
router.post('/login-pin', authLimiter, authController.staffLogin);

// Email & Password Credentials Login
router.post('/login', authLimiter, authController.emailLogin);

// Super Admin PIN Login
router.post('/super-login', authLimiter, authController.superLogin);
router.post('/verify-pin', authLimiter, authController.superLogin);

// Current User Verification
router.get('/me', authenticateToken, authController.getMe);

// Create New Admin User (Superadmin Only)
router.post('/users', authenticateToken, requireSuperAdmin, authController.createAdminUser);

module.exports = router;
