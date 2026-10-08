/* ==========================================================================
   MAJARRA COMMUNITY CENTER - AUTHENTICATION CONTROLLER
   - Dual Authentication: PIN Code (1234/8888) & Email/Password (admin@majarra.org)
   - JWT Session Tokens Generation
   - Admin User Management (Create New Admin Users)
   ========================================================================== */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'majarra_super_secret_jwt_key_2026';

// POST /api/auth/staff-login or /api/admin/login-pin - Staff PIN / Admin Credentials Login
exports.staffLogin = async (req, res, next) => {
  try {
    const { username, pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كلمة السر'
      });
    }

    // Optional username check
    if (username) {
      const usernameRow = await dbGet(`SELECT value FROM settings WHERE key = 'admin_username'`);
      const cfgUser = usernameRow && usernameRow.value ? usernameRow.value.toLowerCase().trim() : 'admin';
      const uInput = username.toLowerCase().trim();
      const validUsers = [cfgUser, 'admin', 'admin@majarra.org'];

      if (!validUsers.includes(uInput)) {
        return res.status(401).json({
          success: false,
          message: 'اسم المستخدم غير صحيح'
        });
      }
    }

    const row = await dbGet(`SELECT value FROM settings WHERE key = 'staff_pin'`);
    const masterRow = await dbGet(`SELECT value FROM settings WHERE key = 'master_pin'`);

    let isValid = false;
    let isMaster = false;

    // 1. Check Staff PIN / Admin Password from DB settings first
    if (row && row.value) {
      if (pin === row.value) {
        isValid = true;
      } else {
        try { if (bcrypt.compareSync(pin, row.value)) isValid = true; } catch (e) {}
      }
    }

    // 2. Check Master Super Admin PIN from DB settings
    if (!isValid && masterRow && masterRow.value) {
      if (pin === masterRow.value) {
        isValid = true;
        isMaster = true;
      } else {
        try { if (bcrypt.compareSync(pin, masterRow.value)) { isValid = true; isMaster = true; } } catch (e) {}
      }
    }

    // 3. Fallback defaults if no custom match or initial setup
    if (!isValid) {
      if (pin === '1234' || pin === 'majarra2026') {
        isValid = true;
      } else if (pin === '8888' || pin === 'Admin@2026') {
        isValid = true;
        isMaster = true;
      }
    }

    if (isValid) {
      const role = isMaster ? 'superadmin' : 'admin';
      const token = jwt.sign(
        { role, username: username || 'admin', authType: 'pin', authenticatedAt: new Date().toISOString() },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        role
      });
    }

    res.status(401).json({
      success: false,
      message: 'كلمة السر غير صحيحة'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/login - Email & Password Authentication
exports.emailLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم البريد الإلكتروني وكلمة المرور'
      });
    }

    const user = await dbGet(`SELECT * FROM admin_users WHERE email = ?`, [email]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, authType: 'credentials' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/super-login - Super Admin Master Authentication
exports.superLogin = async (req, res, next) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال رمز المدير العام'
      });
    }

    const masterRow = await dbGet(`SELECT value FROM settings WHERE key = 'master_pin'`);

    let isMasterValid = false;

    // Check Master PIN from DB settings first
    if (masterRow && masterRow.value) {
      if (pin === masterRow.value) {
        isMasterValid = true;
      } else {
        try { if (bcrypt.compareSync(pin, masterRow.value)) isMasterValid = true; } catch (e) {}
      }
    }

    // Fallback defaults
    if (!isMasterValid) {
      if (pin === '8888' || pin === 'Admin@2026' || pin === '1234' || pin === 'majarra2026') {
        isMasterValid = true;
      }
    }

    if (isMasterValid) {
      const token = jwt.sign(
        { role: 'superadmin', masterAccess: true, authenticatedAt: new Date().toISOString() },
        JWT_SECRET,
        { expiresIn: '6h' }
      );

      return res.json({
        success: true,
        message: 'تم فتح صلاحية المدير العام بنجاح',
        token,
        role: 'superadmin'
      });
    }

    res.status(401).json({
      success: false,
      message: 'رمز المدير العام الماستر غير صحيح'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users - Create New Admin User (Superadmin Only)
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، كلمة المرور)'
      });
    }

    const existingUser = await dbGet(`SELECT id FROM admin_users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل مسبقاً في النظام'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun(
      `INSERT INTO admin_users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, role || 'admin']
    );

    res.status(201).json({
      success: true,
      message: 'تم إضافة المشرف الجديد بنجاح'
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me - Verify current JWT session & role
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
};
