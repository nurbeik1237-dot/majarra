/* ==========================================================================
   MAJARRA COMMUNITY CENTER - SUPER ADMIN SETTINGS ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireSuperAdmin); // Require Super Admin Role for all settings routes

router.get('/', settingsController.getSettings);
router.get('/site-info', settingsController.getSettings);
router.get('/policies', settingsController.getSettings);
router.put('/halls', settingsController.updateHallsConfig);
router.put('/packages', settingsController.updatePackagesConfig);
router.put('/site-info', settingsController.updateSiteConfig);
router.put('/policies', settingsController.updatePoliciesConfig);
router.put('/forms', settingsController.updateFormsConfig);
router.put('/pins', settingsController.updatePins);
router.put('/phone', settingsController.updatePhone);
router.put('/email', settingsController.updateEmail);
router.put('/instagram', settingsController.updateInstagram);

// Bio Hub Admin Management Endpoints
router.get('/bio', settingsController.getBioAdminData);
router.put('/bio/profile', settingsController.updateBioProfile);
router.post('/bio/links', settingsController.addBioLink);
router.put('/bio/links/:id', settingsController.updateBioLink);
router.delete('/bio/links/:id', settingsController.deleteBioLink);
router.get('/bio-events', settingsController.getBioAdminData);
router.post('/bio-events', settingsController.addBioEvent);
router.post('/bio/events', settingsController.addBioEvent);
router.put('/bio/events/:id', settingsController.updateBioEvent);
router.delete('/bio/events/:id', settingsController.deleteBioEvent);
router.delete('/bio-events/:id', settingsController.deleteBioEvent);
// Backup & ZIP Package Endpoints
router.get('/backup/info', settingsController.getBackupInfo);
router.post('/backup/generate', settingsController.generateBackupZip);
router.get('/backup/download', settingsController.downloadBackupZip);

module.exports = router;

