const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4']);
const imageLimit = 5 * 1024 * 1024;
const videoLimit = 25 * 1024 * 1024;

export const evidenceAccept = 'image/jpeg,image/png,image/webp,video/mp4';

export function evidenceFileKey(file) {
  return `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
}

export function validateEvidenceSelection(files, currentFiles) {
  const accepted = [];
  const messages = [];
  const known = new Set(currentFiles.map(evidenceFileKey));
  for (const file of files) {
    if (file.size === 0) { messages.push('Empty files cannot be uploaded.'); continue; }
    if (!imageTypes.has(file.type) && !videoTypes.has(file.type)) { messages.push('Only JPG, PNG, WEBP, and MP4 files are allowed.'); continue; }
    if (imageTypes.has(file.type) && file.size > imageLimit) { messages.push('Images must not exceed 5 MB.'); continue; }
    if (videoTypes.has(file.type) && file.size > videoLimit) { messages.push('Videos must not exceed 25 MB.'); continue; }
    const key = evidenceFileKey(file);
    if (known.has(key)) { messages.push('This file has already been selected.'); continue; }
    if (currentFiles.length + accepted.length >= 3) { messages.push('You can attach up to 3 files.'); continue; }
    known.add(key);
    accepted.push(file);
  }
  return { accepted, messages: [...new Set(messages)] };
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
