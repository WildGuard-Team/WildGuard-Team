export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status : 500;
  const message = error.type === 'entity.parse.failed' ? 'Invalid JSON body.'
    : status === 413 ? 'Request body too large.'
      : error.expose ? error.message : 'Request failed.';
  res.status(status).json({ error: { message: status === 500 ? 'Internal server error.' : message } });
}
