/* ==========================================================================
   MAJARRA COMMUNITY CENTER - ADMIN ANALYTICS CONTROLLER
   - Hall Distribution Statistics
   - Peak Days & Day-of-Week Analytics
   - Monthly Booking Trends & Attendance Counts
   ========================================================================== */

const { dbAll, dbGet } = require('../config/database');

exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    // 1. Overall counts
    const totalRow = await dbGet(`SELECT COUNT(*) as count FROM bookings`);
    const pendingRow = await dbGet(`SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'`);
    const acceptedRow = await dbGet(`SELECT COUNT(*) as count FROM bookings WHERE status = 'accepted'`);
    const rejectedRow = await dbGet(`SELECT COUNT(*) as count FROM bookings WHERE status = 'rejected'`);
    const attendeesRow = await dbGet(`SELECT SUM(CAST(attendeesCount AS INTEGER)) as total FROM bookings WHERE status = 'accepted'`);

    // 2. Hall Breakdown
    const hallRows = await dbAll(`
      SELECT hallName, COUNT(*) as count 
      FROM bookings 
      GROUP BY hallName
    `);

    // 3. Accepted bookings date distribution for day-of-week & monthly charts
    const acceptedBookings = await dbAll(`
      SELECT id, hallName, startDate, startTime, attendeesCount, createdAt 
      FROM bookings 
      WHERE status = 'accepted'
    `);

    const daysMap = {
      'الأحد': 0, 'الإثنين': 0, 'الثلاثاء': 0, 'الأربعاء': 0, 'الخميس': 0, 'الجمعة': 0, 'السبت': 0
    };
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const monthlyMap = {};

    acceptedBookings.forEach(b => {
      if (b.startDate) {
        const d = new Date(b.startDate);
        if (!isNaN(d.getTime())) {
          const dayName = dayNamesAr[d.getDay()];
          if (daysMap[dayName] !== undefined) {
            daysMap[dayName]++;
          }

          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
        }
      }
    });

    res.json({
      success: true,
      summary: {
        total: totalRow ? totalRow.count : 0,
        pending: pendingRow ? pendingRow.count : 0,
        accepted: acceptedRow ? acceptedRow.count : 0,
        rejected: rejectedRow ? rejectedRow.count : 0,
        totalAttendees: attendeesRow && attendeesRow.total ? attendeesRow.total : 0
      },
      hallsDistribution: hallRows || [],
      dayOfWeekDistribution: daysMap,
      monthlyDistribution: monthlyMap
    });
  } catch (err) {
    next(err);
  }
};
