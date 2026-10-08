/* ==========================================================================
   MAJARRA COMMUNITY CENTER - AUTOMATED 24-HOUR REMINDER SERVICE
   - Scans accepted bookings 24 hours prior to event date
   - Sends automated email reminders to booking organizers
   - Prevents duplicate reminders via database flag
   ========================================================================== */

const { dbAll, dbRun } = require('../config/database');
const { sendNotificationEmail } = require('./emailService');

async function process24HourReminders() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const targetDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const upcomingBookings = await dbAll(`
      SELECT * FROM bookings 
      WHERE status = 'accepted' 
      AND (reminder_sent IS NULL OR reminder_sent = 0)
      AND startDate = ?
    `, [targetDateStr]);

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return;
    }

    console.log(`[Reminder-Engine] ⏰ Found ${upcomingBookings.length} upcoming booking(s) for tomorrow (${targetDateStr}). Sending reminders...`);

    for (const b of upcomingBookings) {
      const emailContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #e8c677; margin: 0; font-size: 1.8rem;">مركز مجرّّة المجتمعي</h1>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 4px;">تذكير بموعد فعاليتكم غداً ⏰</p>
          </div>

          <p style="font-size: 1.1rem; line-weight: 700;">أهلاً وسهلاً بك <strong>${b.organizerName}</strong> (${b.executorName || 'مستفيد مجرة'})،</p>
          
          <p style="font-size: 1rem; color: #cbd5e1; line-height: 1.6;">
            نود تذكيركم بموعد فعاليتكم القادمة غداً في مركز مجرّّة. يسعدنا استقبالكم ونتمنى لكم فعالية ملهمة وموفقة!
          </p>

          <div style="background: rgba(255,255,255,0.05); border-right: 4px solid #22c55e; padding: 16px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 6px 0; font-weight: 700; color: #ffffff;">📌 عنوان الفعالية: <span style="color: #e8c677;">${b.eventTitle}</span></p>
            <p style="margin: 6px 0; font-weight: 700; color: #ffffff;">🏛️ القاعة المحجوزة: <span style="color: #38bdf8;">${b.hallName}</span></p>
            <p style="margin: 6px 0; font-weight: 700; color: #ffffff;">📅 التاريخ: <span>${b.startDate}</span></p>
            <p style="margin: 6px 0; font-weight: 700; color: #ffffff;">⏰ التوقيت: <span>${b.startTime} حتى ${b.endTime}</span></p>
            <p style="margin: 6px 0; font-weight: 700; color: #ffffff;">🔖 كود الحجز: <span style="font-family: monospace; color: #a855f7;">${b.id}</span></p>
          </div>

          <p style="font-size: 0.9rem; color: #94a3b8; line-height: 1.5;">
            في حال وجود أي تعديلات طارئة أو استفسارات، يمكنك التواصل مباشرة مع إدارة المركز عبر الواتساب.
          </p>

          <div style="text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 0.8rem; color: #64748b;">
            مركز مجرّّة - مساحة مجتمعية تفاعلية للأفكار والإبداع
          </div>
        </div>
      `;

      if (b.email) {
        await sendNotificationEmail(
          b.email,
          `⏰ تذكير بموعد فعاليتكم غداً في مركز مجرّة - [${b.eventTitle}]`,
          emailContent
        );
      }

      // Mark as reminded
      await dbRun(`UPDATE bookings SET reminder_sent = 1 WHERE id = ?`, [b.id]);
    }
  } catch (err) {
    console.error('[Reminder-Engine] ❌ Error processing 24-hour reminders:', err.message);
  }
}

module.exports = { process24HourReminders };
