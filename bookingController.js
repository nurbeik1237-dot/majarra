/* ==========================================================================
   MAJARRA COMMUNITY CENTER - ADMIN BOOKINGS CONTROLLER
   - Fetch All & Filter Bookings
   - Update Booking Status & Edit Details with Automatic Email Notifications
   - Manual Booking Additions & Deletion
   - Stats & Analytics Dashboard
   ========================================================================== */

const { dbAll, dbGet, dbRun } = require('../config/database');
const { sendNotificationEmail } = require('../services/emailService');

// Helper to safely parse JSON equipment array
function parseEquipment(eq) {
  if (!eq) return [];
  try {
    return JSON.parse(eq);
  } catch (e) {
    return [String(eq)];
  }
}

// GET /api/admin/bookings - Fetch all bookings with search, status, and hall filtering
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, hall, search } = req.query;

    let sql = `SELECT * FROM bookings WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (hall && hall !== 'all') {
      sql += ` AND hallName = ?`;
      params.push(hall);
    }

    if (search) {
      const q = `%${search.toLowerCase()}%`;
      sql += ` AND (LOWER(organizerName) LIKE ? OR LOWER(executorName) LIKE ? OR LOWER(eventTitle) LIKE ? OR LOWER(id) LIKE ?)`;
      params.push(q, q, q, q);
    }

    sql += ` ORDER BY createdAt DESC`;

    const rows = await dbAll(sql, params);

    const formattedBookings = rows.map(r => ({
      ...r,
      equipment: parseEquipment(r.equipment)
    }));

    res.json({
      success: true,
      count: formattedBookings.length,
      data: formattedBookings,
      bookings: formattedBookings
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/bookings/:id - Fetch single booking
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await dbGet(`SELECT * FROM bookings WHERE id = ?`, [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'الحجز غير موجود بالحافظة'
      });
    }

    res.json({
      success: true,
      booking: {
        ...row,
        equipment: parseEquipment(row.equipment)
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/bookings/:id/status - Approve or Reject booking with email notification
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['accepted', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة الحجز غير صالحة (مقبول: accepted / قيد المراجعة: pending / مرفوض: rejected)'
      });
    }

    const currentBooking = await dbGet(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!currentBooking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    await dbRun(`UPDATE bookings SET status = ?, adminNotes = COALESCE(?, adminNotes) WHERE id = ?`, [status, adminNotes, id]);

    // Send email notification to client if status changed
    if (status !== currentBooking.status && currentBooking.email) {
      const isAccepted = status === 'accepted';
      const statusText = isAccepted ? 'تم قبول وتأكيد حجزك رسمياً ✅' : 'نعتذر، لم يتم قبول طلب الحجز ❌';
      
      sendNotificationEmail(
        currentBooking.email,
        `تحديث بشأن طلب الحجز ${id} | مركز مجرة`,
        `<h3>مرحباً ${currentBooking.organizerName}،</h3>
         <p>نود إعلامك بأنه تم تحديث حالة طلب الحجز الخاص بك (<strong>${id}</strong>) لنشاط <strong>"${currentBooking.eventTitle}"</strong> إلى: <strong>${statusText}</strong>.</p>
         ${adminNotes ? `<p>ملاحظات الإدارة: ${adminNotes}</p>` : ''}`
      );
    }

    res.json({
      success: true,
      message: `تم تحديث حالة الحجز رقم (${id}) بنجاح إلى: ${status}`
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/bookings/:id - Full edit of booking details
exports.updateBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const b = req.body;

    const currentBooking = await dbGet(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!currentBooking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    const sql = `
      UPDATE bookings 
      SET status = COALESCE(?, status),
          hallName = COALESCE(?, hallName),
          startDate = COALESCE(?, startDate),
          endDate = COALESCE(?, endDate),
          startTime = COALESCE(?, startTime),
          endTime = COALESCE(?, endTime),
          attendeesCount = COALESCE(?, attendeesCount),
          feeAmount = COALESCE(?, feeAmount),
          eventTitle = COALESCE(?, eventTitle),
          organizerName = COALESCE(?, organizerName),
          executorName = COALESCE(?, executorName),
          adminNotes = COALESCE(?, adminNotes)
      WHERE id = ?
    `;

    const params = [
      b.status,
      b.hallName,
      b.startDate,
      b.endDate || b.startDate,
      b.startTime,
      b.endTime,
      b.attendeesCount ? parseInt(b.attendeesCount, 10) : undefined,
      b.feeAmount,
      b.eventTitle,
      b.organizerName,
      b.executorName,
      b.adminNotes,
      id
    ];

    await dbRun(sql, params);

    // Notify client if status changed via full edit
    if (b.status && b.status !== currentBooking.status && currentBooking.email) {
      const isAccepted = b.status === 'accepted';
      const statusText = isAccepted ? 'تم قبول وتأكيد حجزك رسمياً ✅' : 'نعتذر، لم يتم قبول طلب الحجز ❌';
      
      sendNotificationEmail(
        currentBooking.email,
        `تحديث بشأن طلب الحجز ${id} | مركز مجرة`,
        `<h3>مرحباً ${currentBooking.organizerName}،</h3>
         <p>نود إعلامك بأنه تم تحديث حالة طلب الحجز الخاص بك (<strong>${id}</strong>) إلى: <strong>${statusText}</strong>.</p>
         ${b.adminNotes ? `<p>ملاحظات الإدارة: ${b.adminNotes}</p>` : ''}`
      );
    }

    res.json({
      success: true,
      message: 'تم حفظ كافة تعديلات الحجز بنجاح'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/manual-booking - Create direct manual booking from Admin Dashboard
exports.createManualBooking = async (req, res, next) => {
  try {
    const b = req.body;
    const bookingId = b.id || ('MJR-' + Math.floor(1000 + Math.random() * 9000));

    const sql = `
      INSERT INTO bookings (
        id, organizerName, whatsappNumber, email, entityType, executorName,
        eventType, hallName, eventTitle, eventDescription, attendeesCount,
        startDate, endDate, startTime, endTime, equipment, extraEquipmentNeeds,
        isSponsored, isPaidEvent, packageType, additionalService, feeAmount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      bookingId,
      b.organizerName || 'إدارة المركز',
      b.whatsappNumber || '+90 538 506 29 89',
      b.email || 'info@majarra.org',
      b.entityType || 'منظمة غير ربحية',
      b.executorName || 'إدارة المركز',
      b.eventType || 'نشاط رسمي',
      b.hallName || 'قاعة أفــُـق (سعة القاعة 20)',
      b.eventTitle || 'حجز مباشر',
      b.eventDescription || 'حجز يدوي مباشر مضاف عن طريق لوحة التحكم.',
      parseInt(b.attendeesCount, 10) || 10,
      b.startDate,
      b.endDate || b.startDate,
      b.startTime || '10:00',
      b.endTime || '12:00',
      JSON.stringify(b.equipment || ['بروجكتر', 'كراسي']),
      b.extraEquipmentNeeds || '',
      b.isSponsored || 'نعم',
      b.isPaidEvent || 'لا',
      b.packageType || 'كفو',
      b.additionalService || 'بدون خدمات إضافية',
      b.feeAmount || '0 TL (نشاط مجاني)',
      b.status || 'accepted'
    ];

    await dbRun(sql, params);

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الحجز اليدوي بنجاح وتثبيته بالتقويم',
      bookingId
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/bookings/:id - Delete booking
exports.deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dbRun(`DELETE FROM bookings WHERE id = ?`, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    res.json({
      success: true,
      message: `تم حذف الحجز رقم (${id}) نهائياً`
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats - Dashboard Analytics & Breakdown
exports.getStats = async (req, res, next) => {
  try {
    const totalRow = await dbGet(`SELECT COUNT(*) as total FROM bookings`);
    const pendingRow = await dbGet(`SELECT COUNT(*) as pending FROM bookings WHERE status = 'pending'`);
    const acceptedRow = await dbGet(`SELECT COUNT(*) as accepted FROM bookings WHERE status = 'accepted'`);
    const attendeesRow = await dbGet(`SELECT SUM(attendeesCount) as totalAttendees FROM bookings WHERE status = 'accepted'`);

    res.json({
      success: true,
      stats: {
        total: totalRow.total || 0,
        pending: pendingRow.pending || 0,
        accepted: acceptedRow.accepted || 0,
        totalAttendees: attendeesRow.totalAttendees || 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   DYNAMIC EVENT REGISTRATION ENGINE (ADMIN CONTROLLERS)
   ========================================================================== */

exports.getAllEventsAdmin = async (req, res, next) => {
  try {
    const events = await dbAll(`
      SELECT e.*, (
        SELECT COUNT(*) FROM event_registrations r 
        WHERE r.event_id = e.id OR r.eventId = e.id OR r.eventId = e.slug OR r.event_title = e.title
      ) as registeredCount FROM events e ORDER BY e.createdAt DESC
    `);
    const forms = await dbAll(`
      SELECT f.*, (
        (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) +
        (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = f.id OR r.eventId = f.id OR r.eventId = f.slug OR r.event_title = f.title)
      ) as registeredCount FROM forms f ORDER BY f.id DESC
    `);
    
    const combined = [...events];
    forms.forEach(f => {
      if (!combined.some(e => e.slug === f.slug)) {
        combined.push({
          id: f.id,
          slug: f.slug,
          title: f.title,
          description: f.description || '',
          banner_url: '',
          max_capacity: f.max_responses || 0,
          is_active: f.is_active,
          custom_fields: f.questions_json,
          createdAt: f.created_at || new Date().toISOString(),
          registeredCount: f.registeredCount || 0
        });
      }
    });

    res.json({
      success: true,
      events: combined
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/events/:id - Get single event details
exports.getEventByIdAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    let event = await dbGet(`SELECT e.*, (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) as registeredCount FROM events e WHERE e.id = ?`, [id]);
    if (!event) {
      const form = await dbGet(`SELECT f.*, (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) as registeredCount FROM forms f WHERE f.id = ?`, [id]);
      if (form) {
        event = {
          id: form.id,
          title: form.title,
          slug: form.slug,
          description: form.description,
          max_capacity: form.max_responses,
          is_active: form.is_active,
          custom_fields: form.questions_json,
          registeredCount: form.registeredCount || 0
        };
      }
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'الفعالية غير موجودة.' });
    }
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};


// POST /api/admin/events - Create new dynamic event
exports.createEventAdmin = async (req, res, next) => {
  try {
    const { slug, title, description, banner_url, max_capacity, is_active, custom_fields } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'عنوان الفعالية مطلوب.' });
    }

    let finalSlug = (slug || '').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!finalSlug) {
      finalSlug = 'event-' + Date.now().toString(36);
    }

    const existing = await dbGet(`SELECT id FROM events WHERE slug = ?`, [finalSlug]);
    if (existing) {
      finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1000)}`;
    }

    const customFieldsJson = custom_fields ? (typeof custom_fields === 'string' ? custom_fields : JSON.stringify(custom_fields)) : '[]';

    const result = await dbRun(`
      INSERT INTO events (slug, title, description, banner_url, max_capacity, is_active, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      finalSlug,
      title,
      description || '',
      banner_url || '',
      parseInt(max_capacity) || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      customFieldsJson
    ]);

    const createdEvent = await dbGet(`SELECT e.*, 0 as registeredCount FROM events e WHERE e.id = ?`, [result.id]);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفعالية ورابط التسجيل بنجاح',
      id: result.id,
      slug: finalSlug,
      event: createdEvent
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/events/:id - Update dynamic event
exports.updateEventAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slug, title, description, banner_url, max_capacity, is_active, custom_fields } = req.body;

    const existing = await dbGet(`SELECT * FROM events WHERE id = ?`, [id]);
    if (!existing) {
      // If event ID doesn't exist, create it as a new event for safety
      return exports.createEventAdmin(req, res, next);
    }

    let finalSlug = (slug || '').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!finalSlug) {
      finalSlug = existing.slug || ('event-' + Date.now().toString(36));
    }
    const customFieldsJson = custom_fields !== undefined ? (typeof custom_fields === 'string' ? custom_fields : JSON.stringify(custom_fields)) : existing.custom_fields;

    await dbRun(`
      UPDATE events SET
        slug = ?,
        title = ?,
        description = ?,
        banner_url = ?,
        max_capacity = ?,
        is_active = ?,
        custom_fields = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      finalSlug,
      title || existing.title,
      description !== undefined ? description : existing.description,
      banner_url !== undefined ? banner_url : existing.banner_url,
      max_capacity !== undefined ? parseInt(max_capacity) : existing.max_capacity,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      customFieldsJson,
      id
    ]);

    const updated = await dbGet(`SELECT e.*, (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) as registeredCount FROM events e WHERE e.id = ?`, [id]);

    res.json({
      success: true,
      message: 'تم تحديث بيانات الفعالية بنجاح',
      event: updated
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/events/:id - Delete dynamic event or form
exports.deleteEventAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const targetId = isNaN(numId) ? id : numId;

    // Find all matching slugs or IDs in events and forms
    const matchedEvents = await dbAll(`SELECT id, slug FROM events WHERE id = ? OR id = ? OR slug = ?`, [id, targetId, id]);
    const matchedForms = await dbAll(`SELECT id, slug FROM forms WHERE id = ? OR id = ? OR slug = ?`, [id, targetId, id]);

    const items = new Set([String(id), String(targetId)]);
    matchedEvents.forEach(e => { if (e.id) items.add(String(e.id)); if (e.slug) items.add(String(e.slug)); });
    matchedForms.forEach(f => { if (f.id) items.add(String(f.id)); if (f.slug) items.add(String(f.slug)); });

    for (const key of items) {
      await dbRun(`DELETE FROM event_registrations WHERE event_id = ?`, [key]);
      await dbRun(`DELETE FROM events WHERE id = ? OR slug = ?`, [key, key]);
      await dbRun(`DELETE FROM responses WHERE form_id = ?`, [key]);
      await dbRun(`DELETE FROM forms WHERE id = ? OR slug = ?`, [key, key]);
      await dbRun(`DELETE FROM bio_links WHERE url LIKE ? OR url LIKE ?`, [`%${key}%`, `%/e/${key}`]);
    }

    res.json({
      success: true,
      message: 'تم حذف الاستمارة/الفعالية بنجاح 🗑️'
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/events/:id/registrations - Get registrations list for event or form
exports.getEventRegistrationsAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'all') {
      const allEvRegs = await dbAll(`
        SELECT r.id, 
               COALESCE(r.name, r.fullName, 'مشارك') as name, 
               r.phone, 
               r.email, 
               COALESCE(r.answers_json, r.customAnswers, '{}') as answers_json,
               COALESCE(r.status, 'pending') as status,
               COALESCE(r.created_at, r.createdAt, CURRENT_TIMESTAMP) as created_at,
               COALESCE(e.title, f.title, r.event_title, 'فعالية مجتمعية') as event_title, 
               COALESCE(e.slug, f.slug, r.eventId, 'event') as event_slug
        FROM event_registrations r
        LEFT JOIN events e ON r.event_id = e.id OR r.eventId = e.id OR r.eventId = e.slug
        LEFT JOIN forms f ON r.event_id = f.id OR r.eventId = f.id OR r.eventId = f.slug
        ORDER BY r.id DESC
      `);

      const allResponses = await dbAll(`
        SELECT r.*, f.title as event_title, f.slug as event_slug
        FROM responses r
        LEFT JOIN forms f ON r.form_id = f.id
        ORDER BY r.id DESC
      `);

      const combined = [...allEvRegs];
      allResponses.forEach(r => {
        let answersObj = {};
        try {
          answersObj = typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : (r.answers_json || {});
        } catch (e) {}

        let extractedName = '';
        let extractedPhone = '';
        let extractedEmail = '';

        for (const [k, v] of Object.entries(answersObj)) {
          const key = k.trim();
          const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
          if (!valStr || valStr === '-') continue;

          if (!extractedName && (key.includes('الاسم') || key.includes('اسم') || key.toLowerCase().includes('name'))) {
            extractedName = valStr;
          }
          if (!extractedPhone && (key.includes('هاتف') || key.includes('واتساب') || key.includes('موبايل') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile') || key.toLowerCase().includes('tel'))) {
            extractedPhone = valStr;
          }
          if (!extractedEmail && (key.includes('بريد') || key.toLowerCase().includes('email') || key.toLowerCase().includes('mail'))) {
            extractedEmail = valStr;
          }
        }

        combined.push({
          id: 'resp-' + r.id,
          event_id: r.form_id,
          event_title: r.event_title || 'استمارة فعالية',
          event_slug: r.event_slug || 'form',
          name: extractedName || 'مشارك جديد',
          phone: extractedPhone || '-',
          email: extractedEmail || '-',
          status: 'pending',
          answers: answersObj,
          answers_json: typeof r.answers_json === 'string' ? r.answers_json : JSON.stringify(answersObj),
          created_at: r.submitted_at || r.created_at || new Date().toISOString()
        });
      });

      return res.json({
        success: true,
        count: combined.length,
        registrations: combined
      });
    }

    let event = await dbGet(`SELECT * FROM events WHERE id = ? OR slug = ?`, [id, id]);
    let form = null;
    let registrations = [];

    if (!event) {
      form = await dbGet(`SELECT * FROM forms WHERE id = ? OR slug = ?`, [id, id]);
      if (form) {
        event = {
          id: form.id,
          title: form.title,
          slug: form.slug,
          description: form.description,
          max_capacity: form.max_responses,
          is_active: form.is_active
        };
      }
    } else {
      form = await dbGet(`SELECT * FROM forms WHERE id = ? OR slug = ?`, [event.id, event.slug]);
    }

    if (!event && !form) {
      return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    }

    if (event && event.id) {
      const evRegs = await dbAll(`SELECT * FROM event_registrations WHERE event_id = ? ORDER BY id DESC`, [event.id]);
      registrations.push(...evRegs);
    }

    if (form && form.id) {
      const formResponses = await dbAll(`SELECT * FROM responses WHERE form_id = ? ORDER BY id DESC`, [form.id]);
      formResponses.forEach(r => {
        let answersObj = {};
        try {
          answersObj = typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : (r.answers_json || {});
        } catch (e) {}

        let extractedName = '';
        let extractedPhone = '';
        let extractedEmail = '';

        for (const [k, v] of Object.entries(answersObj)) {
          const key = k.trim();
          const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
          if (!valStr || valStr === '-') continue;

          if (!extractedName && (key.includes('الاسم') || key.includes('اسم') || key.toLowerCase().includes('name'))) {
            extractedName = valStr;
          }
          if (!extractedPhone && (key.includes('هاتف') || key.includes('واتساب') || key.includes('موبايل') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile') || key.toLowerCase().includes('tel'))) {
            extractedPhone = valStr;
          }
          if (!extractedEmail && (key.includes('بريد') || key.toLowerCase().includes('email') || key.toLowerCase().includes('mail'))) {
            extractedEmail = valStr;
          }
        }

        registrations.push({
          id: 'resp-' + r.id,
          event_id: form.id,
          name: extractedName || 'مشارك جديد',
          phone: extractedPhone || '-',
          email: extractedEmail || '-',
          status: 'pending',
          answers: answersObj,
          answers_json: typeof r.answers_json === 'string' ? r.answers_json : JSON.stringify(answersObj),
          created_at: r.submitted_at || r.created_at || new Date().toISOString()
        });
      });
    }

    res.json({
      success: true,
      event: event || form,
      count: registrations.length,
      registrations
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/events/:id/export - Export event registrations as CSV
exports.exportEventRegistrationsCSV = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      const allRegs = await dbAll(`SELECT * FROM event_registrations ORDER BY id DESC`);
      return res.json({
        success: true,
        count: allRegs.length,
        registrations: allRegs
      });
    }

    let event = await dbGet(`SELECT * FROM events WHERE id = ? OR slug = ?`, [id, id]);
    let form = null;
    let registrations = [];
    let customQuestions = [];

    if (event) {
      registrations = await dbAll(`SELECT * FROM event_registrations WHERE event_id = ? ORDER BY id ASC`, [event.id]);
      try {
        if (event.custom_fields) {
          customQuestions = typeof event.custom_fields === 'string' ? JSON.parse(event.custom_fields) : event.custom_fields;
        }
      } catch (e) {}
    } else {
      form = await dbGet(`SELECT * FROM forms WHERE id = ? OR slug = ?`, [id, id]);
      if (form) {
        event = { id: form.id, title: form.title, slug: form.slug };
        try {
          if (form.questions_json) {
            customQuestions = typeof form.questions_json === 'string' ? JSON.parse(form.questions_json) : form.questions_json;
          }
        } catch (e) {}
        const responses = await dbAll(`SELECT * FROM responses WHERE form_id = ? ORDER BY id ASC`, [form.id]);
        registrations = responses.map(r => {
          let ans = {};
          try { ans = typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : (r.answers_json || {}); } catch(e) {}
          return {
            name: ans['q_full_name'] || ans['الاسم الكامل'] || ans['الاسم'] || 'مشارك',
            phone: ans['q_phone'] || ans['رقم الواتساب'] || ans['الهاتف'] || '-',
            email: ans['q_email'] || ans['البريد الإلكتروني'] || '-',
            answers_json: JSON.stringify(ans),
            created_at: r.submitted_at || r.created_at || ''
          };
        });
      }
    }

    if (!event) {
      return res.status(404).send('الفعالية غير موجودة');
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic Excel compatibility

    // Construct headers
    const headers = ['م', 'الاسم الكامل', 'رقم الواتساب', 'البريد الإلكتروني'];
    if (Array.isArray(customQuestions) && customQuestions.length > 0) {
      customQuestions.forEach(q => headers.push(q.label || q.title || 'سؤال مخصص'));
    } else {
      headers.push('الإجابات المخصصة');
    }
    headers.push('تاريخ التسجيل');

    csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

    registrations.forEach((r, idx) => {
      let answersObj = {};
      try {
        if (r.answers_json) answersObj = JSON.parse(r.answers_json);
      } catch (e) {}

      const row = [
        idx + 1,
        `"${String(r.name || '').replace(/"/g, '""')}"`,
        `"${String(r.phone || '').replace(/"/g, '""')}"`,
        `"${String(r.email || '').replace(/"/g, '""')}"`
      ];

      if (Array.isArray(customQuestions) && customQuestions.length > 0) {
        customQuestions.forEach(q => {
          let val = answersObj[q.label || q.title || q.id] || '';
          if (Array.isArray(val)) val = val.join(' - ');
          row.push(`"${String(val).replace(/"/g, '""')}"`);
        });
      } else {
        const answersText = Object.entries(answersObj).map(([k, v]) => `${k}: ${v}`).join(' | ');
        row.push(`"${String(answersText).replace(/"/g, '""')}"`);
      }

      row.push(`"${String(r.created_at || '').replace(/"/g, '""')}"`);

      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendees_${event.slug}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/bookings/events/registrations/:id/status - Update attendee registration status
exports.updateEventRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }

    await dbRun(`UPDATE event_registrations SET status = ? WHERE id = ?`, [status, id]);
    res.json({ success: true, message: 'تم تحديث حالة التسجيل بنجاح' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/bookings/events/registrations/:id - Delete attendee registration
exports.deleteEventRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const targetId = isNaN(numId) ? id : numId;
    const cleanId = String(id).replace('resp-', '');
    const cleanNum = parseInt(cleanId, 10);

    await dbRun(`DELETE FROM event_registrations WHERE id = ? OR id = ?`, [id, targetId]);
    await dbRun(`DELETE FROM responses WHERE id = ? OR id = ? OR id = ?`, [id, targetId, isNaN(cleanNum) ? cleanId : cleanNum]);
    res.json({ success: true, message: 'تم حذف التسجيل بنجاح' });
  } catch (err) {
    next(err);
  }
};

