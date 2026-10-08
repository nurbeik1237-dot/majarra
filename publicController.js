/* ==========================================================================
   MAJARRA COMMUNITY CENTER - PUBLIC API CONTROLLER
   - Public Calendar Events & Hall Configs
   - Live Conflict & Availability Checking
   - Public Booking Submission with Multer File Attachment Support
   - Booking Tracking by ID Endpoint
   - Nodemailer Email Notifications
   ========================================================================== */

const { dbAll, dbGet, dbRun } = require('../config/database');
const { sendNotificationEmail } = require('../services/emailService');
const { sendInstantPushAlerts } = require('../services/telegramService');
const { fetchBookingsFromDrive, appendBookingToDrive } = require('../services/googleSheetsService');

// GET /api/public/all-bookings-sync - Central Sync for Admin & Visitors
exports.getAllBookingsSync = async (req, res, next) => {
  try {
    const rows = await dbAll(`SELECT * FROM bookings ORDER BY createdAt DESC`);
    res.json({
      success: true,
      count: rows.length,
      bookings: rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/calendar-events - Get accepted bookings for live public calendar
exports.getPublicCalendarEvents = async (req, res, next) => {
  try {
    const { hall, year, month } = req.query;

    let sql = `
      SELECT id, eventTitle, hallName, eventType, executorName, startDate, endDate, startTime, endTime, attendeesCount
      FROM bookings 
      WHERE status = 'accepted'
    `;
    const params = [];

    if (hall && hall !== 'all') {
      sql += ` AND hallName = ?`;
      params.push(hall);
    }

    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      const prefix = `${year}-${monthStr}`;
      sql += ` AND startDate LIKE ?`;
      params.push(`${prefix}%`);
    }

    sql += ` ORDER BY startDate ASC, startTime ASC`;

    const events = await dbAll(sql, params);
    res.json({
      success: true,
      count: events.length,
      data: events,
      events
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/halls - Get active hall names, capacities & descriptions
exports.getPublicHalls = async (req, res, next) => {
  try {
    const row = await dbGet(`SELECT value FROM settings WHERE key = 'halls_config'`);
    let hallsConfig = {};
    if (row && row.value) {
      try { hallsConfig = JSON.parse(row.value); } catch (e) {}
    }
    res.json({
      success: true,
      halls: hallsConfig
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/settings - Get all site settings & hall configs for client sync
exports.getPublicSettings = async (req, res, next) => {
  try {
    const rows = await dbAll(`SELECT key, value FROM settings`);
    const map = {};
    (rows || []).forEach(r => {
      try {
        map[r.key] = JSON.parse(r.value);
      } catch (e) {
        map[r.key] = r.value;
      }
    });

    res.json({
      success: true,
      halls: map.halls_config || {},
      packages: map.packages_config || {},
      site: map.site_config || {},
      policies: map.policies_config || {},
      forms: map.forms_config || {},
      adminPhone: map.admin_phone || '+90 538 506 29 89',
      adminEmail: map.admin_email || 'nur.beik1237@gmail.com',
      adminInstagram: map.admin_instagram || 'https://www.instagram.com/majarracommunity/',
      adminFacebook: map.admin_facebook || '',
      adminUsername: map.admin_username || 'admin',
      staffPin: map.staff_pin ? 'configured' : 'default',
      masterPin: map.master_pin ? 'configured' : 'default'
    });
  } catch (err) {
    next(err);
  }
};

// GET or POST /api/public/check-availability - Live capacity & time slot collision check
exports.checkAvailability = async (req, res, next) => {
  try {
    const hallName = req.query.hallName || req.body.hallName;
    const startDate = req.query.startDate || req.body.startDate;
    const startTime = req.query.startTime || req.body.startTime;
    const endTime = req.query.endTime || req.body.endTime;

    if (!hallName || !startDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'جميع معايير الوقت والقاعة مطلوبة لفحص التوفر'
      });
    }

    const collisions = await dbAll(`
      SELECT id, eventTitle, startTime, endTime 
      FROM bookings 
      WHERE status = 'accepted' AND hallName = ? AND startDate = ?
      AND (
        (startTime < ? AND endTime > ?) OR
        (startTime < ? AND endTime > ?) OR
        (startTime >= ? AND endTime <= ?)
      )
    `, [hallName, startDate, endTime, startTime, startTime, startTime, startTime, endTime]);

    const isAvailable = collisions.length === 0;

    if (!isAvailable) {
      const c = collisions[0];
      return res.json({
        available: false,
        isAvailable: false,
        message: `القاعة محجوزة في هذا التوقيت لنشاط (${c.eventTitle}) من ${c.startTime} إلى ${c.endTime}`,
        collisionsCount: collisions.length,
        collisions
      });
    }

    res.json({
      available: true,
      isAvailable: true,
      message: 'القاعة والتوقيت متاحان للحجز فوراً.',
      collisionsCount: 0,
      collisions: []
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/track/:id - Visitor Booking Tracking by ID
exports.trackBooking = async (req, res, next) => {
  try {
    const rawId = req.params.id || req.query.id || req.query.bookingId || '';
    const cleanId = String(rawId).replace(/#/g, '').trim().toUpperCase();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال رقم الحجز للبحث'
      });
    }

    const row = await dbGet(`
      SELECT id, organizerName, executorName, eventTitle, hallName, startDate, startTime, endTime, status, createdAt
      FROM bookings WHERE UPPER(REPLACE(id, '#', '')) = ? OR UPPER(id) = ?
    `, [cleanId, cleanId]);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: `لم يتم العثور على أي حجز برقم (#${cleanId})`
      });
    }

    res.json({
      success: true,
      booking: row
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/bookings - Public Booking Submission (Supports Multer Attachment)
exports.submitBooking = async (req, res, next) => {
  try {
    const b = req.body;
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!b.organizerName || !b.whatsappNumber || !b.eventTitle || !b.hallName || !b.startDate || !b.startTime || !b.endTime) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تعبئة كافة الحقول المطلوبة بالشكل الصحيح'
      });
    }

    // Final conflict check
    const collision = await dbGet(`
      SELECT id, eventTitle FROM bookings
      WHERE hallName = ? AND startDate = ? AND status = 'accepted'
      AND (
        (startTime < ? AND endTime > ?) OR
        (startTime < ? AND endTime > ?) OR
        (startTime >= ? AND endTime <= ?)
      )
    `, [b.hallName, b.startDate, b.endTime, b.startTime, b.startTime, b.startTime, b.startTime, b.endTime]);

    if (collision) {
      return res.status(409).json({
        success: false,
        message: `القاعة محجوزة بالفعل في هذا التوقيت لنشاط "${collision.eventTitle}"، يرجى اختيار موعد آخر.`
      });
    }

    const bookingId = 'MJR-' + Math.floor(1000 + Math.random() * 9000);
    const isPaid = b.isPaidEvent === 'نعم' || b.isPaidEvent === true;
    const feeText = isPaid ? (b.feeAmount || 'تحدد لاحقاً بالليرة التركية (TL)') : '0 TL (نشاط مجاني)';

    const equipmentStr = typeof b.equipment === 'string' ? b.equipment : JSON.stringify(b.equipment || []);

    const sql = `
      INSERT INTO bookings (
        id, organizerName, whatsappNumber, email, entityType, executorName,
        eventType, hallName, eventTitle, eventDescription, attendeesCount,
        startDate, endDate, startTime, endTime, instagramLink, facebookLink,
        linkedinLink, equipment, extraEquipmentNeeds, isSponsored, isPaidEvent,
        packageType, additionalService, feeAmount, attachmentUrl, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const params = [
      bookingId,
      b.organizerName,
      b.whatsappNumber,
      b.email || 'info@majarra.org',
      b.entityType || 'فرد مستقل',
      b.executorName || b.organizerName,
      b.eventType || 'فعالية',
      b.hallName,
      b.eventTitle,
      b.eventDescription || '',
      parseInt(b.attendeesCount, 10) || 1,
      b.startDate,
      b.endDate || b.startDate,
      b.startTime,
      b.endTime,
      b.instagramLink || '',
      b.facebookLink || '',
      b.linkedinLink || '',
      equipmentStr,
      b.extraEquipmentNeeds || '',
      b.isSponsored || 'لا',
      isPaid ? 'نعم' : 'لا',
      b.packageType || 'كفو',
      b.additionalService || 'بدون خدمات إضافية',
      feeText,
      attachmentUrl
    ];

    await dbRun(sql, params);

    const createdBooking = {
      ...b,
      id: bookingId,
      feeAmount: feeText,
      attachmentUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // 1. Send confirmation email to client
    if (b.email && b.email.includes('@')) {
      sendNotificationEmail(
        b.email,
        `🎉 تم استلام طلب حجزكم (#${bookingId}) بنجاح | مركز مجرة المجتمعي`,
        `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #0f0a1c; color: #ffffff; padding: 25px; border-radius: 12px;">
          <h2 style="color: #d4af37; border-bottom: 2px solid #8a6fb2; padding-bottom: 10px;">مركز مجرّة المجتمعي - تأكيد استلام الطلب</h2>
          <p>مرحباً <strong>${b.organizerName}</strong>،</p>
          <p>تم استلام طلب حجزكم بنجاح وهو الآن قيد التدقيق والمراجعة الإدارية.</p>
          
          <div style="background: rgba(138, 111, 178, 0.15); border: 1px solid #8a6fb2; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>رقم الحجز:</strong> <span style="color: #d4af37; font-weight: bold;">#${bookingId}</span></p>
            <p style="margin: 5px 0;"><strong>القاعة:</strong> ${b.hallName}</p>
            <p style="margin: 5px 0;"><strong>عنوان النشاط:</strong> ${b.eventTitle}</p>
            <p style="margin: 5px 0;"><strong>التاريخ والوقت:</strong> ${b.startDate} | ${b.startTime} - ${b.endTime}</p>
            <p style="margin: 5px 0;"><strong>الرسوم المقدرة:</strong> ${feeText}</p>
          </div>

          <p>يمكنك الاستعلام عن حالة طلبك في أي وقت برقم الحجز <strong>(#${bookingId})</strong> عبر موقعنا الإلكتروني.</p>
          <p style="color: #a095c2; font-size: 0.85rem; margin-top: 20px;">مركز مجرّة المجتمعي — Majarra Community Center</p>
        </div>
        `
      );
    }

    // 2. Send Executive Alert Email to Booking Staff & Super Admin (nur.beik1237@gmail.com)
    const adminNotificationEmail = process.env.ADMIN_EMAIL || 'nur.beik1237@gmail.com';
    const cleanWaPhone = (b.whatsappNumber || '').replace(/[^0-9]/g, '');
    
    sendNotificationEmail(
      adminNotificationEmail,
      `🚨 إشعار حجز جديد بانتظار التدقيق الإداري: #${bookingId} (${b.hallName})`,
      `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #0f0a1c; color: #ffffff; padding: 25px; border-radius: 12px; border: 2px solid #d4af37;">
        <h2 style="color: #d4af37; margin-top: 0;">⚡ إشعار حجز جديد وارد (موظف الحجوزات والمدير العام)</h2>
        <p>وصل طلب حجز جديد بانتظار التدقيق والمراجعة واتخاذ الإجراء:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; color: #ffffff;">
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">رقم الحجز:</td><td style="padding: 8px;">#${bookingId}</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">المسؤول المباشر:</td><td style="padding: 8px;">${b.organizerName}</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">رقم الواتساب:</td><td style="padding: 8px;" dir="ltr"><a href="https://wa.me/${cleanWaPhone}" style="color: #25D366; font-weight: bold; text-decoration: none;">${b.whatsappNumber} 💬 (مراسلة فورا)</a></td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">الجهة المنفذة:</td><td style="padding: 8px;">${b.executorName || b.organizerName} (${b.entityType || 'فرد'})</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">القاعة المطلوبة:</td><td style="padding: 8px;">${b.hallName}</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">عنوان النشاط:</td><td style="padding: 8px;">${b.eventTitle}</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">التاريخ والتوقيت:</td><td style="padding: 8px;">${b.startDate} (${b.startTime} إلى ${b.endTime})</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">عدد الحضور:</td><td style="padding: 8px;">${b.attendeesCount} شخص</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">نوع النشاط:</td><td style="padding: 8px;">${b.eventType || 'فعالية'} | باقة: ${b.packageType || 'كفو'}</td></tr>
          <tr style="border-bottom: 1px solid #332454;"><td style="padding: 8px; font-weight: bold; color: #d4af37;">الرسوم المقدرة:</td><td style="padding: 8px; color: #d4af37; font-weight: bold;">${feeText}</td></tr>
        </table>

        <div style="margin-top: 20px; text-align: center;">
          <a href="https://majarra-community-center.loca.lt" style="background: #8a6fb2; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">الانتقال للوحة الإدارة والموافقة/الرفض</a>
        </div>
      </div>
      `
    );

    // 3. Dispatch Instant Mobile & Desktop Push Notifications (24/7 Service)
    sendInstantPushAlerts(createdBooking).catch(err => console.warn('Instant Push alert error:', err));

    // 4. Sync Record to Google Drive / Google Sheets
    appendBookingToDrive(createdBooking).catch(err => console.warn('[Google Drive Sync Warning]:', err.message));

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب الحجز بنجاح، وسيقوم فريق الإدارة بمراجعته والتواصل معكم.',
      bookingId,
      bookingData: createdBooking
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/calendar/public - Public Calendar Slots from Google Drive / Database
exports.getPublicCalendarSlots = async (_req, res, next) => {
  try {
    const driveBookings = await fetchBookingsFromDrive();
    let publicSlots = [];

    if (driveBookings && driveBookings.length > 0) {
      publicSlots = driveBookings
        .filter((b) => b.status === "accepted")
        .map((b) => ({
          hallName: b.hallName,
          startDate: b.startDate,
          startTime: b.startTime,
          endTime: b.endTime,
          eventTitle: b.eventTitle,
        }));
    } else {
      const dbAccepted = await dbAll(`
        SELECT hallName, startDate, startTime, endTime, eventTitle 
        FROM bookings 
        WHERE status = 'accepted'
      `);
      publicSlots = dbAccepted.map(b => ({
        hallName: b.hallName,
        startDate: b.startDate,
        startTime: b.startTime,
        endTime: b.endTime,
        eventTitle: b.eventTitle
      }));
    }

    res.json(publicSlots);
  } catch (err) {
    next(err);
  }
};

// GET /api/public/bio - Get Bio Hub profile, active links, and active events
exports.getPublicBioData = async (req, res, next) => {
  try {
    let profile = await dbGet(`SELECT * FROM bio_profile LIMIT 1`);
    if (!profile) {
      profile = {
        title: 'مركز مجرّة المجتمعي',
        subtitle: 'Majarra Community Center',
        bioDesc: 'مساحتك الملهِمة في إسطنبول لإقامة ورش العمل، المبادرات الشبابية، الاجتماعات، والفعاليات الثقافية والتعليمية 🚀',
        locationTitle: 'موقع مركز مجرة المجتمعي',
        locationDesc: '__ osmanlı iş merkez __ غازي مختار باشا أمام محطة الترام',
        videoTitle: 'From Idea to Reality | رحلة تحضير مركز مجرّة',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      };
    }

    const links = await dbAll(`SELECT * FROM bio_links WHERE isActive = 1 ORDER BY sortOrder ASC, id ASC`);
    const events = await dbAll(`SELECT * FROM bio_events WHERE isActive = 1 ORDER BY sortOrder ASC, id ASC`);

    res.json({
      success: true,
      profile,
      links,
      events
    });
  } catch (err) {
    next(err);
  }
};

exports.renderVoucherHTML = async (req, res, next) => {
  try {
    const rawId = req.params.id || req.query.id || '';
    const cleanId = String(rawId).replace(/#/g, '').trim().toUpperCase();
    const row = await dbGet(`SELECT * FROM bookings WHERE UPPER(REPLACE(id, '#', '')) = ? OR UPPER(id) = ?`, [cleanId, cleanId]);
    if (!row) return res.status(404).send('الحجز غير موجود');
    if (res.render) {
      return res.render('templates/booking-voucher', { booking: row });
    }
    res.send(`<h1>فوتشر حجز ${row.id}</h1><p>المنظم: ${row.organizerName}</p>`);
  } catch (err) {
    next(err);
  }
};

exports.downloadVoucherPDF = async (req, res, next) => {
  try {
    res.status(501).send('تنزيل PDF يتاح عبر المتصفح مباشرة');
  } catch (err) {
    next(err);
  }
};

exports.renderUserForm = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const form = await dbGet(`
      SELECT f.*, (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) AS resp_count
      FROM forms f WHERE f.slug = ?
    `, [slug]);

    if (!form) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>الاستمارة غير موجودة</title></head>
        <body style="background:#060814; color:#fff; font-family:sans-serif; text-align:center; padding:50px;">
          <h2>⚠️ الاستمارة غير موجودة أو تم تغيير الرابط</h2>
          <a href="/bio.html" style="color:#818cf8;">العودة للرئيسية</a>
        </body>
        </html>
      `);
    }

    const isClosed = form.is_active === 0 || (form.max_responses > 0 && form.resp_count >= form.max_responses);

    res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${form.title} | مجرّة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@dawod/thmanyah-font-web@1.2.0/index.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ar.js"></script>
    <style>
        body { font-family: 'Thmanyah Serif Display', 'Tajawal', sans-serif; background-color: #060814; }
        .font-num { font-family: 'Plus Jakarta Sans', sans-serif; }
        .glass-panel { background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .glass-card { background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.06); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .mesh-gradient { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; background: radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(168, 85, 247, 0.12) 0%, transparent 40%); }
        .input-ring:focus { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
        .flatpickr-calendar { background: rgba(15, 23, 42, 0.98) !important; border: 1px solid rgba(129, 140, 248, 0.4) !important; border-radius: 1.25rem !important; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.3) !important; backdrop-filter: blur(25px) !important; font-family: 'Tajawal', sans-serif !important; direction: rtl !important; padding: 14px 12px !important; width: 336px !important; box-sizing: border-box !important; }
        .flatpickr-current-month { font-size: 110% !important; font-weight: 800 !important; color: #f8fafc !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; }
        .flatpickr-current-month .flatpickr-monthDropdown-months, .flatpickr-current-month select.flatpickr-monthDropdown-years { background: rgba(30, 41, 59, 0.85) !important; color: #818cf8 !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 10px !important; padding: 4px 12px !important; font-weight: 800 !important; font-size: 0.92rem !important; cursor: pointer !important; outline: none !important; margin: 0 4px !important; transition: all 0.2s ease !important; }
        .flatpickr-current-month select.flatpickr-monthDropdown-years option { background-color: #0f172a !important; color: #f8fafc !important; padding: 6px !important; }
        .flatpickr-current-month .numInputWrapper { display: none !important; }
        .flatpickr-days { width: 100% !important; display: flex !important; }
        .dayContainer { display: flex !important; flex-wrap: wrap !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; justify-content: flex-start !important; outline: none !important; }
        .flatpickr-weekdays { display: flex !important; width: 100% !important; height: 32px !important; align-items: center !important; overflow: hidden !important; }
        .flatpickr-weekdaycontainer { display: flex !important; width: 100% !important; justify-content: space-between !important; }
        span.flatpickr-weekday { flex: 0 0 14.2857% !important; max-width: 14.2857% !important; width: 14.2857% !important; text-align: center !important; font-weight: 800 !important; font-size: 0.82rem !important; color: #a5b4fc !important; line-height: 32px !important; }
        .flatpickr-day { flex: 0 0 14.2857% !important; max-width: 14.2857% !important; width: 14.2857% !important; height: 38px !important; line-height: 38px !important; text-align: center !important; color: #f8fafc !important; border-radius: 10px !important; font-weight: 700 !important; margin: 2px 0 !important; box-sizing: border-box !important; }
        .flatpickr-day.selected { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important; color: #ffffff !important; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important; }
        .flatpickr-day.prevMonthDay, .flatpickr-day.nextMonthDay { color: rgba(248, 250, 252, 0.25) !important; }
    </style>
</head>
<body class="text-slate-100 min-h-screen py-10 px-4 md:px-6 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
    <div class="mesh-gradient"></div>
    <div class="fixed top-0 left-0 w-full h-1 bg-slate-900/80 backdrop-blur z-50">
        <div id="progress-bar" class="h-full bg-gradient-to-l from-indigo-500 via-purple-500 to-sky-400 w-0 transition-all duration-300"></div>
    </div>
    <div class="max-w-4xl w-full mx-auto relative z-10 space-y-5">
        <header id="form-header" class="glass-panel rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div class="relative z-10 space-y-4">
                <div class="flex items-center justify-between gap-3">
                    ${form.badge_text ? `<span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold"><span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>${form.badge_text}</span>` : '<div></div>'}
                    <a href="/bio.html" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition">العودة إلى الصفحة الرئيسية ↩</a>
                </div>
                <h1 class="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">${form.title}</h1>
                ${form.description ? `<p class="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line pt-1 border-t border-white/5">${form.description}</p>` : ''}
            </div>
        </header>

        ${isClosed ? `
            <div class="glass-panel rounded-3xl p-10 text-center space-y-3">
                <div class="text-4xl">🪐</div>
                <h2 class="text-lg font-bold text-white">باب التسجيل غير متاح حالياً</h2>
                <p class="text-slate-400 text-sm max-w-sm mx-auto">عذراً، تم إغلاق الاستمارة أو اكتملت السعة الاستيعابية المخصصة لهذا النشاط.</p>
            </div>
        ` : `
            <form id="pro-form" class="space-y-4" novalidate>
                <div id="questions-wrapper" class="space-y-4"></div>
                <div class="pt-4 flex justify-center">
                    <button type="submit" id="btn-submit" class="max-w-md w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group">
                        <span>تأكيد وإرسال الرد</span>
                        <span class="group-hover:translate-x-[-4px] transition-transform duration-200">←</span>
                    </button>
                </div>
            </form>
            <div id="success-state" class="hidden glass-panel rounded-3xl p-6 md:p-10 text-center space-y-6 shadow-2xl max-w-2xl mx-auto border border-indigo-500/30">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-3xl font-black shadow-lg shadow-amber-500/10">⌛</div>
                
                <div class="space-y-2">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>حالة الطلب: قيد التأكيد والمراجعة</span>
                    </div>
                    <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight">تم استلام طلبك بنجاح</h2>
                    <p class="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                        شكراً لاهتمامك بالانضمام إلى مجتمع مجرّة! تم تسجيل بياناتك بنجاح، وطلبك الآن <strong class="text-amber-300 font-bold">قيد التأكيد والمراجعة</strong> من قبل اللجنة المشرفة.
                    </p>
                </div>

                <!-- QR CODE TICKET CARD -->
                <div id="ticket-card" class="bg-slate-950/80 border border-white/10 rounded-2xl p-6 text-right space-y-4 shadow-inner relative overflow-hidden">
                    <div class="flex items-center justify-between border-b border-white/10 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            <span class="text-xs font-bold text-slate-300">بطاقة استمارة مجتمع مجرّة الرسمية</span>
                        </div>
                        <span id="ticket-code" class="font-num text-xs font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-400/20">MJR-MEM-2026</span>
                    </div>

                    <div class="flex flex-col md:flex-row items-center gap-6 pt-2">
                        <!-- QR Code Box -->
                        <div class="bg-white p-3 rounded-xl shadow-md flex-shrink-0 flex flex-col items-center gap-1.5">
                            <div id="qrcode-box" class="w-32 h-32 flex items-center justify-center"></div>
                            <span class="text-[10px] font-bold text-slate-700 tracking-wider font-num" id="qrcode-label">MJR-MEM-2026</span>
                        </div>

                        <!-- Ticket Details -->
                        <div class="flex-1 space-y-2.5 text-xs text-slate-300 w-full">
                            <div class="flex justify-between border-b border-white/5 pb-1.5">
                                <span class="text-slate-400">اسم المتقدم:</span>
                                <span id="ticket-name" class="font-bold text-white">-</span>
                            </div>
                            <div class="flex justify-between border-b border-white/5 pb-1.5">
                                <span class="text-slate-400">رقم التواصل:</span>
                                <span id="ticket-phone" class="font-num text-white">-</span>
                            </div>
                            <div class="flex justify-between border-b border-white/5 pb-1.5">
                                <span class="text-slate-400">تاريخ إرسال الاستمارة:</span>
                                <span id="ticket-date" class="text-slate-300 font-num">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">حالة الاستمارة:</span>
                                <span class="text-amber-400 font-bold">⏳ قيد التأكيد والمراجعة</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-2 flex flex-wrap justify-center gap-3">
                    <button onclick="window.print()" class="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition flex items-center gap-2">
                        <span>📥 طباعة / حفظ بطاقة الطلب والباركود</span>
                    </button>
                    <a href="/bio.html" class="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98] transition flex items-center gap-2">
                        <span>العودة إلى الصفحة الرئيسية ↩</span>
                    </a>
                </div>
            </div>
        `}
        <footer class="text-center text-xs text-slate-500 py-6">مركز مجرّة المجتمعي • مساحة للتفاعل والمعرفة</footer>
    </div>

    <script>
        window.transformAllFlatpickrCalendars = function() {
            document.querySelectorAll('.flatpickr-calendar').forEach(function(cal) {
                const container = cal.querySelector('.flatpickr-current-month');
                if (!container) return;

                let yearSelect = container.querySelector('select.flatpickr-monthDropdown-years');
                const numWrapper = container.querySelector('.numInputWrapper');

                if (!yearSelect && numWrapper) {
                    yearSelect = document.createElement('select');
                    yearSelect.className = 'flatpickr-monthDropdown-months flatpickr-monthDropdown-years';
                    yearSelect.setAttribute('aria-label', 'سنة');

                    const curYearInput = numWrapper.querySelector('.cur-year');
                    const currentYear = curYearInput ? parseInt(curYearInput.value || curYearInput.getAttribute('value') || new Date().getFullYear(), 10) : new Date().getFullYear();

                    const startYear = 1940;
                    const endYear = new Date().getFullYear() + 10;
                    for (let y = endYear; y >= startYear; y--) {
                        const opt = document.createElement('option');
                        opt.className = 'flatpickr-monthDropdown-month';
                        opt.value = y;
                        opt.textContent = y;
                        if (y === currentYear) opt.selected = true;
                        yearSelect.appendChild(opt);
                    }

                    yearSelect.addEventListener('change', function(e) {
                        const val = parseInt(e.target.value, 10);
                        if (curYearInput) {
                            curYearInput.value = val;
                            curYearInput.dispatchEvent(new Event('input', { bubbles: true }));
                            curYearInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        document.querySelectorAll('input.flatpickr-input').forEach(function(inp) {
                            if (inp._flatpickr && inp._flatpickr.isOpen) {
                                inp._flatpickr.changeYear(val);
                            }
                        });
                    });

                    numWrapper.style.display = 'none';
                    numWrapper.parentNode.insertBefore(yearSelect, numWrapper);
                } else if (yearSelect && numWrapper) {
                    const curYearInput = numWrapper.querySelector('.cur-year');
                    if (curYearInput && curYearInput.value && yearSelect.value !== curYearInput.value) {
                        yearSelect.value = curYearInput.value;
                    }
                }
            });
        };

        document.addEventListener('click', function() { window.transformAllFlatpickrCalendars(); }, true);
        document.addEventListener('focusin', function() { window.transformAllFlatpickrCalendars(); }, true);
        setInterval(function() { window.transformAllFlatpickrCalendars(); }, 100);

        window.triggerFormFileUpload = function(el) {
            var inp = el.querySelector('input[type=file]');
            if (inp) inp.click();
        };

        window.handleFormFileChange = function(inp) {
            var f = inp.files[0];
            var statusEl = inp.parentElement.querySelector('.file-status-box');
            if (statusEl) {
                if (f) {
                    statusEl.innerHTML = '<div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mt-2">📄 ' + f.name + ' (' + (f.size / 1048576).toFixed(2) + ' MB)</div>';
                } else {
                    statusEl.innerHTML = '';
                }
            }
        };

        const questions = ${form.questions_json || '[]'};
        const wrapper = document.getElementById('questions-wrapper');
        const progressBar = document.getElementById('progress-bar');
        const formEl = document.getElementById('pro-form');

        function updateProgress() {
            if (!formEl) return;
            let filledCount = 0;
            questions.forEach((q, idx) => {
                if (q.type === 'checkbox') {
                    const checked = formEl.querySelectorAll('input[name="q_' + idx + '[]"]:checked');
                    if (checked.length > 0) filledCount++;
                } else if (q.type === 'radio' || q.type === 'rating') {
                    const checked = formEl.querySelector('input[name="q_' + idx + '"]:checked') || formEl.querySelector('input[name="q_' + idx + '"][value!=""]');
                    if (checked && checked.value !== "") filledCount++;
                } else {
                    const field = formEl.querySelector('[name="q_' + idx + '"]');
                    if (field && field.value.trim() !== '') filledCount++;
                }
            });
            const percent = questions.length ? Math.round((filledCount / questions.length) * 100) : 0;
            if (progressBar) progressBar.style.width = percent + '%';
        }

        if (wrapper) {
            questions.forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = "glass-card rounded-2xl p-5 md:p-6 space-y-3";
                
                const star = q.required ? '<span class="text-rose-400 text-sm mr-1 font-bold">*</span>' : '';
                const reqAttr = q.required ? 'data-required="true"' : '';
                let fieldHtml = '';

                if (q.type === 'email') {
                    fieldHtml = '<input type="email" name="q_' + idx + '" ' + reqAttr + ' placeholder="name@example.com" dir="ltr" class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none input-ring">';
                } else if (q.type === 'phone' || q.type === 'tel') {
                    fieldHtml = '<input type="tel" name="q_' + idx + '" ' + reqAttr + ' placeholder="+90 5xx xxx xx xx" dir="ltr" class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none input-ring">';
                } else if (q.type === 'number') {
                    fieldHtml = '<input type="number" name="q_' + idx + '" ' + reqAttr + ' placeholder="0" class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none input-ring">';
                } else if (q.type === 'file') {
                    fieldHtml = '<div class="relative border-2 border-dashed border-indigo-500/30 hover:border-indigo-400/60 bg-slate-950/40 hover:bg-slate-950/60 rounded-2xl p-5 text-center transition-all cursor-pointer group" onclick="triggerFormFileUpload(this)">' +
                        '<input type="file" name="q_' + idx + '" ' + reqAttr + ' class="hidden" onchange="handleFormFileChange(this)">' +
                        '<div class="flex flex-col items-center gap-2 pointer-events-none">' +
                            '<div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">' +
                                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>' +
                            '</div>' +
                            '<span class="text-sm font-bold text-slate-200 group-hover:text-white transition">انقر هنا لاختيار ملف من جهازك</span>' +
                            '<span class="text-xs text-slate-400 font-medium">يمكنك رفع ملف واحد (PDF, PNG, JPG, DOCX - حتى 10 MB)</span>' +
                            '<div class="file-status-box"></div>' +
                        '</div>' +
                    '</div>';
                } else if (q.type === 'text') {
                    fieldHtml = '<input type="text" name="q_' + idx + '" ' + reqAttr + ' placeholder="اكتب إجابتك هنا..." class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none input-ring">';
                } else if (q.type === 'textarea') {
                    fieldHtml = '<textarea name="q_' + idx + '" ' + reqAttr + ' rows="3" placeholder="شاركنا تفاصيل إجابتك..." class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none input-ring resize-none"></textarea>';
                } else if (q.type === 'select') {
                    const opts = (q.options || []).map(opt => '<option value="' + opt + '">' + opt + '</option>').join('');
                    fieldHtml = '<select name="q_' + idx + '" ' + reqAttr + ' class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none input-ring"><option value="">-- اختر من القائمة --</option>' + opts + '</select>';
                } else if (q.type === 'date') {
                    fieldHtml = '<input type="date" name="q_' + idx + '" ' + reqAttr + ' class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none input-ring">';
                } else if (q.type === 'time') {
                    fieldHtml = '<input type="time" name="q_' + idx + '" ' + reqAttr + ' class="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none input-ring">';
                } else if (q.type === 'rating') {
                    fieldHtml = '<div class="flex gap-2 text-2xl text-amber-400 cursor-pointer pt-1" id="star-box-' + idx + '"><input type="hidden" name="q_' + idx + '" value="5"><span onclick="this.parentElement.querySelector(&quot;input&quot;).value=1; this.parentElement.querySelectorAll(&quot;span&quot;).forEach((s,i)=>s.innerText=i<1?&quot;★&quot;:&quot;☆&quot;)" class="hover:scale-110 transition">★</span><span onclick="this.parentElement.querySelector(&quot;input&quot;).value=2; this.parentElement.querySelectorAll(&quot;span&quot;).forEach((s,i)=>s.innerText=i<2?&quot;★&quot;:&quot;☆&quot;)" class="hover:scale-110 transition">★</span><span onclick="this.parentElement.querySelector(&quot;input&quot;).value=3; this.parentElement.querySelectorAll(&quot;span&quot;).forEach((s,i)=>s.innerText=i<3?&quot;★&quot;:&quot;☆&quot;)" class="hover:scale-110 transition">★</span><span onclick="this.parentElement.querySelector(&quot;input&quot;).value=4; this.parentElement.querySelectorAll(&quot;span&quot;).forEach((s,i)=>s.innerText=i<4?&quot;★&quot;:&quot;☆&quot;)" class="hover:scale-110 transition">★</span><span onclick="this.parentElement.querySelector(&quot;input&quot;).value=5; this.parentElement.querySelectorAll(&quot;span&quot;).forEach((s,i)=>s.innerText=i<5?&quot;★&quot;:&quot;☆&quot;)" class="hover:scale-110 transition">★</span></div>';
                } else if (q.type === 'radio') {
                    const opts = (q.options || []).map(opt => {
                        const isOther = opt.trim().startsWith('أخرى');
                        if (isOther) {
                            return '<label class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-indigo-400/30 hover:bg-slate-950/60 cursor-pointer transition"><input type="radio" name="q_' + idx + '" value="أخرى" ' + reqAttr + ' class="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 radio-other-trigger"><span class="text-sm text-slate-200 font-medium whitespace-nowrap">أخرى:</span><input type="text" id="other_text_' + idx + '" placeholder="اكتب التفاصيل هنا..." class="flex-1 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" onclick="const rb=this.parentElement.querySelector(&quot;input[type=radio]&quot;); if(rb) rb.checked=true;"></label>';
                        }
                        return '<label class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-indigo-400/30 hover:bg-slate-950/60 cursor-pointer transition"><input type="radio" name="q_' + idx + '" value="' + opt + '" ' + reqAttr + ' class="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"><span class="text-sm text-slate-200 font-medium">' + opt + '</span></label>';
                    }).join('');
                    fieldHtml = '<div class="grid grid-cols-1 gap-2 pt-1">' + opts + '</div>';
                } else if (q.type === 'checkbox') {
                    const opts = (q.options || []).map(opt => {
                        const isOther = opt.trim().startsWith('أخرى');
                        if (isOther) {
                            return '<label class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-indigo-400/30 hover:bg-slate-950/60 cursor-pointer transition"><input type="checkbox" name="q_' + idx + '[]" value="أخرى" class="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 cb-other-trigger"><span class="text-sm text-slate-200 font-medium whitespace-nowrap">أخرى:</span><input type="text" id="other_cb_text_' + idx + '" placeholder="اكتب التفاصيل هنا..." class="flex-1 bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" onclick="const cb=this.parentElement.querySelector(&quot;input[type=checkbox]&quot;); if(cb) cb.checked=true;"></label>';
                        }
                        return '<label class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-indigo-400/30 hover:bg-slate-950/60 cursor-pointer transition"><input type="checkbox" name="q_' + idx + '[]" value="' + opt + '" class="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"><span class="text-sm text-slate-200 font-medium">' + opt + '</span></label>';
                    }).join('');
                    fieldHtml = '<div class="grid grid-cols-1 gap-2 pt-1">' + opts + '</div>';
                }

                const descHtml = q.description ? '<div class="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-line pt-2 border-t border-white/10 mt-1.5">' + q.description + '</div>' : "";

                card.innerHTML = '<div class="space-y-1"><label class="block text-sm md:text-[15px] font-bold text-white leading-relaxed">' + q.label + ' ' + star + '</label>' + descHtml + '</div>' + fieldHtml + '<div class="err-hint hidden text-xs text-rose-400 pt-1 font-medium">هذا الحقل مطلوب للإرسال</div>';
                wrapper.appendChild(card);
            });

            const initFlatpickrWithYearDropdown = function() {
                if (typeof flatpickr === 'undefined') return;

                flatpickr("input[type=date]", {
                    locale: "ar",
                    dateFormat: "Y-m-d",
                    altInput: true,
                    altFormat: "j F Y",
                    monthSelectorType: "dropdown",
                    disableMobile: true,
                    onReady: function() { window.transformAllFlatpickrCalendars(); },
                    onOpen: function() { window.transformAllFlatpickrCalendars(); },
                    onMonthChange: function() { setTimeout(window.transformAllFlatpickrCalendars, 10); },
                    onYearChange: function() { setTimeout(window.transformAllFlatpickrCalendars, 10); }
                });
            };

            const fpTimer = setInterval(function() {
                if (typeof flatpickr !== 'undefined') {
                    clearInterval(fpTimer);
                    initFlatpickrWithYearDropdown();
                }
            }, 50);
        }

        if (formEl) {
            formEl.addEventListener('input', updateProgress);
            formEl.addEventListener('change', updateProgress);
            formEl.addEventListener('submit', async (e) => {
                e.preventDefault();
                let hasError = false;
                const answers = {};

                questions.forEach((q, idx) => {
                    const card = wrapper.children[idx];
                    const errHint = card ? card.querySelector('.err-hint') : null;
                    let val;

                    if (q.type === 'checkbox') {
                        const checked = Array.from(card.querySelectorAll('input[name="q_' + idx + '[]"]:checked')).map(cb => cb.value);
                        val = checked;
                        if (q.required && checked.length === 0) hasError = true;
                    } else if (q.type === 'radio') {
                        const checked = card.querySelector('input[name="q_' + idx + '"]:checked');
                        val = checked ? checked.value : '';
                        if (q.required && !val) hasError = true;
                    } else {
                        const input = card ? card.querySelector('[name="q_' + idx + '"]') : null;
                        val = input ? input.value.trim() : '';
                        if (q.required && !val) hasError = true;
                    }

                    if (q.required && (!val || (Array.isArray(val) && val.length === 0))) {
                        if (errHint) errHint.classList.remove('hidden');
                        if (card) card.classList.add('!border-rose-500/40');
                    } else {
                        if (errHint) errHint.classList.add('hidden');
                        if (card) card.classList.remove('!border-rose-500/40');
                    }

                    answers[q.label] = val;
                });

                if (hasError) {
                    const firstErr = wrapper.querySelector('.err-hint:not(.hidden)');
                    if (firstErr) firstErr.closest('.glass-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }

                const btn = document.getElementById('btn-submit');
                btn.disabled = true;
                btn.innerHTML = '<span>جاري تأكيد الرد...</span>';

                try {
                    const res = await fetch('/api/forms/${form.id}/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answers })
                    });
                    const result = await res.json();

                    if (result.success) {
                        formEl.classList.add('hidden');
                        const formHeader = document.getElementById('form-header');
                        if (formHeader) formHeader.classList.add('hidden');
                        document.getElementById('success-state').classList.remove('hidden');
                        if (progressBar) progressBar.style.width = '100%';
                        window.scrollTo({ top: 0, behavior: 'smooth' });

                        const respId = result.responseId || Math.floor(1000 + Math.random() * 9000);
                        const refCode = 'MJR-MEM-' + respId;
                        
                        const ticketCodeEl = document.getElementById('ticket-code');
                        const qrCodeLabelEl = document.getElementById('qrcode-label');
                        if (ticketCodeEl) ticketCodeEl.textContent = refCode;
                        if (qrCodeLabelEl) qrCodeLabelEl.textContent = refCode;

                        const nameVal = answers['الاسم والكنية (بالعربي)'] || answers['الاسم والكنية (بالإنجليزية)'] || Object.values(answers)[1] || 'عضو جديد';
                        const phoneVal = answers['رقم الهاتف'] || Object.values(answers)[3] || '-';
                        const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                        const ticketNameEl = document.getElementById('ticket-name');
                        const ticketPhoneEl = document.getElementById('ticket-phone');
                        const ticketDateEl = document.getElementById('ticket-date');
                        if (ticketNameEl) ticketNameEl.textContent = nameVal;
                        if (ticketPhoneEl) ticketPhoneEl.textContent = phoneVal;
                        if (ticketDateEl) ticketDateEl.textContent = dateStr;

                        const qrBox = document.getElementById('qrcode-box');
                        if (qrBox) {
                            qrBox.innerHTML = '';
                            const qrText = window.location.origin + '/e/${form.slug}?ref=' + refCode;
                            if (typeof QRCode !== 'undefined') {
                                new QRCode(qrBox, {
                                    text: qrText,
                                    width: 120,
                                    height: 120,
                                    colorDark: "#0f172a",
                                    colorLight: "#ffffff",
                                    correctLevel: QRCode.CorrectLevel.H
                                });
                            } else {
                                const img = document.createElement('img');
                                img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(qrText);
                                img.alt = 'QR Code';
                                img.className = 'w-30 h-30 rounded';
                                qrBox.appendChild(img);
                            }
                        }

                        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    } else {
                        alert(result.message || 'حدث خطأ غير متوقع');
                        btn.disabled = false;
                        btn.innerHTML = '<span>تأكيد وإرسال الرد</span><span>←</span>';
                    }
                } catch (err) {
                    alert('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
                    btn.disabled = false;
                    btn.innerHTML = '<span>تأكيد وإرسال الرد</span><span>←</span>';
                }
            });
        }
    </script>
</body>
</html>
    `);
  } catch (err) {
    next(err);
  }
};
exports.submitUserFormResponse = async (req, res, next) => {
  try {
    const { answers } = req.body || {};
    const formId = req.params.formId;
    const result = await dbRun(`INSERT INTO responses (form_id, answers_json) VALUES (?, ?)`, [formId, JSON.stringify(answers || {})]);
    res.json({ success: true, message: 'تم حفظ الرد بنجاح', responseId: result ? result.lastID : Math.floor(1000 + Math.random() * 9000) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.renderUserAdminPage = async (req, res, next) => {
  try {
    res.redirect('/admin.html');
  } catch (err) {
    next(err);
  }
};

exports.exportUserFormCSV = async (req, res, next) => {
  try {
    res.status(501).send('تصدير الملفات يتاح عبر لوحة التحكم الرئيسية');
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:slug/register - Register participant for a dynamic event / form
exports.registerForEvent = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, phone, email, answers } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تعبئة الاسم ورقم الهاتف على الأقل.'
      });
    }

    // 1. Find event in events table or forms table
    let event = await dbGet('SELECT * FROM events WHERE slug = ?', [slug]);
    let eventId = null;
    let eventTitle = '';

    if (event) {
      eventId = event.id;
      eventTitle = event.title;
    } else {
      const form = await dbGet('SELECT * FROM forms WHERE slug = ?', [slug]);
      if (form) {
        eventId = form.id;
        eventTitle = form.title;
      }
    }

    const answersJson = typeof answers === 'string' ? answers : JSON.stringify(answers || {});

    // 2. Insert into event_registrations
    const regResult = await dbRun(
      `INSERT INTO event_registrations (event_id, eventId, name, fullName, phone, email, answers_json, customAnswers, event_title, status, created_at, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        eventId || 1, 
        slug || String(eventId || 1), 
        name.trim(), 
        name.trim(), 
        phone.trim(), 
        (email || '').trim(), 
        answersJson, 
        answersJson, 
        eventTitle || slug
      ]
    );

    // 3. Optional fallback insert into responses table if form exists
    try {
      if (eventId) {
        await dbRun(
          `INSERT INTO responses (form_id, respondent_name, respondent_phone, respondent_email, answers_json, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [eventId, name.trim(), phone.trim(), (email || '').trim(), answersJson]
        );
      }
    } catch (e) {}

    res.json({
      success: true,
      registrationId: regResult ? regResult.lastID : Math.floor(1000 + Math.random() * 9000),
      eventTitle: eventTitle || slug,
      message: 'تم تسجيل البيانات بنجاح واستخراج تذكرة الحضور!'
    });
  } catch (err) {
    console.error('Error in registerForEvent:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حفظ التسجيل: ' + err.message
    });
  }
};
