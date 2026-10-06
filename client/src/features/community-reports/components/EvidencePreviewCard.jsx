import { useEffect, useState } from 'react';
import { formatFileSize } from '../validation/evidence.validation.js';

export default function EvidencePreviewCard({ file, onRemove, compact = false }) {
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    if (typeof File === 'undefined' || !(file instanceof File)) {
      setPreviewUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  const isVideo = file.type === 'video/mp4';
  const fileName = file.name || 'Evidence file';
  return <article className={`evidence-preview-card${compact ? ' is-compact' : ''}`}>
    <div className="evidence-preview-media">
      {previewUrl && (isVideo ? <video src={previewUrl} muted preload="metadata" controls aria-label={`Preview ${fileName}`} />
        : <img src={previewUrl} alt={`Preview of ${fileName}`} />)}
      {previewUrl && isVideo && <span className="evidence-play-indicator" aria-hidden="true">▶</span>}
      {onRemove && <button type="button" className="evidence-remove" onClick={onRemove} aria-label={`Remove ${fileName}`}>×</button>}
    </div>
    <p title={fileName}>{fileName}</p><small>{formatFileSize(file.size)}</small>
  </article>;
}
