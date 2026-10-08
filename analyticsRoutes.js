/* ==========================================================================
   MAJARRA COMMUNITY CENTER - ADMIN ANALYTICS ROUTER
   ========================================================================== */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/overview', authenticateToken, analyticsController.getAnalyticsOverview);

module.exports = router;
