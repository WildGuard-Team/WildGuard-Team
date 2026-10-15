export function sanitizeEvidenceOriginalName(name) {
  const normalized = typeof name === 'string' ? name.normalize('NFKC').replace(/[\\/\0-\x1f\x7f]/g, '_').trim() : '';
  return (normalized || 'evidence').slice(0, 255);
}

export function toEvidenceMetadata(upload, file) {
  return {
    publicId: upload.public_id,
    secureUrl: upload.secure_url,
    resourceType: upload.resource_type,
    originalName: sanitizeEvidenceOriginalName(file.originalname),
    mimeType: file.mimetype,
    bytes: upload.bytes,
    format: upload.format,
    width: upload.width,
    height: upload.height,
    duration: upload.duration,
  };
}

export function toPublicEvidence(evidence) {
  return {
    secureUrl: evidence.secureUrl,
    resourceType: evidence.resourceType,
    originalName: evidence.originalName,
    mimeType: evidence.mimeType,
    bytes: evidence.bytes,
    format: evidence.format ?? null,
    width: evidence.width ?? null,
    height: evidence.height ?? null,
    duration: evidence.duration ?? null,
  };
}
