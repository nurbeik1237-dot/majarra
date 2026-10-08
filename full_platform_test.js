/* ==========================================================================
   MAJARRA COMMUNITY CENTER - FULL END-TO-END & STRESS TEST SUITE
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function makeRequest(urlPath, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    let payload = null;
    if (body) {
      if (typeof body === 'object' && !(body instanceof Buffer)) {
        payload = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      } else {
        payload = body;
      }
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({
          status: res.statusCode,
          duration,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, duration: Date.now() - startTime, error: err.message });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function runTestSuite() {
  console.log('🚀 Starting Full Platform & Stress Audit for Majarra Center...\n');
  const results = [];

  // TEST 1: Public Halls Endpoint
  console.log('1️⃣ Testing GET /api/public/halls...');
  const resHalls = await makeRequest('/api/public/halls');
  results.push({ name: 'Public Halls List', pass: resHalls.status === 200 && resHalls.data.success, duration: resHalls.duration });

  // TEST 2: Public Calendar Events Endpoint
  console.log('2️⃣ Testing GET /api/public/calendar-events...');
  const resCal = await makeRequest('/api/public/calendar-events?year=2026&month=9');
  results.push({ name: 'Public Calendar Events', pass: resCal.status === 200 && resCal.data.success, duration: resCal.duration });

  // TEST 3: Conflict Check
  console.log('3️⃣ Testing POST /api/public/check-conflict...');
  const resConflict = await makeRequest('/api/public/check-conflict', 'POST', {
    hallName: 'قاعة أفُق',
    startDate: '2026-10-15',
    startTime: '10:00',
    endTime: '12:00'
  });
  console.log('resConflict response:', resConflict.data);
  results.push({ name: 'Conflict Checking Engine', pass: resConflict.status === 200 && (typeof resConflict.data.hasConflict !== 'undefined' || typeof resConflict.data.isAvailable !== 'undefined'), duration: resConflict.duration });

  // TEST 4: Submit Public Booking
  console.log('4️⃣ Testing POST /api/public/bookings/submit (Hall Booking)...');
  const randomDay = Math.floor(Math.random() * 25) + 1;
  const resBooking = await makeRequest('/api/public/bookings/submit', 'POST', {
    organizerName: 'د. ياسمين الشامي (اختبار تلقائي)',
    whatsappNumber: '+905385062989',
    email: `test.yasmin.${Date.now()}@example.com`,
    eventTitle: `ملتقى ريادة الأعمال الشبابية #${Date.now().toString().slice(-4)} 🚀`,
    hallName: 'قاعة ديوان',
    startDate: `2026-12-${String(randomDay).padStart(2, '0')}`,
    startTime: '14:00',
    endTime: '18:00',
    attendeesCount: 35,
    eventType: 'ورشة عمل',
    notes: 'حجز تجريبي آلي لفحص السيرفر'
  });
  console.log('resBooking response:', resBooking.data);
  const createdBookingId = resBooking.data && resBooking.data.bookingId ? resBooking.data.bookingId : null;
  results.push({ name: 'Submit Public Hall Booking', pass: (resBooking.status === 201 || resBooking.status === 200) && resBooking.data.success === true, duration: resBooking.duration });

  // TEST 5: Track Booking Endpoint
  if (createdBookingId) {
    console.log(`5️⃣ Testing GET /api/public/track-booking/${createdBookingId}...`);
    const resTrack = await makeRequest(`/api/public/track-booking/${createdBookingId}`);
    results.push({ name: 'Track Booking Endpoint', pass: resTrack.status === 200 && resTrack.data.success, duration: resTrack.duration });
  }

  // TEST 6: Public Dynamic Form Page
  console.log('6️⃣ Testing GET /e/majarra-community...');
  const resFormPage = await makeRequest('/e/majarra-community');
  results.push({ name: 'Public Form Page (/e/majarra-community)', pass: resFormPage.status === 200 && typeof resFormPage.data === 'string' && resFormPage.data.includes('مجتمع مجرّة'), duration: resFormPage.duration });

  // TEST 7: Submit Response to Form
  console.log('7️⃣ Testing POST /api/forms/5/submit (Dynamic Form Submission)...');
  const resFormSub = await makeRequest('/api/forms/5/submit', 'POST', {
    answers: {
      'الاسم الثلاثي': 'خالد سامي الموصلي (اختبار آلي)',
      'رقم الهاتف المحمول': '+90 538 000 0000',
      'البريد الإلكتروني': 'khaled.mousli@example.com',
      'تاريخ الميلاد': '2000-05-15',
      'الجنسية': 'سورية',
      'هل ترغب بالانضمام لفريق المتطوعين؟': 'نعم'
    }
  });
  results.push({ name: 'Submit Response to Dynamic Form', pass: resFormSub.status === 200 && resFormSub.data.success, duration: resFormSub.duration });

  // TEST 8: Bio Hub Page & API
  console.log('8️⃣ Testing GET /bio.html & GET /api/admin/settings/bio...');
  const resBioPage = await makeRequest('/bio.html');
  const resBioApi = await makeRequest('/api/admin/settings/bio', 'GET', null, { 'Authorization': 'Bearer standalone-super-token' });
  results.push({ name: 'Bio Hub Page & Data API', pass: resBioPage.status === 200 && resBioApi.data.success, duration: resBioApi.duration });

  // TEST 9: Admin Events List API
  console.log('9️⃣ Testing GET /api/admin/bookings/events/list...');
  const resEventsList = await makeRequest('/api/admin/bookings/events/list', 'GET', null, { 'Authorization': 'Bearer standalone-admin-token' });
  results.push({ name: 'Admin Dynamic Events List API', pass: resEventsList.status === 200 && resEventsList.data.success, duration: resEventsList.duration });

  // TEST 10: STRESS TEST (50 Concurrent Requests)
  console.log('🔟 STRESS TEST: Sending 50 Concurrent Booking & Form Requests...');
  const stressPromises = [];
  const stressStart = Date.now();
  for (let i = 0; i < 25; i++) {
    stressPromises.push(makeRequest('/api/public/check-conflict', 'POST', {
      hallName: 'قاعة سديم',
      startDate: `2026-11-${(i % 28) + 1}`,
      startTime: '10:00',
      endTime: '12:00'
    }));
    stressPromises.push(makeRequest('/api/forms/5/submit', 'POST', {
      answers: {
        'الاسم الثلاثي': `مشارك اختبار رقم ${i}`,
        'رقم الهاتف المحمول': `+9053800${i}`,
        'البريد الإلكتروني': `stress${i}@example.com`
      }
    }));
  }

  const stressResults = await Promise.all(stressPromises);
  const stressDuration = Date.now() - stressStart;
  const successfulStress = stressResults.filter(r => r.status === 200).length;
  results.push({ name: `Stress Test (50 Concurrency, ${successfulStress}/50 Success)`, pass: successfulStress === 50, duration: stressDuration });

  console.log('\n===========================================================');
  console.log('📊 TEST SUMMARY & RESULTS AUDIT:');
  console.log('===========================================================');
  results.forEach(r => {
    console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.name.padEnd(50)} | Duration: ${r.duration}ms`);
  });
  console.log('===========================================================\n');
}

runTestSuite();
