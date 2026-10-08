/* ==========================================================================
   MAJARRA COMMUNITY CENTER - BOOKING ZOD VALIDATION MIDDLEWARE
   - Validates incoming booking payloads using Zod Schemas
   - Ensures strict capacity limits and non-overlapping time boundaries
   ========================================================================== */

const { z } = require('zod');

const HallEnum = z.enum([
  "قاعة أفــُـق (سعة القاعة 20)",
  "قاعة ديـــوان (سعة القاعة 30)",
  "قاعة ســديم (سعة القاعة 16-18)",
  "المركز كلياً",
  // Friendly aliases for backward compatibility
  "قاعة أفــُـق",
  "قاعة ديـــوان",
  "قاعة ســديم"
]);

const HALL_CAPACITIES = {
  "قاعة أفــُـق (سعة القاعة 20)": 20,
  "قاعة ديـــوان (سعة القاعة 30)": 30,
  "قاعة ســديم (سعة القاعة 16-18)": 18,
  "المركز كلياً": 70,
  "قاعة أفــُـق": 20,
  "قاعة ديـــوان": 30,
  "قاعة ســديم": 18
};

const BookingSchema = z.object({
  organizerName: z.string({ required_error: "اسم الجهة المنظمة مطلوب" }).min(3, "اسم الجهة المنظمة يجب أن يكون 3 أحرف على الأقل"),
  whatsappNumber: z.string({ required_error: "رقم الواتساب مطلوب" }).min(8, "رقم الواتساب يجب أن يكون 8 أرقام على الأقل"),
  email: z.string({ required_error: "البريد الإلكتروني مطلوب" }).email("البريد الإلكتروني غير صحيح"),
  entityType: z.enum(["فرد مستقل", "فريق تطوعي", "منظمة غير ربحية"], {
    errorMap: () => ({ message: "نوع الجهة يجب أن يكون: فرد مستقل، فريق تطوعي، أو منظمة غير ربحية" })
  }),
  executorName: z.string({ required_error: "اسم الشخص المنفذ مطلوب" }).min(2, "اسم الشخص المنفذ يجب أن يكون حرفين على الأقل"),
  eventType: z.string({ required_error: "نوع النشاط مطلوب" }).min(2, "نوع النشاط يجب أن يكون حرفين على الأقل"),
  hallName: HallEnum,
  eventTitle: z.string({ required_error: "عنوان الفعالية مطلوب" }).min(3, "عنوان الفعالية يجب أن يكون 3 أحرف على الأقل"),
  eventDescription: z.string({ required_error: "وصف النشاط مطلوب" }).min(5, "وصف النشاط يجب أن يكون 5 أحرف على الأقل"),
  attendeesCount: z.coerce.number().positive("عدد الحضور يجب أن يكون رقماً موجباً أكبر من 0"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ البداية يجب أن يكون بصيغة YYYY-MM-DD"),
  endDate: z.string().optional().default(""),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت البداية يجب أن يكون بصيغة HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت النهاية يجب أن يكون بصيغة HH:MM"),
  equipment: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  }, z.array(z.string()).default([])),
  packageType: z.enum(["كفو", "على عيني"], {
    errorMap: () => ({ message: "نوع الباقة يجب أن يكون: كفو، أو على عيني" })
  }),
  additionalService: z.string().default("بدون خدمات إضافية"),
}).refine((data) => data.endTime > data.startTime, {
  message: "وقت النهاية يجب أن يكون بعد وقت البداية",
  path: ["endTime"],
}).refine((data) => data.attendeesCount <= (HALL_CAPACITIES[data.hallName] || 70), {
  message: "عدد الحضور يتجاوز السعة القصوى المسموحة للقاعة",
  path: ["attendeesCount"],
});

/**
 * Express Middleware for Booking Schema Validation
 */
function validateBookingInput(req, res, next) {
  // Provide defaults for optional or transformed fields if missing in loose submissions
  const payload = {
    ...req.body,
    email: req.body.email || 'info@majarra.org',
    entityType: req.body.entityType || 'فرد مستقل',
    executorName: req.body.executorName || req.body.organizerName || 'منفذ الفعالية',
    eventType: req.body.eventType || 'فعالية عامة',
    packageType: req.body.packageType || 'كفو',
    additionalService: req.body.additionalService || 'بدون خدمات إضافية'
  };

  const validation = BookingSchema.safeParse(payload);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: "بيانات الإدخال غير صالحة",
      details: validation.error.format()
    });
  }

  req.validatedBooking = validation.data;
  next();
}

module.exports = {
  BookingSchema,
  HallEnum,
  HALL_CAPACITIES,
  validateBookingInput
};
