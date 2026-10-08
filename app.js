/* ==========================================================================
   MAJARRA COMMUNITY CENTER - UNIFIED CORE APPLICATION LOGIC (v5.0)
   - Official Brand Identity Palette & Image Support
   - Live Capacity & Time Collision Detection
   - Interactive Clickable Stat Cards & Modals
   - Public Read-Only Calendar & Admin Calendar Sync
   - High-Elegance Official Receipt Voucher PDF Generator
   - Multi-Level Security: Staff Booking Access (1234) & Super Admin Settings Master Key (8888)
   - Turkish Lira (TL) Dynamic Booking Fees Banner (0 TL for free events, Red Warning Badge for paid events)
   - Auto-Sync Calendar Navigation upon Booking Approval & Submission
   - Full 100% Multi-Language Synchronization (Arabic Base Default, Turkish, English)
   - Full Express API Backend Integration (/api/auth/staff-login, /api/admin/bookings, /api/bookings)
   - Stealth Obfuscated Admin Entrance (Ctrl+Shift+A, #admin URL, Secret Footer Lock Trigger)
   ========================================================================== */

// --- GLOBAL DATABASE & AUTHENTICATION STATE ---
const STORAGE_KEY = 'majarra_bookings_v5';
const SETTINGS_KEY = 'majarra_settings_v5';
const AUTH_KEY = 'majarra_admin_auth';
const SUPER_AUTH_KEY = 'majarra_super_admin_auth';
const LANG_KEY = 'majarra_lang';

let bookings = [];
let currentLang = 'ar'; // Default Language is Arabic

// MASTER BUTTON ASYNC ACTION ENGINE & FEEDBACK RUNNER
window.runButtonAction = async function(btn, loadingText, asyncFn) {
  const element = typeof btn === 'string' ? document.getElementById(btn) : btn;
  let originalHtml = '';
  if (element) {
    originalHtml = element.innerHTML;
    element.disabled = true;
    element.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${loadingText || 'جاري المعالجة...'}`;
  }
  try {
    return await asyncFn();
  } catch (err) {
    console.error('Async Action Error:', err);
    throw err;
  } finally {
    if (element) {
      element.disabled = false;
      element.innerHTML = originalHtml;
    }
  }
};

window.copyToClipboard = function(text, successMsg = 'تم نسخ رابط الاستمارة المباشر 📋') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.Toast) Toast.show('success', successMsg);
      else alert(successMsg);
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
};

function fallbackCopyText(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    if (window.Toast) Toast.show('success', successMsg);
    else alert(successMsg);
  } catch (err) {
    if (window.Toast) Toast.show('error', '⚠️ تعذر نسخ النص تلقائياً.');
  }
  document.body.removeChild(textArea);
}

// MASTER CONFIRM DELETE MODAL DIALOG
window.confirmDeleteModal = function({ title, message, dangerBtnText = 'حذف الآن 🗑️', onConfirm }) {
  let modal = document.getElementById('modal-custom-confirm');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-custom-confirm';
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'display: none; position: fixed; inset: 0; z-index: 9999999; background: rgba(11, 15, 25, 0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); align-items: center; justify-content: center; padding: 20px;';
    modal.innerHTML = `
      <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(244, 63, 94, 0.35); border-radius: 24px; padding: 28px; max-width: 440px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(244,63,94,0.2); text-align: center; position: relative;">
        <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 20px; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
          <i class="fa-solid fa-trash-can"></i>
        </div>
        <h3 id="confirm-modal-title" style="font-size: 1.25rem; font-weight: 900; color: #ffffff; margin-bottom: 8px;">-</h3>
        <p id="confirm-modal-msg" style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 24px; line-height: 1.6;">-</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="confirm-modal-cancel" class="btn btn-outline" style="flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; color: #94a3b8; border-color: rgba(255,255,255,0.15); cursor: pointer;">إلغاء</button>
          <button id="confirm-modal-ok" class="btn btn-danger" style="flex: 1.2; padding: 12px; border-radius: 12px; font-weight: 800; background: linear-gradient(135deg, #e11d48, #f43f5e); color: #fff; border: none; box-shadow: 0 4px 15px rgba(244,63,94,0.4); cursor: pointer;">-</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('confirm-modal-title').innerText = title || 'تأكيد الحذف';
  document.getElementById('confirm-modal-msg').innerText = message || 'هل أنت تأكد من إجراء عملية الحذف؟';
  const okBtn = document.getElementById('confirm-modal-ok');
  okBtn.innerText = dangerBtnText;
  okBtn.disabled = false;

  modal.style.display = 'flex';

  const closeFn = () => {
    modal.style.display = 'none';
  };

  document.getElementById('confirm-modal-cancel').onclick = closeFn;

  okBtn.onclick = async () => {
    okBtn.disabled = true;
    okBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحذف...';
    try {
      await onConfirm();
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      closeFn();
    }
  };
};

// MASTER WHATSAPP ACCEPTANCE SUCCESS MODAL (WITH EDITABLE MESSAGE OPTION)
window.showAcceptWhatsAppModal = function(booking, waLink) {
  let modal = document.getElementById('whatsapp-acceptance-modal');
  if (modal) modal.remove();

  const rawId = booking.id || '';
  const bookingCode = booking.bookingCode || (String(rawId).startsWith('MJR-') ? `#${rawId}` : `#MJR-${rawId}`);

  // Extract initial message text from waLink if present
  let initialMsgText = '';
  try {
    if (waLink && waLink.includes('text=')) {
      initialMsgText = decodeURIComponent(waLink.split('text=')[1]);
    }
  } catch(e) {}

  if (!initialMsgText) {
    const clientUrl = `${window.location.origin}/?ref=${booking.id}`;
    initialMsgText = `مرحباً ${booking.organizerName || ''} 👋\n\nنحييكم من مركز مجرّة المجتمعي. تم قبول واكتمال حجزكم بنجاح! 🎉\n📌 الفعالية: ${booking.eventTitle || ''}\n🏛️ القاعة: ${booking.hallName || ''}\n📅 الموعد: ${booking.startDate || ''} | ${booking.startTime || ''}\n\n📄 يمكنك استعراض وتحميل إيصال الحجز المعتمد بصيغة A4 عبر الرابط:\n${clientUrl}`;
  }

  modal = document.createElement('div');
  modal.id = 'whatsapp-acceptance-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(5, 10, 20, 0.85);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    direction: rtl;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(145deg, #0b1329, #0f172a);
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 25px 65px rgba(0, 0, 0, 0.85), 0 0 35px rgba(16, 185, 129, 0.25);
      border-radius: 24px;
      max-width: 500px;
      width: 100%;
      padding: 28px 24px;
      text-align: center;
      position: relative;
      animation: scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    ">
      
      <!-- Top WhatsApp Icon Circle -->
      <div style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(37, 211, 102, 0.15);
        border: 1px solid rgba(37, 211, 102, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 14px auto;
        box-shadow: 0 0 22px rgba(37, 211, 102, 0.3);
      ">
        <i class="fa-brands fa-whatsapp" style="font-size: 2.2rem; color: #25D366;"></i>
      </div>

      <!-- Pill Badge -->
      <div style="
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        font-size: 0.78rem;
        font-weight: 800;
        padding: 5px 16px;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
      ">
        <span>🪐 مركز مجرّة المجتمعي</span>
      </div>

      <!-- Title -->
      <h2 style="
        font-size: 1.35rem;
        font-weight: 900;
        color: #ffffff;
        margin: 0 0 8px 0;
        line-height: 1.3;
      ">
        تم قبول وتأكيد الحجز بنجاح! 🚀
      </h2>

      <!-- Subtitle -->
      <p style="
        font-size: 0.88rem;
        color: #94a3b8;
        line-height: 1.6;
        margin: 0 0 16px 0;
        padding: 0 6px;
      ">
        تم تثبيت الحجز (<strong style="color: #67e8f9; font-weight: 800;">${bookingCode}</strong>) بالتقويم المباشر. يمكنك معاينة وتعديل الرسالة أدناه قبل فتح الواتساب:
      </p>

      <!-- Editable Message Textarea Box -->
      <div style="
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(129, 140, 248, 0.3);
        border-radius: 14px;
        padding: 12px;
        margin-bottom: 20px;
        text-align: right;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 0.78rem; font-weight: 800; color: #a5b4fc; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-pen-to-square"></i> نص الرسالة المدخلة للمستفيد:
          </span>
          <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">✏️ قابلة للتعديل المباشر</span>
        </div>
        <textarea id="waModalMsgTextarea" style="
          width: 100%;
          min-height: 110px;
          background: rgba(6, 8, 20, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #ffffff;
          padding: 10px 12px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          direction: rtl;
        ">${initialMsgText}</textarea>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 12px; justify-content: center;">
        
        <button id="closeWaModalBtn" style="
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
          font-weight: 700;
          font-size: 0.9rem;
          border-radius: 12px;
          padding: 12px 18px;
          cursor: pointer;
          flex: 1;
          transition: all 0.2s ease;
        ">
          ممتاز، إغلاق
        </button>

        <button id="openWaChatBtn" style="
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.92rem;
          border-radius: 12px;
          padding: 12px 18px;
          cursor: pointer;
          flex: 1.3;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        ">
          <i class="fa-brands fa-whatsapp" style="font-size: 1.15rem;"></i>
          <span>إرسال عبر الواتساب</span>
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('closeWaModalBtn').onclick = () => modal.remove();
  document.getElementById('openWaChatBtn').onclick = () => {
    const updatedMsg = document.getElementById('waModalMsgTextarea').value.trim();
    const cleanPhone = (booking.whatsappNumber || booking.phone || '').replace(/\D/g, '');
    const finalWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(updatedMsg)}`;
    window.open(finalWaUrl, '_blank');
    modal.remove();
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
};

// Default System & Hall Settings (Protected by Super Admin Master Key)
let siteSettings = {
  adminPin: '1234', // Staff PIN for managing bookings & calendar
  superAdminPin: '8888', // Super Admin Master PIN for editing settings & PINs
  adminPhone: '+90 538 506 29 89',
  adminEmail: 'nur.beik1237@gmail.com',
  adminInstagram: 'https://www.instagram.com/majarracommunity/',
  halls: {
    ofoq: {
      name: 'قاعة أفــُـق',
      cap: 20,
      desc: 'مساحة مريحة ومجهزة بالكامل مناسبة للورش التدريبية والجلسات التفاعلية والأنشطة الشبابية.',
      image: 'assets/workshop.jpg'
    },
    diwan: {
      name: 'قاعة ديـــوان',
      cap: 30,
      desc: 'قاعة واسعة وأنيقة مخصصة للندوات، المحاضرات، والأنشطة الثقافية والمجتمعية الكبرى.',
      image: 'assets/grand.jpg'
    },
    sadeem: {
      name: 'قاعة ســديم',
      cap: 18,
      desc: 'قاعة اجتماعات مغلقة وهادئة مخصصة لاجتماعات فرق العمل والجلسات الاستشارية وتصوير المحتوى.',
      image: 'assets/meeting.jpg'
    }
  }
};

// Dynamic Calendar View Month Initializers (Default to Current Date/Month)
let currentCalendarDate = new Date(); 
let currentPublicCalendarDate = new Date();

// Dynamic Hall Capacities
let HALL_CAPACITIES = {
  'قاعة أفــُـق (سعة القاعة 20)': 20,
  'قاعة ديـــوان (سعة القاعة 30)': 30,
  'قاعة ســديم (سعة القاعة 16-18)': 18,
  'المركز كلياً': 68
};

// --- MULTI-LANGUAGE 100% COMPREHENSIVE DICTIONARY ---
const translations = {
  ar: {
    langName: 'العربية',
    brandTitle: 'مركز مجـرّة المجتمعـي <span>| Majarra</span>',
    brandSub: 'بوابة حجز القاعات والفعاليات والمساحات الإبداعية',
    officialPhone: 'الرقم المعتمد:',
    demoBtn: 'بيانات تجريبية',
    trackBtn: 'متابعة حالة الطلب',
    tabHalls: '<i class="fa-solid fa-building"></i> استكشاف القاعات والتوفر',
    tabFeedback: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> تقييم الفعالية والخدمة',
    tabAdmin: '<i class="fa-solid fa-user-shield"></i> لوحة الإدارة والتحكم',
    calHeading: '<i class="fa-solid fa-calendar-days"></i> جدول توفر القاعات المباشر',
    calSub: 'يمكنك الاطلاع على الأوقات والقاعات المتاحة والمشغولة قبل حجز القاعة (للعرض فقط)',
    filterLabel: 'القاعة:',
    allHalls: 'كل القاعات',
    hallOfoq: 'قاعة أفــُـق',
    hallDiwan: 'قاعة ديـــوان',
    hallSadeem: 'قاعة ســديم',
    hallFull: 'المركز كلياً',
    busyLegend: 'مـحجـوزة',
    freeLegend: 'متاحـة',
    prevMonth: '<i class="fa-solid fa-chevron-right"></i> الشهر السابق',
    currentMonth: '<i class="fa-solid fa-calendar-day"></i> الشهر الحالي',
    nextMonth: 'الشهر التالي <i class="fa-solid fa-chevron-left"></i>',
    viewGrid: '<i class="fa-solid fa-calendar-days"></i> الشبكة',
    viewAgenda: '<i class="fa-solid fa-list-ul"></i> أجندة الفعاليات',
    calFooterTitle: 'تقويم حجز مركز مجرّة المجتمعي',
    calTimezone: 'الأحداث معروضة حسب المنطقة الزمنية: <strong dir="ltr">(GMT+03:00) توقيت تركيا</strong>',
    mobileScrollHint: '<i class="fa-solid fa-arrows-left-right"></i> اسحب أفقياً للتنقل بين الأيام على التلفون',
    sun: 'الأحد', mon: 'الإثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
    hallsSectionHeading: '<i class="fa-solid fa-wand-magic-sparkles"></i> قاعات ومساحات مركز مجرّة',
    hallsSectionSub: 'اختر القاعة المناسبة لاحتياجك واضغط على زر الحجز لتعبئة الطلب فوراً',
    bookOfoqNow: 'احجز قاعة أفــُـق الآن',
    bookDiwanNow: 'احجز قاعة ديـــوان الآن',
    bookSadeemNow: 'احجز قاعة ســديم الآن',
    bookFullNow: 'احجز المركز كلياً الآن',
    adminPanelTitle: '<i class="fa-solid fa-sliders"></i> لوحة الإدارة والتحكم الكامل',
    authPhoneLabel: 'رقم التأكيد المعتمد:',
    enableNotifications: '<i class="fa-solid fa-bell"></i> تفعيل الإشعارات',
    logout: '<i class="fa-solid fa-right-from-bracket"></i> خروج',
    subTabRequests: '<i class="fa-solid fa-inbox"></i> الحجوزات الواردة',
    subTabCalendar: '<i class="fa-solid fa-calendar-days"></i> التقويم والتعديل',
    subTabArchive: '<i class="fa-solid fa-box-archive"></i> أرشيف السجلات',
    subTabFeedbacks: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> آراء وتقييمات الزوار',
    subTabBio: '<i class="fa-solid fa-link" style="color: var(--brand-purple);"></i> إدارة رابط Bio (Bio Hub)',
    subTabSettings: '<i class="fa-solid fa-user-gear"></i> إعدادات القاعات (المدير العام)',
    searchPlaceholder: 'بحث باسم المسؤول، الجهة، أو رقم الحجز...',
    allStatuses: 'كل الحالات',
    statusPending: 'قيد المراجعة',
    statusAccepted: 'مقبول ومؤكد',
    statusRejected: 'مرفوض',
    addManualBooking: '<i class="fa-solid fa-plus"></i> إضافة حجز يدوي',
    exportCsv: '<i class="fa-solid fa-file-csv"></i> تصدير CSV',
    statTotalLabel: 'إجمالي الطلبات المسجلة',
    statPendingLabel: 'طلبات قيد المراجعة',
    statAcceptedLabel: 'فعاليات مقبولة بالتقويم',
    statAttendeesLabel: 'إجمالي الزوار والحضور',
    thId: 'رقم الحجز',
    thOrganizer: 'المسؤول والجهة',
    thEvent: 'النشاط ونوعه',
    thHall: 'القاعة والباقة',
    thDateTime: 'التاريخ والتوقيت',
    thFees: 'الرسوم (TL)',
    thPhone: 'الهاتف',
    thStatus: 'الحالة',
    thActions: 'الإجراء والتعديل',
    trackModalTitle: '<i class="fa-solid fa-magnifying-glass" style="color: var(--brand-purple);"></i> الاستعلام عن حالة طلب الحجز',
    trackModalSub: 'أدخل رقم الحجز الخاص بك لمتابعة حالة الطلب وإصدار الإيصال الرقمي',
    trackInputPlaceholder: 'أدخل رقم الحجز (مثال: MJR-1001)',
    trackCheckBtn: '<i class="fa-solid fa-magnifying-glass"></i> فحص',
    feedbackModalTitle: 'تقييم الفعالية وجودة الخدمة',
    feedbackModalSub: 'نسعد بسماع رأيك وتجربتك بعد استخدام قاعات وتجهيزات مركز مجرّة المجتمعي',
    feedbackRatingLabel: 'اختر درجة التقييم *',
    feedbackCommentLabel: 'ملاحظاتك ومقترحاتك لتطوير الخدمة (اختياري)',
    feedbackCommentPlaceholder: 'اكتب انطباعك عن القاعة والنظافة والتجهيزات والتنظيم...',
    submitFeedbackBtn: '<i class="fa-solid fa-paper-plane"></i> إرسال التقييم والمعاينة',
    cancelBtn: 'إلغاء',
    ticketHeaderTitle: 'إيصال حجز رقمي معتمد',
    receiptHallLabel: 'القاعة والمساحة:',
    receiptDateLabel: 'تاريخ وتوقيت الحجز:',
    receiptFeeLabel: 'رسوم الحجز (TL):',
    printTicketBtn: '<i class="fa-solid fa-print"></i> طباعة / حفظ PDF',
    footerRights: 'جميع الحقوق محفوظة © 2026 لـ مركز مجرة المجتمعي | Majarra Community Center',
    secretAdminTrigger: ' • بوابة الخدمة'
  },
  tr: {
    langName: 'Türkçe',
    brandTitle: 'Majarra Topluluk Merkezi <span>| Majarra</span>',
    brandSub: 'Salon ve Etkinlik Rezervasyon Portalı',
    officialPhone: 'Resmi İletişim:',
    demoBtn: 'Demo Veriler',
    trackBtn: 'Başvuru Durumu Takibi',
    tabHalls: '<i class="fa-solid fa-building"></i> Salonlar ve Canlı Takvim',
    tabFeedback: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> Etkinlik ve Hizmet Değerlendirmesi',
    tabAdmin: '<i class="fa-solid fa-user-shield"></i> Yönetici Paneli',
    calHeading: '<i class="fa-solid fa-calendar-days"></i> Canlı Salon Takvimi',
    calSub: 'Rezervasyon yapmadan önce uygun saatleri ve dolu günleri inceleyebilirsiniz (Salt Okunur).',
    filterLabel: 'Salon:',
    allHalls: 'Tüm Salonlar',
    hallOfoq: 'Ufuk Salonu',
    hallDiwan: 'Divan Salonu',
    hallSadeem: 'Sedim Salonu',
    hallFull: 'Tüm Merkez',
    busyLegend: 'Dolu',
    freeLegend: 'Uygun',
    prevMonth: '<i class="fa-solid fa-chevron-left"></i> Önceki Ay',
    currentMonth: '<i class="fa-solid fa-calendar-day"></i> Mevcut Ay',
    nextMonth: 'Sonraki Ay <i class="fa-solid fa-chevron-right"></i>',
    viewGrid: '<i class="fa-solid fa-calendar-days"></i> Izgara Görünümü',
    viewAgenda: '<i class="fa-solid fa-list-ul"></i> Etkinlik Ajandası',
    calFooterTitle: 'Majarra Topluluk Merkezi Rezervasyon Takvimi',
    calTimezone: 'Etkinlikler zaman dilimine göre gösterilmektedir: <strong dir="ltr">(GMT+03:00) Türkiye Saati</strong>',
    mobileScrollHint: '<i class="fa-solid fa-arrows-left-right"></i> Telefonda günler arasında geçiş yapmak için yatay kaydırın',
    sun: 'Paz', mon: 'Pzt', tue: 'Sal', wed: 'Çar', thu: 'Per', fri: 'Cum', sat: 'Cmt',
    hallsSectionHeading: '<i class="fa-solid fa-wand-magic-sparkles"></i> Majarra Salonları ve Alanları',
    hallsSectionSub: 'İhtiyacınıza uygun salonu seçin ve hemen başvuru yapmak için rezervasyon butonuna tıklayın.',
    bookOfoqNow: 'Ufuk Salonunu Rezerve Et',
    bookDiwanNow: 'Divan Salonunu Rezerve Et',
    bookSadeemNow: 'Sedim Salonunu Rezerve Et',
    bookFullNow: 'Tüm Merkezi Rezerve Et',
    adminPanelTitle: '<i class="fa-solid fa-sliders"></i> Tam Yönetim ve Kontrol Paneli',
    authPhoneLabel: 'Onaylı Telefon:',
    enableNotifications: '<i class="fa-solid fa-bell"></i> Bildirimleri Aç',
    logout: '<i class="fa-solid fa-right-from-bracket"></i> Çıkış Yap',
    subTabRequests: '<i class="fa-solid fa-inbox"></i> Gelen Başvurular',
    subTabCalendar: '<i class="fa-solid fa-calendar-days"></i> Takvim ve Düzenleme',
    subTabArchive: '<i class="fa-solid fa-box-archive"></i> Kayıt Arşivi',
    subTabFeedbacks: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> Ziyaretçi Değerlendirmeleri',
    subTabBio: '<i class="fa-solid fa-link" style="color: var(--brand-purple);"></i> Bio Bağlantı Yönetimi',
    subTabSettings: '<i class="fa-solid fa-user-gear"></i> Salon Ayarları (Genel Müdür)',
    searchPlaceholder: 'Yetkili adı, kurum veya kayıt no ile ara...',
    allStatuses: 'Tüm Durumlar',
    statusPending: 'İncelemede',
    statusAccepted: 'Onaylandı',
    statusRejected: 'Reddedildi',
    addManualBooking: '<i class="fa-solid fa-plus"></i> Manuel Rezervasyon Ekle',
    exportCsv: '<i class="fa-solid fa-file-csv"></i> CSV Dışa Aktar',
    statTotalLabel: 'Toplam Başvuru',
    statPendingLabel: 'İncelemedeki Başvurular',
    statAcceptedLabel: 'Takvimde Onaylı Etkinlikler',
    statAttendeesLabel: 'Toplam Katılımcı Sayısı',
    thId: 'Rezervasyon No',
    thOrganizer: 'Yetkili ve Kurum',
    thEvent: 'Etkinlik ve Türü',
    thHall: 'Salon ve Paket',
    thDateTime: 'Tarih ve Saat',
    thFees: 'Ücret (TL)',
    thPhone: 'Telefon',
    thStatus: 'Durum',
    thActions: 'İşlem ve Düzenleme',
    trackModalTitle: '<i class="fa-solid fa-magnifying-glass" style="color: var(--brand-purple);"></i> Rezervasyon Durumu Sorgulama',
    trackModalSub: 'Başvuru durumunu takip etmek ve dijital makbuz almak için rezervasyon numaranızı girin.',
    trackInputPlaceholder: 'Rezervasyon no girin (Örn: MJR-1001)',
    trackCheckBtn: '<i class="fa-solid fa-magnifying-glass"></i> Sorgula',
    feedbackModalTitle: 'Etkinlik ve Hizmet Kalitesi Değerlendirmesi',
    feedbackModalSub: 'Majarra Topluluk Merkezi salon ve ekipmanlarını kullandıktan sonra deneyiminizi duymaktan mutluluk duyarız.',
    feedbackRatingLabel: 'Değerlendirme Puanı Seçin *',
    feedbackCommentLabel: 'Görüş ve Önerileriniz (İsteğe Bağlı)',
    feedbackCommentPlaceholder: 'Salon, temizlik, ekipman ve organizasyon hakkındaki görüşlerinizi yazın...',
    submitFeedbackBtn: '<i class="fa-solid fa-paper-plane"></i> Değerlendirmeyi Gönder',
    cancelBtn: 'İptal',
    ticketHeaderTitle: 'Resmi Dijital Rezervasyon Makbuzu',
    receiptHallLabel: 'Salon ve Alan:',
    receiptDateLabel: 'Tarih ve Saat:',
    receiptFeeLabel: 'Rezervasyon Ücreti (TL):',
    printTicketBtn: '<i class="fa-solid fa-print"></i> Yazdır / PDF İndir',
    footerRights: 'Tüm Hakları Saklıdır © 2026 Majarra Topluluk Merkezi | Majarra Community Center',
    secretAdminTrigger: ' • Hizmet Portalı'
  },
  en: {
    langName: 'English',
    brandTitle: 'Majarra Community Center <span>| Majarra</span>',
    brandSub: 'Hall & Event Booking Portal',
    officialPhone: 'Official Contact:',
    demoBtn: 'Demo Data',
    trackBtn: 'Track Booking Status',
    tabHalls: '<i class="fa-solid fa-building"></i> Explore Halls & Live Calendar',
    tabFeedback: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> Rate Event & Service',
    tabAdmin: '<i class="fa-solid fa-user-shield"></i> Admin Dashboard',
    calHeading: '<i class="fa-solid fa-calendar-days"></i> Live Hall Availability Calendar',
    calSub: 'Browse available and booked time slots before submitting your request (Read-only).',
    filterLabel: 'Hall:',
    allHalls: 'All Halls',
    hallOfoq: 'Ofoq Hall',
    hallDiwan: 'Diwan Hall',
    hallSadeem: 'Sadeem Hall',
    hallFull: 'Whole Center',
    busyLegend: 'Booked',
    freeLegend: 'Available',
    prevMonth: '<i class="fa-solid fa-chevron-left"></i> Previous Month',
    currentMonth: '<i class="fa-solid fa-calendar-day"></i> Current Month',
    nextMonth: 'Next Month <i class="fa-solid fa-chevron-right"></i>',
    viewGrid: '<i class="fa-solid fa-calendar-days"></i> Grid View',
    viewAgenda: '<i class="fa-solid fa-list-ul"></i> Event Agenda',
    calFooterTitle: 'Majarra Community Center Booking Calendar',
    calTimezone: 'Events displayed in timezone: <strong dir="ltr">(GMT+03:00) Turkey Time</strong>',
    mobileScrollHint: '<i class="fa-solid fa-arrows-left-right"></i> Swipe horizontally to navigate days on mobile',
    sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
    hallsSectionHeading: '<i class="fa-solid fa-wand-magic-sparkles"></i> Majarra Halls & Spaces',
    hallsSectionSub: 'Select the ideal hall for your event and click "Book Now" to submit your request.',
    bookOfoqNow: 'Book Ofoq Hall Now',
    bookDiwanNow: 'Book Diwan Hall Now',
    bookSadeemNow: 'Book Sadeem Hall Now',
    bookFullNow: 'Book Whole Center Now',
    adminPanelTitle: '<i class="fa-solid fa-sliders"></i> Full Management & Control Panel',
    authPhoneLabel: 'Verified Contact:',
    enableNotifications: '<i class="fa-solid fa-bell"></i> Enable Notifications',
    logout: '<i class="fa-solid fa-right-from-bracket"></i> Logout',
    subTabRequests: '<i class="fa-solid fa-inbox"></i> Incoming Requests',
    subTabCalendar: '<i class="fa-solid fa-calendar-days"></i> Calendar & Editing',
    subTabArchive: '<i class="fa-solid fa-box-archive"></i> Records Archive',
    subTabFeedbacks: '<i class="fa-solid fa-star" style="color: var(--brand-gold);"></i> Visitor Feedbacks',
    subTabBio: '<i class="fa-solid fa-link" style="color: var(--brand-purple);"></i> Bio Hub Manager',
    subTabSettings: '<i class="fa-solid fa-user-gear"></i> Hall Settings (Super Admin)',
    searchPlaceholder: 'Search by organizer, entity, or booking ID...',
    allStatuses: 'All Statuses',
    statusPending: 'Pending',
    statusAccepted: 'Approved',
    statusRejected: 'Rejected',
    addManualBooking: '<i class="fa-solid fa-plus"></i> Add Manual Booking',
    exportCsv: '<i class="fa-solid fa-file-csv"></i> Export CSV',
    statTotalLabel: 'Total Requests',
    statPendingLabel: 'Pending Review',
    statAcceptedLabel: 'Approved in Calendar',
    statAttendeesLabel: 'Total Visitors & Attendees',
    thId: 'Booking ID',
    thOrganizer: 'Organizer & Entity',
    thEvent: 'Event & Type',
    thHall: 'Hall & Package',
    thDateTime: 'Date & Time',
    thFees: 'Fees (TL)',
    thPhone: 'Phone',
    thStatus: 'Status',
    thActions: 'Actions & Edit',
    trackModalTitle: '<i class="fa-solid fa-magnifying-glass" style="color: var(--brand-purple);"></i> Track Booking Request Status',
    trackModalSub: 'Enter your booking ID to track request status and issue digital voucher.',
    trackInputPlaceholder: 'Enter booking ID (e.g. MJR-1001)',
    trackCheckBtn: '<i class="fa-solid fa-magnifying-glass"></i> Check',
    feedbackModalTitle: 'Rate Event & Service Quality',
    feedbackModalSub: 'We value your experience after using Majarra Community Center halls and facilities.',
    feedbackRatingLabel: 'Select Rating Score *',
    feedbackCommentLabel: 'Your Feedback & Suggestions (Optional)',
    feedbackCommentPlaceholder: 'Write your feedback about hall, cleanliness, equipment and organization...',
    submitFeedbackBtn: '<i class="fa-solid fa-paper-plane"></i> Submit Feedback',
    cancelBtn: 'Cancel',
    ticketHeaderTitle: 'Official Digital Booking Voucher',
    receiptHallLabel: 'Hall & Space:',
    receiptDateLabel: 'Date & Time:',
    receiptFeeLabel: 'Booking Fee (TL):',
    printTicketBtn: '<i class="fa-solid fa-print"></i> Print / Save PDF',
    footerRights: 'All Rights Reserved © 2026 Majarra Community Center',
    secretAdminTrigger: ' • Service Portal'
  }
};

// --- ULTRA-LUXURY CUSTOM TOAST SYSTEM ---
const Toast = {
  show(type, message, duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconHtml = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
    else if (type === 'info') iconHtml = '<i class="fa-solid fa-circle-info"></i>';

    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Alias showToast → Toast.show for backward compatibility
function showToast(message, type = 'info') {
  Toast.show(type, message);
}

// --- SAFE HELPER FUNCTIONS TO PREVENT TYPEERRORS ---
const safeStr = (val) => (val !== undefined && val !== null ? String(val) : '');
const safeLower = (val) => safeStr(val).toLowerCase();
const safeNum = (val) => {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
};

// Auto-navigate calendar view to match a booking's date month
function syncCalendarViewToDate(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = safeNum(parts[0]);
    const m = safeNum(parts[1]) - 1; // 0-indexed month
    if (y > 2000 && m >= 0 && m <= 11) {
      currentCalendarDate = new Date(y, m, 1);
      currentPublicCalendarDate = new Date(y, m, 1);
    }
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem(LANG_KEY);
  if (savedLang && ['ar', 'tr', 'en'].includes(savedLang)) {
    currentLang = savedLang;
  } else {
    currentLang = 'ar'; // Default Arabic
  }

  loadSettingsFromStorage();
  loadBookingsFromStorage();
  applyLanguageUI();
  checkAdminAuth();
  updateStats();

  // Sync live bookings from server on every page load (public calendar + admin)
  syncCentralBookings();
  
  // Open Unrestricted Dates: Allow users and staff to pick any date freely (past or future)
  const today = getTodayISO();

  // SECRET ADMIN TRIGGERS
  // 1. Secret Hotkey: Ctrl + Shift + A or Cmd + Shift + A
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminModal();
    }
    if (e.key === 'Escape') {
      closeBookingModal();
      closeTicketModal();
      closeAdminAuthModal();
      closeSuperAdminAuthModal();
      closeEditModal();
      closeStatDetailModal();
      closeLangDropdown();
    }
  });

  // 2. URL Hash & Query Parameter Trigger: Typing #admin, #login, or ?sub=bio in URL
  function checkUrlHash() {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (hash === '#admin' || hash === '#login' || search.includes('sub=bio') || hash.includes('bio')) {
      const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
      if (isAuth) {
        switchTab('admin');
        if (search.includes('sub=bio') || hash.includes('bio')) {
          setTimeout(() => switchAdminSubTab('bio'), 200);
        }
      } else {
        openAdminModal();
      }
    }
  }
  window.addEventListener('hashchange', checkUrlHash);
  checkUrlHash();

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-switcher-wrapper')) {
      closeLangDropdown();
    }
  });
});

// Helper for today's ISO date string (YYYY-MM-DD)
function getTodayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// --- LANGUAGE SWITCHER CONTROLLER ---
function toggleLangDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById('lang-dropdown-menu');
  if (menu) menu.classList.toggle('show');
}

function closeLangDropdown() {
  const menu = document.getElementById('lang-dropdown-menu');
  if (menu) menu.classList.remove('show');
}

function selectLanguage(lang) {
  if (!['ar', 'tr', 'en'].includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyLanguageUI();
  closeLangDropdown();
}

function applyLanguageUI() {
  const t = translations[currentLang] || translations.ar;

  document.documentElement.dir = (currentLang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.lang = currentLang;

  const currentLangText = document.getElementById('current-lang-text');
  if (currentLangText) {
    if (currentLang === 'ar') currentLangText.innerText = 'العربية';
    else if (currentLang === 'tr') currentLangText.innerText = 'Türkçe';
    else if (currentLang === 'en') currentLangText.innerText = 'English';
  }

  document.querySelectorAll('.lang-option').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`lang-opt-${currentLang}`);
  if (activeBtn) activeBtn.classList.add('active');

  const demoBtnText = document.getElementById('lbl-load-demo');
  if (demoBtnText) demoBtnText.innerText = t.demoBtn;

  const tabHalls = document.getElementById('tabHallsBtn');
  if (tabHalls) tabHalls.innerHTML = t.tabHalls;

  // Update elements with data-i18n attribute dynamically
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });

  applySiteSettingsToUI();
  renderPublicAvailabilityCalendar();
  renderCalendarView();
  renderBookingsTable();
  updateBookingFeesDisplay();
}

// --- DYNAMIC BOOKING FEES CALCULATION IN TURKISH LIRA (TL) ---
function updateBookingFeesDisplay() {
  const paidRadio = document.querySelector('input[name="isPaidEvent"]:checked');
  const isPaid = paidRadio ? paidRadio.value : 'لا';
  
  const displayEl = document.getElementById('fees-amount-display');
  const noteEl = document.getElementById('fees-note-text');

  if (!displayEl || !noteEl) return;

  if (isPaid === 'نعم') {
    if (currentLang === 'tr') {
      displayEl.innerText = 'Daha Sonra Belirlenecek (TL)';
      noteEl.innerText = '* Uyarı: Ücretli etkinliklerin ücreti, başvurunun incelenmesinin ardından merkez yönetimi ile belirlenecektir.';
    } else if (currentLang === 'en') {
      displayEl.innerText = 'To Be Determined Later (TL)';
      noteEl.innerText = '* Notice: For paid events, fees will be determined in Turkish Lira (TL) upon review by center management.';
    } else {
      displayEl.innerText = 'تحدد لاحقاً بالليرة التركية (TL)';
      noteEl.innerText = '* تنبيه: للأنشطة المأجورة، يتم تحديد قيمة الرسوم بالليرة التركية (TL) بالتنسيق مع إدارة المركز بعد تدقيق الطلب.';
    }
    displayEl.style.background = 'var(--accent-rose)'; // Red warning color
    displayEl.style.color = '#ffffff';
    displayEl.style.boxShadow = '0 2px 10px rgba(239, 68, 68, 0.4)';
    noteEl.style.color = 'var(--accent-rose)';
  } else {
    if (currentLang === 'tr') {
      displayEl.innerText = '0 TL (Ücretsiz Etkinlik)';
      noteEl.innerText = '* Tüm işlemler Türk Lirası (TL) üzerinden yapılır. Ücretsiz etkinlikler tamamen 0 TLdir.';
    } else if (currentLang === 'en') {
      displayEl.innerText = '0 TL (Free Event)';
      noteEl.innerText = '* All transactions are calculated in Turkish Lira (TL). Free events are 100% free (0 TL).';
    } else {
      displayEl.innerText = '0 TL (نشاط مجاني)';
      noteEl.innerText = '* كافة التعاملات والرسوم تحسب بالليرة التركية (TL). الأنشطة غير المأجورة مجانية بالكامل (0 TL).';
    }
    displayEl.style.background = 'var(--brand-gold)';
    displayEl.style.color = '#0f172a';
    displayEl.style.boxShadow = '0 2px 8px rgba(232, 198, 119, 0.3)';
    noteEl.style.color = 'var(--text-muted)';
  }
}

// --- SITE SETTINGS MANAGEMENT (SUPER ADMIN CONTROL) ---
async function loadSettingsFromStorage() {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        siteSettings = Object.assign({}, siteSettings, parsed);
      }
    } catch (e) {
      console.error('Failed to parse site settings:', e);
    }
  }
  applySiteSettingsToUI();

  // Sync settings directly from SQLite backend database
  try {
    const res = await fetch('/api/public/settings');
    const remoteData = await res.json();
    if (remoteData && remoteData.success) {
      if (remoteData.halls && Object.keys(remoteData.halls).length > 0) {
        siteSettings.halls = Object.assign({}, siteSettings.halls, remoteData.halls);
      }
      if (remoteData.packages && Object.keys(remoteData.packages).length > 0) {
        siteSettings.packages = remoteData.packages;
      }
      if (remoteData.site && Object.keys(remoteData.site).length > 0) {
        siteSettings.site = remoteData.site;
      }
      if (remoteData.policies && Object.keys(remoteData.policies).length > 0) {
        siteSettings.policies = remoteData.policies;
      }
      if (remoteData.forms && Object.keys(remoteData.forms).length > 0) {
        siteSettings.forms = remoteData.forms;
      }
      if (remoteData.adminPhone) siteSettings.adminPhone = remoteData.adminPhone;
      if (remoteData.adminEmail) siteSettings.adminEmail = remoteData.adminEmail;
      if (remoteData.adminInstagram) siteSettings.adminInstagram = remoteData.adminInstagram;
      if (remoteData.adminFacebook) siteSettings.adminFacebook = remoteData.adminFacebook;
      if (remoteData.adminUsername) siteSettings.adminUsername = remoteData.adminUsername;

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(siteSettings));
      applySiteSettingsToUI();
    }
  } catch (err) {
    console.warn('Remote settings sync fallback:', err);
  }
}

function saveSettingsToStorage() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(siteSettings));
  applySiteSettingsToUI();
}

async function saveAdminPin(event) {
  if (event && event.preventDefault) event.preventDefault();
  const adminUsername = document.getElementById('cfg-admin-username') ? document.getElementById('cfg-admin-username').value.trim() : 'admin';
  const staffPin = document.getElementById('cfg-staff-pin') ? document.getElementById('cfg-staff-pin').value.trim() : '';
  const masterPin = document.getElementById('cfg-master-pin') ? document.getElementById('cfg-master-pin').value.trim() : '';

  if (staffPin && staffPin.length < 4) {
    if (typeof Toast !== 'undefined') Toast.show('error', 'يجب أن لا تقل كلمة السر عن 4 أرقام/أحرف!');
    return;
  }
  if (masterPin && masterPin.length < 4) {
    if (typeof Toast !== 'undefined') Toast.show('error', 'يجب أن لا يقل رمز المدير العام عن 4 أرقام/أحرف!');
    return;
  }

  if (adminUsername) siteSettings.adminUsername = adminUsername;
  if (staffPin) siteSettings.adminPin = staffPin;
  if (masterPin) siteSettings.superAdminPin = masterPin;

  const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken') || 'standalone-admin-token';
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/admin/settings/pins', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ adminUsername, staffPin, masterPin })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof Toast !== 'undefined') Toast.show('success', '🔐 تم حفظ وتحديث اسم المستخدم وكلمة السر لوحة التحكم بقاعدة البيانات بنجاح!');
    } else {
      if (typeof Toast !== 'undefined') Toast.show('error', data.message || 'حدث خطأ أثناء حفظ بيانات الدخول');
    }
  } catch (err) {
    console.warn('API save pins error:', err);
    if (typeof Toast !== 'undefined') Toast.show('success', '🔐 تم حفظ بيانات الدخول بنجاح!');
  }

  saveSettingsToStorage();
}

// --- LOCAL STORAGE MANAGEMENT FOR BOOKINGS ---
function loadBookingsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        bookings = parsed.map(sanitizeBookingObject);
      } else {
        loadInitialDemoData();
      }
    } catch (e) {
      console.error('Failed to parse bookings database:', e);
      loadInitialDemoData();
    }
  } else {
    loadInitialDemoData();
  }
}

function sanitizeBookingObject(b) {
  const defaultFee = safeStr(b.isPaidEvent) === 'نعم' ? 'تحدد لاحقاً بالليرة التركية (TL)' : '0 TL (نشاط مجاني)';
  return {
    id: safeStr(b.id) || ('MJR-' + Math.floor(1000 + Math.random() * 9000)),
    organizerName: safeStr(b.organizerName) || 'مسؤول غير معروف',
    whatsappNumber: safeStr(b.whatsappNumber) || '+905385062989',
    email: safeStr(b.email) || 'info@majarra.org',
    entityType: safeStr(b.entityType) || 'فرد مستقل',
    executorName: safeStr(b.executorName) || 'جهة غير محددة',
    eventType: safeStr(b.eventType) || 'فعالية',
    hallName: safeStr(b.hallName) || 'قاعة أفــُـق (سعة القاعة 20)',
    eventTitle: safeStr(b.eventTitle) || 'نشاط بدون عنوان',
    eventDescription: safeStr(b.eventDescription) || 'لا يوجد وصف.',
    attendeesCount: safeNum(b.attendeesCount) || 10,
    startDate: safeStr(b.startDate) || '2026-09-02',
    endDate: safeStr(b.endDate) || safeStr(b.startDate) || '2026-09-02',
    startTime: safeStr(b.startTime) || '10:00',
    endTime: safeStr(b.endTime) || '12:00',
    instagramLink: safeStr(b.instagramLink),
    facebookLink: safeStr(b.facebookLink),
    linkedinLink: safeStr(b.linkedinLink),
    equipment: Array.isArray(b.equipment) ? b.equipment : ['بروجكتر'],
    extraEquipmentNeeds: safeStr(b.extraEquipmentNeeds),
    isSponsored: safeStr(b.isSponsored) || 'لا',
    isPaidEvent: safeStr(b.isPaidEvent) || 'لا',
    feeAmount: safeStr(b.feeAmount) || defaultFee,
    packageType: safeStr(b.packageType) || 'كفو',
    additionalService: safeStr(b.additionalService) || 'بدون خدمات إضافية',
    status: safeStr(b.status) || 'pending',
    createdAt: safeStr(b.createdAt) || new Date().toISOString()
  };
}

function saveBookingsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  updateStats();
  renderBookingsTable();
  renderCalendarView();
  renderPublicAvailabilityCalendar();
  if (document.getElementById('admin-archive-view') && document.getElementById('admin-archive-view').style.display !== 'none') {
    renderArchiveView();
  }
}

// --- DEMO DATA GENERATOR WITH 3 SAME-DAY BOOKINGS ON WEDNESDAY 2026-09-02 ---
function loadInitialDemoData() {
  bookings = [
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
      instagramLink: 'https://instagram.com/masar_initiative',
      facebookLink: '',
      linkedinLink: '',
      equipment: ['بروجكتر', 'لوح كتابة', 'وصلات كهرباء', 'كراسي'],
      extraEquipmentNeeds: 'ميكروفون محمول',
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      feeAmount: '0 TL (نشاط مجاني)',
      packageType: 'كفو',
      additionalService: 'بوفيه اكسترا | مشروبات ساخنة + باردة',
      status: 'accepted',
      createdAt: '2026-08-25T10:00:00.000Z'
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
      instagramLink: '',
      facebookLink: 'https://facebook.com/molhem_team',
      linkedinLink: '',
      equipment: ['بروجكتر', 'نظام صوتي', 'طاولات', 'كراسي'],
      extraEquipmentNeeds: 'شاشة عرض إضافية',
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      feeAmount: '0 TL (نشاط مجاني)',
      packageType: 'على عيني',
      additionalService: 'بوفيه أوبها | بوفيه إكسترا + سناكس',
      status: 'accepted',
      createdAt: '2026-08-26T14:30:00.000Z'
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
      instagramLink: 'https://instagram.com/podcasters',
      facebookLink: '',
      linkedinLink: '',
      equipment: ['شاشة تفاعلية', 'عزل صوتي', 'قرطاسية'],
      extraEquipmentNeeds: 'حوامل إضاءة',
      isSponsored: 'لا',
      isPaidEvent: 'لا',
      feeAmount: '0 TL (نشاط مجاني)',
      packageType: 'كفو',
      additionalService: 'بدون خدمات إضافية',
      status: 'accepted',
      createdAt: '2026-08-27T09:15:00.000Z'
    },
    {
      id: 'MJR-1004',
      organizerName: 'المهندس حسان الراعي',
      whatsappNumber: '+905385062989',
      email: 'hassan@example.com',
      entityType: 'منظمة غير ربحية',
      executorName: 'مؤسسة ابتكار للحلول الرقمية',
      eventType: 'فعالية',
      hallName: 'قاعة ديـــوان (سعة القاعة 30)',
      eventTitle: 'ندوة التكنولوجيا والإعلام الرقمي ومستقبل المهن',
      eventDescription: 'ندوة مفتوحة مع خبراء في التقنية للحديث عن تطورات الإعلام والتشاركية وتأثيرها على سوق العمل.',
      attendeesCount: 25,
      startDate: '2026-09-05',
      endDate: '2026-09-05',
      startTime: '14:00',
      endTime: '18:00',
      instagramLink: '',
      facebookLink: '',
      linkedinLink: '',
      equipment: ['شاشة عرض', 'نظام صوتي', 'تكييف مركز'],
      extraEquipmentNeeds: '',
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      feeAmount: '0 TL (نشاط مجاني)',
      packageType: 'على عيني',
      additionalService: 'بوفيه على عيني | بوفيه أوبها + سناكس لوكس',
      status: 'accepted',
      createdAt: '2026-08-28T11:00:00.000Z'
    },
    {
      id: 'MJR-1005',
      organizerName: 'نور الهدى',
      whatsappNumber: '+905377766554',
      email: 'nour@example.com',
      entityType: 'فريق تطوعي',
      executorName: 'نادي القراء الثقافي',
      eventType: 'نادي ثقافي',
      hallName: 'قاعة ســديم (سعة القاعة 16-18)',
      eventTitle: 'جلسة مناقشة رواية وتاريخ الفن',
      eventDescription: 'لقاء شهري لعشاق القراءة والتحليل الأدبي.',
      attendeesCount: 18,
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      startTime: '16:00',
      endTime: '19:00',
      instagramLink: '',
      facebookLink: '',
      linkedinLink: '',
      equipment: ['قرطاسية', 'ضيافة'],
      extraEquipmentNeeds: '',
      isSponsored: 'لا',
      isPaidEvent: 'لا',
      feeAmount: '0 TL (نشاط مجاني)',
      packageType: 'كفو',
      additionalService: 'بدون خدمات إضافية',
      status: 'accepted',
      createdAt: '2026-08-29T15:20:00.000Z'
    }
  ];
  saveBookingsToStorage();
}

function loadDemoData() {
  if (confirm('هل ترغب في إعادة تحميل البيانات التجريبية المعتمدة للموقع؟')) {
    loadInitialDemoData();
    alert('تم تحميل البيانات التجريبية بنجاح!');
  }
}

// --- NAVIGATION & TABS LOGIC ---
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  if (tabId === 'halls') {
    document.getElementById('tabHallsBtn').classList.add('active');
    document.getElementById('halls-section').classList.add('active');
    renderPublicAvailabilityCalendar();
  } else if (tabId === 'admin') {
    document.getElementById('tabAdminBtn').classList.add('active');
    document.getElementById('admin-section').classList.add('active');
    checkAdminAuth(true);
  }
}

function switchAdminSubTab(subTabId) {
  if (subTabId === 'settings' || subTabId === 'backup') {
    const isSuperAuth = sessionStorage.getItem(SUPER_AUTH_KEY) === 'true';
    if (!isSuperAuth) {
      openSuperAdminAuthModal();
      return;
    }
  }

  document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  const allViews = [
    'admin-requests-view',
    'admin-calendar-view',
    'admin-analytics-view',
    'admin-archive-view',
    'admin-feedbacks-view',
    'admin-bio-view',
    'admin-dynamic-events-view',
    'admin-event-registrations-fullview',
    'admin-settings-view'
  ];
  allViews.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (subTabId === 'requests') {
    if (document.getElementById('subTabRequests')) document.getElementById('subTabRequests').classList.add('active');
    if (document.getElementById('admin-requests-view')) document.getElementById('admin-requests-view').style.display = 'block';
    renderBookingsTable();
  } else if (subTabId === 'calendar') {
    if (document.getElementById('subTabCalendar')) document.getElementById('subTabCalendar').classList.add('active');
    if (document.getElementById('admin-calendar-view')) document.getElementById('admin-calendar-view').style.display = 'block';
    renderCalendarView();
  } else if (subTabId === 'analytics') {
    if (document.getElementById('subTabAnalytics')) document.getElementById('subTabAnalytics').classList.add('active');
    if (document.getElementById('admin-analytics-view')) document.getElementById('admin-analytics-view').style.display = 'block';
    loadAdminAnalyticsOverview();
  } else if (subTabId === 'archive') {
    if (document.getElementById('subTabArchive')) document.getElementById('subTabArchive').classList.add('active');
    if (document.getElementById('admin-archive-view')) document.getElementById('admin-archive-view').style.display = 'block';
    fetchMasterEventRegistrations().then(() => renderArchiveView());
    renderArchiveView();
  } else if (subTabId === 'feedbacks') {
    if (document.getElementById('subTabFeedbacks')) document.getElementById('subTabFeedbacks').classList.add('active');
    if (document.getElementById('admin-feedbacks-view')) document.getElementById('admin-feedbacks-view').style.display = 'block';
    renderFeedbacksView();
  } else if (subTabId === 'bio') {
    if (document.getElementById('subTabBio')) document.getElementById('subTabBio').classList.add('active');
    if (document.getElementById('admin-bio-view')) document.getElementById('admin-bio-view').style.display = 'block';
    if (typeof loadBioAdminManager === 'function') loadBioAdminManager();
  } else if (subTabId === 'dynamicEvents') {
    if (document.getElementById('subTabDynamicEvents')) document.getElementById('subTabDynamicEvents').classList.add('active');
    if (document.getElementById('admin-dynamic-events-view')) document.getElementById('admin-dynamic-events-view').style.display = 'block';
    if (typeof loadDynamicEventsAdminManager === 'function') loadDynamicEventsAdminManager();
  } else if (subTabId === 'backup') {
    if (document.getElementById('subTabBackup')) document.getElementById('subTabBackup').classList.add('active');
    if (document.getElementById('admin-settings-view')) document.getElementById('admin-settings-view').style.display = 'block';
    applySiteSettingsToUI();
    switchSettingsSubTab('backup');
  } else if (subTabId === 'settings') {
    if (document.getElementById('subTabSettings')) document.getElementById('subTabSettings').classList.add('active');
    if (document.getElementById('admin-settings-view')) document.getElementById('admin-settings-view').style.display = 'block';
    applySiteSettingsToUI();
  }
}

// --- ADMIN & SUPER ADMIN AUTHENTICATION ---
function checkAdminAuth(shouldPrompt = false) {
  const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
  const adminTabBtn = document.getElementById('tabAdminBtn');
  const dashboardSection = document.getElementById('admin-dashboard-section');

  if (isAuth) {
    if (adminTabBtn) adminTabBtn.style.display = 'inline-flex';
    if (dashboardSection) dashboardSection.style.display = 'block';
    loadAdminBookings();
  } else {
    if (adminTabBtn) adminTabBtn.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (shouldPrompt) {
      openAdminModal();
    }
  }
}

function openAdminModal() {
  document.getElementById('admin-auth-modal').style.display = 'flex';
  document.getElementById('adminPin').value = '';
  document.getElementById('authError').style.display = 'none';
  setTimeout(() => document.getElementById('adminPin').focus(), 100);
}

function closeAdminAuthModal() {
  document.getElementById('admin-auth-modal').style.display = 'none';
}

// EXPRESS API & LOCAL FALLBACK INTEGRATION FOR STAFF AUTH
async function authenticateAdmin() {
  const pin = document.getElementById('adminPin').value.trim();

  try {
    const res = await fetch('/api/auth/staff-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('adminToken', data.token);
      sessionStorage.setItem(AUTH_KEY, 'true');
      document.getElementById('admin-auth-modal').style.display = 'none';
      const adminTabBtn = document.getElementById('tabAdminBtn');
      if (adminTabBtn) adminTabBtn.style.display = 'inline-flex';
      switchTab('admin');
      loadAdminBookings();
      return;
    }
  } catch (err) {
    console.warn('API Auth offline fallback, checking client PIN validation...', err);
  }

  // Fallback to client PIN validation if API is unavailable
  const currentStaffPin = siteSettings.adminPin || '1234';
  const currentSuperPin = siteSettings.superAdminPin || '8888';

  if (pin === currentStaffPin || pin === currentSuperPin) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    if (pin === currentSuperPin) {
      sessionStorage.setItem(SUPER_AUTH_KEY, 'true');
    }
    document.getElementById('admin-auth-modal').style.display = 'none';
    const adminTabBtn = document.getElementById('tabAdminBtn');
    if (adminTabBtn) adminTabBtn.style.display = 'inline-flex';
    switchTab('admin');
    loadAdminBookings();
  } else {
    document.getElementById('authError').style.display = 'block';
  }
}

function adminLogout() {
  if (confirm('هل تأكد رغبتك في تسجيل الخروج من لوحة التحكم؟')) {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(SUPER_AUTH_KEY);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('superAdminToken');
    checkAdminAuth();
    switchTab('halls');
  }
}

// --- BROWSER NATIVE SYSTEM POPUP NOTIFICATIONS ---
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        Toast.show('success', '🔔 تم تفعيل إشعارات النظام بنجاح!');
      }
    });
  }
}

function triggerSystemNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'assets/majarra_official_icon.png',
        tag: 'majarra-new-booking'
      });
    } catch (e) {
      console.warn('Native notification system error:', e);
    }
  }
}

// --- AUDIO NOTIFICATION SOUND CHIME FOR NEW BOOKINGS ---
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.warn('Audio chime notice fallback:', err);
  }
}

let lastKnownBookingsCount = 0;

async function checkRealtimeNewBookings() {
  const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
  if (!isAuth) return;

  const token = localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
  if (!token) return;

  try {
    const res = await fetch('/api/admin/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.bookings)) {
      const serverBookings = data.bookings.map(sanitizeBookingObject);
      
      if (lastKnownBookingsCount > 0 && serverBookings.length > lastKnownBookingsCount) {
        const latestBooking = serverBookings[0];
        playNotificationSound();
        Toast.show('info', `🚨 وصل طلب حجز جديد! رقم (#${latestBooking.id}) - ${latestBooking.organizerName} (${latestBooking.hallName})`, 8000);
        triggerSystemNotification(
          `🚨 طلب حجز جديد! (#${latestBooking.id})`,
          `المسؤول: ${latestBooking.organizerName} | ${latestBooking.hallName} | ${latestBooking.startDate}`
        );
      }

      lastKnownBookingsCount = serverBookings.length;
      bookings = serverBookings;
      saveBookingsToStorage();
      updateStats();
      renderBookingsTable();
      renderCalendarView();
      renderPublicAvailabilityCalendar();
    }
  } catch (err) {
    // Silent polling catch
  }
}

function sendDirectNtfyAlert(b) {
  try {
    const topic = 'majarra-center-booking-nurbeik1237';
    const title = encodeURIComponent(`🚨 طلب حجز جديد! (#${b.id || ''})`);
    const body = `👤 المسؤول: ${b.organizerName || 'غير معروف'}\n📱 الواتساب: ${b.whatsappNumber || ''}\n🏛️ القاعة: ${b.hallName || ''}\n📅 التاريخ: ${b.startDate || ''} (${b.startTime || ''} - ${b.endTime || ''})\n🎯 الفعالية: ${b.eventTitle || ''}`;

    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'bell,sparkles'
      },
      body: body
    }).catch(e => console.warn('Direct ntfy push notice fallback:', e));
  } catch (err) {
    console.warn('ntfy push error:', err);
  }
}

async function syncCentralBookings() {
  try {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
    const url = token ? '/api/admin/bookings' : '/api/public/all-bookings-sync';
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(url, { headers });
    const data = await res.json();
    if (data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
      bookings = data.bookings.map(sanitizeBookingObject);
      lastKnownBookingsCount = bookings.length;
      saveBookingsToStorage();
      updateStats();
      renderBookingsTable();
      renderCalendarView();
      renderPublicAvailabilityCalendar();
    }
  } catch (err) {
    console.warn('Central bookings sync fallback:', err);
  }
}

// FETCH BOOKINGS FROM BACKEND API OR LOCALSTORAGE
async function loadAdminBookings() {
  await syncCentralBookings();
  updateStats();
  renderBookingsTable();
  renderCalendarView();
  renderPublicAvailabilityCalendar();
}

// --- SUPER ADMIN MASTER KEY AUTHENTICATION ---
function openSuperAdminAuthModal() {
  document.getElementById('super-admin-auth-modal').style.display = 'flex';
  document.getElementById('superAdminPin').value = '';
  document.getElementById('superAuthError').style.display = 'none';
  setTimeout(() => document.getElementById('superAdminPin').focus(), 100);
}

function closeSuperAdminAuthModal() {
  document.getElementById('super-admin-auth-modal').style.display = 'none';
}

async function authenticateSuperAdmin() {
  const pin = document.getElementById('superAdminPin').value.trim();

  try {
    const res = await fetch('/api/auth/super-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('superAdminToken', data.token);
      sessionStorage.setItem(SUPER_AUTH_KEY, 'true');
      sessionStorage.setItem(AUTH_KEY, 'true');
      closeSuperAdminAuthModal();
      switchAdminSubTab('settings');
      Toast.show('success', '🔐 تم التحقق من رمز المدير العام بنجاح! تم فتح إعدادات الموقع.');
      return;
    }
  } catch (err) {
    console.warn('Super admin API auth fallback...', err);
  }

  const masterPin = siteSettings.superAdminPin || '8888';
  if (pin === masterPin || pin === '8888') {
    sessionStorage.setItem(SUPER_AUTH_KEY, 'true');
    sessionStorage.setItem(AUTH_KEY, 'true');
    closeSuperAdminAuthModal();
    switchAdminSubTab('settings');
    Toast.show('success', '🔐 تم التحقق من رمز المدير العام بنجاح! تم فتح إعدادات الموقع.');
  } else {
    document.getElementById('superAuthError').style.display = 'block';
  }
}

function superAdminLogout() {
  sessionStorage.removeItem(SUPER_AUTH_KEY);
  localStorage.removeItem('superAdminToken');
  switchAdminSubTab('requests');
  Toast.show('info', '🔒 تم قفل لوحة إعدادات المدير العام بنجاح.');
}

// --- LIVE HALL IMAGE PREVIEW & FILE UPLOAD HANDLERS ---
function updateHallPreview(hallKey) {
  const inputEl = document.getElementById(`cfg-${hallKey}-img-input`);
  const previewEl = document.getElementById(`cfg-${hallKey}-preview`);
  if (inputEl && previewEl && inputEl.value) {
    previewEl.src = inputEl.value;
  }
}

function handleHallFileUpload(event, hallKey) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const inputEl = document.getElementById(`cfg-${hallKey}-img-input`);
    const previewEl = document.getElementById(`cfg-${hallKey}-preview`);
    if (inputEl) inputEl.value = dataUrl;
    if (previewEl) previewEl.src = dataUrl;
    Toast.show('success', 'تم رفع وتحديث معاينة الصورة بنجاح!');
  };
  reader.readAsDataURL(file);
}

// --- SUPER ADMIN SUBTAB SWITCHER ---
function switchSettingsSubTab(subtabKey) {
  const subtabs = ['halls', 'packages', 'forms', 'site', 'contact', 'policies', 'security', 'backup'];
  subtabs.forEach(key => {
    const btn = document.getElementById(`subtab-btn-${key}`);
    const panel = document.getElementById(`subtab-panel-${key}`);
    if (btn) btn.classList.remove('active');
    if (panel) panel.style.display = 'none';
  });

  const targetBtn = document.getElementById(`subtab-btn-${subtabKey}`);
  const targetPanel = document.getElementById(`subtab-panel-${subtabKey}`);
  if (targetBtn) targetBtn.classList.add('active');
  if (targetPanel) targetPanel.style.display = 'block';

  if (subtabKey === 'backup') {
    loadBackupManager();
  }
}

function updateFileNameDisplay(inputId, displayId) {
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);
  if (input && display) {
    if (input.files && input.files[0]) {
      display.innerText = `تم اختيار: ${input.files[0].name}`;
      display.style.color = '#22c55e';
    } else {
      display.innerText = 'لم يتم اختيار صورة جديدة';
      display.style.color = 'var(--text-muted)';
    }
  }
}

async function loadBackupManager() {
  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/settings/backup/info', { headers });
    const data = await res.json();
    if (data.success) {
      const sizeEl = document.getElementById('backup-size-display');
      const dateEl = document.getElementById('backup-date-display');
      const nameEl = document.getElementById('backup-filename-display');
      if (sizeEl) sizeEl.innerText = data.fileSize || '-- MB';
      if (nameEl) nameEl.innerText = data.filename || 'majarra-site-latest.zip';
      if (dateEl) {
        const d = data.lastModified ? new Date(data.lastModified) : new Date();
        dateEl.innerText = d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
      }
    }
  } catch (err) {
    console.error('Error loading backup info:', err);
  }
}

async function repackageSiteZip() {
  try {
    if (typeof Toast !== 'undefined') Toast.show('info', 'جاري حزم وضغط جميع ملفات الموقع وقاعدة البيانات الآن...');
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/settings/backup/generate', { method: 'POST', headers });
    const data = await res.json();
    if (data.success) {
      if (typeof Toast !== 'undefined') Toast.show('success', data.message || 'تم حزم وتحديث النسخة الاحتياطية بنجاح!');
      loadBackupManager();
    } else {
      if (typeof Toast !== 'undefined') Toast.show('error', data.message || 'حدث خطأ أثناء حزم الملف');
    }
  } catch (err) {
    console.error('Error repackaging site ZIP:', err);
    if (typeof Toast !== 'undefined') Toast.show('error', 'تعذر الاتصال بالخادم لحزم النسخة');
  }
}

function downloadSiteBackupZip() {
  const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
  const url = `/api/admin/settings/backup/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'majarra-site-latest.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof Toast !== 'undefined') Toast.show('success', 'جاري بدء تحميل ملف النسخة الاحتياطية (ZIP)...');
}

function handleLogoFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const inputEl = document.getElementById('cfg-logo-img-input');
    const previewEl = document.getElementById('cfg-logo-preview');
    if (inputEl) inputEl.value = dataUrl;
    if (previewEl) previewEl.src = dataUrl;
    Toast.show('success', 'تم رفع وتحديث معاينة شعار المركز بنجاح!');
  };
  reader.readAsDataURL(file);
}

function updateLogoPreview() {
  const inputEl = document.getElementById('cfg-logo-img-input');
  const previewEl = document.getElementById('cfg-logo-preview');
  if (inputEl && previewEl) previewEl.src = inputEl.value;
}

// --- APPLY SITE SETTINGS TO PUBLIC UI & ADMIN FORM ---
function applySiteSettingsToUI() {
  if (document.getElementById('cfg-admin-username')) {
    document.getElementById('cfg-admin-username').value = siteSettings.adminUsername || 'admin';
  }

  const fm = siteSettings.forms || {};
  if (fm.shareIdea) {
    if (document.getElementById('cfg-form-idea-active')) document.getElementById('cfg-form-idea-active').value = fm.shareIdea.active !== false ? 'true' : 'false';
    if (document.getElementById('cfg-form-idea-email')) document.getElementById('cfg-form-idea-email').value = fm.shareIdea.notificationEmail || 'nur.beik1237@gmail.com';
    if (document.getElementById('cfg-form-idea-title')) document.getElementById('cfg-form-idea-title').value = fm.shareIdea.title || 'شارك فكرتــك مع مركز مــجرة المجتمعي';
    if (document.getElementById('cfg-form-idea-subtitle')) document.getElementById('cfg-form-idea-subtitle').value = fm.shareIdea.subtitle || 'هل لديك مهارة، أو فكرة لورشة، تدريب، محاضرة...';
  }
  if (fm.workshopGen) {
    if (document.getElementById('cfg-form-workshop-active')) document.getElementById('cfg-form-workshop-active').value = fm.workshopGen.active !== false ? 'true' : 'false';
    if (document.getElementById('cfg-form-workshop-seats')) document.getElementById('cfg-form-workshop-seats').value = fm.workshopGen.maxSeats || 30;
    if (document.getElementById('cfg-form-workshop-title')) document.getElementById('cfg-form-workshop-title').value = fm.workshopGen.title || 'ورشة العمل والتدريب التفاعلي';
  }

  const h = siteSettings.halls || {};

  // Ofoq Hall
  if (h.ofoq) {
    if (document.getElementById('cfg-ofoq-name')) document.getElementById('cfg-ofoq-name').value = h.ofoq.name || 'قاعة أفــُـق';
    if (document.getElementById('cfg-ofoq-cap')) document.getElementById('cfg-ofoq-cap').value = h.ofoq.cap || 20;
    if (document.getElementById('cfg-ofoq-desc')) document.getElementById('cfg-ofoq-desc').value = h.ofoq.desc || '';
    if (document.getElementById('cfg-ofoq-rate')) document.getElementById('cfg-ofoq-rate').value = h.ofoq.hourlyRate || 150;
    if (document.getElementById('cfg-ofoq-status')) document.getElementById('cfg-ofoq-status').value = h.ofoq.status || 'active';
    if (document.getElementById('cfg-ofoq-img-input')) document.getElementById('cfg-ofoq-img-input').value = h.ofoq.image || 'assets/workshop.jpg';
    if (document.getElementById('cfg-ofoq-preview')) document.getElementById('cfg-ofoq-preview').src = h.ofoq.image || 'assets/workshop.jpg';

    let title = h.ofoq.name || 'قاعة أفــُـق';
    let desc = h.ofoq.desc || 'مساحة مريحة ومجهزة بالكامل مناسبة للورش التدريبية والجلسات التفاعلية والأنشطة الشبابية.';
    let cap = h.ofoq.cap || 20;
    let capTag = `سعة ${cap} شخص`;

    if (currentLang === 'tr') {
      if (title === 'قاعة أفــُـق') title = 'Ufuk Salonu';
      if (desc.includes('مساحة مريحة')) desc = 'Eğitim atölyeleri, etkileşimli oturumlar ve gençlik etkinlikleri için tam donanımlı konforlu alan.';
      capTag = `Kapasite: ${cap} Kişi`;
    } else if (currentLang === 'en') {
      if (title === 'قاعة أفــُـق') title = 'Ofoq Hall';
      if (desc.includes('مساحة مريحة')) desc = 'A fully equipped comfortable space suitable for training workshops, interactive sessions, and youth activities.';
      capTag = `Capacity: ${cap} Persons`;
    }

    if (document.getElementById('hall-ofoq-title')) document.getElementById('hall-ofoq-title').innerText = title;
    if (document.getElementById('hall-ofoq-cap-tag')) document.getElementById('hall-ofoq-cap-tag').innerText = capTag;
    if (document.getElementById('hall-ofoq-desc')) document.getElementById('hall-ofoq-desc').innerText = desc;
    if (document.getElementById('hall-ofoq-img')) document.getElementById('hall-ofoq-img').src = h.ofoq.image || 'assets/workshop.jpg';
  }

  // Diwan Hall
  if (h.diwan) {
    if (document.getElementById('cfg-diwan-name')) document.getElementById('cfg-diwan-name').value = h.diwan.name || 'قاعة ديـــوان';
    if (document.getElementById('cfg-diwan-cap')) document.getElementById('cfg-diwan-cap').value = h.diwan.cap || 30;
    if (document.getElementById('cfg-diwan-desc')) document.getElementById('cfg-diwan-desc').value = h.diwan.desc || '';
    if (document.getElementById('cfg-diwan-rate')) document.getElementById('cfg-diwan-rate').value = h.diwan.hourlyRate || 250;
    if (document.getElementById('cfg-diwan-status')) document.getElementById('cfg-diwan-status').value = h.diwan.status || 'active';
    if (document.getElementById('cfg-diwan-img-input')) document.getElementById('cfg-diwan-img-input').value = h.diwan.image || 'assets/grand.jpg';
    if (document.getElementById('cfg-diwan-preview')) document.getElementById('cfg-diwan-preview').src = h.diwan.image || 'assets/grand.jpg';

    let title = h.diwan.name || 'قاعة ديـــوان';
    let desc = h.diwan.desc || 'قاعة واسعة وأنيقة مخصصة للندوات، المحاضرات، والأنشطة الثقافية والمجتمعية الكبرى.';
    let cap = h.diwan.cap || 30;
    let capTag = `سعة ${cap} شخص`;

    if (currentLang === 'tr') {
      if (title === 'قاعة ديـــوان') title = 'Divan Salonu';
      if (desc.includes('قاعة واسعة')) desc = 'Seminerler, konferanslar ve büyük kültürel/toplumsal etkinlikler için tasarlanmış geniş ve şık salon.';
      capTag = `Kapasite: ${cap} Kişi`;
    } else if (currentLang === 'en') {
      if (title === 'قاعة ديـــوان') title = 'Diwan Hall';
      if (desc.includes('قاعة واسعة')) desc = 'A spacious and elegant hall designed for seminars, lectures, and major cultural & community events.';
      capTag = `Capacity: ${cap} Persons`;
    }

    if (document.getElementById('hall-diwan-title')) document.getElementById('hall-diwan-title').innerText = title;
    if (document.getElementById('hall-diwan-cap-tag')) document.getElementById('hall-diwan-cap-tag').innerText = capTag;
    if (document.getElementById('hall-diwan-desc')) document.getElementById('hall-diwan-desc').innerText = desc;
    if (document.getElementById('hall-diwan-img')) document.getElementById('hall-diwan-img').src = h.diwan.image || 'assets/grand.jpg';
  }

  // Sadeem Hall
  if (h.sadeem) {
    if (document.getElementById('cfg-sadeem-name')) document.getElementById('cfg-sadeem-name').value = h.sadeem.name || 'قاعة ســديم';
    if (document.getElementById('cfg-sadeem-cap')) document.getElementById('cfg-sadeem-cap').value = h.sadeem.cap || 18;
    if (document.getElementById('cfg-sadeem-desc')) document.getElementById('cfg-sadeem-desc').value = h.sadeem.desc || '';
    if (document.getElementById('cfg-sadeem-rate')) document.getElementById('cfg-sadeem-rate').value = h.sadeem.hourlyRate || 150;
    if (document.getElementById('cfg-sadeem-status')) document.getElementById('cfg-sadeem-status').value = h.sadeem.status || 'active';
    if (document.getElementById('cfg-sadeem-img-input')) document.getElementById('cfg-sadeem-img-input').value = h.sadeem.image || 'assets/meeting.jpg';
    if (document.getElementById('cfg-sadeem-preview')) document.getElementById('cfg-sadeem-preview').src = h.sadeem.image || 'assets/meeting.jpg';

    let title = h.sadeem.name || 'قاعة ســديم';
    let desc = h.sadeem.desc || 'قاعة اجتماعات مغلقة وهادئة مخصصة لاجتماعات فرق العمل والجلسات الاستشارية وتصوير المحتوى.';
    let cap = h.sadeem.cap || 18;
    let capTag = `سعة ${cap} - ${cap} شخص`;

    if (currentLang === 'tr') {
      if (title === 'قاعة ســديم') title = 'Sedim Salonu';
      if (desc.includes('قاعة اجتماعات')) desc = 'Ekip toplantıları, danışmanlık oturumları ve içerik çekimleri için özel ve sessiz toplantı salonu.';
      capTag = `Kapasite: ${cap} Kişi`;
    } else if (currentLang === 'en') {
      if (title === 'قاعة ســديم') title = 'Sadeem Hall';
      if (desc.includes('قاعة اجتماعات')) desc = 'A quiet, private meeting room dedicated for team meetings, consulting sessions, and content creation.';
      capTag = `Capacity: ${cap} Persons`;
    }

    if (document.getElementById('hall-sadeem-title')) document.getElementById('hall-sadeem-title').innerText = title;
    if (document.getElementById('hall-sadeem-cap-tag')) document.getElementById('hall-sadeem-cap-tag').innerText = capTag;
    if (document.getElementById('hall-sadeem-desc')) document.getElementById('hall-sadeem-desc').innerText = desc;
    if (document.getElementById('hall-sadeem-img')) document.getElementById('hall-sadeem-img').src = h.sadeem.image || 'assets/meeting.jpg';
  }

  // Packages settings UI
  if (siteSettings.packages) {
    const pkg = siteSettings.packages;
    if (pkg.kafo) {
      if (document.getElementById('pkg-kafo-title')) document.getElementById('pkg-kafo-title').value = pkg.kafo.title || 'باقة كَفـُو';
      if (document.getElementById('pkg-kafo-badge')) document.getElementById('pkg-kafo-badge').value = pkg.kafo.badge || '';
      if (document.getElementById('pkg-kafo-subtitle')) document.getElementById('pkg-kafo-subtitle').value = pkg.kafo.subtitle || '';
      if (document.getElementById('pkg-kafo-price')) document.getElementById('pkg-kafo-price').value = pkg.kafo.priceText || 'مجانية 100%';
    }
    if (pkg.alaEyni) {
      if (document.getElementById('pkg-ala-title')) document.getElementById('pkg-ala-title').value = pkg.alaEyni.title || 'باقة على عيني';
      if (document.getElementById('pkg-ala-badge')) document.getElementById('pkg-ala-badge').value = pkg.alaEyni.badge || '';
      if (document.getElementById('pkg-ala-subtitle')) document.getElementById('pkg-ala-subtitle').value = pkg.alaEyni.subtitle || '';
      if (document.getElementById('pkg-ala-ofoq')) document.getElementById('pkg-ala-ofoq').value = pkg.alaEyni.ofoqPrice || '225 TL';
      if (document.getElementById('pkg-ala-diwan')) document.getElementById('pkg-ala-diwan').value = pkg.alaEyni.diwanPrice || '350 TL';
      if (document.getElementById('pkg-ala-sadeem')) document.getElementById('pkg-ala-sadeem').value = pkg.alaEyni.sadeemPrice || '225 TL';
    }
  }

  // Site branding settings UI
  if (siteSettings.site) {
    const s = siteSettings.site;
    if (document.getElementById('cfg-site-name')) document.getElementById('cfg-site-name').value = s.siteName || 'مركز مجرّة المجتمعي';
    if (document.getElementById('cfg-site-tagline')) document.getElementById('cfg-site-tagline').value = s.tagline || '';
    if (document.getElementById('cfg-site-banner')) document.getElementById('cfg-site-banner').value = s.announcementBanner || '';
    if (document.getElementById('cfg-site-hours')) document.getElementById('cfg-site-hours').value = s.workingHours || '';
    if (document.getElementById('cfg-site-maps')) document.getElementById('cfg-site-maps').value = s.addressUrl || '';
    if (document.getElementById('cfg-logo-img-input')) document.getElementById('cfg-logo-img-input').value = s.logoUrl || 'assets/majarra_official_icon.png';
    if (document.getElementById('cfg-logo-preview')) document.getElementById('cfg-logo-preview').src = s.logoUrl || 'assets/majarra_official_icon.png';
  }

  // Contact settings UI
  if (document.getElementById('cfg-admin-phone')) document.getElementById('cfg-admin-phone').value = siteSettings.adminPhone || '+90 538 506 29 89';
  if (document.getElementById('cfg-admin-email')) document.getElementById('cfg-admin-email').value = siteSettings.adminEmail || 'nur.beik1237@gmail.com';
  if (document.getElementById('cfg-admin-insta')) document.getElementById('cfg-admin-insta').value = siteSettings.adminInstagram || 'https://www.instagram.com/majarracommunity/';
  if (document.getElementById('cfg-admin-fb')) document.getElementById('cfg-admin-fb').value = siteSettings.adminFacebook || '';

  // Policies settings UI
  if (siteSettings.policies) {
    const p = siteSettings.policies;
    if (document.getElementById('cfg-policy-terms')) document.getElementById('cfg-policy-terms').value = p.bookingTerms || '';
    if (document.getElementById('cfg-policy-cancel')) document.getElementById('cfg-policy-cancel').value = p.cancellationPolicy || '';
    if (document.getElementById('cfg-policy-footer')) document.getElementById('cfg-policy-footer').value = p.receiptFooterNote || '';
  }

  // Update capacities in HALL_CAPACITIES map
  if (h.ofoq && h.ofoq.cap) HALL_CAPACITIES['قاعة أفــُـق'] = safeNum(h.ofoq.cap);
  if (h.diwan && h.diwan.cap) HALL_CAPACITIES['قاعة ديـــوان'] = safeNum(h.diwan.cap);
  if (h.sadeem && h.sadeem.cap) HALL_CAPACITIES['قاعة ســديم'] = safeNum(h.sadeem.cap);
}

async function getAdminAuthToken() {
  let token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
  if (!token) {
    try {
      const res = await fetch('/api/auth/super-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: siteSettings.superAdminPin || '8888' })
      });
      const data = await res.json();
      if (data && data.token) {
        token = data.token;
        localStorage.setItem('superAdminToken', token);
        localStorage.setItem('adminToken', token);
      }
    } catch (e) {}
  }
  return token;
}

// SAVE HALL SETTINGS FORM
async function saveHallSettings(e) {
  if (e && e.preventDefault) e.preventDefault();

  const newHalls = {
    ofoq: {
      name: document.getElementById('cfg-ofoq-name').value,
      cap: safeNum(document.getElementById('cfg-ofoq-cap').value) || 20,
      hourlyRate: safeNum(document.getElementById('cfg-ofoq-rate').value) || 150,
      status: document.getElementById('cfg-ofoq-status').value || 'active',
      desc: document.getElementById('cfg-ofoq-desc').value,
      image: document.getElementById('cfg-ofoq-img-input').value || 'assets/workshop.jpg'
    },
    diwan: {
      name: document.getElementById('cfg-diwan-name').value,
      cap: safeNum(document.getElementById('cfg-diwan-cap').value) || 30,
      hourlyRate: safeNum(document.getElementById('cfg-diwan-rate').value) || 250,
      status: document.getElementById('cfg-diwan-status').value || 'active',
      desc: document.getElementById('cfg-diwan-desc').value,
      image: document.getElementById('cfg-diwan-img-input').value || 'assets/grand.jpg'
    },
    sadeem: {
      name: document.getElementById('cfg-sadeem-name').value,
      cap: safeNum(document.getElementById('cfg-sadeem-cap').value) || 18,
      hourlyRate: safeNum(document.getElementById('cfg-sadeem-rate').value) || 150,
      status: document.getElementById('cfg-sadeem-status').value || 'active',
      desc: document.getElementById('cfg-sadeem-desc').value,
      image: document.getElementById('cfg-sadeem-img-input').value || 'assets/meeting.jpg'
    }
  };

  siteSettings.halls = newHalls;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/halls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ halls: newHalls })
      });
    } catch (err) {
      console.warn('API save halls settings fallback:', err);
    }
  }

  saveSettingsToStorage();
  applySiteSettingsToUI();
  Toast.show('success', 'تم حفظ وتحديث أسماء، سعات، وأجرة وصور القاعات بنجاح! 🖼️✨');
}

// SAVE PACKAGES SETTINGS
async function savePackagesSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  const packages = {
    kafo: {
      title: document.getElementById('pkg-kafo-title').value,
      badge: document.getElementById('pkg-kafo-badge').value,
      subtitle: document.getElementById('pkg-kafo-subtitle').value,
      priceText: document.getElementById('pkg-kafo-price').value
    },
    alaEyni: {
      title: document.getElementById('pkg-ala-title').value,
      badge: document.getElementById('pkg-ala-badge').value,
      subtitle: document.getElementById('pkg-ala-subtitle').value,
      ofoqPrice: document.getElementById('pkg-ala-ofoq').value,
      diwanPrice: document.getElementById('pkg-ala-diwan').value,
      sadeemPrice: document.getElementById('pkg-ala-sadeem').value
    }
  };
  siteSettings.packages = packages;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ packages })
      });
    } catch (err) { console.warn('API save packages error:', err); }
  }
  saveSettingsToStorage();
  Toast.show('success', 'تم حفظ وتحديث إعدادات وأسعار الباقات بنجاح! 📦✨');
}

// SAVE DYNAMIC FORMS SETTINGS
async function saveFormsSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  const forms = {
    shareIdea: {
      active: document.getElementById('cfg-form-idea-active') ? document.getElementById('cfg-form-idea-active').value === 'true' : true,
      notificationEmail: document.getElementById('cfg-form-idea-email') ? document.getElementById('cfg-form-idea-email').value.trim() : 'nur.beik1237@gmail.com',
      title: document.getElementById('cfg-form-idea-title') ? document.getElementById('cfg-form-idea-title').value.trim() : 'شارك فكرتــك مع مركز مــجرة المجتمعي',
      subtitle: document.getElementById('cfg-form-idea-subtitle') ? document.getElementById('cfg-form-idea-subtitle').value.trim() : 'يسعدنا استقبال أفكارك ومقترحاتك...'
    },
    workshopGen: {
      active: document.getElementById('cfg-form-workshop-active') ? document.getElementById('cfg-form-workshop-active').value === 'true' : true,
      title: document.getElementById('cfg-form-workshop-title') ? document.getElementById('cfg-form-workshop-title').value.trim() : 'ورشة العمل والتدريب التفاعلي',
      maxSeats: document.getElementById('cfg-form-workshop-seats') ? parseInt(document.getElementById('cfg-form-workshop-seats').value) : 30
    }
  };
  siteSettings.forms = forms;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/forms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ forms })
      });
    } catch (err) { console.warn('API save forms settings error:', err); }
  }
  saveSettingsToStorage();
  Toast.show('success', 'تم حفظ وتحديث إعدادات الاستمارات والفعاليات بنجاح! 📋✨');
}

// SAVE SITE BRANDING SETTINGS
async function saveSiteSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  const site = {
    siteName: document.getElementById('cfg-site-name').value,
    tagline: document.getElementById('cfg-site-tagline').value,
    announcementBanner: document.getElementById('cfg-site-banner').value,
    workingHours: document.getElementById('cfg-site-hours').value,
    addressUrl: document.getElementById('cfg-site-maps').value,
    logoUrl: document.getElementById('cfg-logo-img-input').value || 'assets/majarra_official_icon.png'
  };
  siteSettings.site = site;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/site-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ site })
      });
    } catch (err) { console.warn('API save site settings error:', err); }
  }
  saveSettingsToStorage();
  applySiteSettingsToUI();
  Toast.show('success', 'تم حفظ وتحديث هوية وإعلانات الموقع بنجاح! ⚙️✨');
}

// SAVE CONTACT SETTINGS
async function saveContactSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  const phone = document.getElementById('cfg-admin-phone').value;
  const email = document.getElementById('cfg-admin-email').value;
  const instagram = document.getElementById('cfg-admin-insta').value;
  const facebook = document.getElementById('cfg-admin-fb').value;

  siteSettings.adminPhone = phone;
  siteSettings.adminEmail = email;
  siteSettings.adminInstagram = instagram;
  siteSettings.adminFacebook = facebook;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminPhone: phone })
      });
      await fetch('/api/admin/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminEmail: email })
      });
      await fetch('/api/admin/settings/instagram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminInstagram: instagram, adminFacebook: facebook })
      });
    } catch (err) { console.warn('API save contact error:', err); }
  }
  saveSettingsToStorage();
  applySiteSettingsToUI();
  Toast.show('success', 'تم حفظ وتحديث كافة معلومات التواصل والحسابات بنجاح! 📞✨');
}

// SAVE POLICIES SETTINGS
async function savePoliciesSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  const policies = {
    bookingTerms: document.getElementById('cfg-policy-terms').value,
    cancellationPolicy: document.getElementById('cfg-policy-cancel').value,
    receiptFooterNote: document.getElementById('cfg-policy-footer').value
  };
  siteSettings.policies = policies;

  const token = await getAdminAuthToken();
  if (token) {
    try {
      await fetch('/api/admin/settings/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ policies })
      });
    } catch (err) { console.warn('API save policies error:', err); }
  }
  saveSettingsToStorage();
  Toast.show('success', 'تم حفظ وتحديث الشروط وسياسات وسندات الحجز بنجاح! 📜✨');
}


// --- STATS DASHBOARD WITH DEFENSIVE CALCULATION ---
function updateStats() {
  const total = bookings.length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const accepted = bookings.filter(b => b.status === 'accepted').length;
  
  const acceptedBookings = bookings.filter(b => b.status === 'accepted');
  const totalAttendees = acceptedBookings.reduce((sum, b) => sum + safeNum(b.attendeesCount), 0);

  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const acceptedEl = document.getElementById('stat-accepted');
  const attendeesEl = document.getElementById('stat-attendees');

  if (totalEl) totalEl.innerText = total;
  if (pendingEl) pendingEl.innerText = pending;
  if (acceptedEl) acceptedEl.innerText = accepted;
  if (attendeesEl) attendeesEl.innerText = totalAttendees;

  const badgeEl = document.getElementById('pending-badge-count');
  if (badgeEl) badgeEl.innerText = pending;
}

// --- INTERACTIVE CLICKABLE STAT CARD DETAIL MODAL BREAKDOWN ---
function openStatDetailModal(type) {
  const modal = document.getElementById('stat-detail-modal');
  const titleEl = document.getElementById('stat-modal-title');
  const subtitleEl = document.getElementById('stat-modal-subtitle');
  const bodyEl = document.getElementById('stat-modal-body');

  if (!modal || !bodyEl) return;

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  if (type === 'attendees') {
    titleEl.innerHTML = '<i class="fa-solid fa-users" style="color: var(--brand-peach);"></i> توزيع إجمالي الحضور حسب الفعاليات والأيام';
    subtitleEl.innerText = 'عرض تفصيلي لأعداد الحضور المتوقعة لكافة الفعاليات المقبولة بالتقويم';

    const acceptedList = bookings.filter(b => b.status === 'accepted');
    
    if (acceptedList.length === 0) {
      bodyEl.innerHTML = '<div class="alert-banner info">لا توجد فعاليات مقبولة ومثبتة في التقويم حالياً.</div>';
    } else {
      const groupedByDate = {};
      acceptedList.forEach(b => {
        if (!groupedByDate[b.startDate]) groupedByDate[b.startDate] = [];
        groupedByDate[b.startDate].push(b);
      });

      const sortedDates = Object.keys(groupedByDate).sort();

      let html = '';
      sortedDates.forEach(dateStr => {
        const dateObj = new Date(dateStr);
        const dayName = dayNames[dateObj.getDay()] || '';
        const dayEvents = groupedByDate[dateStr];
        const dayTotalAttendees = dayEvents.reduce((sum, item) => sum + safeNum(item.attendeesCount), 0);

        html += `
          <div class="stat-day-block">
            <div class="stat-day-header">
              <span><i class="fa-solid fa-calendar-day"></i> ${dayName} (${dateStr})</span>
              <span class="stat-day-total-tag">👥 ${dayTotalAttendees} زائر (${dayEvents.length} فعاليات)</span>
            </div>
        `;

        dayEvents.forEach(evt => {
          const cleanHall = getCleanHallName(evt.hallName);
          const start12h = formatTime12h(evt.startTime);
          const end12h = formatTime12h(evt.endTime);
          html += `
            <div class="stat-event-row">
              <div class="stat-event-info">
                <span class="stat-event-title">${evt.eventTitle} (${evt.id})</span>
                <span class="stat-event-meta"><i class="fa-solid fa-door-closed" style="color: var(--brand-purple);"></i> ${cleanHall} | <i class="fa-solid fa-clock"></i> ${start12h} - ${end12h} | <i class="fa-solid fa-user"></i> ${evt.executorName || evt.organizerName}</span>
              </div>
              <span class="stat-event-attendees"><i class="fa-solid fa-user-group"></i> ${evt.attendeesCount} شخص</span>
            </div>
          `;
        });

        html += `</div>`;
      });

      bodyEl.innerHTML = html;
    }
  } else if (type === 'accepted') {
    titleEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> الفعاليات المقبولة والمثبتة في التقويم';
    subtitleEl.innerText = 'قائمة لكافة الحجوزات التي تم اعتمادها وإدراجها في الجدول المباشر';

    const acceptedList = bookings.filter(b => b.status === 'accepted');
    if (acceptedList.length === 0) {
      bodyEl.innerHTML = '<div class="alert-banner info">لا توجد فعاليات مقبولة في التقويم حالياً.</div>';
    } else {
      let html = '<div class="stat-day-block">';
      acceptedList.forEach(evt => {
        const cleanHall = getCleanHallName(evt.hallName);
        const start12h = formatTime12h(evt.startTime);
        const end12h = formatTime12h(evt.endTime);
        html += `
          <div class="stat-event-row">
            <div class="stat-event-info">
              <span class="stat-event-title">${evt.eventTitle} (${evt.id})</span>
              <span class="stat-event-meta"><i class="fa-solid fa-door-closed" style="color: var(--brand-purple);"></i> ${cleanHall} | <i class="fa-solid fa-calendar"></i> ${evt.startDate} (${start12h} - ${end12h}) | <i class="fa-solid fa-user"></i> ${evt.organizerName}</span>
            </div>
            <button class="btn btn-outline btn-sm" onclick="closeStatDetailModal(); showTicketModal('${evt.id}');"><i class="fa-solid fa-receipt"></i> الإيصال</button>
          </div>
        `;
      });
      html += '</div>';
      bodyEl.innerHTML = html;
    }
  } else if (type === 'pending') {
    titleEl.innerHTML = '<i class="fa-solid fa-hourglass-half" style="color: var(--brand-gold);"></i> الطلبات المعلقة قيد المراجعة';
    subtitleEl.innerText = 'طلبات حجز جديدة بانتظار موافقة أو رفض إدارة المركز';

    const pendingList = bookings.filter(b => b.status === 'pending');
    if (pendingList.length === 0) {
      bodyEl.innerHTML = '<div class="alert-banner success"><i class="fa-solid fa-check"></i> ممتااااز! لا توجد أي طلبات معلقة تنتظر القرار حالياً.</div>';
    } else {
      let html = '<div class="stat-day-block">';
      pendingList.forEach(evt => {
        const cleanHall = getCleanHallName(evt.hallName);
        const start12h = formatTime12h(evt.startTime);
        const end12h = formatTime12h(evt.endTime);
        html += `
          <div class="stat-event-row">
            <div class="stat-event-info">
              <span class="stat-event-title">${evt.eventTitle} (${evt.id})</span>
              <span class="stat-event-meta"><i class="fa-solid fa-door-closed" style="color: var(--brand-purple);"></i> ${cleanHall} | <i class="fa-solid fa-calendar"></i> ${evt.startDate} | <i class="fa-solid fa-clock"></i> ${start12h} - ${end12h} | <i class="fa-solid fa-users"></i> ${evt.attendeesCount} شخص</span>
            </div>
            <div class="action-btn-group">
              <button class="btn btn-sm" style="background: #10b981; color: white; font-weight: 800;" onclick="closeStatDetailModal(); updateBookingStatus('${evt.id}', 'accepted');"><i class="fa-solid fa-check"></i> قبول</button>
              <button class="btn btn-sm" style="background: #ef4444; color: white; font-weight: 800;" onclick="closeStatDetailModal(); updateBookingStatus('${evt.id}', 'rejected');"><i class="fa-solid fa-xmark"></i> رفض</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
      bodyEl.innerHTML = html;
    }
  } else {
    titleEl.innerHTML = '<i class="fa-solid fa-calendar-check" style="color: var(--brand-purple);"></i> إجمالي كافة الطلبات المسجلة بالنظام';
    subtitleEl.innerText = 'سجل شامل لكافة الطلبات الواردة (مقبولة، معلقة، ومرفوضة)';

    let html = '<div class="stat-day-block">';
    bookings.forEach(evt => {
      const cleanHall = getCleanHallName(evt.hallName);
      const statusBadge = evt.status === 'accepted' 
        ? '<span class="badge badge-accepted">مقبول</span>' 
        : (evt.status === 'pending' ? '<span class="badge badge-pending">معلق</span>' : '<span class="badge badge-rejected">مرفوض</span>');

      html += `
        <div class="stat-event-row">
          <div class="stat-event-info">
            <span class="stat-event-title">${evt.eventTitle} (${evt.id}) ${statusBadge}</span>
            <span class="stat-event-meta"><i class="fa-solid fa-door-closed" style="color: var(--brand-purple);"></i> ${cleanHall} | <i class="fa-solid fa-calendar"></i> ${evt.startDate} | <i class="fa-solid fa-user"></i> ${evt.organizerName}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    bodyEl.innerHTML = html;
  }

  modal.style.display = 'flex';
}

function closeStatDetailModal() {
  const modal = document.getElementById('stat-detail-modal');
  if (modal) modal.style.display = 'none';
}

// --- 12-HOUR TIME FORMATTER (Google Calendar Style e.g. 1:30 م or 9:00 ص) ---
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

// --- PUBLIC AVAILABILITY READ-ONLY CALENDAR ---
function changePublicCalendarMonth(delta) {
  // Always reset day to 1 before changing month to prevent 31st overflow skipping bug (e.g. Aug 31 + 1 month -> Sep 31 -> Oct 1)
  const targetYear = currentPublicCalendarDate.getFullYear();
  const targetMonth = currentPublicCalendarDate.getMonth() + delta;
  currentPublicCalendarDate = new Date(targetYear, targetMonth, 1);
  renderPublicAvailabilityCalendar();
}

function getCleanHallName(fullHallName) {
  if (!fullHallName) return currentLang === 'tr' ? 'Salon' : (currentLang === 'en' ? 'Hall' : 'القاعة');
  let clean = fullHallName.replace(/\(سعة.*?\)/g, '').trim();
  if (clean.includes('أفــُـق') || clean.includes('أفق') || clean.includes('Ofoq')) {
    return currentLang === 'tr' ? 'Ufuk Salonu' : (currentLang === 'en' ? 'Ofoq Hall' : 'قاعة أفــُـق');
  }
  if (clean.includes('ديـــوان') || clean.includes('ديوان') || clean.includes('Diwan')) {
    return currentLang === 'tr' ? 'Divan Salonu' : (currentLang === 'en' ? 'Diwan Hall' : 'قاعة ديـــوان');
  }
  if (clean.includes('ســديم') || clean.includes('سديم') || clean.includes('Sadeem')) {
    return currentLang === 'tr' ? 'Sedim Salonu' : (currentLang === 'en' ? 'Sadeem Hall' : 'قاعة ســديم');
  }
  if (clean.includes('المركز كلياً') || clean.includes('Tüm Merkez') || clean.includes('Whole Center')) {
    return currentLang === 'tr' ? 'Tüm Merkez' : (currentLang === 'en' ? 'Whole Center' : 'المركز كلياً');
  }
  return clean || fullHallName;
}

let publicCalendarViewMode = 'grid'; // 'grid' or 'agenda'

function setPublicCalendarViewMode(mode) {
  publicCalendarViewMode = mode;
  const gridContainer = document.getElementById('public-calendar-grid-container');
  const agendaContainer = document.getElementById('public-calendar-agenda-container');
  const btnGrid = document.getElementById('btn-view-grid');
  const btnAgenda = document.getElementById('btn-view-agenda');
  const mobileHint = document.getElementById('public-mobile-hint');

  if (mode === 'agenda') {
    if (gridContainer) gridContainer.style.display = 'none';
    if (agendaContainer) agendaContainer.style.display = 'block';
    if (mobileHint) mobileHint.style.display = 'none';

    if (btnGrid) {
      btnGrid.classList.remove('active');
      btnGrid.style.background = 'transparent';
      btnGrid.style.color = 'var(--text-secondary)';
    }
    if (btnAgenda) {
      btnAgenda.classList.add('active');
      btnAgenda.style.background = 'var(--brand-purple)';
      btnAgenda.style.color = '#ffffff';
    }
    renderPublicCalendarAgendaList();
  } else {
    if (gridContainer) gridContainer.style.display = 'block';
    if (agendaContainer) agendaContainer.style.display = 'none';
    if (mobileHint) mobileHint.style.display = 'block';

    if (btnGrid) {
      btnGrid.classList.add('active');
      btnGrid.style.background = 'var(--brand-purple)';
      btnGrid.style.color = '#ffffff';
    }
    if (btnAgenda) {
      btnAgenda.classList.remove('active');
      btnAgenda.style.background = 'transparent';
      btnAgenda.style.color = 'var(--text-secondary)';
    }
    renderPublicAvailabilityCalendar();
  }
}

function renderPublicCalendarAgendaList() {
  const container = document.getElementById('public-calendar-agenda-list');
  const titleEl = document.getElementById('public-calendar-month-title');
  const hallFilter = document.getElementById('public-hall-filter') ? document.getElementById('public-hall-filter').value : 'all';

  if (!container) return;

  const year = currentPublicCalendarDate.getFullYear();
  const month = currentPublicCalendarDate.getMonth();

  const monthNamesArabic = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthNamesTurkish = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthNamesEnglish = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNamesArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayNamesTurkish = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const dayNamesEnglish = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let mNames = monthNamesArabic;
  let dNames = dayNamesArabic;
  if (currentLang === 'tr') {
    mNames = monthNamesTurkish;
    dNames = dayNamesTurkish;
  } else if (currentLang === 'en') {
    mNames = monthNamesEnglish;
    dNames = dayNamesEnglish;
  }

  if (titleEl) {
    titleEl.innerText = `${mNames[month]} ${year}`;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  const targetPrefix = `${year}-${monthStr}`;

  let monthBookings = bookings.filter(b => b.status === 'accepted' && b.startDate && b.startDate.startsWith(targetPrefix));

  if (hallFilter !== 'all') {
    monthBookings = monthBookings.filter(b => b.hallName === hallFilter);
  }

  let bannerText = `<i class="fa-solid fa-mobile-screen-button"></i> جدول الأجندة اليومية المخصص للهواتف (شهر ${mNames[month]})`;
  let bannerSub = `اضغط على أي يوم للحجز الفوري ⚡`;
  let todayText = `اليوم`;
  let bookDayText = `<i class="fa-solid fa-plus"></i> احجز هذا اليوم`;
  let freeDayText = `<i class="fa-solid fa-circle-check"></i> جميع قاعات المركز متاحة بالكامل للحجز بهذا اليوم!`;

  if (currentLang === 'tr') {
    bannerText = `<i class="fa-solid fa-mobile-screen-button"></i> Mobil Cihazlar İçin Günlük Etkinlik Ajandası (${mNames[month]})`;
    bannerSub = `Anında rezervasyon yapmak için istediğiniz güne tıklayın ⚡`;
    todayText = `Bugün`;
    bookDayText = `<i class="fa-solid fa-plus"></i> Bu Tarihe Rezervasyon Yap`;
    freeDayText = `<i class="fa-solid fa-circle-check"></i> Bu gün tüm salonlar tamamen uygundur!`;
  } else if (currentLang === 'en') {
    bannerText = `<i class="fa-solid fa-mobile-screen-button"></i> Daily Event Agenda for Mobile (${mNames[month]})`;
    bannerSub = `Click any day to book instantly ⚡`;
    todayText = `Today`;
    bookDayText = `<i class="fa-solid fa-plus"></i> Book This Date`;
    freeDayText = `<i class="fa-solid fa-circle-check"></i> All halls fully available for booking on this day!`;
  }

  let html = `
    <div style="background: rgba(232, 198, 119, 0.08); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(232, 198, 119, 0.25); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <span style="color: var(--brand-gold); font-size: 0.88rem; font-weight: 700;">
        ${bannerText}
      </span>
      <span style="font-size: 0.8rem; color: var(--text-secondary);">
        ${bannerSub}
      </span>
    </div>
  `;

  let daysWithContentCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateFormatted = `${year}-${monthStr}-${dayStr}`;
    const dateObj = new Date(year, month, day);
    const dayName = dNames[dateObj.getDay()];

    const dayEvts = monthBookings.filter(b => b.startDate === dateFormatted);
    dayEvts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    // Render day card
    const isToday = (dateFormatted === new Date().toISOString().slice(0, 10));
    const todayBorder = isToday ? 'border: 2px solid var(--brand-gold);' : 'border: 1px solid var(--glass-border);';

    html += `
      <div class="agenda-day-card" style="background: var(--bg-card); ${todayBorder} border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.25); transition: transform 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 900; font-size: 1.1rem; color: var(--brand-gold);">
              <i class="fa-solid fa-calendar-day"></i> ${dayName} ${day} ${mNames[month]}
            </span>
            ${isToday ? `<span class="badge" style="background: var(--brand-gold); color: #0f172a; font-size: 0.72rem; font-weight: 800;">${todayText}</span>` : ''}
          </div>

          <button class="btn btn-primary btn-sm" onclick="openBookingModalWithDate('${dateFormatted}')" style="font-size: 0.8rem; padding: 6px 12px;">
            ${bookDayText}
          </button>
        </div>
    `;

    if (dayEvts.length > 0) {
      daysWithContentCount++;
      dayEvts.forEach(evt => {
        const shortHall = getCleanHallName(evt.hallName);
        const start12h = formatTime12h(evt.startTime);
        const end12h = formatTime12h(evt.endTime);

        let hallClass = 'hall-ofoq-badge';
        if (evt.hallName.includes('ديـــوان')) hallClass = 'hall-diwan-badge';
        else if (evt.hallName.includes('ســديم')) hallClass = 'hall-sadeem-badge';
        else if (evt.hallName.includes('المركز كلياً')) hallClass = 'hall-full-badge';

        html += `
          <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; border-right: 4px solid var(--brand-purple); display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span style="font-weight: 800; font-size: 0.98rem; color: var(--text-primary);">
                <i class="fa-solid fa-circle" style="font-size: 0.6rem; color: #e1306c; vertical-align: middle;"></i> ${evt.eventTitle}
              </span>
              <span class="event-hall ${hallClass}" style="padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.78rem;">
                <i class="fa-solid fa-door-closed"></i> ${shortHall}
              </span>
            </div>
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--text-secondary); margin-top: 2px;">
              <span><i class="fa-solid fa-building-flag" style="color: var(--brand-purple);"></i> ${evt.executorName}</span>
              <span><i class="fa-solid fa-clock" style="color: var(--accent-emerald);"></i> ${start12h} - ${end12h}</span>
            </div>
          </div>
        `;
      });
    } else {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; color: #10b981; font-size: 0.86rem; font-weight: 600;">
          <span>${freeDayText}</span>
        </div>
      `;
    }

    html += `</div>`;
  }

  container.innerHTML = html;
}

function openBookingModalWithDate(dateStr) {
  window.location.href = `/book.html?date=${encodeURIComponent(dateStr)}`;
}

function createRichCalendarEventCard(evt, isAdmin = false) {
  const item = document.createElement('div');
  const hallStr = safeStr(evt.hallId || evt.hallName);
  
  let hallBadgeClass = 'hall-ofoq-badge';
  let shortHallName = 'أفـُـق';
  let hallDoorIcon = '<i class="fa-solid fa-door-open" style="font-size: 0.7rem; color: var(--brand-gold);"></i>';

  if (hallStr.includes('ديـــوان') || hallStr.includes('diwan')) {
    hallBadgeClass = 'hall-diwan-badge';
    shortHallName = 'ديــوان';
    hallDoorIcon = '<i class="fa-solid fa-door-open" style="font-size: 0.7rem; color: var(--brand-gold);"></i>';
  } else if (hallStr.includes('ســديم') || hallStr.includes('sadeem')) {
    hallBadgeClass = 'hall-sadeem-badge';
    shortHallName = 'سَــديم';
    hallDoorIcon = '<i class="fa-solid fa-door-open" style="font-size: 0.7rem; color: var(--brand-gold);"></i>';
  } else if (hallStr.includes('المركز كلياً') || hallStr.includes('full')) {
    hallBadgeClass = 'hall-full-badge';
    shortHallName = 'المركز كلياً';
    hallDoorIcon = '<i class="fa-solid fa-building" style="font-size: 0.7rem; color: var(--brand-gold);"></i>';
  }

  item.className = `public-cal-event-item ${hallBadgeClass}`;

  const start12h = formatTime12h(evt.startTime);
  const editBtnHtml = isAdmin 
    ? `<i class="fa-solid fa-pen-to-square edit-evt-icon" style="font-size: 0.7rem; cursor: pointer;" title="تعديل الحجز" onclick="event.stopPropagation(); openEditModal('${evt.id}')"></i>` 
    : '';

  item.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 0.68rem; margin-bottom: 2px;">
      <span style="color: var(--brand-gold); font-weight: 800; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
        <i class="fa-regular fa-clock" style="font-size: 0.65rem;"></i> ${start12h}
      </span>
      <span style="display: flex; align-items: center; gap: 3px; font-weight: 700; color: #cbd5e1; white-space: nowrap;">
        ${hallDoorIcon} <span>${shortHallName}</span> ${editBtnHtml}
      </span>
    </div>
    <div style="font-weight: 800; color: #ffffff; font-size: 0.76rem; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; width: 100%;">
      ${evt.eventTitle}
    </div>
  `;

  item.onclick = (e) => {
    e.stopPropagation();
    if (isAdmin) {
      openEditModal(evt.id);
    } else {
      openPublicEventDetailModal(evt.id);
    }
  };

  return item;
}

function renderPublicAvailabilityCalendar() {
  if (publicCalendarViewMode === 'agenda') {
    renderPublicCalendarAgendaList();
    return;
  }

  const gridEl = document.getElementById('public-calendar-grid-days');
  const titleEl = document.getElementById('public-calendar-month-title');
  const hallFilter = document.getElementById('public-hall-filter') ? document.getElementById('public-hall-filter').value : 'all';

  if (!gridEl || !titleEl) return;

  const year = currentPublicCalendarDate.getFullYear();
  const month = currentPublicCalendarDate.getMonth();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthNamesTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let mNames = monthNamesAr;
  if (currentLang === 'tr') mNames = monthNamesTr;
  else if (currentLang === 'en') mNames = monthNamesEn;

  titleEl.innerText = `${mNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  gridEl.innerHTML = '';

  // 1. Previous Month Days Padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month-cell';
    cell.innerHTML = `<div class="day-cell-header"><span class="cal-day-number muted-day-num">${dayNum}</span></div>`;
    gridEl.appendChild(cell);
  }

  // 2. Current Month Days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${monthStr}-${dayStr}`;

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';

    const isToday = (year === todayY && month === todayM && day === todayD);
    if (isToday) cell.classList.add('today-cell');

    let dayEvents = bookings.filter(b => b.status === 'accepted' && b.startDate === dateString);
    
    if (hallFilter !== 'all') {
      dayEvents = dayEvents.filter(b => b.hallName === hallFilter);
    }

    const dayNumHtml = isToday 
      ? `<span class="cal-day-number today-badge">${day}</span>` 
      : `<span class="cal-day-number">${day}</span>`;

    const countBadgeHtml = dayEvents.length > 0
      ? `<span class="day-events-count-badge">${dayEvents.length} حجز</span>`
      : '';

    let cellTopHtml = `<div class="day-cell-header">${dayNumHtml}${countBadgeHtml}</div>`;
    cell.innerHTML = cellTopHtml;

    if (dayEvents.length > 0) {
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events-container';

      dayEvents.forEach(evt => {
        const item = createRichCalendarEventCard(evt, false);
        eventsContainer.appendChild(item);
      });

      cell.appendChild(eventsContainer);
    }

    gridEl.appendChild(cell);
  }

  // 3. Next Month Days Padding
  const totalRendered = firstDay + daysInMonth;
  const targetTotalGrid = totalRendered > 35 ? 42 : 35;
  const remainingCells = targetTotalGrid - totalRendered;

  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month-cell';
    
    let dayText = String(dayNum);
    if (dayNum === 1) {
      const nextMonthIdx = (month + 1) % 12;
      dayText = `1 ${mNames[nextMonthIdx]}`;
    }

    cell.innerHTML = `<div class="day-cell-header"><span class="cal-day-number muted-day-num">${dayText}</span></div>`;
    gridEl.appendChild(cell);
  }
}

// --- ADMIN INTERACTIVE CALENDAR WITH EDIT & ADD ACCESS ---
function changeCalendarMonth(delta) {
  const targetYear = currentCalendarDate.getFullYear();
  const targetMonth = currentCalendarDate.getMonth() + delta;
  currentCalendarDate = new Date(targetYear, targetMonth, 1);
  renderCalendarView();
}

function resetAdminCalendarToToday() {
  currentCalendarDate = new Date();
  currentCalendarDate.setDate(1);
  renderCalendarView();
}

function renderCalendarView() {
  const gridEl = document.getElementById('calendar-grid-days');
  const titleEl = document.getElementById('calendar-month-title');

  if (!gridEl || !titleEl) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthNamesTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let mNames = monthNamesAr;
  if (currentLang === 'tr') mNames = monthNamesTr;
  else if (currentLang === 'en') mNames = monthNamesEn;

  titleEl.innerText = `${mNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  gridEl.innerHTML = '';

  // 1. Previous Month Days Padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month-cell';
    cell.innerHTML = `<div class="day-cell-header"><span class="cal-day-number muted-day-num">${dayNum}</span></div>`;
    gridEl.appendChild(cell);
  }

  // 2. Current Month Days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${monthStr}-${dayStr}`;

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';

    const isToday = (year === todayY && month === todayM && day === todayD);
    if (isToday) cell.classList.add('today-cell');

    const dayEvents = bookings.filter(b => b.startDate === dateString);

    const dayNumHtml = isToday 
      ? `<span class="cal-day-number today-badge">${day}</span>` 
      : `<span class="cal-day-number">${day}</span>`;

    const countBadgeHtml = dayEvents.length > 0
      ? `<span class="day-events-count-badge">${dayEvents.length} حجز</span>`
      : '';

    let cellTopHtml = `<div class="day-cell-header">${dayNumHtml}${countBadgeHtml}</div>`;
    cell.innerHTML = cellTopHtml;

    if (dayEvents.length > 0) {
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events-container';

      dayEvents.forEach(evt => {
        const item = createRichCalendarEventCard(evt, true);
        eventsContainer.appendChild(item);
      });

      cell.appendChild(eventsContainer);
    }

    gridEl.appendChild(cell);
  }

  // 3. Next Month Days Padding
  const totalRendered = firstDay + daysInMonth;
  const targetTotalGrid = totalRendered > 35 ? 42 : 35;
  const remainingCells = targetTotalGrid - totalRendered;

  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month-cell';
    
    let dayText = String(dayNum);
    if (dayNum === 1) {
      const nextMonthIdx = (month + 1) % 12;
      dayText = `1 ${mNames[nextMonthIdx]}`;
    }

    cell.innerHTML = `<div class="day-cell-header"><span class="cal-day-number muted-day-num">${dayText}</span></div>`;
    gridEl.appendChild(cell);
  }
}

// --- EDIT & MANUAL CALENDAR BOOKING MODAL ---
function openEditModal(bookingId) {
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  document.getElementById('editBookingId').value = booking.id;
  document.getElementById('editTitle').value = booking.eventTitle;
  document.getElementById('editOrganizer').value = booking.organizerName;
  document.getElementById('editExecutor').value = booking.executorName;
  document.getElementById('editHall').value = booking.hallName;
  document.getElementById('editStatus').value = booking.status;
  document.getElementById('editStartDate').value = booking.startDate;
  document.getElementById('editAttendees').value = booking.attendeesCount;
  document.getElementById('editFeeAmount').value = booking.feeAmount || (booking.isPaidEvent === 'نعم' ? 'تحدد لاحقاً بالليرة التركية (TL)' : '0 TL (نشاط مجاني)');
  document.getElementById('editStartTime').value = booking.startTime;
  document.getElementById('editEndTime').value = booking.endTime;

  document.getElementById('edit-modal-title').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> تعديل حجز (${booking.id})`;
  document.getElementById('edit-event-modal').style.display = 'flex';
}

function openManualCalendarModal() {
  const newId = 'MJR-' + (Math.floor(1000 + Math.random() * 9000));
  document.getElementById('editBookingId').value = newId;
  document.getElementById('editTitle').value = '';
  document.getElementById('editOrganizer').value = '';
  document.getElementById('editExecutor').value = '';
  document.getElementById('editHall').value = 'قاعة أفــُـق (سعة القاعة 20)';
  document.getElementById('editStatus').value = 'accepted';
  document.getElementById('editStartDate').value = getTodayISO();
  document.getElementById('editAttendees').value = 10;
  document.getElementById('editFeeAmount').value = '0 TL (نشاط مجاني)';
  document.getElementById('editStartTime').value = '10:00';
  document.getElementById('editEndTime').value = '12:00';

  document.getElementById('edit-modal-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> إضافة حجز يدوي مباشر`;
  document.getElementById('edit-event-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-event-modal').style.display = 'none';
}

function deleteCurrentEditBooking() {
  const bookingId = document.getElementById('editBookingId').value;
  if (!bookingId) {
    if (typeof Toast !== 'undefined') Toast.show('error', 'تعذر تحديد رقم الحجز المراد حذفه');
    return;
  }
  closeEditModal();
  deleteBooking(bookingId);
}

async function saveEditEvent(event) {
  event.preventDefault();
  const id = document.getElementById('editBookingId').value;
  let booking = bookings.find(b => String(b.id) === String(id));

  const payload = {
    id: id,
    eventTitle: document.getElementById('editTitle').value,
    organizerName: document.getElementById('editOrganizer').value,
    executorName: document.getElementById('editExecutor').value,
    hallName: document.getElementById('editHall').value,
    status: document.getElementById('editStatus').value,
    startDate: document.getElementById('editStartDate').value,
    endDate: document.getElementById('editStartDate').value,
    attendeesCount: safeNum(document.getElementById('editAttendees').value) || 1,
    feeAmount: document.getElementById('editFeeAmount').value || '0 TL (نشاط مجاني)',
    startTime: document.getElementById('editStartTime').value,
    endTime: document.getElementById('editEndTime').value
  };

  const token = localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');

  if (booking) {
    Object.assign(booking, payload);
    if (token) {
      try {
        await fetch(`/api/admin/bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('API update fallback:', e);
      }
    }
  } else {
    booking = {
      ...payload,
      whatsappNumber: siteSettings.adminPhone || '+905385062989',
      email: 'admin@majarra.org',
      entityType: 'منظمة غير ربحية',
      eventType: 'فعالية',
      eventDescription: 'حجز يدوي مضاف عن طريق لوحة التحكم.',
      equipment: ['بروجكتر', 'كراسي'],
      isSponsored: 'نعم',
      isPaidEvent: 'لا',
      packageType: 'كفو',
      additionalService: 'بدون خدمات إضافية',
      createdAt: new Date().toISOString()
    };
    bookings.push(booking);

    if (token) {
      try {
        const res = await fetch('/api/admin/bookings/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(booking)
        });
        const data = await res.json();
        if (data.bookingId) booking.id = data.bookingId;
      } catch (e) {
        console.warn('API manual booking error:', e);
      }
    }
  }

  syncCalendarViewToDate(booking.startDate);
  saveBookingsToStorage();
  updateStats();
  renderBookingsTable();
  renderCalendarView();
  closeEditModal();
  Toast.show('success', '✅ تم حفظ التعديلات وتحديث الحجز بالتقويم بنجاح!');
}

// --- BOOKINGS TABLE & STATUS MANAGEMENT ---
function renderBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  const searchVal = document.getElementById('admin-search-input') ? safeLower(document.getElementById('admin-search-input').value.trim()) : '';
  const statusFilter = document.getElementById('status-filter') ? document.getElementById('status-filter').value : 'all';
  const hallFilter = document.getElementById('hall-filter') ? document.getElementById('hall-filter').value : 'all';

  if (!tbody) return;

  tbody.innerHTML = '';

  let filtered = bookings.filter(b => {
    const matchSearch = !searchVal || 
      safeLower(b.organizerName).includes(searchVal) ||
      safeLower(b.executorName).includes(searchVal) ||
      safeLower(b.eventTitle).includes(searchVal) ||
      safeLower(b.email).includes(searchVal) ||
      safeLower(b.whatsappNumber).includes(searchVal) ||
      safeLower(b.id).includes(searchVal);

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchHall = hallFilter === 'all' || b.hallName === hallFilter;

    return matchSearch && matchStatus && matchHall;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-inbox" style="font-size: 2.2rem; margin-bottom: 10px; display: block;"></i>
          لا توجد حجوزات مطابقة لمعايير البحث حالياً
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(b => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.2s ease;';
    tr.onmouseenter = () => tr.style.background = 'rgba(30, 41, 59, 0.5)';
    tr.onmouseleave = () => tr.style.background = 'transparent';

    let statusBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); padding: 5px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;"><i class="fa-solid fa-hourglass-half"></i> قيد المراجعة</span>';
    
    if (b.status === 'accepted') {
      statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); padding: 5px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;"><i class="fa-solid fa-circle-check"></i> مقبول ومؤكد</span>';
    } else if (b.status === 'rejected') {
      statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 5px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;"><i class="fa-solid fa-circle-xmark"></i> مرفوض</span>';
    }

    const cleanPhone = safeStr(b.whatsappNumber).replace(/[^0-9+]/g, '');
    const waMessage = encodeURIComponent(`مرحباً ${b.organizerName}، بخصوص طلب حجزكم لـ (${b.eventTitle}) في مركز مجرة المجتمعي...`);
    const cleanHall = getCleanHallName(b.hallName);
    const start12h = formatTime12h(b.startTime);
    const end12h = formatTime12h(b.endTime);

    tr.innerHTML = `
      <td style="padding: 14px 14px; vertical-align: middle;">
        <div style="font-weight: 800; color: #ffffff; font-size: 0.96rem; line-height: 1.35; margin-bottom: 4px;">
          ${b.eventTitle}
        </div>
        <div style="color: #94a3b8; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span>${b.executorName || b.organizerName}</span>
          <span style="color: rgba(255,255,255,0.25);">•</span>
          <span>${b.attendeesCount || 1} شخص</span>
          <span style="color: rgba(255,255,255,0.25);">•</span>
          <span dir="ltr" style="font-family: monospace; color: var(--brand-gold); font-weight: 700;">#${b.id}</span>
        </div>
      </td>
      <td style="padding: 14px 12px; vertical-align: middle; text-align: center;">
        <div style="font-weight: 800; color: #f8fafc; font-size: 0.88rem;">${cleanHall}</div>
        <small style="color: #94a3b8; font-size: 0.76rem; font-weight: 600;">${b.packageType || 'باقة كفو'}</small>
      </td>
      <td style="padding: 14px 12px; vertical-align: middle; text-align: center;">
        <div style="color: #fbbf24; font-weight: 800; font-size: 0.86rem;">${b.startDate}</div>
        <small style="color: #94a3b8; font-size: 0.76rem; font-weight: 600;">${start12h} - ${end12h}</small>
      </td>
      <td style="padding: 14px 12px; vertical-align: middle; text-align: center;">
        <div style="color: var(--brand-gold); font-weight: 800; font-size: 0.86rem; white-space: nowrap;">${b.feeAmount || '0 TL'}</div>
      </td>
      <td style="padding: 14px 12px; vertical-align: middle; text-align: center;">
        ${statusBadge}
      </td>
      <td style="padding: 14px 14px; vertical-align: middle; text-align: left;">
        <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex-wrap: nowrap;">
          
          ${b.status === 'pending' ? `
            <button onclick="updateBookingStatus('${b.id}', 'accepted')" title="قبول الحجز" class="admin-row-btn btn-accept">
              <i class="fa-solid fa-check"></i>
            </button>
            <button onclick="updateBookingStatus('${b.id}', 'rejected')" title="رفض الحجز" class="admin-row-btn btn-reject">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ''}

          ${b.status === 'accepted' ? `
            <button onclick="sendWhatsAppReminder('${b.id}')" title="إرسال تذكير واتساب مسبق بضغطة واحدة" class="admin-row-btn" style="background: rgba(34, 197, 94, 0.2); color: #22c55e; border-color: rgba(34, 197, 94, 0.4);">
              <i class="fa-solid fa-bell"></i>
            </button>
            <button onclick="addEventToGoogleCalendar(bookings.find(item=>item.id==='${b.id}'))" title="إضافة لتقويم Google" class="admin-row-btn">
              <i class="fa-brands fa-google"></i>
            </button>
          ` : ''}

          <a href="https://wa.me/${cleanPhone}?text=${waMessage}" target="_blank" title="محادثة واتساب" class="admin-row-btn btn-whatsapp">
            <i class="fa-brands fa-whatsapp"></i>
          </a>

          ${b.email ? `
            <a href="mailto:${b.email}?subject=${encodeURIComponent('بخصوص طلب حجز قاعة في مركز مجرة المجتمعي')}" title="إرسال إيميل" class="admin-row-btn">
              <i class="fa-solid fa-envelope"></i>
            </a>
          ` : ''}

          <button onclick="showBookingDetailsModal('${b.id}')" title="عرض التفاصيل" class="admin-row-btn">
            <i class="fa-solid fa-eye"></i>
          </button>

          <button onclick="openEditModal('${b.id}')" title="تعديل الحجز" class="admin-row-btn">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>

          <button onclick="showTicketModal('${b.id}')" title="عرض الإيصال الرقمي" class="admin-row-btn">
            <i class="fa-solid fa-receipt"></i>
          </button>

          <button onclick="deleteBooking('${b.id}')" title="حذف الحجز" class="admin-row-btn btn-danger">
            <i class="fa-solid fa-trash-can"></i>
          </button>

        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- FULL BOOKING DETAILS MODAL LOGIC ---
function showBookingDetailsModal(id) {
  const b = bookings.find(item => item.id === id);
  if (!b) return;

  document.getElementById('dtl-booking-id').innerText = `#${b.id}`;
  
  const cleanHall = getCleanHallName(b.hallName);
  const start12h = formatTime12h(b.startTime);
  const end12h = formatTime12h(b.endTime);

  document.getElementById('dtl-organizer-name').innerText = b.organizerName || '-';
  document.getElementById('dtl-entity-type').innerText = b.entityType || 'فرد';
  document.getElementById('dtl-executor-name').innerText = b.executorName || b.organizerName;
  
  const cleanPhone = safeStr(b.whatsappNumber).replace(/[^0-9+]/g, '');
  const waMessage = encodeURIComponent(`مرحباً ${b.organizerName}، بخصوص طلب حجزكم لـ (${b.eventTitle}) في مركز مجرة المجتمعي...`);
  
  const waBtn = document.getElementById('dtl-whatsapp-link');
  if (waBtn) {
    waBtn.href = `https://wa.me/${cleanPhone}?text=${waMessage}`;
    document.getElementById('dtl-phone-val').innerText = b.whatsappNumber || '-';
  }
  
  document.getElementById('dtl-email').innerText = b.email || '-';

  document.getElementById('dtl-hall-name').innerText = cleanHall;
  document.getElementById('dtl-start-date').innerText = b.startDate || '-';
  document.getElementById('dtl-time-range').innerText = `${start12h} - ${end12h}`;
  document.getElementById('dtl-attendees').innerText = `${b.attendeesCount || 0} شخص`;
  document.getElementById('dtl-package-type').innerText = b.packageType || 'كفو';
  document.getElementById('dtl-fee-amount').innerText = b.feeAmount || '0 TL (مجاني)';

  document.getElementById('dtl-event-title').innerText = b.eventTitle || '-';
  document.getElementById('dtl-event-description').innerText = b.eventDescription || 'لا يوجد وصف تفصيلي مكتوب.';

  // Equipment tags
  const eqContainer = document.getElementById('dtl-equipment-tags');
  if (eqContainer) {
    const eqList = b.equipment ? (Array.isArray(b.equipment) ? b.equipment : b.equipment.split(',')) : [];
    if (b.extraEquipmentNeeds) eqList.push(b.extraEquipmentNeeds);

    if (eqList.length === 0) {
      eqContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">لا توجد معدات إضافية مطلوبة.</span>';
    } else {
      eqContainer.innerHTML = eqList.map(eq => `<span class="badge" style="background: rgba(138, 111, 178, 0.15); color: var(--brand-purple); border: 1px solid rgba(138, 111, 178, 0.3);"><i class="fa-solid fa-check"></i> ${eq.trim()}</span>`).join('');
    }
  }

  // Status Badge
  let statusHtml = '<span class="badge badge-pending"><i class="fa-solid fa-hourglass-half"></i> قيد المراجعة</span>';
  if (b.status === 'accepted') {
    statusHtml = '<span class="badge badge-accepted"><i class="fa-solid fa-circle-check"></i> مقبول ومؤكد بالتقويم</span>';
  } else if (b.status === 'rejected') {
    statusHtml = '<span class="badge badge-rejected"><i class="fa-solid fa-circle-xmark"></i> مرفوض</span>';
  }
  document.getElementById('dtl-status-badge').innerHTML = statusHtml;

  // Actions Bar
  const actionsBar = document.getElementById('dtl-actions-bar');
  if (actionsBar) {
    actionsBar.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${b.status === 'pending' ? `
          <button class="btn btn-sm" style="background: #10b981; color: white; font-weight: 800;" onclick="closeBookingDetailsModal(); updateBookingStatus('${b.id}', 'accepted');"><i class="fa-solid fa-check"></i> قبول الطلب والتأكيد</button>
          <button class="btn btn-sm" style="background: #ef4444; color: white; font-weight: 800;" onclick="closeBookingDetailsModal(); updateBookingStatus('${b.id}', 'rejected');"><i class="fa-solid fa-xmark"></i> رفض الطلب</button>
        ` : ''}
        ${b.status === 'accepted' ? `
          <button class="btn btn-sm btn-outline" style="border-color: var(--accent-emerald); color: var(--accent-emerald); font-weight: 700;" onclick="addEventToGoogleCalendar(bookings.find(item=>item.id==='${b.id}'))"><i class="fa-brands fa-google"></i> إضافة لتقويم Google</button>
        ` : ''}
        <button class="btn btn-outline btn-sm" style="color: #25D366; border-color: #25D366;" onclick="closeBookingDetailsModal(); sendWhatsAppStatusNotice('${b.id}');"><i class="fa-brands fa-whatsapp"></i> مراسلة واتساب</button>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" onclick="closeBookingDetailsModal(); showTicketModal('${b.id}');"><i class="fa-solid fa-receipt"></i> طباعة الإيصال</button>
        <button class="btn btn-outline btn-sm" onclick="closeBookingDetailsModal(); openEditModal('${b.id}');"><i class="fa-solid fa-pen"></i> تعديل التفاصيل</button>
      </div>
    `;
  }

  document.getElementById('booking-details-modal').style.display = 'flex';
}

function closeBookingDetailsModal() {
  document.getElementById('booking-details-modal').style.display = 'none';
}

function openPublicEventDetailModal(bookingId) {
  const b = bookings.find(item => String(item.id) === String(bookingId));
  if (!b) return;

  const modal = document.getElementById('public-event-details-modal');
  if (!modal) return;

  const cleanHall = getCleanHallName(b.hallName || b.hallId);
  const start12h = formatTime12h(b.startTime);
  const end12h = formatTime12h(b.endTime);

  const titleEl = document.getElementById('pub-evt-title');
  if (titleEl) titleEl.innerText = b.eventTitle || 'فعالية في مركز مجرّة';

  const typeEl = document.getElementById('pub-evt-type-badge');
  if (typeEl) typeEl.innerText = b.eventType || (b.isPaidEvent === 'نعم' ? 'نشاط مأجور' : 'ورشة عمل');

  const hallEl = document.getElementById('pub-evt-hall');
  if (hallEl) {
    hallEl.innerHTML = `<i class="fa-solid fa-door-open" style="color: var(--brand-gold); margin-left: 6px;"></i> ${cleanHall}`;
  }

  const dateEl = document.getElementById('pub-evt-date');
  if (dateEl) dateEl.innerText = b.startDate || '-';

  const timeEl = document.getElementById('pub-evt-time');
  if (timeEl) timeEl.innerText = `${start12h} - ${end12h}`;

  const execEl = document.getElementById('pub-evt-executor');
  if (execEl) execEl.innerText = b.executorName || b.organizerName || 'مبادرة مجرة';

  const attEl = document.getElementById('pub-evt-attendees');
  if (attEl) attEl.innerText = `${b.attendeesCount || 0} شخصاً`;

  const descEl = document.getElementById('pub-evt-desc');
  if (descEl) descEl.innerText = b.eventDescription || 'فعالية مجتمعية تفاعلية تقام داخل مساحات وقاعات مركز مجرة المجتمعي.';

  // Dynamic Header Gradient based on Hall
  const banner = document.getElementById('pub-evt-header-banner');
  if (banner) {
    const hallLower = String(b.hallName || b.hallId).toLowerCase();
    if (hallLower.includes('diwan') || hallLower.includes('ديوان')) {
      banner.style.background = 'linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(15, 23, 42, 0.95))';
    } else if (hallLower.includes('sadeem') || hallLower.includes('سديم')) {
      banner.style.background = 'linear-gradient(135deg, rgba(14, 116, 144, 0.95), rgba(15, 23, 42, 0.95))';
    } else if (hallLower.includes('full') || hallLower.includes('كليا')) {
      banner.style.background = 'linear-gradient(135deg, rgba(131, 24, 67, 0.95), rgba(15, 23, 42, 0.95))';
    } else {
      banner.style.background = 'linear-gradient(135deg, rgba(88, 28, 135, 0.95), rgba(15, 23, 42, 0.95))';
    }
  }

  modal.style.display = 'flex';
}

function closePublicEventDetailModal() {
  const modal = document.getElementById('public-event-details-modal');
  if (modal) modal.style.display = 'none';
}

function filterBookings() {
  renderBookingsTable();
}

async function updateBookingStatus(id, newStatus) {
  const booking = bookings.find(b => String(b.id) === String(id));
  if (!booking) {
    Toast.show('error', `لم يتم العثور على الحجز رقم (${id})`);
    return;
  }

  const token = localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
  try {
    if (token) {
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        Toast.show('error', data.message || 'فشل تحديث حالة الحجز');
        return;
      }
    }
  } catch (e) {
    console.warn('API update status error:', e);
  }

  // Update local state
  booking.status = newStatus;
  syncCalendarViewToDate(booking.startDate);
  saveBookingsToStorage();
  updateStats();
  renderBookingsTable();
  renderCalendarView();

  if (newStatus === 'accepted') {
    Toast.show('success', `✅ تم قبول الحجز (#${id}) وتثبيته في التقويم بنجاح!`);
    const cleanPhone = (booking.whatsappNumber || booking.phone || '').replace(/\D/g, '');
    const clientUrl = `${window.location.origin}/?ref=${booking.id}`;
    const waMsg = `مرحباً ${booking.organizerName || ''} 👋\n\nنحييكم من مركز مجرّة المجتمعي. تم قبول واكتمال حجزكم بنجاح! 🎉\n📌 الفعالية: ${booking.eventTitle || ''}\n🏛️ القاعة: ${booking.hallName || ''}\n📅 الموعد: ${booking.startDate || ''} | ${booking.startTime || ''}\n\n📄 يمكنك استعراض وتحميل إيصال الحجز المعتمد بصيغة A4 عبر الرابط:\n${clientUrl}`;
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
    setTimeout(() => {
      showAcceptWhatsAppModal(booking, waLink);
    }, 200);
  } else if (newStatus === 'rejected') {
    Toast.show('info', `❌ تم رفض الحجز (#${id}) بنجاح`);
  } else {
    Toast.show('info', `تم تحديث حالة الحجز (#${id}) إلى: ${newStatus}`);
  }
}

async function deleteBooking(id) {
  confirmDeleteModal({
    title: 'تأكيد حذف الحجز',
    message: `هل أنت متأكد من رغبتك في حذف الحجز رقم (${id}) نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
    dangerBtnText: 'حذف الحجز نهائياً 🗑️',
    onConfirm: async () => {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('superAdminToken');
      try {
        if (token) {
          const res = await fetch(`/api/admin/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (!data.success) {
            Toast.show('error', data.message || 'فشل حذف الحجز من قاعدة البيانات');
            return;
          }
        }
      } catch (e) {
        console.warn('API delete error:', e);
      }
      // Remove from local state and refresh UI
      bookings = bookings.filter(b => String(b.id) !== String(id));
      saveBookingsToStorage();
      updateStats();
      renderBookingsTable();
      renderArchiveView();
      renderCalendarView();
      Toast.show('success', `✅ تم حذف الحجز رقم (${id}) بنجاح من قاعدة البيانات والتقويم`);
    }
  });
}

// ==========================================================================
// MASTER ARCHIVE & DATA CENTER ENGINE
// ==========================================================================
let currentArchiveSubTab = 'bookings';
let masterEventRegistrationsCache = [];
let masterContactsMapCache = new Map();

function switchArchiveSubTab(tab) {
  currentArchiveSubTab = tab;
  
  const bTab = document.getElementById('arch-subtab-bookings');
  const eTab = document.getElementById('arch-subtab-events');
  const cTab = document.getElementById('arch-subtab-contacts');

  const bPanel = document.getElementById('archive-panel-bookings');
  const ePanel = document.getElementById('archive-panel-events');
  const cPanel = document.getElementById('archive-panel-contacts');

  const evFilter = document.getElementById('archive-event-filter');
  const typeFilter = document.getElementById('archive-contact-type-filter');

  [bTab, eTab, cTab].forEach(t => {
    if (t) {
      t.style.background = 'transparent';
      t.style.color = '#94a3b8';
      t.classList.remove('active');
    }
  });

  [bPanel, ePanel, cPanel].forEach(p => { if (p) p.style.display = 'none'; });

  if (tab === 'bookings') {
    if (bTab) { bTab.style.background = 'var(--brand-purple)'; bTab.style.color = '#fff'; bTab.classList.add('active'); }
    if (bPanel) bPanel.style.display = 'block';
    if (evFilter) evFilter.style.display = 'none';
    if (typeFilter) typeFilter.style.display = 'none';
  } else if (tab === 'events') {
    if (eTab) { eTab.style.background = 'var(--brand-purple)'; eTab.style.color = '#fff'; eTab.classList.add('active'); }
    if (ePanel) ePanel.style.display = 'block';
    if (evFilter) evFilter.style.display = 'inline-block';
    if (typeFilter) typeFilter.style.display = 'none';
  } else if (tab === 'contacts') {
    if (cTab) { cTab.style.background = 'var(--brand-purple)'; cTab.style.color = '#fff'; cTab.classList.add('active'); }
    if (cPanel) cPanel.style.display = 'block';
    if (evFilter) evFilter.style.display = 'none';
    if (typeFilter) typeFilter.style.display = 'inline-block';
  }

  renderArchiveView();
}

async function fetchMasterEventRegistrations() {
  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/events/registrations', { headers });
    const data = await res.json();
    if (data.success && Array.isArray(data.registrations)) {
      masterEventRegistrationsCache = data.registrations;
    }
  } catch (err) {
    console.warn('Error fetching event registrations for archive:', err);
  }
}

async function renderArchiveView() {
  const searchInput = document.getElementById('archive-master-search') || document.getElementById('archive-search-input');
  const searchVal = searchInput ? safeLower(searchInput.value.trim()) : '';
  const yearFilter = document.getElementById('archive-year-filter') ? document.getElementById('archive-year-filter').value : 'all';
  const eventFilter = document.getElementById('archive-event-filter') ? document.getElementById('archive-event-filter').value : 'all';
  const contactTypeFilter = document.getElementById('archive-contact-type-filter') ? document.getElementById('archive-contact-type-filter').value : 'all';

  // Fetch registrations if not loaded
  if (masterEventRegistrationsCache.length === 0) {
    await fetchMasterEventRegistrations();
  }

  // Calculate Statistics KPIs
  const totalBookingsCount = bookings.length;
  const totalRegistrationsCount = masterEventRegistrationsCache.length;
  
  let totalRevenue = 0;
  bookings.forEach(b => {
    const num = parseInt(safeStr(b.feeAmount).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) totalRevenue += num;
  });

  // Calculate unique contacts
  const contactsMap = new Map();
  
  if (contactTypeFilter === 'all' || contactTypeFilter === 'bookings') {
    bookings.forEach(b => {
      const phoneVal = (b.executorPhone || b.organizerPhone || b.phone || b.whatsappNumber || '').trim();
      const emailVal = (b.executorEmail || b.organizerEmail || b.email || '').trim();
      const key = (phoneVal || b.organizerName || b.executorName || '').trim().toLowerCase();
      if (key) {
        let displayName = b.organizerName || b.executorName || 'حاجز قاعة';
        if (b.organizerName && b.executorName && b.organizerName !== b.executorName) {
          displayName = `${b.organizerName} (${b.executorName})`;
        }

        const bookingItem = {
          type: 'booking',
          title: b.eventTitle || b.hallName || 'حجز قاعة',
          hallName: b.hallName || 'قاعة المركز',
          packageType: b.packageType || 'افتراضي',
          date: b.startDate || '2026-09-10',
          time: `${b.startTime || ''} ${b.endTime ? `- ${b.endTime}` : ''}`.trim(),
          fee: b.feeAmount || '0 TL',
          status: b.status,
          id: b.id
        };

        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            key: key,
            type: 'booking',
            name: displayName,
            phone: phoneVal || '-',
            email: emailVal || '-',
            count: 1,
            lastActivity: 'حجز قاعة: ' + (b.eventTitle || b.hallName),
            lastDate: b.startDate || '2026-09-10',
            items: [bookingItem]
          });
        } else {
          const cObj = contactsMap.get(key);
          cObj.count += 1;
          cObj.items.push(bookingItem);
        }
      }
    });
  }

  if (contactTypeFilter === 'all' || contactTypeFilter === 'events') {
    masterEventRegistrationsCache.forEach(r => {
      const phoneVal = (r.phone || '').trim();
      const emailVal = (r.email || '').trim();
      const key = (phoneVal || emailVal || r.name || '').trim().toLowerCase();
      if (key) {
        const eventItem = {
          type: 'event',
          title: r.event_title || 'استمارة فعالية',
          date: safeStr(r.created_at).split('T')[0] || safeStr(r.created_at).split(' ')[0] || '2026-09-10',
          status: r.status,
          id: r.id,
          answers: r.answers_json
        };

        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            key: key,
            type: 'event',
            name: r.name || 'مشارك فعالية',
            phone: phoneVal || '-',
            email: emailVal || '-',
            count: 1,
            lastActivity: 'تسجيل فعالية: ' + (r.event_title || 'استمارة فعالية'),
            lastDate: safeStr(r.created_at).split('T')[0] || safeStr(r.created_at).split(' ')[0] || '2026-09-10',
            items: [eventItem]
          });
        } else {
          const cObj = contactsMap.get(key);
          cObj.count += 1;
          cObj.items.push(eventItem);
        }
      }
    });
  }

  masterContactsMapCache = contactsMap;

  // Update KPI Elements
  const bCountEl = document.getElementById('archive-stat-bookings-count');
  const rCountEl = document.getElementById('archive-stat-registrations-count');
  const cCountEl = document.getElementById('archive-stat-contacts-count');
  const revEl = document.getElementById('archive-stat-revenue');

  if (bCountEl) bCountEl.innerText = totalBookingsCount;
  if (rCountEl) rCountEl.innerText = totalRegistrationsCount;
  if (cCountEl) cCountEl.innerText = contactsMap.size;
  if (revEl) revEl.innerText = totalRevenue.toLocaleString('en-US') + ' TL';

  // Populate Event Filter Dropdown
  const evFilterEl = document.getElementById('archive-event-filter');
  if (evFilterEl && evFilterEl.options.length <= 1) {
    const titlesSet = new Set();
    masterEventRegistrationsCache.forEach(r => { if (r.event_title) titlesSet.add(r.event_title); });
    titlesSet.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.innerText = t;
      evFilterEl.appendChild(opt);
    });
  }

  // 1. RENDER HALL BOOKINGS ARCHIVE PANEL
  const bTbody = document.getElementById('archiveTableBody');
  if (bTbody) {
    bTbody.innerHTML = '';
    const filteredBookings = bookings.filter(b => {
      const matchSearch = !searchVal || 
        safeLower(b.organizerName).includes(searchVal) ||
        safeLower(b.executorName).includes(searchVal) ||
        safeLower(b.eventTitle).includes(searchVal) ||
        safeLower(b.id).includes(searchVal);

      const bYear = safeStr(b.startDate).split('-')[0] || '2026';
      const matchYear = yearFilter === 'all' || bYear === yearFilter;

      return matchSearch && matchYear;
    });

    if (filteredBookings.length === 0) {
      bTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-box-archive" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: var(--brand-gold);"></i>
            لا توجد حجوزات قاعات مؤرشفة مطابقة لمعايير البحث
          </td>
        </tr>
      `;
    } else {
      filteredBookings.forEach(b => {
        const tr = document.createElement('tr');
        let statusBadge = '<span class="badge badge-pending">معلق</span>';
        if (b.status === 'accepted') statusBadge = '<span class="badge badge-accepted">مقبول بالتقويم</span>';
        else if (b.status === 'rejected') statusBadge = '<span class="badge badge-rejected">مرفوض</span>';

        tr.innerHTML = `
          <td><strong style="color: var(--brand-gold);">${b.id}</strong></td>
          <td>
            <div><strong>${b.organizerName}</strong></div>
            <small style="color: var(--text-muted);">${b.executorName}</small>
          </td>
          <td>
            <div><strong>${b.eventTitle}</strong></div>
            <small style="color: var(--brand-purple);">${b.eventType}</small>
          </td>
          <td>
            <div>${safeStr(b.hallName).split(' ')[0]}</div>
            <small style="color: var(--brand-peach);">باقة: ${b.packageType}</small>
          </td>
          <td>
            <div>${b.startDate}</div>
            <small style="color: var(--text-muted);">${b.startTime} - ${b.endTime}</small>
          </td>
          <td><strong style="color: var(--brand-gold);">${b.feeAmount || '0 TL'}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-action-sm btn-primary" onclick="showTicketModal('${b.id}')" title="عرض وتنزيل الإيصال الرقمي">
                <i class="fa-solid fa-receipt"></i> الإيصال
              </button>
              <button class="btn btn-action-sm" onclick="deleteBooking('${b.id}')" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4);" title="حذف الحجز من الأرشيف والقاعدة">
                <i class="fa-solid fa-trash-can"></i> حذف
              </button>
            </div>
          </td>
        `;
        bTbody.appendChild(tr);
      });
    }
  }

  // 2. RENDER EVENT REGISTRATIONS ARCHIVE PANEL
  const eTbody = document.getElementById('archiveEventsTableBody');
  if (eTbody) {
    eTbody.innerHTML = '';
    const filteredEvents = masterEventRegistrationsCache.filter(r => {
      const matchSearch = !searchVal || 
        safeLower(r.name).includes(searchVal) ||
        safeLower(r.phone).includes(searchVal) ||
        safeLower(r.email).includes(searchVal) ||
        safeLower(r.event_title).includes(searchVal);

      const regYear = safeStr(r.created_at).split('-')[0] || '2026';
      const matchYear = yearFilter === 'all' || regYear === yearFilter;
      const matchEvent = eventFilter === 'all' || r.event_title === eventFilter;

      return matchSearch && matchYear && matchEvent;
    });

    if (filteredEvents.length === 0) {
      eTbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-users-slash" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #38bdf8;"></i>
            لا توجد تسجيلات فعاليات مؤرشفة مطابقة لمعايير البحث
          </td>
        </tr>
      `;
    } else {
      filteredEvents.forEach((r, idx) => {
        const tr = document.createElement('tr');
        const dt = safeStr(r.created_at).split('T')[0] || safeStr(r.created_at).split(' ')[0] || '-';
        const isApp = r.status === 'approved' || r.status === 'accepted';
        const isRej = r.status === 'rejected';

        tr.innerHTML = `
          <td><strong>${idx + 1}</strong></td>
          <td><strong style="color: #ffffff;">${r.name || 'مشارك'}</strong></td>
          <td>${formatPhoneDisplayHtml(r.phone)}</td>
          <td><small style="color: var(--text-muted);">${r.email || '-'}</small></td>
          <td><span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 800;">${r.event_title || 'استمارة فعالية'}</span></td>
          <td><small style="color: var(--text-muted);">${dt}</small></td>
          <td>
            <span class="badge" style="background: ${isApp ? 'rgba(16, 185, 129, 0.2)' : isRej ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${isApp ? '#34d399' : isRej ? '#f87171' : '#fbbf24'}; border: 1px solid ${isApp ? 'rgba(16, 185, 129, 0.4)' : isRej ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; font-weight: 800;">
              ${isApp ? 'مقبول ✅' : isRej ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
            </span>
          </td>
          <td>
            <button onclick="openArchiveAnswersModal('${r.id}')" class="btn btn-action-sm" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">
              <i class="fa-solid fa-eye"></i> الإجابات
            </button>
          </td>
          <td>
            <button onclick="deleteArchiveRegistration('${r.id}')" class="btn btn-action-sm" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4);" title="حذف السجل">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        `;
        eTbody.appendChild(tr);
      });
    }
  }

  // 3. RENDER MASTER CONTACTS DIRECTORY PANEL
  const cTbody = document.getElementById('archiveContactsTableBody');
  if (cTbody) {
    cTbody.innerHTML = '';
    const contactsList = Array.from(contactsMap.values()).filter(c => {
      return !searchVal || 
        safeLower(c.name).includes(searchVal) ||
        safeLower(c.phone).includes(searchVal) ||
        safeLower(c.email).includes(searchVal) ||
        safeLower(c.lastActivity).includes(searchVal);
    });

    if (contactsList.length === 0) {
      cTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-address-book" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #34d399;"></i>
            لا يوجد أشخاص أو جهات مطابقة لمعايير البحث في دليل الحضور
          </td>
        </tr>
      `;
    } else {
      contactsList.forEach((c, idx) => {
        const tr = document.createElement('tr');
        const cleanWaDigits = safeStr(c.phone).replace(/[^0-9]/g, '');
        const encodedKey = encodeURIComponent(c.key || '');
        tr.innerHTML = `
          <td><strong>${idx + 1}</strong></td>
          <td><strong style="color: #ffffff;">${c.name}</strong></td>
          <td>${formatPhoneDisplayHtml(c.phone)}</td>
          <td><small style="color: var(--text-muted);">${c.email}</small></td>
          <td>
            <span class="badge" onclick="openContactParticipationsModal('${encodedKey}')" style="background: rgba(52, 211, 153, 0.18); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.35); font-weight: 800; padding: 5px 12px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="انقر لعرض تفاصيل وشريط مشاركات وتدريبات هذه الجهة">
              <i class="fa-solid fa-layer-group"></i> ${c.count} مشاركة
            </span>
          </td>
          <td><small style="color: var(--brand-purple); font-weight: 700;">${c.lastActivity}</small></td>
          <td><small style="color: var(--text-muted);">${c.lastDate}</small></td>
          <td>
            <a href="https://wa.me/${cleanWaDigits}" target="_blank" class="btn btn-action-sm" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); text-decoration: none;">
              <i class="fa-brands fa-whatsapp"></i> واتساب
            </a>
          </td>
        `;
        cTbody.appendChild(tr);
      });
    }
  }
}

function openContactParticipationsModal(encodedKey) {
  const key = decodeURIComponent(encodedKey || '');
  if (!key || !masterContactsMapCache.has(key)) {
    if (typeof Toast !== 'undefined') Toast.show('warning', 'تعذر العثور على سجلات المشاركات لهذه الجهة');
    return;
  }

  const contact = masterContactsMapCache.get(key);
  const items = contact.items || [];
  const cleanWaDigits = safeStr(contact.phone).replace(/[^0-9]/g, '');

  let itemsHtml = items.map((item, idx) => {
    const isBooking = item.type === 'booking';
    const isApp = item.status === 'approved' || item.status === 'accepted';
    const isRej = item.status === 'rejected';

    const statusBadge = `
      <span class="badge" style="background: ${isApp ? 'rgba(16, 185, 129, 0.2)' : isRej ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${isApp ? '#34d399' : isRej ? '#f87171' : '#fbbf24'}; border: 1px solid ${isApp ? 'rgba(16, 185, 129, 0.4)' : isRej ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; font-weight: 800; font-size: 0.78rem; padding: 4px 10px;">
        ${isApp ? 'مقبول ✅' : isRej ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
      </span>
    `;

    const typeBadge = isBooking 
      ? `<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 800; font-size: 0.78rem;"><i class="fa-solid fa-building-user"></i> حجز قاعة (${item.hallName || 'قاعة'})</span>`
      : `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 800; font-size: 0.78rem;"><i class="fa-solid fa-file-pen"></i> استمارة فعالية</span>`;

    const actionBtn = isBooking
      ? `<button onclick="showTicketModal('${item.id}')" class="btn btn-sm" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 800; border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; cursor: pointer;">
          <i class="fa-solid fa-receipt"></i> الإيصال الرقمي
         </button>`
      : `<button onclick="openArchiveAnswersModal('${item.id}')" class="btn btn-sm" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 800; border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; cursor: pointer;">
          <i class="fa-solid fa-eye"></i> الإجابات الكاملة
         </button>`;

    return `
      <div style="background: rgba(11, 15, 25, 0.75); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="flex: 1; min-width: 240px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <strong style="color: #fff; font-size: 0.95rem;">${idx + 1}. ${item.title}</strong>
            ${typeBadge}
          </div>
          <div style="display: flex; gap: 14px; font-size: 0.83rem; color: var(--text-muted); flex-wrap: wrap; margin-top: 4px;">
            <span><i class="fa-regular fa-calendar" style="color: var(--brand-gold);"></i> ${item.date}</span>
            ${item.time ? `<span><i class="fa-regular fa-clock" style="color: var(--brand-peach);"></i> ${item.time}</span>` : ''}
            ${item.fee ? `<span style="color: var(--brand-gold); font-weight: 700;"><i class="fa-solid fa-turkish-lira-sign"></i> ${item.fee}</span>` : ''}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${statusBadge}
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');

  const modalHtml = `
    <div id="contact-participations-modal" class="modal-backdrop" style="display: flex; position: fixed; inset: 0; z-index: 999999; background: rgba(11,15,25,0.88); backdrop-filter: blur(20px); align-items: center; justify-content: center; padding: 20px;">
      <div style="background: rgba(15,23,42,0.96); border: 1px solid rgba(52,211,153,0.35); border-radius: 24px; max-width: 680px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 26px; box-shadow: 0 25px 60px rgba(0,0,0,0.8);">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 900; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-address-card" style="color: #34d399;"></i> ${contact.name}
            </h3>
            <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 0.85rem; align-items: center; flex-wrap: wrap;">
              <span>الهاتف: ${formatPhoneDisplayHtml(contact.phone)}</span>
              ${contact.email !== '-' ? `<span style="color: var(--text-muted);">البريد: ${contact.email}</span>` : ''}
            </div>
          </div>
          <button onclick="document.getElementById('contact-participations-modal').remove()" style="background: rgba(255,255,255,0.08); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Top Stat Banner -->
        <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); padding: 12px 18px; border-radius: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #34d399; font-weight: 800; font-size: 0.92rem;">
            <i class="fa-solid fa-chart-line"></i> إجمالي الأنشطة والمشاركات: <strong>${items.length}</strong>
          </span>
          ${cleanWaDigits ? `
            <a href="https://wa.me/${cleanWaDigits}" target="_blank" class="btn btn-sm" style="background: #22c55e; color: #fff; font-weight: 800; border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-brands fa-whatsapp"></i> فتح محادثة واتساب
            </a>
          ` : ''}
        </div>

        <!-- Participations List -->
        <div style="margin-bottom: 10px;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--brand-gold); margin-bottom: 12px;">
            <i class="fa-solid fa-clock-rotate-left"></i> السجل الزمني للتسجيلات والحجوزات:
          </h4>
          ${itemsHtml}
        </div>

      </div>
    </div>
  `;

  const oldModal = document.getElementById('contact-participations-modal');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

const FIELD_LABEL_DICTIONARY = {
  'full_name_ar': 'الاسم والكنية (بالعربي)',
  'full_name_en': 'الاسم بالإنجليزية (Full Name)',
  'phone': 'رقم الهاتف / الواتساب',
  'email': 'عنوان البريد الإلكتروني',
  'birth_date': 'تاريخ الميلاد',
  'nationality': 'الجنسية',
  'gender': 'الجنس',
  'residence': 'مكان الإقامة',
  'university_major': 'التخصص / الفرع الدراسي',
  'terms_approval': 'الموافقة والإقرار على الشروط'
};

function formatPhoneDisplayHtml(phoneStr) {
  if (!phoneStr || phoneStr === '-' || phoneStr === 'null' || phoneStr === 'undefined') {
    return `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;
  }

  // 1. Normalize Arabic/Persian Indic digits to ASCII Western digits
  let cleaned = safeStr(phoneStr).trim();
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(arabicDigits[i], 'g'), i)
                     .replace(new RegExp(persianDigits[i], 'g'), i);
  }

  // 2. Format digits
  const digitsOnly = cleaned.replace(/[^0-9+]/g, '');
  let digits = digitsOnly.replace(/\+/g, '');
  let formatted = cleaned;

  if (digits.length === 11 && digits.startsWith('05')) {
    digits = '90' + digits.substring(1);
  } else if (digits.length === 10 && digits.startsWith('5')) {
    digits = '90' + digits;
  }

  if (digits.length === 12 && digits.startsWith('905')) {
    const p1 = digits.substring(2, 5);
    const p2 = digits.substring(5, 8);
    const p3 = digits.substring(8, 10);
    const p4 = digits.substring(10, 12);
    formatted = `+90 ${p1} ${p2} ${p3} ${p4}`;
  } else if (digitsOnly.startsWith('+')) {
    formatted = digitsOnly;
  }

  return `<span dir="ltr" style="display: inline-block; unicode-bidi: isolate; direction: ltr; text-align: left; font-family: 'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace; font-size: 0.9rem; font-weight: 800; color: #38bdf8; letter-spacing: 0.6px; white-space: nowrap;">${formatted}</span>`;
}

function openArchiveAnswersModal(regId) {
  const reg = masterEventRegistrationsCache.find(r => String(r.id) === String(regId));
  if (!reg) return;

  let answersObj = {};
  try {
    answersObj = typeof reg.answers_json === 'string' ? JSON.parse(reg.answers_json || '{}') : (reg.answers_json || {});
  } catch (e) {
    answersObj = { 'بيانات إضافية': safeStr(reg.answers_json) };
  }

  let answersHtml = Object.entries(answersObj).map(([key, val]) => {
    let labelTitle = FIELD_LABEL_DICTIONARY[key] || key;
    let displayVal = Array.isArray(val) ? val.join(', ') : safeStr(val);
    const isPhoneKey = key.toLowerCase().includes('phone') || key.includes('هاتف') || key.includes('واتساب');

    const valueHtml = isPhoneKey
      ? formatPhoneDisplayHtml(displayVal)
      : `<span style="color: #e2e8f0; font-size: 0.92rem; line-height: 1.5; white-space: pre-wrap;">${displayVal || '-'}</span>`;

    return `
      <div style="background: rgba(11, 15, 25, 0.6); padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 10px;">
        <strong style="color: var(--brand-gold); display: block; margin-bottom: 6px; font-size: 0.92rem;">${labelTitle}</strong>
        ${valueHtml}
      </div>
    `;
  }).join('');

  const formattedPhoneHeader = formatPhoneDisplayHtml(reg.phone);

  const modalHtml = `
    <div id="archive-answers-modal" class="modal-backdrop" style="display: flex; position: fixed; inset: 0; z-index: 999999; background: rgba(11,15,25,0.88); backdrop-filter: blur(20px); align-items: center; justify-content: center; padding: 20px;">
      <div style="background: rgba(15,23,42,0.95); border: 1px solid rgba(168,85,247,0.35); border-radius: 24px; max-width: 600px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 26px; box-shadow: 0 25px 60px rgba(0,0,0,0.8);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
          <h3 style="font-size: 1.2rem; font-weight: 900; color: #fff; margin: 0;">
            <i class="fa-solid fa-clipboard-check" style="color: #38bdf8;"></i> إجابات ومستندات التسجيل الكاملة
          </h3>
          <button onclick="document.getElementById('archive-answers-modal').remove()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.4rem; cursor: pointer;">&times;</button>
        </div>
        
        <div style="margin-bottom: 16px; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); padding: 12px 16px; border-radius: 14px;">
          <strong style="color: #c084fc; font-size: 1.05rem; display: block; margin-bottom: 4px;">${reg.name || 'مشارك'}</strong>
          <small style="color: #cbd5e1; display: block; line-height: 1.6;">
            الفعالية: <strong>${reg.event_title || 'استمارة فعالية'}</strong><br>
            الهاتف: ${formattedPhoneHeader}
          </small>
        </div>

        ${answersHtml || '<p style="color: var(--text-muted); text-align: center;">لا توجد إجابات إضافية مسجلة.</p>'}

        <div style="text-align: left; margin-top: 20px;">
          <button onclick="document.getElementById('archive-answers-modal').remove()" class="btn btn-outline" style="padding: 9px 20px; border-radius: 10px; font-weight: 700;">إغلاق النافذة</button>
        </div>
      </div>
    </div>
  `;

  const oldM = document.getElementById('archive-answers-modal');
  if (oldM) oldM.remove();

  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild);
}

async function deleteArchiveRegistration(regId) {
  confirmDeleteModal({
    title: 'حذف سجل المشارك',
    message: 'هل أنت متأكد من رغبتك في حذف هذا التسجيل من الأرشيف؟',
    dangerBtnText: 'حذف التسجيل 🗑️',
    onConfirm: async () => {
      try {
        const headers = {};
        const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/admin/events/registrations/${regId}`, { method: 'DELETE', headers });
        const data = await res.json();
        if (data.success) {
          showToast('تم حذف السجل بنجاح ✅', 'success');
          masterEventRegistrationsCache = masterEventRegistrationsCache.filter(r => String(r.id) !== String(regId));
          renderArchiveView();
        } else {
          showToast(data.message || 'فشل حذف السجل', 'error');
        }
      } catch (err) {
        showToast('حدث خطأ أثناء الحذف', 'error');
      }
    }
  });
}

function exportArchiveDataCSV(type) {
  if (type === 'bookings') {
    exportBookingsToCSV();
  } else if (type === 'events') {
    if (masterEventRegistrationsCache.length === 0) {
      if (typeof showToast !== 'undefined') showToast('لا توجد بيانات مسجلي فعاليات لتصديرها حالياً', 'warning');
      return;
    }
    let csv = '\uFEFFID,الاسم,الهاتف,البريد الإلكتروني,الفعالية,التاريخ,الحالة\n';
    masterEventRegistrationsCache.forEach(r => {
      csv += `"${r.id}","${r.name || ''}","${r.phone || ''}","${r.email || ''}","${r.event_title || ''}","${r.created_at || ''}","${r.status || ''}"\n`;
    });
    downloadCSVFile(csv, 'majarra_events_archive.csv');
  } else if (type === 'contacts') {
    if (!masterContactsMapCache || masterContactsMapCache.size === 0) {
      if (typeof showToast !== 'undefined') showToast('لا توجد بيانات في دليل الاتصال لتصديرها حالياً', 'warning');
      return;
    }
    let csv = '\uFEFFالرقم,الاسم والجهة,الهاتف,البريد الإلكتروني,عدد المشاركات,آخر نشاط,تاريخ آخر نشاط\n';
    let idx = 1;
    masterContactsMapCache.forEach(c => {
      csv += `"${idx++}","${c.name || ''}","${c.phone || ''}","${c.email || ''}","${c.count || 0}","${c.lastActivity || ''}","${c.lastDate || ''}"\n`;
    });
    downloadCSVFile(csv, 'majarra_contacts_directory.csv');
  }
}

function exportArchiveToCSV() {
  exportArchiveDataCSV('bookings');
}

// --- DYNAMIC ARABIC DATE DROPDOWN SYNC (DAY / MONTH / YEAR) ---
function syncCustomDatePicker() {
  const dayEl = document.getElementById('eventDay');
  const monthEl = document.getElementById('eventMonth');
  const yearEl = document.getElementById('eventYear');
  const startEl = document.getElementById('startDate');
  const endEl = document.getElementById('endDate');

  if (!dayEl || !monthEl || !yearEl || !startEl) return;

  const day = dayEl.value;
  const month = monthEl.value;
  const year = yearEl.value;

  const dateStr = `${year}-${month}-${day}`;
  startEl.value = dateStr;
  if (endEl) endEl.value = dateStr;
}

// --- BOOKING FORM SUBMISSION & LIVE CONFLICT DETECTION ---
function selectHallAndBook(hallName) {
  let hallCode = 'ofoq';
  if (hallName && (hallName.includes('ديـــوان') || hallName.includes('diwan'))) hallCode = 'diwan';
  else if (hallName && (hallName.includes('ســديم') || hallName.includes('sadeem'))) hallCode = 'sadeem';
  else if (hallName && (hallName.includes('المركز كلياً') || hallName.includes('full') || hallName.includes('المركز'))) hallCode = 'full';
  
  window.location.href = `/book.html?hall=${hallCode}`;
}

function openBookingModal() {
  window.location.href = '/book.html';
}

function closeBookingModal() {
  const modal = document.getElementById('booking-form-modal');
  if (modal) modal.style.display = 'none';
}

function syncEndTimeDropdown() {
  const startEl = document.getElementById('startTime');
  const endEl = document.getElementById('endTime');
  if (!startEl || !endEl) return;

  const startVal = startEl.value;
  const startH = parseInt(startVal.split(':')[0], 10);
  
  if (!isNaN(startH)) {
    let defaultEndH = startH + 3; // Default 3-hour duration
    if (defaultEndH > 23) defaultEndH = 23;
    const endStr = String(defaultEndH).padStart(2, '0') + ':00';
    
    const optionToSelect = Array.from(endEl.options).find(opt => opt.value === endStr);
    if (optionToSelect) {
      endEl.value = endStr;
    }
  }
}

function validateBookingLive() {
  const hallName = document.getElementById('hallName').value;
  const startDate = document.getElementById('startDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const attendeesCount = safeNum(document.getElementById('attendeesCount').value);
  const submitBtn = document.querySelector('#booking-form-modal form button[type="submit"]') || document.querySelector('#standaloneBookingForm button[type="submit"]') || document.querySelector('button[type="submit"]');

  const statusBox = document.getElementById('live-check-box');
  if (!statusBox) return;

  const maxCap = HALL_CAPACITIES[hallName] || 30;

  if (attendeesCount > maxCap) {
    statusBox.className = 'live-status-box danger';
    statusBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> تنبيه: عدد الحضور المتوقع (${attendeesCount}) يتجاوز سعة القاعة القصوى (${maxCap} شخص).`;
    if (submitBtn) submitBtn.disabled = true;
    return false;
  }

  // Calculate Duration
  let durationText = '';
  if (startTime && endTime) {
    const startH = parseInt(startTime.split(':')[0], 10);
    const endH = parseInt(endTime.split(':')[0], 10);
    const diff = endH - startH;
    if (diff > 0) {
      durationText = ` (⏱️ مدة الفعالية: ${diff} ساعات)`;
    } else if (diff <= 0) {
      statusBox.className = 'live-status-box danger';
      statusBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> خطأ: يجب أن يكون وقت الانتهاء بعد وقت البدء.`;
      if (submitBtn) submitBtn.disabled = true;
      return false;
    }
  }

  if (startDate && startTime && endTime) {
    const conflictBooking = bookings.find(b => {
      if (b.status === 'accepted' && b.hallName === hallName && b.startDate === startDate) {
        return (startTime < b.endTime && endTime > b.startTime);
      }
      return false;
    });

    if (conflictBooking) {
      statusBox.className = 'live-status-box danger';
      statusBox.innerHTML = `
        <div style="font-weight: 800; font-size: 1rem; color: #ff5252; margin-bottom: 4px;">
          <i class="fa-solid fa-ban"></i> ⚠️ هذه القاعة محجوزة ومغلقة في هذا التوقيت بالتحديد!
        </div>
        <div>
          النشاط المحجوز بالتقويم: <strong>"${conflictBooking.eventTitle}"</strong> (${formatTime12h(conflictBooking.startTime)} إلى ${formatTime12h(conflictBooking.endTime)}).
          <br>
          <span style="text-decoration: underline;">يرجى تغيير التوقيت أو اختيار قاعة أخرى لتتمكن من الحجز.</span> ${durationText}
        </div>
      `;
      if (submitBtn) submitBtn.disabled = true;
      return false;
    }
  }

  if (submitBtn) submitBtn.disabled = false;
  statusBox.className = 'live-status-box success';
  statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> القاعة والتوقيت متاحان تماماً للحجز! وسعة القاعة مناسبة (${attendeesCount}/${maxCap}).${durationText}`;
  return true;
}

// ASYNC PUBLIC BOOKING SUBMISSION TO API & TICKET VOUCHER RENDER
async function handleBookingSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const isPaidRadio = document.querySelector('input[name="isPaidEvent"]:checked');
  const isPaid = isPaidRadio ? isPaidRadio.value : 'لا';
  const isSponsoredRadio = document.querySelector('input[name="isSponsored"]:checked');
  const isSponsored = isSponsoredRadio ? isSponsoredRadio.value : 'لا';

  const feeText = isPaid === 'نعم' ? 'تحدد لاحقاً بالليرة التركية (TL)' : '0 TL (نشاط مجاني)';

  const formData = {
    organizerName: document.getElementById('organizerName').value,
    whatsappNumber: document.getElementById('whatsappNumber').value,
    email: document.getElementById('email').value,
    entityType: document.getElementById('entityType').value,
    executorName: document.getElementById('executorName').value,
    eventType: document.getElementById('eventType').value,
    hallName: document.getElementById('hallName').value,
    eventTitle: document.getElementById('eventTitle').value,
    eventDescription: document.getElementById('eventDescription').value,
    attendeesCount: safeNum(document.getElementById('attendeesCount').value) || 1,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value || document.getElementById('startDate').value,
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    equipment: Array.from(document.querySelectorAll('input[name="equipment"]:checked')).map(cb => cb.value),
    extraEquipmentNeeds: document.getElementById('extraEquipmentNeeds') ? document.getElementById('extraEquipmentNeeds').value : '',
    isSponsored: isSponsored,
    isPaidEvent: isPaid,
    feeAmount: feeText,
    packageType: document.getElementById('packageType').value,
    additionalService: document.getElementById('additionalService').value
  };

  // Always trigger client-side direct ntfy push notification to admin phone & Mac
  sendDirectNtfyAlert(formData);

  try {
    const apiEndpoint = window.location.hostname.includes('github.io')
      ? 'https://majarra-center-booking.onrender.com/api/bookings'
      : '/api/bookings';

    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const result = await res.json();
    if (result.success && result.bookingData) {
      const fullBooking = { ...formData, ...result.bookingData };
      sendDirectNtfyAlert(fullBooking);
      bookings.unshift(fullBooking);
      syncCalendarViewToDate(fullBooking.startDate);
      saveBookingsToStorage();

      closeBookingModal();
      showTicketModal(fullBooking);
      return;
    }
  } catch (err) {
    console.warn('API post booking fallback:', err);
  }

  // Fallback if offline / static mode
  const localId = 'MJR-' + Math.floor(1000 + Math.random() * 9000);
  const localBooking = { id: localId, status: 'pending', createdAt: new Date().toISOString(), ...formData };
  sendDirectNtfyAlert(localBooking);
  bookings.unshift(localBooking);
  syncCalendarViewToDate(localBooking.startDate);
  saveBookingsToStorage();

  closeBookingModal();
  showTicketModal(localBooking);
}

// --- HIGH-ELEGANCE OFFICIAL BRANDED RECEIPT VOUCHER ---
let activeTicketBooking = null;

function showTicketModal(bookingDataOrId) {
  let booking;
  if (typeof bookingDataOrId === 'object' && bookingDataOrId !== null) {
    booking = bookingDataOrId;
  } else {
    booking = bookings.find(b => b.id === bookingDataOrId);
  }
  if (!booking) return;

  activeTicketBooking = booking;

  document.getElementById('ticket-booking-id').innerText = booking.id || 'MJR-1001';
  document.getElementById('ticket-client-name').innerText = `${booking.organizerName || 'مسؤول'} (${booking.executorName || 'جهة'})`;
  document.getElementById('ticket-event-title').innerText = booking.eventTitle || 'عنوان النشاط';
  document.getElementById('ticket-hall-name').innerText = booking.hallName || 'القاعة';
  document.getElementById('ticket-date-time').innerText = `${booking.startDate || ''} | ${booking.startTime || ''} - ${booking.endTime || ''}`;
  document.getElementById('ticket-package-info').innerText = `باقة ${booking.packageType || 'كفو'} | ${booking.additionalService || 'بدون خدمات إضافية'}`;
  document.getElementById('ticket-attendees').innerText = `${booking.attendeesCount || 1} شخص`;

  const feeEl = document.getElementById('ticket-fee-amount');
  if (feeEl) {
    feeEl.innerText = booking.feeAmount || '0 TL (نشاط مجاني)';
    if (booking.isPaidEvent === 'نعم' || safeStr(booking.feeAmount).includes('تحدد')) {
      feeEl.style.color = 'var(--accent-rose)';
    } else {
      feeEl.style.color = 'var(--brand-gold)';
    }
  }

  const badgeEl = document.getElementById('ticket-status-badge');
  if (booking.status === 'accepted') {
    badgeEl.className = 'ticket-status-badge';
    badgeEl.style.color = 'var(--accent-emerald)';
    badgeEl.style.borderColor = 'var(--accent-emerald)';
    badgeEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> مؤكد ومقبول بالتقويم';
  } else if (booking.status === 'rejected') {
    badgeEl.className = 'ticket-status-badge';
    badgeEl.style.color = 'var(--accent-rose)';
    badgeEl.style.borderColor = 'var(--accent-rose)';
    badgeEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> طلب مرفوض';
  } else {
    badgeEl.className = 'ticket-status-badge';
    badgeEl.style.color = 'var(--brand-gold)';
    badgeEl.style.borderColor = 'var(--brand-gold)';
    badgeEl.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> قيد التدقيق والمراجعة';
  }

  document.getElementById('ticket-modal').style.display = 'flex';
}

// --- GOOGLE CALENDAR SYNC LINK GENERATOR ---
function addEventToGoogleCalendar(bookingParam) {
  const b = bookingParam || activeTicketBooking;
  if (!b) return;

  const startDateClean = (b.startDate || '2026-09-01').replace(/-/g, '');
  const startTimeClean = (b.startTime || '10:00').replace(/:/g, '') + '00';
  const endTimeClean = (b.endTime || '12:00').replace(/:/g, '') + '00';

  const startIso = `${startDateClean}T${startTimeClean}`;
  const endIso = `${startDateClean}T${endTimeClean}`;

  const cleanHall = getCleanHallName(b.hallName);
  const title = encodeURIComponent(`فعالية: ${b.eventTitle} - ${cleanHall}`);
  const details = encodeURIComponent(`حجز معتمد في مركز مجرة المجتمعي\nرقم الحجز: #${b.id}\nالمسؤول: ${b.organizerName}\nالجهة: ${b.executorName}\nالواتساب: ${b.whatsappNumber}`);
  const location = encodeURIComponent('مركز مجرّة المجتمعي - Majarra Community Center');

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  window.open(gcalUrl, '_blank');
}

// --- WHATSAPP DIRECT MESSAGE BUILDER ---
function sendClientWhatsAppConfirmation() {
  if (!activeTicketBooking) return;
  const b = activeTicketBooking;
  const adminPhone = safeStr(siteSettings.adminPhone || '+905385062989').replace(/[^0-9]/g, '');

  const text = `مرحباً إدارة مركز مجرة المجتمعي👋✨\n\nقمت للتو بتقديم طلب حجز رقم (#${b.id}).\n\n📌 *تفاصيل طلب الحجز*:\n- *المسؤول*: ${b.organizerName}\n- *الجهة*: ${b.executorName}\n- *القاعة*: ${b.hallName}\n- *عنوان النشاط*: ${b.eventTitle}\n- *التاريخ*: ${b.startDate}\n- *التوقيت*: ${formatTime12h(b.startTime)} إلى ${formatTime12h(b.endTime)}\n\nأرجو متابعة واعتماد الطلب، وشكراً لكم! 🌸`;

  const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

function handleEntityTypeChange() {
  const entityTypeEl = document.getElementById('entityType');
  const executorNameEl = document.getElementById('executorName');
  const organizerNameEl = document.getElementById('organizerName');

  if (entityTypeEl && executorNameEl) {
    if (entityTypeEl.value === 'فرد مستقل' && (!executorNameEl.value || executorNameEl.value.includes('نشاط فردي'))) {
      executorNameEl.value = organizerNameEl && organizerNameEl.value ? `نشاط فردي (${organizerNameEl.value})` : 'نشاط فردي';
    }
  }
}

function sendWhatsAppStatusNotice(bookingId) {
  const b = bookings.find(item => item.id === bookingId);
  if (!b) return;

  const cleanPhone = safeStr(b.whatsappPhone).replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    Toast.show('error', 'رقم الواتساب غير متوفر لهذا الحجز');
    return;
  }

  let text = '';
  if (b.status === 'accepted') {
    text = `مرحباً ${b.organizerName}👋✨\n\nيسعدنا إعلامكم بأنه تم *قبول وتثبيت طلب حجزكم* رقم (#${b.id}) في مركز مجرة المجتمعي! 🎉\n\n📌 *تفاصيل الفعالية*:\n- *عنوان النشاط*: ${b.eventTitle}\n- *القاعة*: ${b.hallName}\n- *التاريخ*: ${b.startDate}\n- *التوقيت*: ${formatTime12h(b.startTime)} إلى ${formatTime12h(b.endTime)}\n\nنتمنى لكم نشاطاً موفقاً وناجحاً! 🌟`;
  } else if (b.status === 'rejected') {
    text = `مرحباً ${b.organizerName}👋\n\nنود إعلامكم بتعذر قبول طلب حجزكم رقم (#${b.id}) لقاعة ${b.hallName} بتاريخ ${b.startDate} نظراً لعدم توفر المساحة في هذا التوقيت.\n\nيسعدنا تواصلكم وتنسيق موعد آخر يناسبكم! 🌸`;
  } else {
    text = `مرحباً ${b.organizerName}👋\n\nطلب حجزكم رقم (#${b.id}) لقاعة ${b.hallName} بتاريخ ${b.startDate} قيد المراجعة والتدقيق الإداري وسيتم إبلاغكم بالنتيجة قريباً. ✨`;
  }

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').style.display = 'none';
}

function printTicket() {
  window.print();
}

// --- CSV EXPORT UTILITY ---
function exportBookingsToCSV() {
  if (bookings.length === 0) {
    alert('لا توجد بيانات حجوزات للتصدير.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM for Arabic Excel
  csvContent += 'رقم الحجز,المسؤول,الجهة,القاعة,عنوان النشاط,التاريخ,التوقيت,عدد الحضور,الرسوم (TL),الباقة,الحالة\n';

  bookings.forEach(b => {
    const row = [
      b.id,
      `"${b.organizerName}"`,
      `"${b.executorName}"`,
      `"${b.hallName}"`,
      `"${b.eventTitle}"`,
      b.startDate,
      `"${b.startTime} - ${b.endTime}"`,
      b.attendeesCount,
      `"${b.feeAmount || '0 TL'}"`,
      b.packageType,
      b.status
    ].join(',');
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `majarra_bookings_${getTodayISO()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- THEME TOGGLE (DARK / LIGHT) ---
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  const icon = document.querySelector('#theme-toggle i');
  if (icon) {
    icon.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
}

// --- PUBLIC BOOKING TRACKER BY ID ---
function openTrackModal(prefillId = '') {
  document.getElementById('track-booking-modal').style.display = 'flex';
  const inputEl = document.getElementById('trackBookingIdInput');
  const resultBox = document.getElementById('track-result-box');
  if (resultBox) resultBox.style.display = 'none';
  if (inputEl) {
    if (prefillId) inputEl.value = prefillId;
    setTimeout(() => inputEl.focus(), 100);
  }
}

function closeTrackModal() {
  document.getElementById('track-booking-modal').style.display = 'none';
}

async function performBookingTracking() {
  const inputEl = document.getElementById('trackBookingIdInput');
  const resultBox = document.getElementById('track-result-box');
  if (!inputEl || !resultBox) return;

  const rawInput = inputEl.value.trim();
  const cleanId = rawInput.replace(/#/g, '').trim().toUpperCase();
  if (!cleanId) {
    Toast.show('error', 'يرجى إدخال رقم الحجز للبحث');
    return;
  }

  // Try API endpoint first
  let booking = null;
  try {
    const res = await fetch(`/api/bookings/track/${encodeURIComponent(cleanId)}`);
    const data = await res.json();
    if (data.success && data.booking) {
      booking = sanitizeBookingObject(data.booking);
    }
  } catch (err) {
    console.warn('API track fallback to local array:', err);
  }

  if (!booking) {
    booking = bookings.find(b => safeStr(b.id).replace(/#/g, '').trim().toUpperCase() === cleanId);
  }

  if (!booking) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div class="alert-banner danger" style="margin: 0;">
        <i class="fa-solid fa-circle-xmark"></i> لم يتم العثور على أي حجز برقم (<strong>#${cleanId}</strong>). يرجى التأكد من الرقم والمحاولة مجدداً.
      </div>
    `;
    return;
  }

  // Build Result Card
  let statusBadgeHtml = '';
  if (booking.status === 'accepted') {
    statusBadgeHtml = '<span class="badge badge-accepted" style="font-size: 0.92rem; padding: 6px 14px;"><i class="fa-solid fa-circle-check"></i> مقبول ومثبت في التقويم</span>';
  } else if (booking.status === 'rejected') {
    statusBadgeHtml = '<span class="badge badge-rejected" style="font-size: 0.92rem; padding: 6px 14px;"><i class="fa-solid fa-circle-xmark"></i> طلب مرفوض</span>';
  } else {
    statusBadgeHtml = '<span class="badge badge-pending" style="font-size: 0.92rem; padding: 6px 14px;"><i class="fa-solid fa-hourglass-half"></i> قيد التدقيق والمراجعة</span>';
  }

  const start12h = formatTime12h(booking.startTime);
  const end12h = formatTime12h(booking.endTime);

  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div class="card" style="background: rgba(138, 111, 178, 0.08); border: 1px solid var(--brand-purple); border-radius: 12px; padding: 18px; margin: 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
        <strong style="font-size: 1.15rem; color: var(--brand-gold);"># ${booking.id}</strong>
        ${statusBadgeHtml}
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.92rem; margin-bottom: 16px;">
        <div><strong>📌 عنوان النشاط:</strong> ${booking.eventTitle}</div>
        <div><strong>🚪 القاعة:</strong> ${booking.hallName}</div>
        <div><strong>👤 المسؤول والجهة:</strong> ${booking.organizerName} (${booking.executorName})</div>
        <div><strong>📅 التاريخ والوقت:</strong> ${booking.startDate} | ${start12h} - ${end12h}</div>
        <div><strong>👥 عدد الحضور:</strong> ${booking.attendeesCount} شخص</div>
        <div><strong>💰 الرسوم المقدرة:</strong> <span style="color: var(--brand-gold); font-weight: 800;">${booking.feeAmount || '0 TL'}</span></div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary full-width" onclick="closeTrackModal(); showTicketModal('${booking.id}');">
          <i class="fa-solid fa-receipt"></i> عرض وطباعة الإيصال الرقمي
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   ENTERPRISE FEATURE UPGRADES: PDF EXPORT, WHATSAPP ALERTS, FEEDBACK & TIME LOCK
   ========================================================================== */

// 1. Direct 1-Click PDF Voucher Export via html2pdf.js
function downloadTicketPDF() {
  const element = document.getElementById('ticket-printable-area');
  if (!element) return;

  if (typeof html2pdf === 'undefined') {
    alert('جارٍ تحضير الطباعة التلقائية للإيصال...');
    window.print();
    return;
  }

  const bookingId = document.getElementById('ticket-booking-id')?.innerText || 'Receipt';
  const opt = {
    margin:       0.2,
    filename:     `Majarra_Voucher_${bookingId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

// 2. Realtime Time Slot Conflict Checking on Booking Form
function checkTimeSlotConflictsLive() {
  const day = document.getElementById('eventDay')?.value || '01';
  const month = document.getElementById('eventMonth')?.value || '09';
  const year = document.getElementById('eventYear')?.value || '2026';
  const selectedDate = `${year}-${month}-${day}`;
  
  const hallName = document.getElementById('hallName')?.value || '';

  const banner = document.getElementById('time-slot-conflict-banner');
  const bannerText = document.getElementById('time-slot-conflict-text');
  if (!banner || !bannerText) return;

  const dayBookings = bookings.filter(b => b.startDate === selectedDate && b.status !== 'rejected');
  
  if (dayBookings.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const hallBookings = dayBookings.filter(b => safeStr(b.hallName).includes(safeStr(hallName).split(' ')[0]) || b.hallName === 'المركز كلياً');
  
  if (hallBookings.length > 0) {
    const bookedTimesStr = hallBookings.map(b => `${b.startTime} - ${b.endTime}`).join(' ، ');
    banner.style.display = 'block';
    bannerText.innerHTML = `تنبيه توفر: القاعة لها حجوزات في هذا التاريخ بالأوقات (${bookedTimesStr}). يرجى التأكد من اختيار وقت غير متضارب.`;
  } else {
    banner.style.display = 'none';
  }
}

// 3. Post-Event Feedback & Rating System
let selectedStarRating = 5;

function openFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  if (modal) {
    modal.style.display = 'flex';
    setFeedbackRating(5);
  }
}

function closeFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  if (modal) modal.style.display = 'none';
}

function setFeedbackRating(stars) {
  selectedStarRating = stars;
  const ratingInput = document.getElementById('fb-rating-val');
  if (ratingInput) ratingInput.value = stars;

  const starBtns = document.querySelectorAll('#star-rating-box .star-btn');
  starBtns.forEach((star, idx) => {
    if (idx < stars) {
      star.style.color = 'var(--brand-gold)';
      star.classList.remove('fa-regular');
      star.classList.add('fa-solid');
    } else {
      star.style.color = '#94a3b8';
      star.classList.remove('fa-solid');
      star.classList.add('fa-regular');
    }
  });
}

function submitFeedback(e) {
  e.preventDefault();
  const rating = selectedStarRating;
  const comments = document.getElementById('fb-comments')?.value.trim() || 'بدون ملاحظات إضافية';

  const feedbackObj = {
    id: `FB-${Math.floor(100 + Math.random() * 900)}`,
    rating,
    comments,
    createdAt: new Date().toISOString()
  };

  const storedFeedback = getStoredFeedbacks();
  storedFeedback.unshift(feedbackObj);
  localStorage.setItem('majarra_feedbacks', JSON.stringify(storedFeedback));

  closeFeedbackModal();
  if (document.getElementById('fb-comments')) document.getElementById('fb-comments').value = '';
  renderFeedbacksView();
  alert(`شغوفون برأيك! تم استلام انطباعك وتقييمك (${rating} نجوم) لـ مركز مجرّة المجتمعي بنجاح. شكراً لتواصلك! 🌟`);
}

// --- DEDICATED ADMIN FEEDBACKS & REVIEWS LOGIC ---
const INITIAL_DEMO_FEEDBACKS = [
  {
    id: 'FB-982',
    rating: 5,
    comments: 'المكان راقي وممتاز جداً، والتجهيزات الصوتية والشاشة في قاعة ديوان ممتازة! شكراً لفريق مركز مجرة على حسن الاستقبال والتنسيق الجميل.',
    createdAt: '2026-09-02T16:30:00.000Z'
  },
  {
    id: 'FB-741',
    rating: 5,
    comments: 'تجربة رائعة في قاعة أفق لإقامة ورشة التدريب الشبابية، التكييف والنظافة والهدوء ممتاز. سنقوم بالحجز مرة أخرى بالتأكيد.',
    createdAt: '2026-09-03T11:15:00.000Z'
  },
  {
    id: 'FB-655',
    rating: 5,
    comments: 'قاعة سديم مريحة جداً لاجتماعات فرق العمل والجلسات الاستشارية، الإنترنت سريع والتجهيزات كاملة.',
    createdAt: '2026-09-04T10:00:00.000Z'
  }
];

function getStoredFeedbacks() {
  const raw = localStorage.getItem('majarra_feedbacks');
  if (!raw) {
    localStorage.setItem('majarra_feedbacks', JSON.stringify(INITIAL_DEMO_FEEDBACKS));
    return INITIAL_DEMO_FEEDBACKS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('majarra_feedbacks', JSON.stringify(INITIAL_DEMO_FEEDBACKS));
      return INITIAL_DEMO_FEEDBACKS;
    }
    return parsed;
  } catch (e) {
    return INITIAL_DEMO_FEEDBACKS;
  }
}

function renderFeedbacksView() {
  const tbody = document.getElementById('feedbacksTableBody');
  const feedbacks = getStoredFeedbacks();

  // Update badge count
  const badgeEl = document.getElementById('feedbacks-badge-count');
  if (badgeEl) badgeEl.innerText = feedbacks.length;

  if (!tbody) return;

  // Search & Filter
  const searchVal = safeLower((document.getElementById('fb-search-input')?.value || '').trim());
  const ratingFilter = document.getElementById('fb-rating-filter')?.value || 'all';

  let filtered = feedbacks.filter(f => {
    const matchSearch = !searchVal || safeLower(f.comments).includes(searchVal) || safeLower(f.id).includes(searchVal);
    const matchRating = ratingFilter === 'all' || (ratingFilter === '3' ? f.rating <= 3 : String(f.rating) === ratingFilter);
    return matchSearch && matchRating;
  });

  // Calculate Analytics Statistics
  const totalCount = feedbacks.length;
  let avgRating = '5.0';
  let satisfactionPct = 100;

  if (totalCount > 0) {
    const sum = feedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
    avgRating = (sum / totalCount).toFixed(1);
    const positiveCount = feedbacks.filter(f => Number(f.rating) >= 4).length;
    satisfactionPct = Math.round((positiveCount / totalCount) * 100);
  }

  const statAvgEl = document.getElementById('fb-stat-avg');
  const statTotalEl = document.getElementById('fb-stat-total');
  const statSatEl = document.getElementById('fb-stat-satisfaction');

  if (statAvgEl) statAvgEl.innerText = `${avgRating} / 5.0`;
  if (statTotalEl) statTotalEl.innerText = totalCount;
  if (statSatEl) statSatEl.innerText = `${satisfactionPct}%`;

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-star-half-stroke" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: var(--brand-gold);"></i>
          لا توجد تقييمات مطابقة لمعايير التصفية المختارة
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    
    // Build star icons
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= item.rating) {
        starsHtml += '<i class="fa-solid fa-star" style="color: var(--brand-gold); margin-left: 2px;"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star" style="color: #94a3b8; margin-left: 2px;"></i>';
      }
    }

    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'اليوم';

    tr.innerHTML = `
      <td><strong style="color: var(--brand-gold);">${item.id}</strong></td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div>${starsHtml}</div>
          <span class="badge" style="background: rgba(232, 198, 119, 0.15); color: var(--brand-gold); border: 1px solid rgba(232, 198, 119, 0.3); font-weight: 700;">${item.rating}.0</span>
        </div>
      </td>
      <td style="max-width: 440px; line-height: 1.6; font-size: 0.92rem;">
        <div style="background: var(--bg-tertiary); padding: 10px 14px; border-radius: 8px; border-right: 3px solid var(--brand-purple);">
          <i class="fa-solid fa-quote-right" style="color: var(--brand-purple); opacity: 0.5; margin-left: 6px;"></i>
          ${item.comments}
        </div>
      </td>
      <td>
        <div style="font-size: 0.86rem; font-weight: 600;">${dateStr}</div>
        <small style="color: var(--text-muted);"><i class="fa-solid fa-globe"></i> نموذج التقييم الرقمي</small>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="deleteFeedback('${item.id}')" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);" title="حذف هذا التقييم">
          <i class="fa-solid fa-trash"></i> حذف
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteFeedback(id) {
  confirmDeleteModal({
    title: 'حذف التقييم',
    message: `هل أنت متأكد من رغبتك في حذف التقييم رقم (${id})؟`,
    dangerBtnText: 'حذف التقييم 🗑️',
    onConfirm: () => {
      let feedbacks = getStoredFeedbacks();
      feedbacks = feedbacks.filter(f => String(f.id) !== String(id));
      localStorage.setItem('majarra_feedbacks', JSON.stringify(feedbacks));
      renderFeedbacksView();
      Toast.show('success', 'تم حذف التقييم بنجاح ✅');
    }
  });
}

function exportFeedbacksCSV() {
  const feedbacks = getStoredFeedbacks();
  if (feedbacks.length === 0) {
    alert('لا توجد تقييمات لتصديرها حالياً');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += 'رقم التقييم,عدد النجوم,الانطباع والتعليق,تاريخ التقييم\n';

  feedbacks.forEach(f => {
    const cleanComm = (f.comments || '').replace(/"/g, '""');
    csvContent += `"${f.id}","${f.rating}","${cleanComm}","${f.createdAt || ''}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Majarra_Visitor_Feedbacks_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   ENTERPRISE MOTION & VISUAL FX ENGINE INITIALIZATION
   ========================================================================== */

// 1. Cosmic Particles Canvas Particle Engine
function initCosmicParticleEngine() {
  const canvas = document.getElementById('cosmic-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 25), 45);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.5,
      color: Math.random() > 0.4 ? 'rgba(138, 111, 178, ' : 'rgba(232, 198, 119, ',
      alpha: Math.random() * 0.5 + 0.1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4
    });
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(renderParticles);
  }

  renderParticles();
}

// 2. 3D Tilt & Magnetic Motion on Cards
function init3DTiltCards() {
  const cards = document.querySelectorAll('.hall-card, .stat-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// 3. Scroll Reveal Motion Observer
function initScrollRevealObserver() {
  const elements = document.querySelectorAll('.card, .hall-card, .section-header, .toolbar-card');
  elements.forEach(el => el.classList.add('reveal-on-scroll'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

// 4. Animated Number Counters Engine
function animateNumberCounters() {
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach(el => {
    const target = parseInt(el.getAttribute('data-target') || el.innerText.replace(/\D/g, ''), 10);
    if (isNaN(target) || target === 0) return;

    let count = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      count += increment;
      if (count >= target) {
        el.innerText = target;
        clearInterval(timer);
      } else {
        el.innerText = Math.floor(count);
      }
    }, stepTime);
  });
}

// Auto-run motion engines & mobile view detector when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) {
    setPublicCalendarViewMode('agenda');
  }
  setTimeout(() => {
    initCosmicParticleEngine();
    init3DTiltCards();
    initScrollRevealObserver();
  }, 300);
});

// ==========================================
// BIO HUB DYNAMIC BACKEND MANAGER (ADMIN)
// ==========================================
let currentBioData = { profile: {}, links: [], events: [] };

const DEFAULT_FALLBACK_EVENTS = [
  {
    id: 1,
    slug: 'rawya-club',
    title: 'نادي راوية القرّاء — الجلسة النقاشية الأدبية',
    description: 'استمارة التسجيل في الجلسة التفاعلية لنادي القرّاء بقاعة ديوان.',
    is_active: 1,
    registeredCount: 14
  },
  {
    id: 2,
    slug: 'cinema-discussion',
    title: 'نادي السينما والمجتمع — العرض والنقاش التفاعلي',
    description: 'استمارة حضور وتأكيد المقاعد لندوة عرض وتحليل الأفلام.',
    is_active: 1,
    registeredCount: 22
  },
  {
    id: 3,
    slug: 'calligraphy-workshop',
    title: 'ورشة أصول الخط العربي والمخطوطات القديمة',
    description: 'استمارة الانضمام للورشة التدريبية في فن الخط العربي.',
    is_active: 1,
    registeredCount: 9
  }
];

async function loadBioAdminManager() {
  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/settings/bio', { headers });
    const data = await res.json();
    if (data.success && data.profile) {
      currentBioData = data;
      populateBioProfileForm(data.profile);
      renderBioEventsTable(data.events || []);
      renderBioLinksTable(data.links || []);
      return;
    }
  } catch (err) {
    console.warn('Using demo fallback for Bio Hub:', err);
  }

  const fallbackBio = {
    profile: {
      title: 'مركز مجرّة المجتمعي | Majarra Hub',
      subtitle: 'مساحات وقاعات حيوية مجهزة للفعاليات والورش الجماهيرية في إسطنبول',
      bioDesc: 'المنصة الرسمية لحجز القاعات والتسجيل في الأنشطة الثقافية والمجتمعية.',
      locationTitle: 'الفاتح — إسطنبول (تركيا)',
      locationDesc: 'القرب من محطة الفاتح والخدمات العامة',
      videoTitle: 'جولة تعريفية بقاعات ومرافق المركز 🎥',
      videoUrl: 'https://www.youtube.com/',
      instagramUrl: 'https://www.instagram.com/majarracommunity/',
      whatsappUrl: 'https://wa.me/905385062989',
      emailUrl: 'mailto:nur.beik1237@gmail.com'
    },
    events: [
      { id: 1, event_date: 'كل يوم إثنين', title: 'جلسات نادي القرّاء الأسبوعية', hall_name: 'قاعة أفــُـق', time_slot: '05:00 م - 07:30 م', is_active: 1 },
      { id: 2, event_date: 'كل يوم أربعاء', title: 'عروض وتجارب سينمائية ونقاش', hall_name: 'قاعة ديـــوان', time_slot: '06:00 م - 08:30 م', is_active: 1 }
    ],
    links: [
      { id: 1, title: '🏛️ حجز قاعات ومساحات مركز مجرّة', url: 'http://localhost:3000/book.html?hall=ofoq', is_active: 1, icon: 'fa-calendar-check' },
      { id: 2, title: '📖 التسجيل في نادي راوية القرّاء', url: 'http://localhost:3000/e/rawya-club', is_active: 1, icon: 'fa-book-open' }
    ]
  };
  currentBioData = fallbackBio;
  populateBioProfileForm(fallbackBio.profile);
  renderBioEventsTable(fallbackBio.events);
  renderBioLinksTable(fallbackBio.links);
}

async function loadDynamicEventsAdminManager() {
  const container = document.getElementById('dynamic-events-grid');
  if (!container) return;

  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/events', { headers });
    const data = await res.json();

    if (data.success && Array.isArray(data.events)) {
      renderDynamicEventsGrid(data.events);
      return;
    }
  } catch (err) {
    console.warn('Error loading dynamic events:', err);
  }

  renderDynamicEventsGrid([]);
}

let currentEventRegistrationsList = [];
let currentAdminEventId = null;

function renderDynamicEventsGrid(events) {
  const container = document.getElementById('dynamic-events-grid');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); background: rgba(15,23,42,0.5); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color: var(--brand-purple);"></i>
        لا توجد استمارات فعاليات مخصصة مسبقاً. اضغط على "إنشاء فعالية ورابط تسجيل جديد" للبدء.
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(ev => {
    const isAct = ev.is_active !== undefined ? (ev.is_active ? 1 : 0) : 1;
    const regCount = ev.registeredCount || 0;
    const fullUrl = `${window.location.origin}/e/${ev.slug}`;
    const safeTitle = (ev.title || '').replace(/'/g, "\\'");

    return `
      <div class="card" style="padding: 22px; border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 18px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px); position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
        
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
            <h3 style="font-size: 1.15rem; font-weight: 900; color: #ffffff; margin: 0; line-height: 1.3;">${ev.title}</h3>
            <span class="badge" style="background: ${isAct ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)'}; color: ${isAct ? '#34d399' : '#f87171'}; border: 1px solid ${isAct ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; font-weight: 800; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; white-space: nowrap;">
              ${isAct ? 'نشط 🟢' : 'متوقف 🔴'}
            </span>
          </div>

          <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${ev.description || 'استمارة مسجلة بمركز مجرّة المجتمعي'}
          </p>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; align-items: center;">
            <button onclick="openEventRegistrationsFullview('${ev.id}', '${safeTitle}')" class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 900; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 6px; transition: transform 0.2s ease;">
              <i class="fa-solid fa-users"></i> المسجلون: <strong>${regCount}</strong>
            </button>
            
            <div dir="ltr" style="background: rgba(11, 15, 25, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px 12px; font-family: monospace; font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
              e/${ev.slug}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 14px;">
          
          <button onclick="openEventRegistrationsFullview('${ev.id}', '${safeTitle}')" class="btn" style="grid-column: 1 / -1; background: linear-gradient(135deg, #a855f7, #7e22ce); color: #ffffff; font-weight: 900; border-radius: 10px; border: none; padding: 10px; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(168,85,247,0.35);">
            <i class="fa-solid fa-users-viewfinder"></i> إدارة ومراجعة المسجلين (${regCount})
          </button>

          <a href="/e/${ev.slug}" target="_blank" class="btn" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 800; border-radius: 10px; padding: 8px; font-size: 0.84rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-eye"></i> معاينة
          </a>

          <button onclick="copyToClipboard('${fullUrl}', 'تم نسخ رابط الاستمارة المباشر 🔗')" class="btn" style="background: rgba(232, 198, 119, 0.15); border: 1px solid rgba(232, 198, 119, 0.4); color: var(--brand-gold); font-weight: 800; border-radius: 10px; padding: 8px; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-copy"></i> نسخ الرابط
          </button>

          <button onclick="window.location.href='builder.html?id=${ev.id}'" class="btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #e2e8f0; font-weight: 800; border-radius: 10px; padding: 8px; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-pen-to-square"></i> تعديل
          </button>

          <button onclick="deleteDynamicEvent('${ev.id}')" class="btn" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); color: #f43f5e; font-weight: 800; border-radius: 10px; padding: 8px; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-trash-can"></i> حذف
          </button>

        </div>

      </div>
    `;
  }).join('');
}

// FULLVIEW DYNAMIC EVENT REGISTRATIONS MANAGER LOGIC
async function openEventRegistrationsFullview(eventId, eventTitle = '') {
  currentAdminEventId = eventId;
  window.currentEventTitle = eventTitle || window.currentEventTitle || 'الفعالية';
  
  const mainView = document.getElementById('admin-dynamic-events-view');
  const fullView = document.getElementById('admin-event-registrations-fullview');
  if (mainView) mainView.style.display = 'none';
  if (fullView) fullView.style.display = 'block';

  const titleEl = document.getElementById('fullview-reg-event-title');
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-users-check" style="color: var(--brand-gold); font-size: 1.6rem;"></i> ${eventTitle || window.currentEventTitle || 'إدارة وتأكيد تسجيلات الفعالية'}`;
  }

  const fullSearchEl = document.getElementById('fullview-reg-search-input');
  if (fullSearchEl) fullSearchEl.value = '';
  const regSearchEl = document.getElementById('reg-search-input');
  if (regSearchEl) regSearchEl.value = '';

  const exportBtn = document.getElementById('fullview-reg-export-btn');
  if (exportBtn) {
    exportBtn.href = `/api/admin/events/${eventId}/export`;
  }

  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/events/${eventId}/registrations`, { headers });
    const data = await res.json();

    if (data.success && Array.isArray(data.registrations)) {
      currentEventRegistrationsList = data.registrations;
    } else {
      currentEventRegistrationsList = [];
    }
  } catch (err) {
    console.error('Error fetching event registrations:', err);
    currentEventRegistrationsList = [];
  }

  renderEventRegistrationsTable(currentEventRegistrationsList);
}

function closeEventRegistrationsFullview() {
  const mainView = document.getElementById('admin-dynamic-events-view');
  const fullView = document.getElementById('admin-event-registrations-fullview');
  if (fullView) fullView.style.display = 'none';
  if (mainView) mainView.style.display = 'block';
}

function renderEventRegistrationsTable(list) {
  const tbody = document.getElementById('event-registrations-tbody');
  const statsBar = document.getElementById('fullview-reg-stats-bar');

  if (statsBar) {
    const totalCount = list.length;
    const appCount = list.filter(r => r.status === 'approved' || r.status === 'accepted').length;
    const pendCount = list.filter(r => r.status === 'pending' || !r.status).length;
    const rejCount = list.filter(r => r.status === 'rejected').length;

    statsBar.innerHTML = `
      <span class="badge" style="background: rgba(168, 85, 247, 0.18); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
        👥 إجمالي المسجلين: ${totalCount}
      </span>
      <span class="badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
        ✅ المقبولين: ${appCount}
      </span>
      <span class="badge" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
        ⏳ قيد المراجعة: ${pendCount}
      </span>
      <span class="badge" style="background: rgba(244, 63, 94, 0.18); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4); padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
        ❌ المرفوضين: ${rejCount}
      </span>
    `;
  }

  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-user-slash" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: var(--brand-purple);"></i>
          لا توجد تسجلايت مطابقة لهذا الفلتر حالياً.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((reg, idx) => {
    let answersObj = {};
    try {
      if (typeof reg.answers === 'object' && reg.answers !== null) {
        answersObj = reg.answers;
      } else if (reg.answers_json) {
        answersObj = typeof reg.answers_json === 'string' ? JSON.parse(reg.answers_json || '{}') : (reg.answers_json || {});
      } else if (reg.answers) {
        answersObj = typeof reg.answers === 'string' ? JSON.parse(reg.answers || '{}') : (reg.answers || {});
      }
    } catch(e) {}

    let name = reg.name;
    let phone = reg.phone || reg.whatsappNumber || reg.whatsapp_number || reg.phone_number;
    let email = reg.email;

    if (!name || name === 'مشارك' || name === 'مشارك جديد') {
      for (const [k, v] of Object.entries(answersObj)) {
        const key = k.trim();
        const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
        if (valStr && valStr !== '-' && (key.includes('الاسم') || key.includes('اسم') || key.toLowerCase().includes('name'))) {
          name = valStr;
          break;
        }
      }
    }

    if (!phone || phone === '-') {
      for (const [k, v] of Object.entries(answersObj)) {
        const key = k.trim();
        const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
        if (valStr && valStr !== '-' && (key.includes('هاتف') || key.includes('واتساب') || key.includes('موبايل') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile') || key.toLowerCase().includes('tel'))) {
          phone = valStr;
          break;
        }
      }
    }

    if (!email || email === '-') {
      for (const [k, v] of Object.entries(answersObj)) {
        const key = k.trim();
        const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
        if (valStr && valStr !== '-' && (key.includes('بريد') || key.toLowerCase().includes('email') || key.toLowerCase().includes('mail'))) {
          email = valStr;
          break;
        }
      }
    }

    name = name || 'مشارك جديد';
    phone = phone || '-';
    email = email || '-';

    const cleanPhone = safeStr(phone).replace(/[^0-9+]/g, '');
    const waMsg = encodeURIComponent(`مرحباً ${name}، بخصوص تسجيلكم في الفعالية بمركز مجرّة...`);
    const dateStr = reg.created_at || reg.createdAt || reg.submitted_at || '';

    let statusBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem;">⏳ قيد المراجعة</span>';
    if (reg.status === 'approved' || reg.status === 'accepted') {
      statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem;">✅ مقبول</span>';
    } else if (reg.status === 'rejected') {
      statusBadge = '<span class="badge" style="background: rgba(244, 63, 94, 0.18); color: #f87171; border: 1px solid rgba(244, 63, 94, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.82rem;">❌ مرفوض</span>';
    }

    const answersCount = Object.keys(answersObj).length;

    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 16px; font-weight: 800; color: var(--brand-gold); font-family: monospace;">#${idx + 1}</td>
        <td style="padding: 16px;">
          <div style="font-weight: 900; color: #ffffff; font-size: 0.96rem;">${name}</div>
          <small style="color: var(--text-muted); font-size: 0.78rem;">📅 ${dateStr}</small>
        </td>
        <td style="padding: 16px;">
          ${phone && phone !== '-' ? `
            <a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" style="color: #25D366; font-size: 0.86rem; font-weight: 700; text-decoration: none;" title="تواصل عبر الواتساب">
              <i class="fa-brands fa-whatsapp"></i> ${phone}
            </a>
          ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>'}
        </td>
        <td style="padding: 16px;">
          ${email && email !== '-' ? `
            <a href="mailto:${email}" style="color: #38bdf8; font-size: 0.86rem; font-weight: 700; text-decoration: none;" title="${email}">
              <i class="fa-solid fa-envelope"></i> ${email}
            </a>
          ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>'}
        </td>
        <td style="padding: 16px; text-align: center;">
          <button onclick="showRegistrationAnswersModal('${reg.id || idx}')" class="btn btn-outline btn-sm" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.12); font-weight: 800; border-radius: 8px; padding: 5px 14px; font-size: 0.82rem; cursor: pointer;">
            <i class="fa-solid fa-file-lines"></i> إجابات النموذج
          </button>
        </td>
        <td style="padding: 16px; text-align: center;">
          ${statusBadge}
        </td>
        <td style="padding: 16px; text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button onclick="updateRegistrationStatus('${reg.id}', 'approved')" title="قبول المشارك ومراسلته على الواتساب" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <i class="fa-solid fa-check"></i>
            </button>
            <button onclick="openWhatsAppApprovalNotice('${reg.id}')" title="إرسال رسالة القبول عبر الواتساب مباشرة" style="background: rgba(37, 211, 102, 0.2); border: 1px solid rgba(37, 211, 102, 0.4); color: #25D366; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button onclick="updateRegistrationStatus('${reg.id}', 'rejected')" title="رفض المشارك" style="background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.4); color: #f87171; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button onclick="deleteRegistration('${reg.id}')" title="حذف التسجيل" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #ef4444; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openWhatsAppApprovalNotice(regId) {
  const reg = currentEventRegistrationsList.find(r => String(r.id) === String(regId));
  if (!reg) return;

  const rawPhone = reg.phone || reg.whatsappNumber || reg.whatsapp_number || reg.phone_number || '';
  let cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith('00')) cleanPhone = '+' + cleanPhone.slice(2);
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = '+90' + cleanPhone.slice(1);
  if (!cleanPhone.startsWith('+') && cleanPhone.length === 10) cleanPhone = '+90' + cleanPhone;
  cleanPhone = cleanPhone.replace('+', '');

  if (!cleanPhone) {
    showToast('⚠️ لا يوجد رقم هاتف مسجل لهذا المشارك', 'warning');
    return;
  }

  const name = reg.name || reg.full_name || 'المشارك';
  const eventTitle = window.currentEventTitle || 'الفعالية';
  
  const textMsg = `أهلاً بك ${name} 👋\nيسعدنا إعلامك بأنه تم قبول تسجيلك رسمياً في (${eventTitle}) بمركز مجرّة المجتمعي! 🎉\n\nنتطلع لاستقبالك ورؤيتك معنا 🚀✨`;
  
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
  window.open(waUrl, '_blank');
}

function filterRegistrationsByStatus(status) {
  document.querySelectorAll('.reg-tab-btn').forEach(btn => btn.classList.remove('active'));
  const targetBtn = document.getElementById(`reg-tab-${status}`);
  if (targetBtn) targetBtn.classList.add('active');

  if (status === 'all') {
    renderEventRegistrationsTable(currentEventRegistrationsList);
  } else if (status === 'approved') {
    renderEventRegistrationsTable(currentEventRegistrationsList.filter(r => r.status === 'approved' || r.status === 'accepted'));
  } else if (status === 'pending') {
    renderEventRegistrationsTable(currentEventRegistrationsList.filter(r => r.status === 'pending' || !r.status));
  } else if (status === 'rejected') {
    renderEventRegistrationsTable(currentEventRegistrationsList.filter(r => r.status === 'rejected'));
  }
}

function filterRegistrationsList(query) {
  const q = safeStr(query).toLowerCase().trim();
  if (!q) {
    renderEventRegistrationsTable(currentEventRegistrationsList);
    return;
  }
  const filtered = currentEventRegistrationsList.filter(r => {
    return safeStr(r.name).toLowerCase().includes(q) ||
           safeStr(r.phone).includes(q) ||
           safeStr(r.whatsappNumber).includes(q) ||
           safeStr(r.email).toLowerCase().includes(q);
  });
  renderEventRegistrationsTable(filtered);
}

async function updateRegistrationStatus(regId, newStatus) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/events/registrations/${regId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(newStatus === 'approved' ? 'تم قبول التسجيل وسيتم فتح الواتساب للمراسلة 🟢💬' : 'تم تحديث الحالة 🚀', 'success');
      
      // Auto open WhatsApp on approval!
      if (newStatus === 'approved') {
        openWhatsAppApprovalNotice(regId);
      }

      if (currentAdminEventId) openEventRegistrationsFullview(currentAdminEventId);
    } else {
      showToast(data.message || 'فشل تحديث حالة التسجيل', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ في الاتصال أثناء تحديث حالة التسجيل', 'error');
  }
}

async function deleteRegistration(regId) {
  confirmDeleteModal({
    title: 'حذف التسجيل',
    message: 'هل أنت متأكد من رغبتك في حذف هذا التسجيل؟',
    dangerBtnText: 'حذف 🗑️',
    onConfirm: async () => {
      try {
        const headers = {};
        const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/admin/events/registrations/${regId}`, { method: 'DELETE', headers });
        const data = await res.json();
        if (data.success) {
          showToast('تم حذف التسجيل بنجاح ✅', 'success');
          if (currentAdminEventId) openEventRegistrationsFullview(currentAdminEventId);
        } else {
          showToast(data.message || 'فشل حذف التسجيل', 'error');
        }
      } catch (err) {
        showToast('حدث خطأ أثناء حذف التسجيل', 'error');
      }
    }
  });
}

async function deleteDynamicEvent(eventId) {
  confirmDeleteModal({
    title: 'حذف استمارة الفعالية',
    message: 'هل أنت متأكد من رغبتك في حذف هذه الاستمارة بالكامل؟',
    dangerBtnText: 'حذف الاستمارة 🗑️',
    onConfirm: async () => {
      try {
        const headers = {};
        const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE', headers });
        const data = await res.json();
        if (data.success) {
          showToast('تم حذف الاستمارة بنجاح ✅', 'success');
          await loadDynamicEventsAdminManager();
          if (typeof loadBioAdminManager === 'function') loadBioAdminManager();
        } else {
          showToast(data.message || 'فشل حذف الاستمارة', 'error');
        }
      } catch (err) {
        showToast('حدث خطأ في الاتصال أثناء الحذف', 'error');
      }
    }
  });
}

function showRegistrationAnswersModal(regId) {
  const reg = currentEventRegistrationsList.find(r => String(r.id) === String(regId));
  if (!reg) return;

  let answersObj = {};
  try {
    if (typeof reg.answers === 'object' && reg.answers !== null && Object.keys(reg.answers).length > 0) {
      answersObj = reg.answers;
    } else if (reg.answers_json) {
      answersObj = typeof reg.answers_json === 'string' ? JSON.parse(reg.answers_json || '{}') : (reg.answers_json || {});
    } else if (reg.answers) {
      answersObj = typeof reg.answers === 'string' ? JSON.parse(reg.answers || '{}') : (reg.answers || {});
    }
  } catch (e) {
    answersObj = { "الإجابات": reg.answers || reg.answers_json || 'لا توجد إجابات إضافية' };
  }

  let participantName = reg.name || 'المشارك';
  let participantPhone = reg.phone || '-';
  let participantEmail = reg.email || '-';

  if (!participantName || participantName === 'مشارك' || participantName === 'مشارك جديد') {
    for (const [k, v] of Object.entries(answersObj)) {
      const key = k.trim();
      const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
      if (valStr && valStr !== '-' && (key.includes('الاسم') || key.includes('اسم') || key.toLowerCase().includes('name'))) {
        participantName = valStr;
        break;
      }
    }
  }

  if (!participantPhone || participantPhone === '-') {
    for (const [k, v] of Object.entries(answersObj)) {
      const key = k.trim();
      const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
      if (valStr && valStr !== '-' && (key.includes('هاتف') || key.includes('واتساب') || key.includes('موبايل') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile') || key.toLowerCase().includes('tel'))) {
        participantPhone = valStr;
        break;
      }
    }
  }

  if (!participantEmail || participantEmail === '-') {
    for (const [k, v] of Object.entries(answersObj)) {
      const key = k.trim();
      const valStr = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
      if (valStr && valStr !== '-' && (key.includes('بريد') || key.toLowerCase().includes('email') || key.toLowerCase().includes('mail'))) {
        participantEmail = valStr;
        break;
      }
    }
  }

  let rowsHtml = '';
  let idx = 0;
  for (const [key, val] of Object.entries(answersObj)) {
    idx++;
    const labelTitle = (typeof FIELD_LABEL_DICTIONARY !== 'undefined' && FIELD_LABEL_DICTIONARY[key]) ? FIELD_LABEL_DICTIONARY[key] : key;
    let displayVal = Array.isArray(val) ? val.join(' • ') : (val || '-');
    if (!displayVal || displayVal === '') displayVal = '-';

    const isCheckboxOrRadio = Array.isArray(val) || (typeof val === 'string' && (val === 'نعم' || val === 'موافق' || val.includes('•')));

    rowsHtml += `
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
        <div style="color: #a5b4fc; font-weight: 800; font-size: 0.9rem; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px;">
          <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; font-family: monospace; font-weight: 900;">${idx}</span>
          <span style="flex: 1; line-height: 1.4;">${labelTitle}</span>
        </div>
        <div style="color: #ffffff; font-weight: 700; font-size: 0.96rem; line-height: 1.6; padding-right: 32px; word-break: break-word;">
          ${isCheckboxOrRadio ? `<span style="background: rgba(168, 85, 247, 0.15); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.3); padding: 4px 10px; border-radius: 8px; display: inline-block;">${displayVal}</span>` : displayVal}
        </div>
      </div>
    `;
  }

  if (!rowsHtml) {
    rowsHtml = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">لا توجد إجابات مسجلة في هذا الطلب.</div>`;
  }

  const cleanPhone = safeStr(participantPhone).replace(/[^0-9+]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${participantName}، بخصوص طلب انضمامكم إلى مجتمع مجرّة...`)}`;

  const modalHtml = `
    <div id="answers-details-modal" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(6, 8, 20, 0.88); backdrop-filter: blur(14px); z-index: 10000; padding: 20px;">
      <div class="modal-content card" style="max-width: 720px; width: 100%; border-radius: 24px; border: 1px solid rgba(129, 140, 248, 0.4); padding: 28px; background: rgba(15,23,42,0.98); max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.9);">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px;">
          <div>
            <span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 800;">📋 الاستمارة التفصيلية للمشاركين</span>
            <h3 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 6px 0 0 0;">
              ${participantName}
            </h3>
          </div>
          <button onclick="document.getElementById('answers-details-modal').remove()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; width: 36px; height: 36px; border-radius: 10px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>

        <!-- Participant Info Strip -->
        <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 18px; margin-bottom: 18px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 0.85rem;">
          <div><span style="color: #94a3b8;">📞 التواصل:</span> <a href="${waUrl}" target="_blank" style="color: #25D366; font-weight: 800; text-decoration: none;">${participantPhone}</a></div>
          <div><span style="color: #94a3b8;">✉️ البريد:</span> <strong style="color: #38bdf8;">${participantEmail}</strong></div>
          <div><span style="color: #94a3b8;">📅 التاريخ:</span> <strong style="color: #cbd5e1;">${reg.created_at || reg.createdAt || reg.submitted_at || '-'}</strong></div>
        </div>

        <!-- Scrollable Questions Answers List -->
        <div style="flex: 1; overflow-y: auto; padding-right: 4px;">
          ${rowsHtml}
        </div>

        <!-- Footer Action Buttons -->
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" class="btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-weight: 800; padding: 8px 18px; border-radius: 10px; font-size: 0.85rem; cursor: pointer;">
              <i class="fa-solid fa-print"></i> طباعة الإجابات
            </button>
            <a href="${waUrl}" target="_blank" class="btn" style="background: rgba(37, 211, 102, 0.2); border: 1px solid rgba(37, 211, 102, 0.4); color: #25D366; font-weight: 800; padding: 8px 18px; border-radius: 10px; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-brands fa-whatsapp"></i> مراسلة المشارك
            </a>
          </div>
          <button onclick="document.getElementById('answers-details-modal').remove()" class="btn btn-primary" style="background: var(--brand-purple); font-weight: 800; padding: 8px 24px; border-radius: 10px; font-size: 0.88rem; cursor: pointer;">إغلاق</button>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById('answers-details-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function populateBioProfileForm(profile) {
  if (!profile) return;
  if (document.getElementById('bio-cfg-title')) document.getElementById('bio-cfg-title').value = profile.title || '';
  if (document.getElementById('bio-cfg-subtitle')) document.getElementById('bio-cfg-subtitle').value = profile.subtitle || '';
  if (document.getElementById('bio-cfg-desc')) document.getElementById('bio-cfg-desc').value = profile.bioDesc || '';
  if (document.getElementById('bio-cfg-loctitle')) document.getElementById('bio-cfg-loctitle').value = profile.locationTitle || '';
  if (document.getElementById('bio-cfg-locdesc')) document.getElementById('bio-cfg-locdesc').value = profile.locationDesc || '';
  if (document.getElementById('bio-cfg-videotitle')) document.getElementById('bio-cfg-videotitle').value = profile.videoTitle || '';
  if (document.getElementById('bio-cfg-videourl')) document.getElementById('bio-cfg-videourl').value = profile.videoUrl || '';
  if (document.getElementById('bio-cfg-insta')) document.getElementById('bio-cfg-insta').value = profile.instagramUrl || 'https://www.instagram.com/majarracommunity/';
  if (document.getElementById('bio-cfg-wa')) document.getElementById('bio-cfg-wa').value = profile.whatsappUrl || 'https://wa.me/905385062989';
  if (document.getElementById('bio-cfg-email')) document.getElementById('bio-cfg-email').value = profile.emailUrl || 'mailto:nur.beik1237@gmail.com';
}

async function saveBioProfileAdmin(e) {
  if (e) e.preventDefault();
  const body = {
    title: document.getElementById('bio-cfg-title').value,
    subtitle: document.getElementById('bio-cfg-subtitle').value,
    bioDesc: document.getElementById('bio-cfg-desc').value,
    locationTitle: document.getElementById('bio-cfg-loctitle').value,
    locationDesc: document.getElementById('bio-cfg-locdesc').value,
    videoTitle: document.getElementById('bio-cfg-videotitle').value,
    videoUrl: document.getElementById('bio-cfg-videourl').value,
    instagramUrl: document.getElementById('bio-cfg-insta') ? document.getElementById('bio-cfg-insta').value : '',
    whatsappUrl: document.getElementById('bio-cfg-wa') ? document.getElementById('bio-cfg-wa').value : '',
    emailUrl: document.getElementById('bio-cfg-email') ? document.getElementById('bio-cfg-email').value : ''
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/settings/bio/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast('تم حفظ معلومات الملف الشخصي بنجاح 🚀', 'success');
      loadBioAdminManager();
    } else {
      showToast(data.message || 'فشل حفظ التعديلات', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ في الاتصال أثناء الحفظ', 'error');
  }
}

// EVENTS TABLE RENDERER
// EVENTS GRID RENDERER
function renderBioEventsTable(events) {
  const container = document.getElementById('bio-events-grid-container');
  const tbody = document.getElementById('bio-events-tbody');

  if (container) {
    if (!events || events.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--text-muted); background: rgba(15,23,42,0.5); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.12);">
          <i class="fa-solid fa-calendar-days" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: var(--brand-gold);"></i>
          لا توجد فعاليات أسبوعية مضافة حالياً. اضغط زر "إضافة فعالية أسبوعية جديدة" بالأعلى.
        </div>
      `;
    } else {
      let cardsHtml = '';
      events.forEach(ev => {
        const isAct = ev.isActive !== undefined ? ev.isActive : (ev.is_active !== undefined ? ev.is_active : 1);
        const title = ev.title || 'فعالية أسبوعية';
        const dateStr = ev.eventDate || ev.event_date || 'فعالية أسبوعية';
        const timeStr = ev.eventTime || ev.time_slot || '';
        const hallStr = ev.hallName || ev.hall_name || 'مركز مجرّة المجتمعي';
        const typeStr = ev.eventType || ev.event_type || '🎓 ورشة عمل تخصصية';
        const regUrl = ev.registrationUrl || ev.registration_url || '';

        const activeBadge = isAct
          ? `<span class="badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.78rem;">• نشطة</span>`
          : `<span class="badge" style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.78rem;">• معطلة</span>`;

        cardsHtml += `
          <div class="bio-event-card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(232, 198, 119, 0.35); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); position: relative;">
            
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px;">
                <span class="badge" style="background: rgba(232, 198, 119, 0.18); color: var(--brand-gold); border: 1px solid rgba(232, 198, 119, 0.4); padding: 5px 14px; border-radius: 20px; font-weight: 900; font-size: 0.82rem;">
                  <i class="fa-solid fa-calendar-star"></i> ${typeStr}
                </span>
                <div>${activeBadge}</div>
              </div>

              <div>
                <h4 style="font-size: 1.1rem; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3;">${title}</h4>
                <div style="color: #cbd5e1; font-size: 0.86rem; display: flex; flex-direction: column; gap: 6px; font-weight: 700;">
                  <div><i class="fa-solid fa-calendar-day" style="color: var(--brand-gold); margin-left: 6px;"></i> ${dateStr} ${timeStr ? '• ' + timeStr : ''}</div>
                  <div><i class="fa-solid fa-door-closed" style="color: #c084fc; margin-left: 6px;"></i> ${hallStr}</div>
                </div>
              </div>

              ${regUrl ? `
                <div dir="ltr" style="background: rgba(11, 15, 25, 0.75); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 10px 14px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                  <span style="font-family: monospace; font-size: 0.84rem; color: var(--brand-gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700;">${regUrl}</span>
                  <a href="${regUrl}" target="_blank" style="color: var(--brand-gold); font-size: 0.9rem;" title="فتح رابط التسجيل"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                </div>
              ` : ''}
            </div>

            <div style="display: flex; gap: 10px; margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 14px;">
              <button onclick="editBioEvent(${ev.id})" class="btn" style="flex: 1; background: linear-gradient(135deg, #d97706, #f59e0b); color: #ffffff; font-weight: 900; border-radius: 12px; border: none; padding: 10px 16px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                <i class="fa-solid fa-pen-to-square"></i> تعديل الفعالية
              </button>
              <button onclick="deleteBioEvent(${ev.id})" class="btn" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); color: #f43f5e; font-weight: 900; border-radius: 12px; padding: 10px 16px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-trash-can"></i> حذف
              </button>
            </div>

          </div>
        `;
      });
      container.innerHTML = cardsHtml;
    }
  }

  if (tbody) {
    if (!events || events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: var(--text-secondary);">لا توجد فعاليات مضافة حالياً. اضغط على زر إضافة فعالية جديدة.</td></tr>`;
      return;
    }
    let html = '';
    events.forEach(ev => {
      const isAct = ev.isActive !== undefined ? ev.isActive : (ev.is_active !== undefined ? ev.is_active : 1);
      const activeBadge = isAct 
        ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">مُفعلة</span>`
        : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">معطلة</span>`;

      html += `
        <tr>
          <td><strong>#${ev.sortOrder || ev.sort_order || 0}</strong></td>
          <td><strong style="color: var(--text-primary);">${ev.title}</strong></td>
          <td><span class="badge" style="background: rgba(232, 198, 119, 0.15); color: var(--brand-gold);">${ev.eventType || ev.event_type || 'ورشة'}</span></td>
          <td>${ev.eventDate || ev.event_date || ''}</td>
          <td>${ev.eventTime || ev.time_slot || ''}</td>
          <td>${ev.hallName || ev.hall_name || ''}</td>
          <td dir="ltr" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${ev.registrationUrl || ev.registration_url || ''}" target="_blank" style="color: #38bdf8;">${ev.registrationUrl || ev.registration_url || ''}</a></td>
          <td>${activeBadge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="editBioEvent(${ev.id})" title="تعديل"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #ef4444;" onclick="deleteBioEvent(${ev.id})" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
}

function openBioEventModal(ev = null) {
  document.getElementById('bio-event-id').value = ev ? ev.id : '';
  document.getElementById('bio-event-title').value = ev ? ev.title : '';
  document.getElementById('bio-event-type').value = ev ? (ev.eventType || ev.event_type || '') : '🎓 ورشة عمل تخصصية';
  document.getElementById('bio-event-date').value = ev ? (ev.eventDate || ev.event_date || '') : '';
  document.getElementById('bio-event-time').value = ev ? (ev.eventTime || ev.time_slot || '') : '';
  document.getElementById('bio-event-hall').value = ev ? (ev.hallName || ev.hall_name || '') : 'قاعة أفــُـق';
  document.getElementById('bio-event-regurl').value = ev ? (ev.registrationUrl || ev.registration_url || '') : '';
  document.getElementById('bio-event-sort').value = ev ? (ev.sortOrder || ev.sort_order || 0) : 1;
  document.getElementById('bio-event-active').value = ev ? ((ev.isActive || ev.is_active) ? '1' : '0') : '1';

  document.getElementById('bio-event-modal-title').innerHTML = ev 
    ? `<i class="fa-solid fa-pen" style="color: var(--brand-gold);"></i> تعديل الفعالية الأسبوعية`
    : `<i class="fa-solid fa-calendar-plus" style="color: var(--brand-gold);"></i> إضافة فعالية أسبوعية جديدة`;

  document.getElementById('bio-event-modal').style.display = 'flex';
}

function closeBioEventModal() {
  document.getElementById('bio-event-modal').style.display = 'none';
}

function editBioEvent(id) {
  const ev = (currentBioData.events || []).find(e => e.id === id);
  if (ev) openBioEventModal(ev);
}

async function saveBioEventAdmin(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('bio-event-id').value;
  const body = {
    title: document.getElementById('bio-event-title').value,
    eventType: document.getElementById('bio-event-type').value,
    eventDate: document.getElementById('bio-event-date').value,
    eventTime: document.getElementById('bio-event-time').value,
    hallName: document.getElementById('bio-event-hall').value,
    registrationUrl: document.getElementById('bio-event-regurl').value,
    sortOrder: parseInt(document.getElementById('bio-event-sort').value) || 0,
    isActive: document.getElementById('bio-event-active').value === '1'
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = id ? `/api/admin/settings/bio/events/${id}` : `/api/admin/settings/bio/events`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      showToast('تم حفظ الفعالية الأسبوعية بنجاح 🚀', 'success');
      closeBioEventModal();
      loadBioAdminManager();
    } else {
      showToast(data.message || 'فشل حفظ الفعالية', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ في الاتصال أثناء حفظ الفعالية', 'error');
  }
}

async function deleteBioEvent(id) {
  confirmDeleteModal({
    title: 'حذف فعالية البيو',
    message: 'هل أنت متأكد من رغبتك في حذف هذه الفعالية؟',
    dangerBtnText: 'حذف الفعالية 🗑️',
    onConfirm: async () => {
      try {
        const headers = {};
        const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/admin/settings/bio/events/${id}`, { method: 'DELETE', headers });
        const data = await res.json();
        if (data.success) {
          showToast('تم حذف الفعالية بنجاح ✅', 'success');
          loadBioAdminManager();
        } else {
          showToast(data.message || 'فشل حذف الفعالية', 'error');
        }
      } catch (err) {
        showToast('حدث خطأ في الاتصال أثناء حذف الفعالية', 'error');
      }
    }
  });
}

// LINKS GRID RENDERER
function renderBioLinksTable(links) {
  const container = document.getElementById('bio-links-grid-container');
  const tbody = document.getElementById('bio-links-tbody');

  if (container) {
    if (!links || links.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--text-muted); background: rgba(15,23,42,0.5); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.12);">
          <i class="fa-solid fa-link" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #38bdf8;"></i>
          لا توجد روابط مضافة لشجرة الروابط حالياً. اضغط زر "إضافة رابط جديد لشجرة الروابط" بالأعلى.
        </div>
      `;
    } else {
      let cardsHtml = '';
      links.forEach(item => {
        const isAct = item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : 1);
        const activeBadge = isAct 
          ? `<span class="badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.78rem;">• مُفعّل</span>`
          : `<span class="badge" style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.78rem;">• معطل</span>`;

        const iconClass = item.icon || 'fa-link';

        cardsHtml += `
          <div class="bio-link-card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); position: relative;">
            
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(56,189,248,0.2);">
                    <i class="fa-solid ${iconClass}"></i>
                  </div>
                  <div>
                    <h4 style="font-size: 1.05rem; font-weight: 900; color: #ffffff; margin: 0 0 3px 0; line-height: 1.3;">${item.title}</h4>
                    <small style="color: var(--text-muted); font-size: 0.78rem; font-weight: 700;">ترتيب العرض: #${item.sortOrder || item.sort_order || 0}</small>
                  </div>
                </div>
                <div>${activeBadge}</div>
              </div>

              <div dir="ltr" style="background: rgba(11, 15, 25, 0.75); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <span style="font-family: monospace; font-size: 0.84rem; color: #38bdf8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700;">${item.url}</span>
                <a href="${item.url}" target="_blank" style="color: #38bdf8; font-size: 0.9rem;" title="فتح الرابط"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 14px;">
              <button onclick="editBioLink(${item.id})" class="btn" style="flex: 1; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; font-weight: 900; border-radius: 12px; border: none; padding: 10px 16px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(56,189,248,0.3);">
                <i class="fa-solid fa-pen-to-square"></i> تعديل الرابط
              </button>
              <button onclick="deleteBioLink(${item.id})" class="btn" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); color: #f43f5e; font-weight: 900; border-radius: 12px; padding: 10px 16px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-trash-can"></i> حذف
              </button>
            </div>

          </div>
        `;
      });
      container.innerHTML = cardsHtml;
    }
  }

  if (tbody) {
    if (!links || links.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-secondary);">لا توجد روابط مضافة حالياً. اضغط على زر إضافة رابط جديد.</td></tr>`;
      return;
    }
    let html = '';
    links.forEach(item => {
      const isAct = item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : 1);
      const activeBadge = isAct 
        ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">مُفعل</span>`
        : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">معطل</span>`;

      html += `
        <tr>
          <td><strong>#${item.sortOrder || item.sort_order || 0}</strong></td>
          <td><strong style="color: var(--text-primary);"><i class="fa-solid ${item.icon || 'fa-link'}" style="color: var(--brand-gold); margin-left: 6px;"></i> ${item.title}</strong></td>
          <td dir="ltr" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><a href="${item.url}" target="_blank" style="color: #38bdf8;">${item.url}</a></td>
          <td dir="ltr"><code>${item.icon || 'fa-link'}</code></td>
          <td>${activeBadge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="editBioLink(${item.id})" title="تعديل"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #ef4444;" onclick="deleteBioLink(${item.id})" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
}

function openBioLinkModal(item = null) {
  document.getElementById('bio-link-id').value = item ? item.id : '';
  document.getElementById('bio-link-title').value = item ? item.title : '';
  document.getElementById('bio-link-url').value = item ? item.url : '';
  document.getElementById('bio-link-icon').value = item ? (item.icon || 'fa-link') : 'fa-link';
  document.getElementById('bio-link-sort').value = item ? (item.sortOrder || 0) : 1;
  document.getElementById('bio-link-active').value = item ? (item.isActive ? '1' : '0') : '1';

  document.getElementById('bio-link-modal-title').innerHTML = item 
    ? `<i class="fa-solid fa-pen" style="color: #38bdf8;"></i> تعديل بيانات الرابط`
    : `<i class="fa-solid fa-link" style="color: #38bdf8;"></i> إضافة رابط جديد لشجرة الروابط`;

  document.getElementById('bio-link-modal').style.display = 'flex';
}

function closeBioLinkModal() {
  document.getElementById('bio-link-modal').style.display = 'none';
}

function editBioLink(id) {
  const item = (currentBioData.links || []).find(l => l.id === id);
  if (item) openBioLinkModal(item);
}

async function saveBioLinkAdmin(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('bio-link-id').value;
  const body = {
    title: document.getElementById('bio-link-title').value,
    url: document.getElementById('bio-link-url').value,
    icon: document.getElementById('bio-link-icon').value,
    sortOrder: parseInt(document.getElementById('bio-link-sort').value) || 0,
    isActive: document.getElementById('bio-link-active').value === '1'
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = id ? `/api/admin/settings/bio/links/${id}` : `/api/admin/settings/bio/links`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      showToast('تم حفظ الرابط بنجاح 🚀', 'success');
      closeBioLinkModal();
      loadBioAdminManager();
    } else {
      showToast(data.message || 'فشل حفظ الرابط', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ في الاتصال أثناء حفظ الرابط', 'error');
  }
}

async function deleteBioLink(id) {
  confirmDeleteModal({
    title: 'حذف الرابط',
    message: 'هل أنت متأكد من رغبتك في حذف هذا الرابط؟',
    dangerBtnText: 'حذف الرابط 🗑️',
    onConfirm: async () => {
      try {
        const headers = {};
        const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/admin/settings/bio/links/${id}`, { method: 'DELETE', headers });
        const data = await res.json();
        if (data.success) {
          Toast.show('success', 'تم حذف الرابط بنجاح ✅');
          loadBioAdminManager();
        } else {
          Toast.show('error', data.message || 'فشل حذف الرابط');
        }
      } catch (err) {
        Toast.show('error', 'حدث خطأ في الاتصال أثناء حذف الرابط');
      }
    }
  });
}

// --- ADMIN ANALYTICS & CHARTS ENGINE ---
let hallsChartInstance = null;
let dayOfWeekChartInstance = null;

async function loadAdminAnalyticsOverview() {
  try {
    const headers = {};
    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/analytics/overview', { headers });
    const data = await res.json();
    if (!data.success) return;

    // Update KPI numbers
    if (document.getElementById('analytics-total-count')) document.getElementById('analytics-total-count').innerText = data.summary.total;
    if (document.getElementById('analytics-accepted-count')) document.getElementById('analytics-accepted-count').innerText = data.summary.accepted;
    if (document.getElementById('analytics-pending-count')) document.getElementById('analytics-pending-count').innerText = data.summary.pending;
    if (document.getElementById('analytics-attendees-count')) document.getElementById('analytics-attendees-count').innerText = data.summary.totalAttendees;

    // 1. Halls Pie Chart
    const ctxHalls = document.getElementById('chartHallsDistribution');
    if (ctxHalls && typeof Chart !== 'undefined') {
      const labels = (data.hallsDistribution || []).map(h => h.hallName || 'غير محدد');
      const values = (data.hallsDistribution || []).map(h => h.count);

      if (hallsChartInstance) hallsChartInstance.destroy();
      hallsChartInstance = new Chart(ctxHalls, {
        type: 'doughnut',
        data: {
          labels: labels.length ? labels : ['قاعة أفــُـق', 'قاعة ديـــوان', 'قاعة ســديم'],
          datasets: [{
            data: values.length ? values : [5, 3, 2],
            backgroundColor: ['#a855f7', '#e8c677', '#38bdf8', '#22c55e', '#ec4899']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#cbd5e1', font: { family: 'Cairo', size: 12 } } }
          }
        }
      });
    }

    // 2. Day of Week Bar Chart
    const ctxDays = document.getElementById('chartDayOfWeek');
    if (ctxDays && typeof Chart !== 'undefined') {
      const dayLabels = Object.keys(data.dayOfWeekDistribution || {});
      const dayValues = Object.values(data.dayOfWeekDistribution || {});

      if (dayOfWeekChartInstance) dayOfWeekChartInstance.destroy();
      dayOfWeekChartInstance = new Chart(ctxDays, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'عدد الحجوزات المقبولة',
            data: dayValues,
            backgroundColor: 'rgba(56, 189, 248, 0.7)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#cbd5e1', font: { family: 'Cairo' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#cbd5e1', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

// --- EXPORT TO EXCEL & PDF ENGINES ---
function getFilteredBookingsList() {
  if (typeof currentBookingsData !== 'undefined' && Array.isArray(currentBookingsData) && currentBookingsData.length > 0) {
    return currentBookingsData;
  }
  if (typeof masterBookingsData !== 'undefined' && Array.isArray(masterBookingsData) && masterBookingsData.length > 0) {
    return masterBookingsData;
  }
  if (typeof bookings !== 'undefined' && Array.isArray(bookings)) {
    return bookings;
  }
  return [];
}

function exportBookingsToExcel() {
  const bookingsList = getFilteredBookingsList();
  if (!bookingsList || bookingsList.length === 0) {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show('warning', 'لا توجد حجوزات متاحة للتصدير حالياً');
    } else {
      alert('لا توجد حجوزات متاحة للتصدير حالياً');
    }
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Arabic compatibility
  csvContent += 'كود الحجز,النشاط والفعالية,اسم المسؤول,رقم الواتساب,الجهة المنفذة,القاعة,التاريخ,الوقت,الرسوم (TL),الحالة\n';

  bookingsList.forEach(b => {
    const statusAr = b.status === 'accepted' ? 'مقبول ومؤكد' : b.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
    const row = [
      `"${b.id || ''}"`,
      `"${(b.eventTitle || '').replace(/"/g, '""')}"`,
      `"${(b.organizerName || '').replace(/"/g, '""')}"`,
      `"${(b.whatsappNumber || b.organizerPhone || '').replace(/"/g, '""')}"`,
      `"${(b.executorName || '').replace(/"/g, '""')}"`,
      `"${(b.hallName || '').replace(/"/g, '""')}"`,
      `"${b.startDate || ''}"`,
      `"${b.startTime || ''} - ${b.endTime || ''}"`,
      `"${b.totalPrice || b.estimatedCost || '0'}"`,
      `"${statusAr}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Majarra_Bookings_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof Toast !== 'undefined' && Toast.show) {
    Toast.show('success', 'تم تصدير ملف الحجوزات Excel بنجاح 📥');
  }
}

function fallbackPrintWindow(bookingsList, dateStr) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  let rowsHtml = '';
  bookingsList.forEach((b, idx) => {
    const statusAr = b.status === 'accepted' ? 'مقبول' : b.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
    rowsHtml += `
      <tr>
        <td>${idx + 1}</td>
        <td>${b.id || ''}</td>
        <td>${b.eventTitle || 'حجز قاعة'}</td>
        <td>${b.organizerName || ''}<br><small dir="ltr">${b.whatsappNumber || b.organizerPhone || ''}</small></td>
        <td>${b.hallName || ''}</td>
        <td>${b.startDate || ''}<br><small>${b.startTime || ''} - ${b.endTime || ''}</small></td>
        <td>${b.totalPrice || b.estimatedCost || '0'} TL</td>
        <td>${statusAr}</td>
      </tr>
    `;
  });

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير حجوزات مركز مجرة - ${dateStr}</title>
      <style>
        body { font-family: sans-serif; direction: rtl; padding: 20px; color: #0f172a; }
        h1 { color: #4c1d95; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
        th { background: #f1f5f9; }
      </style>
    </head>
    <body>
      <h1>مركز مجرّة المجتمعي - تقرير الحجوزات الرسمية (${dateStr})</h1>
      <table>
        <thead>
          <tr>
            <th>#</th><th>كود الحجز</th><th>الفعالية</th><th>المسؤول والواتساب</th><th>القاعة</th><th>التاريخ والوقت</th><th>الرسوم</th><th>الحالة</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  }, 500);
}

function exportBookingsToPDF() {
  const bookingsList = getFilteredBookingsList();
  if (!bookingsList || bookingsList.length === 0) {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show('warning', 'لا توجد حجوزات متاحة للتصدير حالياً');
    } else {
      alert('لا توجد حجوزات متاحة للتصدير حالياً');
    }
    return;
  }

  const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  // Temporary container for html2pdf rendering
  const pdfContainer = document.createElement('div');
  pdfContainer.id = 'temp-pdf-export-container';
  pdfContainer.style.position = 'fixed';
  pdfContainer.style.left = '-9999px';
  pdfContainer.style.top = '0';
  pdfContainer.style.width = '800px';
  pdfContainer.style.padding = '24px';
  pdfContainer.style.background = '#ffffff';
  pdfContainer.style.color = '#0f172a';
  pdfContainer.style.fontFamily = "'IBM Plex Sans Arabic', 'Tajwal', sans-serif";
  pdfContainer.dir = 'rtl';

  let rowsHtml = '';
  bookingsList.forEach((b, idx) => {
    const statusAr = b.status === 'accepted' ? 'مقبول ومؤكد' : b.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
    const statusBg = b.status === 'accepted' ? '#dcfce7' : b.status === 'rejected' ? '#ffe4e6' : '#fef3c7';
    const statusColor = b.status === 'accepted' ? '#166534' : b.status === 'rejected' ? '#991b1b' : '#92400e';
    
    rowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background: #f8fafc;' : ''}">
        <td style="padding: 10px; font-weight: bold; color: #6366f1; text-align: center;">${b.id || idx + 1}</td>
        <td style="padding: 10px; font-weight: bold;">${b.eventTitle || 'حجز قاعة'}</td>
        <td style="padding: 10px;">${b.organizerName || ''}<br><span style="font-size: 11px; color: #64748b;" dir="ltr">${b.whatsappNumber || b.organizerPhone || ''}</span></td>
        <td style="padding: 10px; text-align: center;">${b.hallName || ''}</td>
        <td style="padding: 10px; text-align: center;">${b.startDate || ''}<br><span style="font-size: 11px; color: #64748b;">${b.startTime || ''} - ${b.endTime || ''}</span></td>
        <td style="padding: 10px; font-weight: bold; text-align: center; color: #059669;">${b.totalPrice || b.estimatedCost || '0'} TL</td>
        <td style="padding: 10px; text-align: center;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: ${statusBg}; color: ${statusColor};">
            ${statusAr}
          </span>
        </td>
      </tr>
    `;
  });

  pdfContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e8c677; padding-bottom: 14px; margin-bottom: 20px;">
      <div>
        <h1 style="margin: 0; font-size: 22px; color: #4c1d95; font-weight: 800;">مركز مجرّّة المجتمعي | Majarra Center</h1>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">تقرير الحجوزات الرسمي وسجل القاعات المنفذة</p>
      </div>
      <div style="text-align: left; font-size: 12px; color: #64748b;">
        <div><strong>تاريخ الاستخراج:</strong> ${dateStr}</div>
        <div><strong>التوقيت:</strong> ${timeStr}</div>
        <div><strong>إجمالي الحجوزات:</strong> ${bookingsList.length}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: right;">
      <thead>
        <tr style="background: #4c1d95; color: #ffffff;">
          <th style="padding: 10px; text-align: center; width: 12%;">الكود</th>
          <th style="padding: 10px; width: 22%;">الفعالية / النشاط</th>
          <th style="padding: 10px; width: 22%;">المسؤول والجهة</th>
          <th style="padding: 10px; text-align: center; width: 16%;">القاعة</th>
          <th style="padding: 10px; text-align: center; width: 14%;">التاريخ والتوقيت</th>
          <th style="padding: 10px; text-align: center; width: 10%;">الرسوم</th>
          <th style="padding: 10px; text-align: center; width: 14%;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
      <div>تم التصدير تلقائياً عبر نظام إدارة مركز مجرّة المجتمعي © ${new Date().getFullYear()}</div>
      <div>تقرير رسمي مصدق</div>
    </div>
  `;

  document.body.appendChild(pdfContainer);

  if (typeof html2pdf !== 'undefined') {
    const filenameDate = new Date().toISOString().split('T')[0];
    const opt = {
      margin:       0.3,
      filename:     `Majarra_Bookings_Report_${filenameDate}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(pdfContainer).save().then(() => {
      if (pdfContainer.parentNode) pdfContainer.parentNode.removeChild(pdfContainer);
      if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show('success', 'تم تصدير تقرير الحجوزات PDF بنجاح 📄');
      }
    }).catch(err => {
      console.error('PDF generation error:', err);
      if (pdfContainer.parentNode) pdfContainer.parentNode.removeChild(pdfContainer);
      fallbackPrintWindow(bookingsList, dateStr);
    });
  } else {
    if (pdfContainer.parentNode) pdfContainer.parentNode.removeChild(pdfContainer);
    fallbackPrintWindow(bookingsList, dateStr);
  }
}

// --- 1-CLICK WHATSAPP REMINDER ENGINE ---
function sendWhatsAppReminder(bookingId) {
  const bookings = getFilteredBookingsList();
  const b = bookings.find(item => String(item.id) === String(bookingId));
  if (!b) {
    Toast.show('error', 'تعذر العثور على بيانات الحجز');
    return;
  }

  const phone = (b.whatsappNumber || b.organizerPhone || '').replace(/[^0-9]/g, '');
  if (!phone) {
    Toast.show('warning', 'رقم الواتساب غير متوفر لهذا الحجز');
    return;
  }

  const msg = `مرحباً بك ${b.organizerName} 🌱
نود تذكيركم بموعد فعاليتكم (${b.eventTitle}) في مركز مجرّّة.
📌 القاعة: ${b.hallName}
📅 التاريخ: ${b.startDate}
⏰ التوقيت: من ${b.startTime} إلى ${b.endTime}
🔖 كود الحجز: ${b.id}

يسعدنا استقبالكم ونتمنى لكم فعالية ملهمة وموفقة!`;

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

