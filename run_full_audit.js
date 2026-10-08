const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch(e) {
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runAudit() {
  console.log("=== STARTING MAJARRA E2E SYSTEM AUDIT ===");

  // Step 1: Login as Super Admin to get Token
  let token = '';
  try {
    const loginRes = await request({
      host: '127.0.0.1', port: 3000, path: '/api/admin/super-login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { pin: '1234' });
    if (loginRes.body && loginRes.body.token) {
      token = loginRes.body.token;
      console.log("[AUTH SUCCESS] Admin token obtained successfully.");
    }
  } catch (e) {
    console.error("[AUTH ERROR]", e.message);
  }

  const authHeader = token ? { 'Authorization': 'Bearer ' + token } : {};
  const randSuffix = Math.floor(Math.random() * 800000) + 10000;
  const futureDay = String((randSuffix % 25) + 1).padStart(2, '0');
  const futureHour = String((randSuffix % 10) + 8).padStart(2, '0');
  const futureDate = `2029-11-${futureDay}`;
  const startTime = `${futureHour}:00`;
  const endTime = `${futureHour}:30`;

  const tests = [
    { name: '1. GET /api/public/site-info', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/site-info', method: 'GET' } },
    { name: '2. GET /api/public/halls', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/halls', method: 'GET' } },
    { name: '3. GET /api/public/events', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/events', method: 'GET' } },
    { name: '4. GET /api/public/bio-events', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/bio-events', method: 'GET' } },
    { name: '5. POST /api/public/bookings (Hall Booking)', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/bookings', method: 'POST', headers: {'Content-Type': 'application/json'} }, data: { hallId: 1, clientName: 'فحص شامل', phone: '0501234567', bookingDate: futureDate, startTime: startTime, endTime: endTime, eventTitle: 'فعالية فحص ' + randSuffix } },
    { name: '6. GET /api/public/bookings/track', opts: { host: '127.0.0.1', port: 3000, path: '/api/public/bookings/track?code=MJR-1001', method: 'GET' } },
    { name: '7. GET /api/admin/bookings', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/bookings', method: 'GET', headers: authHeader } },
    { name: '8. GET /api/admin/bookings/events', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/bookings/events', method: 'GET', headers: authHeader } },
    { name: '9. POST /api/admin/bookings/events (Create Event)', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/bookings/events', method: 'POST', headers: {'Content-Type': 'application/json', ...authHeader} }, data: { title: 'ورشة ذكاء ' + randSuffix, hallName: 'القاعة الكبرى', eventDate: futureDate, eventTime: '16:00 - 18:00', maxAttendees: 50, requireApproval: false, isActive: true } },
    { name: '10. GET /api/admin/bookings/events/registrations', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/bookings/events/registrations', method: 'GET', headers: authHeader } },
    { name: '11. GET /api/admin/settings/bio-events', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/bio-events', method: 'GET', headers: authHeader } },
    { name: '12. POST /api/admin/settings/bio-events (Create Bio Event)', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/bio-events', method: 'POST', headers: {'Content-Type': 'application/json', ...authHeader} }, data: { title: 'لقاء رواد ' + randSuffix, eventType: 'ندوة', hallName: 'القاعة 1', eventDate: futureDate, eventTime: '17:00', sortOrder: 1, isActive: true } },
    { name: '13. GET /api/admin/settings/site-info', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/site-info', method: 'GET', headers: authHeader } },
    { name: '14. PUT /api/admin/settings/site-info (Update Site Info)', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/site-info', method: 'PUT', headers: {'Content-Type': 'application/json', ...authHeader} }, data: { siteName: 'مركز مجرة للتدريب والتطوير', contactPhone: '0599000000', adminPin: '1234' } },
    { name: '15. GET /api/admin/settings/policies', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/policies', method: 'GET', headers: authHeader } },
    { name: '16. PUT /api/admin/settings/policies (Update Policies)', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/settings/policies', method: 'PUT', headers: {'Content-Type': 'application/json', ...authHeader} }, data: { bookingRules: 'الشروط والأحكام العامة', privacyPolicy: 'سياسة الخصوصية والتأكيد' } },
    { name: '17. POST /api/admin/verify-pin', opts: { host: '127.0.0.1', port: 3000, path: '/api/admin/verify-pin', method: 'POST', headers: {'Content-Type': 'application/json'} }, data: { pin: '1234' } },
    { name: '18. GET /index.html (Public Home)', opts: { host: '127.0.0.1', port: 3000, path: '/index.html', method: 'GET' } },
    { name: '19. GET /admin.html (Admin Dashboard)', opts: { host: '127.0.0.1', port: 3000, path: '/admin.html', method: 'GET' } },
    { name: '20. GET /bio.html (Bio Links Page)', opts: { host: '127.0.0.1', port: 3000, path: '/bio.html', method: 'GET' } }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await request(t.opts, t.data);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[PASS] ${t.name} (Status ${res.statusCode})`);
        passed++;
      } else {
        console.error(`[FAIL] ${t.name} (Status ${res.statusCode}):`, res.body);
      }
    } catch (e) {
      console.error(`[ERROR] ${t.name}: ${e.message}`);
    }
  }
  console.log(`\n==============================================`);
  console.log(`AUDIT RESULT SUMMARY: ${passed}/${tests.length} TESTS PASSED CLEANLY.`);
  console.log(`==============================================`);
}

runAudit();
