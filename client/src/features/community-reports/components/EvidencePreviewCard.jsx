import { formatFileSize } from '../validation/evidence.validation.js';

export default function EvidencePreviewCard({ file, previewUrl, onRemove, compact = false }) {
  const isVideo = file.type === 'video/mp4';
  const fileName = file.name || 'Evidence file';
  return <article className={`evidence-preview-card${compact ? ' is-compact' : ''}`}>
    <div className="evidence-preview-media">
      {isVideo ? <video src={previewUrl} muted preload="metadata" controls aria-label={`Preview ${fileName}`} />
        : <img src={previewUrl} alt={`Preview of ${fileName}`} />}
      {isVideo && <span className="evidence-play-indicator" aria-hidden="true">▶</span>}
      {onRemove && <button type="button" className="evidence-remove" onClick={onRemove} aria-label={`Remove ${fileName}`}>×</button>}
    </div>
    <p title={fileName}>{fileName}</p><small>{formatFileSize(file.size)}</small>
  </article>;
}
