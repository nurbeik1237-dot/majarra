/* ==========================================================================
   MAJARRA COMMUNITY CENTER - GLOBAL ERROR HANDLING MIDDLEWARE
   ========================================================================== */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `المسار المطلـوب (${req.originalUrl}) غير موجود بالسيرفر.`
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('💥 Unhandled Exception:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'حدث خطأ غير متوقع في السيرفر.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
