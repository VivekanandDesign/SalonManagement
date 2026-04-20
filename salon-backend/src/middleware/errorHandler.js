function errorHandler(err, req, res, _next) {
  // Log full error in development, minimal in production
  if (process.env.NODE_ENV === 'production') {
    console.error(`[${new Date().toISOString()}] ${err.message}`);
  } else {
    console.error(err.stack);
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists',
      field: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
