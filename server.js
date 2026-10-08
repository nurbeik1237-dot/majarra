/* ==========================================================================
   MAJARRA COMMUNITY CENTER - PROFESSIONAL PRODUCTION EXPRESS SERVER (v6.0)
   - Complete API, Database, Nodemailer Email Notifications & Multer Uploads
   - Helmet Security Headers & CORS Configuration
   - Rate Limiting & Brute Force Protection
   - Dual Admin Auth (PIN Code: 1234 & Credentials: admin@majarra.org / Admin@2026)
   - Modular Controllers & Express Routers
   - SQLite3 Promisified Database Connection & Attachments Support
   - SPA Fallback & Global 404/500 Error Handlers
   ========================================================================== */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import Custom Modules & Middlewares
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// Import Routers
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure EJS View Engine for Server-Side Rendered (SSR) Vouchers
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Helmet Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow CDNs & Google Fonts
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Middleware
app.use(cors());

// 3. Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. HTTP Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Disable API & HTML Caching
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url === '/' || req.url.startsWith('/admin') || req.url.startsWith('/book') || req.url.startsWith('/bio') || req.url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});
app.use('/api', apiLimiter);

const publicController = require('./controllers/publicController');

// 6. Standalone Routes
app.get(['/book', '/booking', '/book.html'], (req, res) => {
  res.sendFile('book.html', { root: __dirname });
});

app.get(['/bio', '/bio.html'], (req, res) => {
  res.sendFile('bio.html', { root: __dirname });
});

app.get(['/builder', '/builder.html'], (req, res) => {
  res.sendFile('builder.html', { root: __dirname });
});

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile('admin.html', { root: __dirname });
});

// Dynamic Event Registration Engine Routes (/e/:slug & /events/:slug)
app.get(['/e/:slug', '/events/:slug'], async (req, res) => {
  const slug = req.params.slug;
  const { dbGet } = require('./config/database');
  try {
    let event = null;
    try {
      event = await dbGet(`SELECT * FROM events WHERE slug = ? OR id = ?`, [slug, slug]);
    } catch (e) {}

    let customFields = [];
    if (!event) {
      let defaultTitle = `استمارة ${slug}`;
      if (slug === 'share-your-idea') defaultTitle = 'شارك فكرتك مع مركز مجرة المجتمعي';
      else if (slug === 'workshop-lead-generation') defaultTitle = 'استمارة قيادة ورشة عمل / فعالية';
      else if (slug === 'rawya-club' || slug === 'roeya-club') defaultTitle = 'استمارة التسجيل في نادي رويّـــة';
      
      event = {
        id: slug,
        slug: slug,
        title: defaultTitle,
        eventType: 'فعالية مجتمعية',
        description: 'يسعدنا استقبال مقترحاتكم وأفكاركم المتميزة في مركز مجرّة المجتمعي.',
        isActive: 1,
        isRegistrationOpen: 1
      };
    } else {
      const rawFields = event.custom_fields || event.customFields;
      if (rawFields) {
        try { customFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields; } catch(e){}
      }
    }
    const isClosed = event.is_active !== undefined ? !event.is_active : (!event.isActive || !event.isRegistrationOpen);
    res.render('templates/event-registration', { event, customFields, isClosed });
  } catch (err) {
    res.status(500).send('Error loading form page: ' + err.message);
  }
});
app.post('/api/events/:slug/register', publicController.registerForEvent);
app.post('/api/forms/:formId/submit', publicController.submitUserFormResponse);
app.get('/admin/forms-legacy', publicController.renderUserAdminPage);
app.get('/admin/export/:formId', publicController.exportUserFormCSV);

const eventRoutes = require('./routes/eventRoutes');

// 7. Mount API Routes
app.get('/api/calendar/public', publicController.getPublicCalendarSlots);
app.use('/api/public', publicRoutes);
app.use('/api/bookings', publicRoutes); // Public bookings submission, availability check, tracking
app.use('/api/auth', authRoutes);
app.use('/api/admin', authRoutes); // Compatibility for /api/admin/login-pin, /api/admin/login, /api/admin/users
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/admin/events', eventRoutes);
app.use('/api/admin/bookings/events', eventRoutes);
app.use('/api/admin/bookings', bookingRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// 8. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    server: 'Majarra Center Backend System',
    timestamp: new Date().toISOString()
  });
});

// 8.5 Serve Static Frontend Files & Uploads
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// 9. Handle SPA Fallback Middleware
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'index.html'), (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('Not Found');
      }
    });
  }
  next();
});

// 10. Global Error Handling Middlewares
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start Express Production Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================================`);
  console.log(`🚀 MAJARRA CENTER BACKEND SERVER IS RUNNING!`);
  console.log(`📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`🔒 Security Headers, Nodemailer Email Service & Uploads Enabled`);
  console.log(`===========================================================`);

  // Automatic 10-Minute Backup Task
  const { bundleProjectZip } = require('./controllers/settingsController');
  const { process24HourReminders } = require('./services/reminderService');
  const AUTO_BACKUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  const runAutoBackup = async () => {
    try {
      console.log(`[Auto-Backup] 📦 Generating automatic 10-minute site ZIP backup...`);
      await bundleProjectZip();
      console.log(`[Auto-Backup] ✅ Backup successfully updated at ${new Date().toLocaleString('ar-EG')}`);
    } catch (err) {
      console.error(`[Auto-Backup] ❌ Failed to generate auto-backup:`, err.message);
    }
  };

  setTimeout(runAutoBackup, 3000);
  setInterval(runAutoBackup, AUTO_BACKUP_INTERVAL_MS);

  // Automatic 24-Hour Reminder Task (Runs every 1 hour)
  setTimeout(process24HourReminders, 6000);
  setInterval(process24HourReminders, 60 * 60 * 1000);
});

module.exports = app;
