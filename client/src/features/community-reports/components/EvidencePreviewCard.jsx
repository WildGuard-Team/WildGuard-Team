import { useEffect, useState } from 'react';
import CommunityIcon from './CommunityIcon.jsx';

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
      {previewUrl && isVideo && <span className="evidence-play-indicator" aria-hidden="true">{compact ? <CommunityIcon name="play" /> : '▶'}</span>}
      {onRemove && <button type="button" className="evidence-remove" onClick={onRemove} aria-label={`Remove ${fileName}`}>{compact ? <CommunityIcon name="close" size={18} /> : '×'}</button>}
    </div>
  </article>;
}
