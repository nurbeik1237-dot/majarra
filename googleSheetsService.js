/* ==========================================================================
   MAJARRA COMMUNITY CENTER - GOOGLE DRIVE & SHEETS INTEGRATION SERVICE
   - Service Account Authentication
   - Append Booking Records to Google Sheets
   - Read / Sync Booking Records from Google Drive
   ========================================================================== */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '..', 'google-key.json');
const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SHEET_ID || process.env.SPREADSHEET_ID || '';

function getGoogleSheetsClient() {
  if (!SPREADSHEET_ID) {
    return null;
  }
  if (!fs.existsSync(SERVICE_ACCOUNT_KEY_PATH)) {
    console.warn(`[Google Sheets Service] Warning: Key file not found at ${SERVICE_ACCOUNT_KEY_PATH}. Google Drive sync disabled.`);
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_PATH,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('[Google Sheets Service] Auth Error:', err.message);
    return null;
  }
}

/**
 * Fetch All Booking Records from Google Sheets
 */
async function fetchBookingsFromDrive() {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:T',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row) => ({
      id: row[0] || '',
      organizerName: row[1] || '',
      whatsappNumber: row[2] || '',
      email: row[3] || '',
      entityType: row[4] || 'فرد مستقل',
      executorName: row[5] || '',
      eventType: row[6] || '',
      hallName: row[7] || '',
      eventTitle: row[8] || '',
      eventDescription: row[9] || '',
      attendeesCount: parseInt(row[10], 10) || 0,
      startDate: row[11] || '',
      endDate: row[12] || '',
      startTime: row[13] || '',
      endTime: row[14] || '',
      equipment: row[15] ? row[15].split(', ') : [],
      packageType: row[16] || 'كفو',
      additionalService: row[17] || 'بدون خدمات إضافية',
      status: row[18] || 'pending',
      createdAt: row[19] || '',
    }));
  } catch (error) {
    console.error('[Google Sheets Service] Error reading from Drive:', error.message);
    return [];
  }
}

/**
 * Append New Booking Record to Google Sheets
 */
async function appendBookingToDrive(booking) {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return false;

  const equipmentStr = Array.isArray(booking.equipment)
    ? booking.equipment.join(', ')
    : String(booking.equipment || '');

  const rowData = [
    booking.id || '',
    booking.organizerName || '',
    booking.whatsappNumber || '',
    booking.email || '',
    booking.entityType || 'فرد مستقل',
    booking.executorName || booking.organizerName || '',
    booking.eventType || '',
    booking.hallName || '',
    booking.eventTitle || '',
    booking.eventDescription || '',
    booking.attendeesCount || 1,
    booking.startDate || '',
    booking.endDate || booking.startDate || '',
    booking.startTime || '',
    booking.endTime || '',
    equipmentStr,
    booking.packageType || 'كفو',
    booking.additionalService || 'بدون خدمات إضافية',
    booking.status || 'pending',
    booking.createdAt || new Date().toISOString(),
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:T',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });
    console.log(`[Google Sheets Service] Successfully appended booking ${booking.id} to Google Drive.`);
    return true;
  } catch (error) {
    console.error('[Google Sheets Service] Failed to append booking to Drive:', error.message);
    return false;
  }
}

module.exports = {
  fetchBookingsFromDrive,
  appendBookingToDrive,
};
