export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status : 500;
  const message = error.type === 'entity.parse.failed' ? 'Invalid JSON body.'
    : error.expose ? error.message
      : status === 413 ? 'Request body too large.'
        : 'Internal server error.';
  res.status(status).json({ error: { message } });
}
