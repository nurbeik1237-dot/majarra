/* ==========================================================================
   MAJARRA COMMUNITY CENTER - SUPER ADMIN SETTINGS CONTROLLER (FULL CONTROL)
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('../config/database');

// Helper to safely parse JSON settings from db
const getJsonSetting = async (key, fallback) => {
  const row = await dbGet(`SELECT value FROM settings WHERE key = ?`, [key]);
  if (row && row.value) {
    try { return JSON.parse(row.value); } catch (e) {}
  }
  return fallback;
};

// GET /api/admin/settings - Fetch ALL site settings
exports.getSettings = async (req, res, next) => {
  try {
    const hallsConfig = await getJsonSetting('halls_config', {
      ofoq: {
        name: 'قاعة أفــُـق',
        cap: 20,
        desc: 'مساحة مريحة ومجهزة بالكامل مناسبة للورش التدريبية والجلسات التفاعلية والأنشطة الشبابية.',
        img: 'assets/workshop.jpg',
        hourlyRate: 150,
        status: 'active',
        gear: ['بروجكتر وشاشة', 'نظام صوتي', 'وايفاي سريع', 'طاولات وكراسي', 'تكييف وتدفئة']
      },
      diwan: {
        name: 'قاعة ديـــوان',
        cap: 30,
        desc: 'قاعة واسعة وأنيقة مخصصة للندوات، المحاضرات، والأنشطة الثقافية والمجتمعية الكبرى.',
        img: 'assets/grand.jpg',
        hourlyRate: 250,
        status: 'active',
        gear: ['منصة إلقاء', 'شاشة بروجكتر عملاقة', 'نظام صوتي احترافي', 'ميكروفونات لاسلكية', 'وايفاي سريع']
      },
      sadeem: {
        name: 'قاعة ســديم',
        cap: 18,
        desc: 'قاعة اجتماعات مغلقة وهادئة مخصصة لاجتماعات فرق العمل والجلسات الاستشارية وتصوير المحتوى.',
        img: 'assets/meeting.jpg',
        hourlyRate: 150,
        status: 'active',
        gear: ['شاشة عرض تفاعلية', 'طاولة اجتماعات كبرى', 'إضاءة تصوير محتوى', 'عزل صوت ممتاز', 'وايفاي سريع']
      }
    });

    const packagesConfig = await getJsonSetting('packages_config', {
      kafo: {
        title: 'باقة كَفـُو',
        subtitle: 'المخصصة للأنشطة غير الربحية وتستهدف المساهمات الاجتماعية والشبابية.',
        priceText: 'مجانية 100%',
        badge: 'الأكثر اختياراً للجمعيات والأنشطة المجتمعية',
        features: [
          'استخدام القاعة المحددة بالكامل طوال فترة الفعالية',
          'استخدام كراسي وطاولات وشاشة البروجكتر مع النظام الصوتي',
          'دعم فني من فريق المركز لإعداد وتجهيز القاعة',
          'إتاحة شبكة الإنترنت السريعة (Wi-Fi) لجميع الحضور'
        ]
      },
      alaEyni: {
        title: 'باقة على عيني',
        subtitle: 'الباقة الشاملة لقاعة وتجهيزات ومشروبات وسناك ساخن لضيوفكم.',
        priceText: 'تتفاوت بحسب القاعة (من 225 TL إلى 350 TL للأنشطة غير الربحية)',
        badge: 'شاملة الضيافة الكاملة والبوفيه',
        ofoqPrice: '225 TL',
        diwanPrice: '350 TL',
        sadeemPrice: '225 TL',
        features: [
          'جميع مميزات وتجهيزات باقة كَفـُو بالكامل',
          'بوفيه مفتوح للمشروبات الساخنة (شاي، قهوة، أعشاب) طول فترة الفعالية',
          'ضيافة خفيفة وسناك ساخن وتجهيز البوفيه الخاص بالقاعة',
          'مساعد وفريق ضيافة مخصص لخدمة الضيوف والحضور'
        ]
      }
    });

    const siteConfig = await getJsonSetting('site_config', {
      siteName: 'مركز مجرّة المجتمعي',
      tagline: 'بوابة حجز القاعات والفعاليات والمساحات الإبداعية',
      logoUrl: 'assets/majarra_official_icon.png',
      announcementBanner: 'أهلاً بكم في مركز مجرة المجتمعي — بوابة حجز القاعات والفعاليات الإبداعية',
      announcementEnabled: true,
      workingHours: 'يومياً من الساعة 09:00 صباحاً حتى 10:00 مساءً',
      addressUrl: 'https://www.google.com/maps/place/Majarra+Community+-+%D9%85%D8%B1%D9%83%D8%B2+%D9%85%D8%AC%D8%B1%D9%91%D8%A9%E2%80%AD/@37.0678503,37.3742895,17z/data=!3m1!4b1!4m6!3m5!1s0x1531e142eed4ad23:0x15a7470cf46658c6!8m2!3d37.0678503!4d37.3742895!16s%2Fg%2F11nbvg75kp'
    });

    const policiesConfig = await getJsonSetting('policies_config', {
      bookingTerms: '1. يرجى التزام المواعيد المحددة لبدء وانتهاء الحجز.\n2. الحفاظ على سلامة القاعة والتجهيزات الصوتية والضوئية.\n3. يرجى إبلاغ إدارة المركز بأي تغيير في مواعيد الحجز قبل 24 ساعة على الأقل.',
      cancellationPolicy: 'يمكن إلغاء أو تعديل الحجز مجاناً قبل 24 ساعة من موعد الفعالية.',
      receiptFooterNote: 'شكراً لاختياركم مركز مجرّة المجتمعي. يتمنى لكم فريق العمل فعالية ناجحة وملهمة!'
    });

    const formsConfig = await getJsonSetting('forms_config', {
      shareIdea: {
        active: true,
        notificationEmail: 'nur.beik1237@gmail.com',
        title: 'شارك فكرتــك مع مركز مــجرة المجتمعي',
        subtitle: 'هل لديك مهارة، أو فكرة لورشة، تدريب، محاضرة، نادي، جلسة حوارية، فعالية أو مبادرة يمكن أن تضيف قيمة لمجتمع مجرة؟'
      },
      workshopGen: {
        active: true,
        title: 'ورشة العمل والتدريب التفاعلي',
        maxSeats: 30
      }
    });

    const phoneRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_phone'`);
    const emailRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_email'`);
    const instaRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_instagram'`);
    const fbRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_facebook'`);
    const userRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_username'`);

    res.json({
      success: true,
      settings: {
        halls: hallsConfig,
        packages: packagesConfig,
        site: siteConfig,
        policies: policiesConfig,
        forms: formsConfig,
        adminUsername: userRow ? userRow.value : 'admin',
        adminPhone: phoneRow ? phoneRow.value : '+90 538 506 29 89',
        adminEmail: emailRow ? emailRow.value : 'nur.beik1237@gmail.com',
        adminInstagram: instaRow ? instaRow.value : 'https://www.instagram.com/majarracommunity/',
        adminFacebook: fbRow ? fbRow.value : ''
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/halls - Update hall capacities, names, descriptions, images, gear
exports.updateHallsConfig = async (req, res, next) => {
  try {
    const { halls } = req.body;
    if (!halls || typeof halls !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات القاعات غير صالحة' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('halls_config', ?)`, [JSON.stringify(halls)]);
    res.json({ success: true, message: 'تم حفظ وتحديث كافة إعدادات وصور وسعات القاعات بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/packages - Update Package prices, badges, and features
exports.updatePackagesConfig = async (req, res, next) => {
  try {
    const { packages } = req.body;
    if (!packages || typeof packages !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات الباقات غير صالحة' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('packages_config', ?)`, [JSON.stringify(packages)]);
    res.json({ success: true, message: 'تم حفظ وتحديث إعدادات وأسعار ومميزات الباقات بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/site-info - Update site name, tagline, logo, announcement
exports.updateSiteConfig = async (req, res, next) => {
  try {
    const site = req.body?.site || req.body;
    if (!site || typeof site !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات هوية الموقع غير صالحة' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('site_config', ?)`, [JSON.stringify(site)]);
    res.json({ success: true, message: 'تم حفظ وتحديث هوية ومعلومات شريط الإعلان في الموقع بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/policies - Update terms, policies, receipt notes
exports.updatePoliciesConfig = async (req, res, next) => {
  try {
    const policies = req.body?.policies || req.body;
    if (!policies || typeof policies !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات السياسات غير صالحة' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('policies_config', ?)`, [JSON.stringify(policies)]);
    res.json({ success: true, message: 'تم حفظ وتحديث شروط الاستخدام وسياسة الإلغاء وسندات الحجز بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/forms - Update dynamic forms & event survey configs
exports.updateFormsConfig = async (req, res, next) => {
  try {
    const forms = req.body?.forms || req.body;
    if (!forms || typeof forms !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات الاستمارات غير صالحة' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('forms_config', ?)`, [JSON.stringify(forms)]);
    res.json({ success: true, message: 'تم حفظ وتحديث إعدادات الاستمارات والفعاليات العامة بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/pins - Update Admin Username, Staff Password, & Master Super Admin PIN
exports.updatePins = async (req, res, next) => {
  try {
    const { adminUsername, staffPin, masterPin } = req.body;

    if (adminUsername) {
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_username', ?)`, [adminUsername.trim()]);
    }

    if (staffPin) {
      if (staffPin.length < 4) {
        return res.status(400).json({ success: false, message: 'كلمة سر الأدمن يجب أن لا تقل عن 4 أرقام/أحرف' });
      }
      const hash = bcrypt.hashSync(staffPin, 10);
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('staff_pin', ?)`, [hash]);
    }

    if (masterPin) {
      if (masterPin.length < 4) {
        return res.status(400).json({ success: false, message: 'رمز المدير العام يجب أن لا يقل عن 4 أرقام/أحرف' });
      }
      const hash = bcrypt.hashSync(masterPin, 10);
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('master_pin', ?)`, [hash]);
    }

    res.json({ success: true, message: 'تم حفظ وتحديث اسم المستخدم وكلمة السر لوحة التحكم في قاعدة البيانات بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/phone - Update Official WhatsApp Phone
exports.updatePhone = async (req, res, next) => {
  try {
    const { adminPhone } = req.body;
    if (!adminPhone) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_phone', ?)`, [adminPhone]);
    res.json({ success: true, message: 'تم حفظ وتحديث رقم الواتساب المعتمد بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/email - Update Official Center Email
exports.updateEmail = async (req, res, next) => {
  try {
    const { adminEmail } = req.body;
    if (!adminEmail || !adminEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'بريد إلكتروني غير صالح' });
    }
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_email', ?)`, [adminEmail]);
    res.json({ success: true, message: 'تم حفظ وتحديث البريد الإلكتروني المعتمد بنجاح' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/instagram - Update Official Instagram Link
exports.updateInstagram = async (req, res, next) => {
  try {
    const { adminInstagram, adminFacebook } = req.body;
    if (adminInstagram) {
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_instagram', ?)`, [adminInstagram]);
    }
    if (adminFacebook !== undefined) {
      await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_facebook', ?)`, [adminFacebook]);
    }
    res.json({ success: true, message: 'تم حفظ وتحديث حسابات ومواقع التواصل الاجتماعي بنجاح' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/settings/bio - Fetch all bio data for admin
exports.getBioAdminData = async (req, res, next) => {
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
    const links = await dbAll(`SELECT * FROM bio_links ORDER BY sortOrder ASC, id ASC`);
    const events = await dbAll(`SELECT * FROM bio_events ORDER BY sortOrder ASC, id ASC`);

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

// PUT /api/admin/settings/bio/profile - Update Bio Profile
exports.updateBioProfile = async (req, res, next) => {
  try {
    const { title, subtitle, bioDesc, locationTitle, locationDesc, videoTitle, videoUrl, instagramUrl, whatsappUrl, emailUrl } = req.body;
    const existing = await dbGet(`SELECT id FROM bio_profile LIMIT 1`);
    if (existing) {
      await dbRun(
        `UPDATE bio_profile SET title=?, subtitle=?, bioDesc=?, locationTitle=?, locationDesc=?, videoTitle=?, videoUrl=?, instagramUrl=?, whatsappUrl=?, emailUrl=? WHERE id=?`,
        [title, subtitle, bioDesc, locationTitle, locationDesc, videoTitle, videoUrl, instagramUrl, whatsappUrl, emailUrl, existing.id]
      );
    } else {
      await dbRun(
        `INSERT INTO bio_profile (title, subtitle, bioDesc, locationTitle, locationDesc, videoTitle, videoUrl, instagramUrl, whatsappUrl, emailUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, subtitle, bioDesc, locationTitle, locationDesc, videoTitle, videoUrl, instagramUrl, whatsappUrl, emailUrl]
      );
    }
    res.json({ success: true, message: 'تم تحديث معلومات ملف Bio بنجاح' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/settings/bio/links - Add Link
exports.addBioLink = async (req, res, next) => {
  try {
    const { title, url, icon, linkType, sortOrder, isActive } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, message: 'العنوان والرابط مطلوبان' });
    }
    const result = await dbRun(
      `INSERT INTO bio_links (title, url, icon, linkType, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, url, icon || 'fa-link', linkType || 'link', parseInt(sortOrder) || 0, isActive !== undefined ? (isActive ? 1 : 0) : 1]
    );
    res.json({ success: true, message: 'تمت إضافة الرابط بنجاح', id: result.id });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/bio/links/:id - Update Link
exports.updateBioLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url, icon, linkType, sortOrder, isActive } = req.body;
    await dbRun(
      `UPDATE bio_links SET 
        title = COALESCE(?, title),
        url = COALESCE(?, url),
        icon = COALESCE(?, icon),
        linkType = COALESCE(?, linkType),
        sortOrder = COALESCE(?, sortOrder),
        isActive = COALESCE(?, isActive)
       WHERE id = ?`,
      [
        title !== undefined ? title : null,
        url !== undefined ? url : null,
        icon !== undefined ? icon : null,
        linkType !== undefined ? linkType : null,
        sortOrder !== undefined ? (parseInt(sortOrder) || 0) : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        id
      ]
    );
    res.json({ success: true, message: 'تم تحديث الرابط بنجاح' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/settings/bio/links/:id - Delete Link & Linked Form/Event
exports.deleteBioLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const targetId = isNaN(numId) ? id : numId;

    const link = await dbGet(`SELECT * FROM bio_links WHERE id=? OR id=?`, [id, targetId]);
    await dbRun(`DELETE FROM bio_links WHERE id=? OR id=?`, [id, targetId]);

    if (link && link.url && link.url.includes('/e/')) {
      const parts = link.url.split('/e/');
      const slug = parts[parts.length - 1].trim();
      if (slug) {
        const slugNum = parseInt(slug, 10);
        const targetSlug = isNaN(slugNum) ? slug : slugNum;
        await dbRun(`DELETE FROM event_registrations WHERE event_id = ? OR event_id = ?`, [slug, targetSlug]);
        await dbRun(`DELETE FROM events WHERE id = ? OR id = ? OR slug = ?`, [slug, targetSlug, slug]);
        await dbRun(`DELETE FROM responses WHERE form_id = ? OR form_id = ?`, [slug, targetSlug]);
        await dbRun(`DELETE FROM forms WHERE id = ? OR id = ? OR slug = ?`, [slug, targetSlug, slug]);
      }
    }

    res.json({ success: true, message: 'تم حذف الرابط والاستمارة المرتبطة به بنجاح 🗑️' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/settings/bio/events - Add Weekly Event
exports.addBioEvent = async (req, res, next) => {
  try {
    const { title, eventType, eventDate, eventTime, hallName, registrationUrl, sortOrder, isActive } = req.body;
    const finalTitle = title ? String(title).trim() : 'فعالية جديدة';
    const finalType = eventType ? String(eventType).trim() : '🎓 ورشة عمل تخصصية';
    const finalDate = eventDate ? String(eventDate).trim() : 'الآن';
    const finalTime = eventTime ? String(eventTime).trim() : 'طوال اليوم';
    const finalHall = hallName ? String(hallName).trim() : 'قاعة أفــُـق';
    const finalRegUrl = registrationUrl ? String(registrationUrl).trim() : '#';
    const finalSort = parseInt(sortOrder) || 1;
    const finalActive = isActive !== undefined ? (isActive ? 1 : 0) : 1;

    const result = await dbRun(
      `INSERT INTO bio_events (title, eventType, eventDate, eventTime, hallName, registrationUrl, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalTitle, finalType, finalDate, finalTime, finalHall, finalRegUrl, finalSort, finalActive]
    );
    res.json({ success: true, message: 'تمت إضافة الفعالية بنجاح', id: result.id });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/settings/bio/events/:id - Update Weekly Event
exports.updateBioEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const targetId = isNaN(numId) ? id : numId;

    const { title, eventType, eventDate, eventTime, hallName, registrationUrl, sortOrder, isActive } = req.body;
    const finalTitle = title ? String(title).trim() : 'فعالية جديدة';
    const finalType = eventType ? String(eventType).trim() : '🎓 ورشة عمل تخصصية';
    const finalDate = eventDate ? String(eventDate).trim() : 'الآن';
    const finalTime = eventTime ? String(eventTime).trim() : 'حسب التنسيق';
    const finalHall = hallName ? String(hallName).trim() : 'قاعة أفــُـق';
    const finalRegUrl = registrationUrl ? String(registrationUrl).trim() : '#';
    const finalSort = parseInt(sortOrder) || 1;
    const finalActive = isActive !== undefined ? (isActive ? 1 : 0) : 1;

    await dbRun(
      `UPDATE bio_events SET title=?, eventType=?, eventDate=?, eventTime=?, hallName=?, registrationUrl=?, sortOrder=?, isActive=? WHERE id=? OR id=?`,
      [finalTitle, finalType, finalDate, finalTime, finalHall, finalRegUrl, finalSort, finalActive, id, targetId]
    );
    res.json({ success: true, message: 'تم تحديث بيانات الفعالية بنجاح' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/settings/bio/events/:id - Delete Weekly Event
exports.deleteBioEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const targetId = isNaN(numId) ? id : numId;
    await dbRun(`DELETE FROM bio_events WHERE id=? OR id=?`, [id, targetId]);
    res.json({ success: true, message: 'تم حذف الفعالية بنجاح' });
  } catch (err) {
    next(err);
  }
};

// --- SITE BACKUP & ZIP PACKAGE ENGINE ---
const { exec } = require('child_process');

const bundleProjectZip = () => {
  return new Promise((resolve, reject) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const zipPath = path.join(uploadsDir, 'majarra-site-latest.zip');
    const projectRoot = path.join(__dirname, '..');
    const cmd = `zip -r -q "${zipPath}" index.html admin.html book.html bio.html builder.html app.js styles.css server.js majarra.db assets routes controllers middleware config services views package.json`;

    exec(cmd, { cwd: projectRoot }, (err, stdout, stderr) => {
      if (err) return reject(err);

      // Async sync to Desktop folder and Desktop zip file
      const desktopFolder = '/Users/macbook/Desktop/موقع مجرة 07';
      const desktopZip = '/Users/macbook/Desktop/موقع_مجرة_الكامل.zip';
      const syncCmd = `rsync -a --exclude 'node_modules' --exclude '.git' "${projectRoot}/" "${desktopFolder}/" && cd "${desktopFolder}" && zip -r -q "${desktopZip}" . -x "*.git*" "node_modules/*" "*.DS_Store"`;
      exec(syncCmd, () => {});

      resolve(zipPath);
    });
  });
};

exports.bundleProjectZip = bundleProjectZip;

// GET /api/admin/settings/backup/info
exports.getBackupInfo = async (req, res, next) => {
  try {
    const zipPath = path.join(__dirname, '../uploads/majarra-site-latest.zip');
    if (!fs.existsSync(zipPath)) {
      await bundleProjectZip();
    }
    const stats = fs.statSync(zipPath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      filename: 'majarra-site-latest.zip',
      fileSize: `${fileSizeMb} MB`,
      fileSizeBytes: stats.size,
      lastModified: stats.mtime,
      downloadUrl: '/api/admin/settings/backup/download'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/settings/backup/generate
exports.generateBackupZip = async (req, res, next) => {
  try {
    const zipPath = await bundleProjectZip();
    const stats = fs.statSync(zipPath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      message: 'تم تحديث وحزم ملف الموقع الكامل (ZIP) بنجاح!',
      filename: 'majarra-site-latest.zip',
      fileSize: `${fileSizeMb} MB`,
      lastModified: stats.mtime,
      downloadUrl: '/api/admin/settings/backup/download'
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/settings/backup/download
exports.downloadBackupZip = async (req, res, next) => {
  try {
    const zipPath = path.join(__dirname, '../uploads/majarra-site-latest.zip');
    if (!fs.existsSync(zipPath)) {
      await bundleProjectZip();
    }
    res.download(zipPath, 'majarra-site-latest.zip', (err) => {
      if (err && !res.headersSent) {
        res.status(500).send('خطأ أثناء تحميل الملف');
      }
    });
  } catch (err) {
    next(err);
  }
};


