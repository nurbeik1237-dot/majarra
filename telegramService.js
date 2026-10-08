/* ==========================================================================
   MAJARRA COMMUNITY CENTER - INSTANT MOBILE & DESKTOP PUSH NOTIFICATION SERVICE
   - ntfy.sh zero-config instant push notifications to iPhone, Android & Mac/PC
   - Telegram Bot instant push notifications
   - Works 24/7 even when browser or admin panel is completely closed
   ========================================================================== */

const https = require('https');

// 1. Send 100% Free Zero-Config Mobile Push Alert via ntfy.sh
async function sendNtfyBookingAlert(booking) {
  const topic = process.env.NTFY_TOPIC || 'majarra-center-booking-nurbeik1237';
  
  const cleanPhone = (booking.whatsappNumber || '').replace(/[^\d+]/g, '');
  const waLink = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}`;

  const message = `
🚨 طلب حجز جديد بانتظار الموافقة!
📌 رقم الحجز: #${booking.id}
👤 المسؤول: ${booking.organizerName}
🏛️ القاعة: ${booking.hallName}
🎯 النشاط: ${booking.eventTitle}
📅 التاريخ: ${booking.startDate} (من ${booking.startTime} إلى ${booking.endTime})
👥 عدد الحضور: ${booking.attendeesCount} شخص
💬 اضغط هنا لمراسلة العميل مباشر على الواتساب
  `.trim();

  const options = {
    hostname: 'ntfy.sh',
    port: 443,
    path: `/${topic}`,
    method: 'POST',
    headers: {
      'Title': encodeURIComponent(`🚨 طلب حجز جديد (#${booking.id}) - مركز مجرّة`),
      'Priority': 'high',
      'Tags': 'bell,calendar,warning',
      'Click': waLink,
      'Content-Type': 'text/plain; charset=utf-8'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📱 ntfy Mobile Push Notification sent to topic [${topic}]! Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.warn(`⚠️ ntfy Mobile Push Notification error: ${err.message}`);
      resolve(false);
    });

    req.write(Buffer.from(message, 'utf-8'));
    req.end();
  });
}

// 2. Send Telegram Bot Alert
async function sendTelegramBookingAlert(booking) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return;
  }

  const cleanPhone = (booking.whatsappNumber || '').replace(/[^\d+]/g, '');
  const waLink = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}`;

  const message = `
🚨 *طلب حجز جديد بانتظار الموافقة!*
━━━━━━━━━━━━━━━━━━━━
📌 *رقم الحجز:* \`#${booking.id}\`
👤 *المسؤول:* ${booking.organizerName}
🏛️ *القاعة:* ${booking.hallName}
🎯 *عنوان النشاط:* ${booking.eventTitle}
📅 *التاريخ:* ${booking.startDate}
⏱️ *التوقيت:* من ${booking.startTime} إلى ${booking.endTime}
👥 *عدد الحضور:* ${booking.attendeesCount} شخص
💰 *الرسوم:* ${booking.feeAmount || 'مجاني'}

💬 [مراسلة العميل مباشر عبر الواتساب](${waLink})
━━━━━━━━━━━━━━━━━━━━
  `.trim();

  const data = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: false
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📱 Telegram Instant Mobile Alert sent! Response code: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.warn(`⚠️ Telegram Notification Error: ${err.message}`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function sendEventRegistrationPushAlert(event, registration) {
  const topic = process.env.NTFY_TOPIC || 'majarra-center-booking-nurbeik1237';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const cleanPhone = (registration.phone || '').replace(/[^\d+]/g, '');
  const waLink = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}`;

  const message = `
📝 تسجيل جديد في فعالية: "${event.title}"
👤 الاسم: ${registration.name}
📱 الواتساب: ${registration.phone}
📧 الإيميل: ${registration.email || 'غير مدخل'}
🔗 رابط الفعالية: /e/${event.slug}
  `.trim();

  // ntfy push alert
  try {
    const options = {
      hostname: 'ntfy.sh',
      port: 443,
      path: `/${topic}`,
      method: 'POST',
      headers: {
        'Title': encodeURIComponent(`📝 تسجيل جديد - ${event.title}`),
        'Priority': 'high',
        'Tags': 'memo,user,star',
        'Click': waLink,
        'Content-Type': 'text/plain; charset=utf-8'
      }
    };
    const req = https.request(options, res => {
      console.log(`📱 ntfy Event Alert sent! Status: ${res.statusCode}`);
    });
    req.on('error', (err) => {
      console.warn('⚠️ ntfy Event Alert error:', err.message);
    });
    req.write(Buffer.from(message, 'utf-8'));
    req.end();
  } catch (e) {}

  // telegram push alert
  if (botToken && chatId) {
    try {
      const tgMsg = `
📝 *تسجيل جديد في فعالية:* "${event.title}"
━━━━━━━━━━━━━━━━━━━━
👤 *الاسم:* ${registration.name}
📱 *الواتساب:* \`${registration.phone}\`
📧 *الإيميل:* ${registration.email || 'غير مدخل'}

💬 [مراسلة المتقدم عبر الواتساب](${waLink})
━━━━━━━━━━━━━━━━━━━━
      `.trim();

      const data = JSON.stringify({ chat_id: chatId, text: tgMsg, parse_mode: 'Markdown' });
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      };
      const req = https.request(options, res => {
        console.log(`📱 Telegram Event Alert sent! Status: ${res.statusCode}`);
      });
      req.on('error', (err) => {
        console.warn('⚠️ Telegram Event Alert error:', err.message);
      });
      req.write(data);
      req.end();
    } catch (e) {}
  }
}

async function sendInstantPushAlerts(booking) {
  await Promise.allSettled([
    sendNtfyBookingAlert(booking),
    sendTelegramBookingAlert(booking)
  ]);
}

module.exports = {
  sendInstantPushAlerts,
  sendNtfyBookingAlert,
  sendTelegramBookingAlert,
  sendEventRegistrationPushAlert
};

