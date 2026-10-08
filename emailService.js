/* ==========================================================================
   MAJARRA COMMUNITY CENTER - EMAIL NOTIFICATION SERVICE (Nodemailer)
   ========================================================================== */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'nur.beik1237@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password_here'
  }
});

async function sendNotificationEmail(to, subject, htmlContent) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: `"مركز مجرة المجتمعي" <${process.env.EMAIL_USER || 'nur.beik1237@gmail.com'}>`,
      to,
      subject,
      html: htmlContent
    });
    console.log(`✉️ Email sent successfully to: ${to}`);
  } catch (error) {
    console.warn(`⚠️ Email notification skipped/failed (SMTP optional): ${error.message}`);
  }
}

module.exports = {
  sendNotificationEmail
};
