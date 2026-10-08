/* ==========================================================================
   MAJARRA COMMUNITY CENTER - RUYA CLUB FORM SEEDER
   Creates/Updates the official "استمارة تسجيل في نادي رويّـــة - غازي عنتاب"
   ========================================================================== */

const { dbRun, dbGet } = require('../config/database');

async function seedRuyaClubForm() {
  try {
    const title = 'استمارة تسجيل في نادي رويّـــة - غازي عنتاب';
    const description = `إذا كنت من الأشخاص اللي بيحبوا يكتشفوا أفكار جديدة، يناقشوا، ويتبادلوا الآراء ضمن بيئة ممتعة، فمكانك معنا.
يسرّنا دعوتك للانضمام إلى نادي الروية، مساحة شبابية تجمع محبّي الحوار، وتبادل الأفكار، والنقاشات الهادفة. 📚✨
في كل جلسة رح نلتقي لنخوض تجربة جديدة حول موضوع مختلف من مجالات متنوعة مثل الأدب، التاريخ، الفن، الفلسفة، القضايا الاجتماعية وغيرها، ضمن أجواء تفاعلية بتشجع على التفكير النقدي، واحترام اختلاف الآراء، والتعبير عن الأفكار بحرية.
بيعتمد النادي على الحوار والتفاعل، وبدون أي تحضير مسبق، لأن موضوع كل جلسة بيكون مفاجأة للمشاركين، حتى تكون النقاشات عفوية وغنية بوجهات النظر المختلفة.

📅 التاريخ: 18.07.2026
📍 المكان: مركز مجرة المجتمعي
🕒 الوقت: 14:30pm - 17:30pm

📌 ملاحظات هامة:
يُقام نادي الروية بشكل أسبوعي كل يوم سبت، وذلك خلال الفترة الممتدة من 18/07/2026 وحتى 06/10/2026.`;

    const questions = [
      {
        id: 'email',
        label: 'عنوان البريد الالكتروني',
        title: 'عنوان البريد الالكتروني',
        type: 'email',
        required: true,
        placeholder: 'example@domain.com'
      },
      {
        id: 'full_name_ar',
        label: 'الاسم والكنية (بالعربي)',
        title: 'الاسم والكنية (بالعربي)',
        type: 'text',
        required: true,
        placeholder: 'أدخل الاسم الكامل بالعربية'
      },
      {
        id: 'full_name_en',
        label: 'Full Name (English)',
        title: 'Full Name (English)',
        type: 'text',
        required: true,
        placeholder: 'Enter Full Name in English'
      },
      {
        id: 'phone',
        label: 'رقم الهاتف',
        title: 'رقم الهاتف',
        type: 'tel',
        required: true,
        placeholder: '+90 5xx xxx xx xx'
      },
      {
        id: 'birth_date',
        label: 'تاريخ الميلاد',
        title: 'تاريخ الميلاد',
        type: 'date',
        required: true
      },
      {
        id: 'nationality',
        label: 'الجنسية',
        title: 'الجنسية',
        type: 'radio',
        options: [
          'سورية',
          'تركية',
          'سورية - تركية',
          'مصرية',
          'عراقية',
          'فلسطينية',
          'اردنية',
          'يمنية',
          'أخرى'
        ],
        required: true
      },
      {
        id: 'gender',
        label: 'الجنس',
        title: 'الجنس',
        type: 'radio',
        options: [
          'ذكر',
          'انثى'
        ],
        required: true
      },
      {
        id: 'residence',
        label: 'مكان الاقامة',
        title: 'مكان الاقامة',
        type: 'text',
        defaultValue: 'غازي عنتاب',
        required: true,
        placeholder: 'غازي عنتاب'
      },
      {
        id: 'university_major',
        label: 'إن كنت طالب جامعي فما هو فرعك الدراسي؟',
        title: 'إن كنت طالب جامعي فما هو فرعك الدراسي؟',
        type: 'text',
        required: false,
        placeholder: 'اسم الفرع / التخصص الدراسي (اختياري)'
      },
      {
        id: 'terms_approval',
        label: 'الموافقة على التسجيل',
        title: 'الموافقة على التسجيل',
        description: '1- سوف يتم أخذ الصور الفوتوغرافية أو السينمائية أو مقاطع الفيديو أثناء الجلسة ومشاركتها على مواقع التواصل الاجتماعي\n2- سيتم التواصل معكم في حال القبول',
        type: 'radio',
        options: [
          'قرأت النص السابق وانا اوافق عليه',
          'لا اوافق على النص السابق.'
        ],
        required: true
      }
    ];

    const questionsJsonStr = JSON.stringify(questions);

    const slug = 'roeya-club';

    const existingForm = await dbGet(`SELECT id FROM forms WHERE slug = ? OR slug = 'ruya-club'`, [slug]);
    if (existingForm) {
      await dbRun(`
        UPDATE forms SET title = ?, description = ?, badge_text = ?, questions_json = ?, is_active = 1 WHERE id = ?
      `, [title, description, '📚 نادي رويّـــة - غازي عنتاب', questionsJsonStr, existingForm.id]);
    } else {
      await dbRun(`
        INSERT INTO forms (slug, title, description, badge_text, questions_json, max_responses, is_active)
        VALUES (?, ?, ?, ?, ?, 100, 1)
      `, [slug, title, description, '📚 نادي رويّـــة - غازي عنتاب', questionsJsonStr]);
    }

    const existingEvent = await dbGet(`SELECT id FROM events WHERE slug = ? OR slug = 'ruya-club'`, [slug]);
    if (existingEvent) {
      await dbRun(`
        UPDATE events SET title = ?, description = ?, banner_url = ?, custom_fields = ?, is_active = 1 WHERE id = ?
      `, [title, description, 'assets/workshop.jpg', questionsJsonStr, existingEvent.id]);
    } else {
      await dbRun(`
        INSERT INTO events (slug, title, description, banner_url, max_capacity, is_active, custom_fields)
        VALUES (?, ?, ?, ?, 100, 1, ?)
      `, [slug, title, description, 'assets/workshop.jpg', questionsJsonStr]);
    }

    const bioLink = await dbGet(`SELECT id FROM bio_links WHERE title LIKE '%رويّة%' OR title LIKE '%روئية%' OR title LIKE '%الروية%'`);
    if (bioLink) {
      await dbRun(`UPDATE bio_links SET url = '/e/roeya-club' WHERE id = ?`, [bioLink.id]);
    } else {
      await dbRun(`INSERT INTO bio_links (title, url, icon, linkType, sortOrder) VALUES ('استمارة التسجيل في نادي رويّـــة 📚', '/e/roeya-club', 'fa-graduation-cap', 'link', 4)`);
    }

    console.log('✅ Successfully created/seeded "استمارة تسجيل في نادي رويّـــة - غازي عنتاب"');
  } catch (err) {
    console.error('❌ Error seeding Ruya club form:', err);
  }
}

if (require.main === module) {
  seedRuyaClubForm().then(() => process.exit(0));
}

module.exports = seedRuyaClubForm;
