/* ==========================================================================
   MAJARRA COMMUNITY CENTER - PROFESSIONAL DATABASE MODULE (SQLite3 Async)
   - Async Promises Wrappers (dbQuery, dbGet, dbRun)
   - Automatic Table Schema Initialization & Indexes
   - Bookings, Admin Users, Settings, & Attachments Support
   - Pre-populated Demo Seeders & Superadmin User (admin@majarra.org)
   ========================================================================== */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'majarra.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to Majarra SQLite Database successfully.');
  }
});

// Promisified Helpers for Clean async/await Architecture
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize Database Schemas and Seeders
async function initDatabase() {
  try {
    // 1. Bookings Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        organizerName TEXT NOT NULL,
        whatsappNumber TEXT NOT NULL,
        email TEXT NOT NULL,
        entityType TEXT NOT NULL,
        executorName TEXT NOT NULL,
        eventType TEXT NOT NULL,
        hallName TEXT NOT NULL,
        eventTitle TEXT NOT NULL,
        eventDescription TEXT,
        attendeesCount INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        instagramLink TEXT,
        facebookLink TEXT,
        linkedinLink TEXT,
        equipment TEXT,
        extraEquipmentNeeds TEXT,
        isSponsored TEXT DEFAULT 'لا',
        isPaidEvent TEXT DEFAULT 'لا',
        packageType TEXT DEFAULT 'كفو',
        additionalService TEXT DEFAULT 'بدون خدمات إضافية',
        feeAmount TEXT DEFAULT '0 TL (نشاط مجاني)',
        attachmentUrl TEXT,
        status TEXT DEFAULT 'pending',
        adminNotes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration safety for missing columns in existing DB files
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN instagramLink TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN facebookLink TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN linkedinLink TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN equipment TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN extraEquipmentNeeds TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN isSponsored TEXT DEFAULT 'لا'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN isPaidEvent TEXT DEFAULT 'لا'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN packageType TEXT DEFAULT 'كفو'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN additionalService TEXT DEFAULT 'بدون خدمات إضافية'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN feeAmount TEXT DEFAULT '0 TL (نشاط مجاني)'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN attachmentUrl TEXT`); } catch(e){}
    try { await dbRun(`ALTER TABLE bookings ADD COLUMN adminNotes TEXT`); } catch(e){}

    // Create Indexes for Super Fast Calendar & Filter Performance
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(startDate)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_bookings_hall ON bookings(hallName)`);

    // 2. Admin Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Auto-seed Default Superadmin User
    const defaultEmail = 'nur.beik1237@gmail.com';
    const userRow = await dbGet(`SELECT id FROM admin_users WHERE email = ? OR email = 'admin@majarra.org'`, [defaultEmail]);
    if (!userRow) {
      const hashedPassword = bcrypt.hashSync('Admin@2026', 10);
      await dbRun(
        `INSERT INTO admin_users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['مدير النظام', defaultEmail, hashedPassword, 'superadmin']
      );
      console.log('👑 Default superadmin user created (nur.beik1237@gmail.com / Admin@2026)');
    } else {
      await dbRun(`UPDATE admin_users SET email = ? WHERE id = ? OR email = 'admin@majarra.org'`, [defaultEmail, userRow.id]);
      console.log('👑 Updated superadmin user email to nur.beik1237@gmail.com');
    }

    // 3. Settings Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Seed Default Passwords and Phone if Not Exists
    const staffPinHash = bcrypt.hashSync('1234', 10);
    const masterPinHash = bcrypt.hashSync('1234', 10);

    await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('staff_pin', ?)`, [staffPinHash]);
    await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('master_pin', ?)`, [masterPinHash]);
    await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_phone', '+90 538 506 29 89')`);

    // Bio Hub Profile & Links Tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS bio_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT DEFAULT 'مركز مجرّة المجتمعي',
        subtitle TEXT DEFAULT 'Majarra Community Center',
        bioDesc TEXT DEFAULT 'مساحتك الملهِمة في إسطنبول لإقامة ورش العمل، المبادرات الشبابية، الاجتماعات، والفعاليات الثقافية والتعليمية 🚀',
        locationTitle TEXT DEFAULT 'موقع مركز مجرة المجتمعي',
        locationDesc TEXT DEFAULT '__ osmanlı iş merkez __ غازي مختار باشا أمام محطة الترام',
        videoTitle TEXT DEFAULT 'From Idea to Reality | رحلة تحضير مركز مجرّة',
        videoUrl TEXT DEFAULT 'https://www.youtube.com/embed/t0th_3N5yIw',
        instagramUrl TEXT DEFAULT 'https://www.instagram.com/majarracommunity/',
        whatsappUrl TEXT DEFAULT 'https://wa.me/905385062989',
        emailUrl TEXT DEFAULT 'mailto:nur.beik1237@gmail.com'
      )
    `);

    try { await dbRun(`ALTER TABLE bio_profile ADD COLUMN instagramUrl TEXT DEFAULT 'https://www.instagram.com/majarracommunity/'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bio_profile ADD COLUMN whatsappUrl TEXT DEFAULT 'https://wa.me/905385062989'`); } catch(e){}
    try { await dbRun(`ALTER TABLE bio_profile ADD COLUMN emailUrl TEXT DEFAULT 'mailto:nur.beik1237@gmail.com'`); } catch(e){}

    const bioProfileCount = await dbGet(`SELECT COUNT(*) as count FROM bio_profile`);
    if (!bioProfileCount || bioProfileCount.count === 0) {
      await dbRun(`INSERT INTO bio_profile (title, subtitle, locationTitle, locationDesc, videoTitle, videoUrl, instagramUrl, whatsappUrl, emailUrl) VALUES ('مركز مجرّة المجتمعي', 'Majarra Community Center', 'موقع مركز مجرة المجتمعي', '__ osmanlı iş merkez __ غازي مختار باشا أمام محطة الترام', 'From Idea to Reality | رحلة تحضير مركز مجرّة', 'https://www.youtube.com/embed/t0th_3N5yIw', 'https://www.instagram.com/majarracommunity/', 'https://wa.me/905385062989', 'mailto:nur.beik1237@gmail.com')`);
    }

    await dbRun(`
      CREATE TABLE IF NOT EXISTS bio_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT DEFAULT 'fa-link',
        linkType TEXT DEFAULT 'link',
        sortOrder INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1
      )
    `);

    const bioLinksCount = await dbGet(`SELECT COUNT(*) as count FROM bio_links`);
    if (!bioLinksCount || bioLinksCount.count === 0) {
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('الموقع على الخريطة', 'https://www.google.com/maps/place/Majarra+Community+-+%D9%85%D8%B1%D9%83%D8%B2+%D9%85%D8%AC%D8%B1%D9%91%D8%A9%E2%80%AD/@37.0678503,37.3742895,17z/data=!3m1!4b1!4m6!3m5!1s0x1531e142eed4ad23:0x15a7470cf46658c6!8m2!3d37.0678503!4d37.3742895!16s%2Fg%2F11nbvg75kp', 'fa-map-location-dot', 'link', 1)`);
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('استمارة الانتساب الى مجتمع مجرة', '#form-membership', 'fa-user-plus', 'link', 2)`);
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('شارك فكرتك مع مركز مجرة', '#form-idea', 'fa-lightbulb', 'link', 3)`);
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('استمارة التسجيل في نادي روئية', '#form-ruya', 'fa-graduation-cap', 'link', 4)`);
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('استمارة حجز القاعات في مركز مجرة 🏛️', 'index.html', 'fa-calendar-check', 'link', 5)`);
    }

    await dbRun(`
      CREATE TABLE IF NOT EXISTS bio_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        eventType TEXT DEFAULT '🎓 ورشة عمل تخصصية',
        eventDate TEXT NOT NULL,
        eventTime TEXT NOT NULL,
        hallName TEXT DEFAULT 'قاعة أفــُـق',
        registrationUrl TEXT DEFAULT '#',
        sortOrder INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1
      )
    `);

    const bioEventsCount = await dbGet(`SELECT COUNT(*) as count FROM bio_events`);
    if (!bioEventsCount || bioEventsCount.count === 0) {
      await dbRun(`INSERT INTO bio_events (title, eventType, eventDate, eventTime, hallName, registrationUrl, sortOrder) VALUES ('ورشة مهارات العرض والإلقاء والتحدث الجماهيري', '🎓 ورشة عمل تخصصية', 'الخميس 10 سبتمبر', '10:00 ص - 01:00 ظ', 'قاعة أفــُـق', 'https://forms.google.com/example1', 1)`);
      await dbRun(`INSERT INTO bio_events (title, eventType, eventDate, eventTime, hallName, registrationUrl, sortOrder) VALUES ('ملتقى ريادة الأعمال والشركات الناشئة الشبابية', '💼 ملتقى مجتمعي', 'السبت 12 سبتمبر', '04:00 م - 07:00 م', 'قاعة ديـــوان', 'https://forms.google.com/example2', 2)`);
    }

    // 4. Dynamic Event Registration Engine Tables (Dynamic Form Builder)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        banner_url TEXT,
        max_capacity INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        custom_fields TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        answers_json TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    try {
      await dbRun(`ALTER TABLE events ADD COLUMN banner_url TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE events ADD COLUMN custom_fields TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE events ADD COLUMN max_capacity INTEGER DEFAULT 0`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE events ADD COLUMN is_active INTEGER DEFAULT 1`);
    } catch(e) {}

    try {
      await dbRun(`ALTER TABLE bookings ADD COLUMN reminder_sent INTEGER DEFAULT 0`);
    } catch(e) {}

    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN status TEXT DEFAULT 'pending'`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN event_id INTEGER`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN name TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN fullName TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN answers_json TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN customAnswers TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN event_title TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN eventId TEXT`);
    } catch(e) {}
    try {
      await dbRun(`ALTER TABLE event_registrations ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    } catch(e) {}

    await dbRun(`CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug)`);
    try {
      await dbRun(`CREATE INDEX IF NOT EXISTS idx_event_reg_event_id ON event_registrations(event_id)`);
    } catch(e) {}

    // Seed Demo Events if empty
    const eventsCount = await dbGet(`SELECT COUNT(*) as count FROM events`);
    if (!eventsCount || eventsCount.count === 0) {
      await dbRun(`
        INSERT INTO events (slug, title, description, banner_url, max_capacity, is_active, custom_fields)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'rawya-club',
        'نادي قراءة وصناعة الأفكار - نادي راوية 📚',
        'جلسة نقاشية وتفاعلية أسبوعية تهدف لإثراء الفكر وصقل مهارات التحليل والنقد الأدبي والمجتمعي في مركز مجرّة.',
        'assets/workshop.jpg',
        25,
        1,
        JSON.stringify([
          { id: 'q1', label: 'ما هو كتابك المفضل الذي ترغب بمناقشته؟', type: 'text', required: false, placeholder: 'اكتب اسم الكتاب...' },
          { id: 'q2', label: 'هل حضرت جلسات نادٍ سابقة؟', type: 'select', options: ['نعم، أحضر باستمرار', 'أول مرة أصحبكم'], required: true }
        ])
      ]);

      await dbRun(`
        INSERT INTO events (slug, title, description, banner_url, max_capacity, is_active, custom_fields)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'creative-workshop',
        'ورشة التفكير الإبداعي وإنتاج المحتوى الرقمي 🎨',
        'ورشة عمل مكثفة مخصصة للشباب والمبدعين لتطوير الأفكار وصناعة المحتوى المرئي والبصري المؤثر.',
        'assets/grand.jpg',
        18,
        1,
        JSON.stringify([
          { id: 'q1', label: 'ما هي اهتماماتك الرئيسية في مجال المحتوى؟', type: 'text', required: true, placeholder: 'التصميم، الكتابة، المونتاج...' }
        ])
      ]);
      console.log('🌱 Seeded initial dynamic events into SQLite database.');
    }

    // 5. Forms Table (User Code Compatibility)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        badge_text TEXT DEFAULT 'فعالية مجتمعية',
        questions_json TEXT NOT NULL,
        max_responses INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Responses Table (User Code Compatibility)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        answers_json TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
      )
    `);

    // Auto seed Ruya Club form if missing
    try {
      const seedRuyaClub = require('../services/seed_ruya_club');
      await seedRuyaClub();
    } catch(e) {
      console.error('Error auto-seeding Ruya club form:', e.message);
    }

    // Seed default forms if missing
    const communityForm = await dbGet(`SELECT id FROM forms WHERE slug = 'majarra-community'`);
    if (!communityForm) {
      const communityTitle = 'استمارة الانتساب إلى مجتمع مجرّة';
      const communityDesc = `مرحباً بكم في استمارة الانتساب إلى مجتمع مجرّة.

يأتي إطلاق مجتمع مجرّة انطلاقاً من إيمان مركز مجرّة بأن دوره لا يقتصر على تقديم الأنشطة أو إتاحة المساحات، بل يشمل بناء مجتمع شبابي يشعر أفراده بالانتماء إلى المركز، ويساهمون في تطويره وصناعة أثر مجتمعي إيجابي من خلال المشاركة والتعاون والعمل المشترك.

يمثل مجتمع مجرّة الإطار المجتمعي الذي يجمع الشباب المنتسبين إلى المركز، ويمنحهم مساحة لاقتراح الأفكار، وإطلاق المبادرات، والمشاركة في تطوير البرامج والأنشطة، والانضمام إلى فرق العمل واللقاءات المجتمعية.

ويشكّل الأعضاء الفاعلون في مجتمع مجرّة الهيئة العامة للمجتمع، التي تساهم في تحديد احتياجات المجتمع وتوجهاته، وتنتخب خمسة أعضاء من اللجنة التشغيلية وفق الشروط والآلية المعتمدة. كما يحق للأعضاء المستوفين لشروط الترشح التقدم لعضوية المقاعد المنتخبة في اللجنة التشغيلية.

لا تُعد الهيئة العامة أو مجتمع مجرّة جهة مسؤولة عن الإدارة اليومية للمركز، إذ تتولى اللجنة التشغيلية مسؤولية التخطيط والتنفيذ والإشراف على التشغيل، واتخاذ القرارات التنظيمية وفق الإطار العام لإدارة المركز. ويقوم دور المجتمع على المشاركة، ونقل الاحتياجات، واقتراح الأفكار، ومساءلة اللجنة ضمن الآليات المعتمدة، وتعزيز الملكية المجتمعية للمركز.

ويؤمن مجتمع مجرّة بأن المركز مساحة مجتمعية مشتركة، وأن اللجنة التشغيلية موجودة لخدمة المجتمع وتطوير المركز، بما يحافظ على استقلاليته وقيمه واستدامته.

📌 من يمكنه الانتساب؟
يحق لأي شاب أو شابة ضمن الفئة العمرية المعتمدة التقدم بطلب الانتساب إلى مجتمع مجرّة، شريطة:
• الإيمان برؤية المركز وقيمه والالتزام بها.
• تعبئة استمارة الانتساب بشكل كامل وصحيح.
• حضور الجلسة التعريفية قبل تفعيل العضوية.
• الالتزام بمدونة السلوك وسياسات السلامة والحماية الخاصة بالمركز.
• احترام جميع أعضاء المجتمع وعدم ممارسة أي شكل من أشكال التمييز أو الإساءة أو التحرش.
• الالتزام بالمشاركة الإيجابية وعدم استخدام المجتمع أو المركز لأغراض سياسية، حزبية، دعائية أو تمييزية.
• المحافظة على ممتلكات المركز ومساحاته واستخدامها بمسؤولية.
• الإقامة في غازي عنتاب.
* لا يشترط وجود خبرة تطوعية سابقة أو الانتماء إلى أي جهة، وإنما تكفي الرغبة الجادة في المشاركة والمساهمة والالتزام بقيم مجتمع مجرّة.

👥 مشاركة الفرق الشبابية والتطوعية:
يمكن للفرق الشبابية والتطوعية غير الربحية التقدم بطلب للتسجيل كفرق مشاركة في مركز مجرّة، شريطة:
• أن يكون الفريق تطوعياً أو شبابياً وغير ربحي.
• توافق أهدافه وأنشطته مع رؤية المركز وقيمه.
• التزامه بسياسات الاستخدام والحجز والسلامة والحماية ومدونة السلوك.
• عدم استخدام اسم المركز أو تمثيله دون موافقة مسبقة.
• احترام استقلالية بقية الفرق والأعضاء.
• عدم احتكار المساحات أو القرارات أو الادعاء بتمثيل مجتمع مجرّة بشكل منفرد.
• تعيين نقطة تواصل واضحة مع اللجنة التشغيلية.
• التعاون مع بقية الفرق والأعضاء في الأنشطة والمبادرات المشتركة.
* تُسجَّل عضوية الأفراد في مجتمع مجرّة بصفتهم الفردية، حتى في حال انتمائهم إلى فريق تطوعي. ويمكن للفرق ترشيح أحد أعضائها للمقاعد المنتخبة في اللجنة التشغيلية، على أن يكون المرشح عضواً فاعلاً في مجتمع مجرّة ومستوفياً لشروط الترشح.

🚀 كيف يمكن للأعضاء المشاركة؟
يستطيع كل عضو اختيار مستوى مشاركته بما يتناسب مع اهتماماته وقدراته، من خلال:
• اقتراح الأفكار والبرامج.
• إطلاق المبادرات الشبابية.
• المساهمة في تصميم الأنشطة وتنفيذها.
• الانضمام إلى فرق العمل.
• المشاركة في اللقاءات المجتمعية.
• نقل احتياجات المجتمع ومقترحاته إلى اللجنة التشغيلية.
• استقبال الأعضاء الجدد وتعزيز روح الانتماء.
• المشاركة في انتخاب الأعضاء الخمسة المنتخبين في اللجنة التشغيلية.
• الترشح للمقاعد المنتخبة عند استيفاء الشروط المعتمدة.

نشكركم على اهتمامكم بالانضمام إلى مجتمع مجرّة، ونتطلع إلى بناء مجتمع شبابي يقوم على المشاركة والانتماء والمسؤولية والعمل المشترك وصناعة الأثر.

تنويه أخير: إن تعبئة هذه الاستمارة تعني التقدم بطلب انتساب، وسيتم مراجعة الطلب واستكمال إجراءات العضوية وفق الآلية المعتمدة.`;

      const communityQuestions = [
        { label: "عنوان البريد الالكتروني", type: "text", required: true, options: [] },
        { label: "الاسم والكنية (بالعربي)", type: "text", required: true, options: [] },
        { label: "الاسم والكنية (بالإنجليزية)", type: "text", required: true, options: [] },
        { label: "رقم الهاتف", type: "text", required: true, options: [] },
        { label: "تاريخ الميلاد", type: "date", required: true, options: [] },
        { label: "الجنسية", type: "radio", required: true, options: ["سورية", "تركية", "سورية - تركية", "مصرية", "عراقية", "فلسطينية", "اردنية", "يمنية", "أخرى:"] },
        { label: "الجنس", type: "radio", required: true, options: ["ذكر", "انثى"] },
        { label: "مكان الاقامة", type: "radio", required: true, options: ["غازي عنتاب", "أخرى:"] },
        { label: "المهنة أو التخصص الدراسي", type: "text", required: true, options: [] },
        { label: "أتقدم للانضمام إلى مجتمع مجرة بصفتي", type: "radio", required: true, options: ["فرد مستقل", "عضو في فريق تطوعي"] },
        { label: "إذا كنت عضواً أو ممثلاً عن فريق تطوعي، فما اسم الفريق الذي تنتمي إليه؟", type: "text", required: false, options: [] },
        { label: "إذا كنت ممثلاً عن فريق، يرجى كتابة نبذة مختصرة عن الفريق", type: "textarea", required: false, options: [] },
        { label: "كيف تعرفت على مجتمع مجرة؟", type: "radio", required: true, options: ["أحد الأصدقاء.", "وسائل التواصل الاجتماعي.", "شاركت سابقًا في أنشطة المركز.", "من خلال فريق تطوعي.", "أخرى:"] },
        { label: "ما الذي دفعك للانضمام إلى مجتمع مجرة؟", type: "textarea", required: true, options: [] },
        { label: "في أي المجالات ترغب بالمشاركة داخل مجتمع مجرة؟ (يمكن اختيار أكثر من خيار)", type: "checkbox", required: true, options: ["الترشح الى اللجنة التشغيلية للمركز.", "تصميم البرامج والأنشطة.", "المبادرات الشبابية.", "فرق العمل.", "تطوير المركز.", "المشاركة في صناعة القرار المجتمعي.", "بناء المجتمع واستقبال الأعضاء الجدد.", "أخرى:"] },
        { label: "إذا اخترت \"فرق العمل\"، فما المجالات التي تود المشاركة فيها؟", type: "checkbox", required: false, options: ["فريق الأنشطة والبرامج", "فريق التواصل المجتمعي و الإعلام", "فريق المتابعة والتقييم", "فريق التحريك المجتمعي وضمان الاستدامة", "فريق الدعم الميداني والتطوير"] },
        { label: "هل لديك فكرة لمبادرة مجتمعية ترغب بتقديمها مستقبلاً؟", type: "radio", required: true, options: ["نعم", "ليس حالياً"] },
        { label: "إذا كانت الإجابة نعم يرجى كتابة نبذة مختصرة عن الفكرة.", type: "textarea", required: false, options: [] },
        { label: "الإقرار والالتزام: أقر بأنني اطلعت على وصف مجتمع مجرة، وآلية الانتساب، وشروط العضوية، وأفهمها وأوافق عليها.", type: "radio", required: true, options: ["موافق"] },
        { label: "أقر بأنني مستوفٍ لشروط الانتساب إلى مجتمع مجرة.", type: "radio", required: true, options: ["موافق"] },
        { label: "أقر بأن تفعيل العضوية يتم بعد حضور جلسة التعارف.", type: "radio", required: true, options: ["موافق"] },
        { label: "أتعهد بالمشاركة الإيجابية واحترام جميع أعضاء المجتمع.", type: "radio", required: true, options: ["موافق"] },
        { label: "هل لديك أي ملاحظات أو معلومات إضافية تود مشاركتها؟", type: "textarea", required: false, options: [] }
      ];

      const badge = 'مجتمع مجرّة • غازي عنتاب';
      const qJson = JSON.stringify(communityQuestions);

      await dbRun(`
        INSERT OR REPLACE INTO forms (slug, title, description, badge_text, questions_json, max_responses, is_active)
        VALUES ('majarra-community', ?, ?, ?, ?, 0, 1)
      `, [communityTitle, communityDesc, badge, qJson]);
      console.log('🌱 Seeded official Majarra Community Membership form into SQLite database.');
    }

    const ideaForm = await dbGet(`SELECT id FROM forms WHERE slug = 'share-your-idea'`);
    if (!ideaForm) {
      const ideaTitle = 'شارك فكرتــك مع مركز مــجرة المجتمعي';
      const ideaDesc = `هل لديك مهارة، أو فكرة لورشة، تدريب، محاضرة، نادي، جلسة حوارية، فعالية أو مبادرة يمكن أن تضيف قيمة لمجتمع مجرة؟

يسعدنا استقبال أفكارك ومقترحاتك. سيقوم فريق مجرة بمراجعة جميع الطلبات، وفي حال كانت الفكرة مناسبة لبرامجنا وااحتياجاتنا، سنتواصل معك لاستكمال التنسيق.`;

      const ideaQuestions = [
        { label: "عنوان البريد الالكتروني", type: "text", required: true, options: [] },
        { label: "الاسم والكنية (بالعربي)", type: "text", required: true, options: [] },
        { label: "Full Name (English)", type: "text", required: true, options: [] },
        { label: "رقم الهاتف", type: "text", required: true, options: [] },
        { label: "تاريخ الميلاد", type: "date", required: true, options: [] },
        { label: "الجنسية", type: "radio", required: true, options: ["سورية", "تركية", "سورية - تركية", "مصرية", "عراقية", "فلسطينية", "اردنية", "يمنية", "أخرى:"] },
        { label: "الجنس", type: "radio", required: true, options: ["ذكر", "انثى"] },
        { label: "مكان الاقامة", type: "radio", required: true, options: ["غازي عنتاب", "مرسين", "حلب", "دمشق", "أخرى:"] },
        { label: "ما الذي ترغب بتقديمه؟", type: "checkbox", required: true, options: ["ورشة", "تدريب", "محاضرة", "جلسة حوارية", "نادي", "فعالية", "مبادرة", "أخرى:"] },
        { label: "ضمن أي مجال تندرج فكرتك؟", type: "checkbox", required: true, options: ["التطوير الشخصي", "الصحة النفسية", "التقنية", "ريادة الأعمال", "الثقافة والأدب", "الفنون", "اللغات", "القيادة والعمل التطوعي", "الأنشطة المجتمعية", "أخرى:"] },
        { label: "عنوان الفكرة", type: "text", required: true, options: [] },
        { label: "صف فكرتك باختصار.", type: "textarea", required: true, options: [] },
        { label: "ما الهدف من هذه الفكرة؟ وما الأثر الذي تتوقع أن تحققه؟", type: "textarea", required: true, options: [] },
        { label: "من هي الفئة المستهدفة؟", type: "checkbox", required: true, options: ["الشباب", "الأطفال", "النساء", "اليافعون / المراهقون", "طلاب الجامعات", "المتطوعون", "العاملون في المجتمع المدني", "أفراد المجتمع", "المدربون / الميسرون", "رواد الأعمال", "الأشخاص ذوو الإعاقة", "اللاجئون / المهاجرون", "أخرى:"] },
        { label: "الفئة العمرية المستهدفة", type: "checkbox", required: true, options: ["اصغر من 12", "12–17", "18–24", "25–35", "36–50", "50+", "ليس هناك عمر محدد"] },
        { label: "ما المدة المتوقعة لتنفيذ النشاط؟", type: "text", required: true, options: [] },
        { label: "هل سبق أن قدمت هذا النشاط أو نشاطًا مشابهًا؟ إذا نعم، اذكر أين ومتى.", type: "textarea", required: true, options: [] },
        { label: "حدثنا عن خبرتك أو مؤهلاتك المرتبطة بهذا المجال.", type: "textarea", required: true, options: [] },
        { label: "هل لديك ملفات أو عروض أو مواد تدعم فكرتك؟ (يمكنك تحميل ملف واحد متوافق. الحد الأقصى لحجم الملف: 10 MB)", type: "file", required: false, options: [] },
        { label: "هل أنت مستعد لتنفيذ هذه الفكرة في حال تم اعتمادها؟", type: "radio", required: true, options: ["نعم", "لا"] },
        { label: "ما نوع الدعم الذي تحتاجه من مجرة؟", type: "checkbox", required: true, options: ["دعم إعلامي (يشمل التغطية، التصميم، وصناعة المحتوى)", "توفير مساحة لتنفيذ النشاط", "دعم لوجستي", "توفير معدات وتجهيزات", "دعم في التنظيم والتنسيق", "استشارات وتطوير الفكرة", "أخرى:"] },
        { label: "هل لديك وقت أو فترة مفضلة لتنفيذ النشاط؟", type: "checkbox", required: true, options: ["أيام الأسبوع", "عطلة نهاية الأسبوع", "الفترة الصباحية", "الفترة الظهيرة", "الفترة المسائية", "لا يوجد وقت محدد", "أخرى:"] },
        { label: "كيف سمعت عن مجرة؟", type: "radio", required: true, options: ["انستغرام", "مجموعات واتس آب آخرى", "فيسبوك", "تويتر", "لينكدان", "من صديق", "أخرى:"] },
        { label: "هل لديك أي ملاحظات أو معلومات إضافية تود مشاركتها؟", type: "textarea", required: false, options: [] }
      ];

      const badge = 'استمارة الأفكار والمبادرات • مركز مجرّة';
      const qJson = JSON.stringify(ideaQuestions);

      await dbRun(`
        INSERT OR REPLACE INTO forms (slug, title, description, badge_text, questions_json, max_responses, is_active)
        VALUES ('share-your-idea', ?, ?, ?, ?, 0, 1)
      `, [ideaTitle, ideaDesc, badge, qJson]);
      console.log('💡 Seeded "Share Your Idea" form into SQLite database.');
    }


    // Seed Hall Configs in Database
    const defaultHalls = {
      ofoq: { name: 'قاعة أفــُـق', cap: 20, hourlyRate: 150, status: 'active', desc: 'مساحة مريحة ومجهزة بالكامل مناسبة للورش التدريبية والجلسات التفاعلية والأنشطة الشبابية.', image: 'assets/workshop.jpg' },
      diwan: { name: 'قاعة ديـــوان', cap: 30, hourlyRate: 250, status: 'active', desc: 'قاعة واسعة وأنيقة مخصصة للندوات، المحاضرات، والأنشطة الثقافية والمجتمعية الكبرى.', image: 'assets/grand.jpg' },
      sadeem: { name: 'قاعة ســديم', cap: 18, hourlyRate: 150, status: 'active', desc: 'قاعة اجتماعات مغلقة وهادئة مخصصة لاجتماعات فرق العمل والجلسات الاستشارية وتصوير المحتوى.', image: 'assets/meeting.jpg' }
    };
    await dbRun(`INSERT OR REPLACE INTO settings (key, value) VALUES ('halls_config', ?)`, [JSON.stringify(defaultHalls)]);

    // Check if bookings table is empty, if so populate initial demo seeders
    const countRow = await dbGet(`SELECT COUNT(*) as count FROM bookings`);
    if (countRow && countRow.count === 0) {
      await seedDemoBookings();
    }
  } catch (err) {
    console.error('❌ Error initializing database schemas:', err.message);
  }
}

async function seedDemoBookings() {
  const seedList = [
    {
      id: 'MJR-1001',
      organizerName: 'مجد العلي',
      whatsappNumber: '+905385062989',
      email: 'majd@example.com',
      entityType: 'منظمة غير ربحية',
      executorName: 'مبادرة مسار الإبداعية',
      eventType: 'ورشة عمل',
      hallName: 'قاعة أفــُـق (سعة القاعة 20)',
      eventTitle: 'تدريب صناعة المحتوى البصري والتصميم الرقمي',
      eventDescription: 'ورشة عمل تفاعلية تهدف لتمكين الشباب في إنتاج المحتوى المرئي وصناعة الأفكار.',
      attendeesCount: 18,
      startDate: '2026-09-02',
      endDate: '2026-09-02',
      startTime: '09:00',
      endTime: '13:00',
      equipment: JSON.stringify(['بروجكتر', 'لوح كتابة', 'وصلات كهرباء', 'كراسي']),
      extraEquipmentNeeds: 'ميكروفون محمول',
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      packageType: 'كفو',
      additionalService: 'بوفيه اكسترا | مشروبات ساخنة + باردة',
      feeAmount: '0 TL (نشاط مجاني)',
      status: 'accepted'
    },
    {
      id: 'MJR-1002',
      organizerName: 'سارة عبد الله',
      whatsappNumber: '+905389998877',
      email: 'sara@example.com',
      entityType: 'فريق تطوعي',
      executorName: 'فريق ملهم التطوعي',
      eventType: 'تدريب',
      hallName: 'قاعة ديـــوان (سعة القاعة 30)',
      eventTitle: 'ملتقى الابتكار وريادة الأعمال الشبابية 2026',
      eventDescription: 'دورة تدريبية مكثفة حول إدارة المشاريع الناشئة وتسويق الابتكارات المجتمعية.',
      attendeesCount: 28,
      startDate: '2026-09-02',
      endDate: '2026-09-02',
      startTime: '14:00',
      endTime: '18:00',
      equipment: JSON.stringify(['بروجكتر', 'نظام صوتي', 'طاولات', 'كراسي']),
      extraEquipmentNeeds: 'شاشة عرض إضافية',
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      packageType: 'على عيني',
      additionalService: 'بوفيه أوبها | بوفيه إكسترا + سناكس',
      feeAmount: '0 TL (نشاط مجاني)',
      status: 'accepted'
    },
    {
      id: 'MJR-1003',
      organizerName: 'أحمد الخطيب',
      whatsappNumber: '+905011122334',
      email: 'ahmed@example.com',
      entityType: 'فرد مستقل',
      executorName: 'استوديو صناع المحتوى',
      eventType: 'اجتماع',
      hallName: 'قاعة ســديم (سعة القاعة 16-18)',
      eventTitle: 'اجتماع وتصوير حلقة بودكاست مجرة',
      eventDescription: 'جلسة حوارية وتصوير بودكاست تناقش التجارب الشبابية الناجحة في الاغتراب.',
      attendeesCount: 12,
      startDate: '2026-09-02',
      endDate: '2026-09-02',
      startTime: '18:30',
      endTime: '21:00',
      equipment: JSON.stringify(['شاشة تفاعلية', 'عزل صوتي', 'قرطاسية']),
      extraEquipmentNeeds: 'حوامل إضاءة',
      isSponsored: 'لا',
      isPaidEvent: 'لا',
      packageType: 'كفو',
      additionalService: 'بدون خدمات إضافية',
      feeAmount: '0 TL (نشاط مجاني)',
      status: 'accepted'
    }
  ];

  for (const b of seedList) {
    await dbRun(`
      INSERT INTO bookings (
        id, organizerName, whatsappNumber, email, entityType, executorName,
        eventType, hallName, eventTitle, eventDescription, attendeesCount,
        startDate, endDate, startTime, endTime, equipment, extraEquipmentNeeds,
        isSponsored, isPaidEvent, packageType, additionalService, feeAmount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      b.id, b.organizerName, b.whatsappNumber, b.email, b.entityType, b.executorName,
      b.eventType, b.hallName, b.eventTitle, b.eventDescription, b.attendeesCount,
      b.startDate, b.endDate, b.startTime, b.endTime, b.equipment, b.extraEquipmentNeeds,
      b.isSponsored, b.isPaidEvent, b.packageType, b.additionalService, b.feeAmount, b.status
    ]);
  }
  console.log('🌱 Seeded initial demo bookings into SQLite database.');
}

initDatabase();

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};
