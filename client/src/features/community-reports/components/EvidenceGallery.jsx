import { useEffect, useId, useRef, useState } from 'react';
import CommunityIcon from './CommunityIcon.jsx';

function safeEvidenceUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (!hostname.includes('.') || /\.(?:localhost|local|internal)$/.test(hostname)) return null;
    const address = hostname.split('.').map(Number);
    if (address.length === 4 && address.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      const [first, second] = address;
      if (first === 0 || first === 10 || first === 127 || first >= 224
        || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168) || (first === 100 && second >= 64 && second <= 127)
        || (first === 198 && (second === 18 || second === 19))) return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function normalizeEvidence(item, index) {
  const name = typeof item?.originalName === 'string' && item.originalName.trim()
    ? item.originalName : `Evidence file ${index + 1}`;
  const mimeType = typeof item?.mimeType === 'string' ? item.mimeType.toLowerCase() : '';
  return {
    name, url: safeEvidenceUrl(item?.secureUrl),
    isImage: mimeType ? mimeType.startsWith('image/') : item?.resourceType === 'image',
  };
}

function FileEvidence({ item, imageUnavailable = false }) {
  return <div className="report-evidence__file">
    <span className="report-evidence__file-icon"><CommunityIcon name="document" size={24} /></span>
    <div className="report-evidence__file-details">
      <span className="report-evidence__name">{item.name}</span>
      {imageUnavailable && <span className="report-evidence__unavailable">Image preview unavailable</span>}
      {item.url ? <a className="report-evidence__file-link" href={item.url} target="_blank" rel="noopener noreferrer">Open file<span className="report-evidence__new-tab"> (new tab)</span></a>
        : <span className="report-evidence__unavailable">File unavailable</span>}
    </div>
  </div>;
}

export default function EvidenceGallery({ evidence }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const dialogRef = useRef(null);
  const previewTriggerRef = useRef(null);
  const previewOriginRef = useRef(null);
  const previewTitleId = useId();
  const items = Array.isArray(evidence) ? evidence.map(normalizeEvidence) : [];

  useEffect(() => {
    if (!selectedImage) return undefined;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      const trigger = previewTriggerRef.current;
      if (trigger?.isConnected) trigger.focus();
      else previewOriginRef.current?.querySelector('a, button')?.focus();
    };
  }, [selectedImage]);

  function openPreview(event, item) {
    previewTriggerRef.current = event.currentTarget;
    previewOriginRef.current = event.currentTarget.closest('article');
    setSelectedImage(item);
  }

  function markImageUnavailable(url) {
    setFailedImages((current) => new Set(current).add(url));
  }

  if (!items.length) return <p className="report-evidence__empty">No evidence was attached to this report.</p>;

  return <>
    <div className="report-evidence__grid">
      {items.map((item, index) => <article className="report-evidence__item" key={`${item.url || item.name}-${index}`}>
        {item.isImage && item.url && !failedImages.has(item.url)
          ? <button type="button" className="report-evidence__thumbnail" aria-label={`Preview image: ${item.name}`} onClick={(event) => openPreview(event, item)}>
            <img src={item.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => markImageUnavailable(item.url)} />
            <span className="report-evidence__name">{item.name}</span>
          </button>
          : <FileEvidence item={item} imageUnavailable={item.isImage && Boolean(item.url)} />}
      </article>)}
    </div>
    <dialog ref={dialogRef} className="report-evidence__dialog" aria-labelledby={previewTitleId}
      onCancel={(event) => { event.preventDefault(); setSelectedImage(null); }}
      onClick={(event) => { if (event.target === event.currentTarget) setSelectedImage(null); }}>
      {selectedImage && <>
        <div className="report-evidence__dialog-header">
          <h2 id={previewTitleId}>{selectedImage.name}</h2>
          <button type="button" className="report-evidence__close" onClick={() => setSelectedImage(null)} aria-label="Close image preview"><CommunityIcon name="close" size={20} /><span>Close</span></button>
        </div>
        {failedImages.has(selectedImage.url)
          ? <div className="report-evidence__dialog-fallback"><FileEvidence item={selectedImage} imageUnavailable /></div>
          : <img className="report-evidence__full-image" src={selectedImage.url} alt={`Evidence: ${selectedImage.name}`} referrerPolicy="no-referrer" onError={() => markImageUnavailable(selectedImage.url)} />}
        <a className="report-evidence__original" href={selectedImage.url} target="_blank" rel="noopener noreferrer">Open original file<span className="report-evidence__new-tab"> (new tab)</span></a>
      </>}
    </dialog>
  </>;
}
