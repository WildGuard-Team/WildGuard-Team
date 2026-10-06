import { useEffect, useRef, useState } from 'react';
import EvidencePreviewCard from './EvidencePreviewCard.jsx';
import { evidenceAccept, evidenceFileKey, validateEvidenceSelection } from '../validation/evidence.validation.js';

export default function EvidenceUploader({ files, onChange }) {
  const inputRef = useRef(null);
  const previewUrls = useRef(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const activeKeys = new Set(files.map(evidenceFileKey));
    files.forEach((file) => {
      const key = evidenceFileKey(file);
      if (!previewUrls.current.has(key)) previewUrls.current.set(key, URL.createObjectURL(file));
    });
    previewUrls.current.forEach((url, key) => {
      if (!activeKeys.has(key)) { URL.revokeObjectURL(url); previewUrls.current.delete(key); }
    });
    setPreviews(files.map((file) => ({ key: evidenceFileKey(file), url: previewUrls.current.get(evidenceFileKey(file)) })));
  }, [files]);
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addFiles(fileList) {
    const { accepted, messages: nextMessages } = validateEvidenceSelection(Array.from(fileList), files);
    if (accepted.length) onChange([...files, ...accepted]);
    setMessages(nextMessages);
  }
  function removeFile(file) {
    onChange(files.filter((item) => evidenceFileKey(item) !== evidenceFileKey(file)));
    setMessages([]);
  }
  function drop(event) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }
  return <section className="evidence-uploader" aria-labelledby="evidence-upload-title">
    <input ref={inputRef} className="sr-only" id="evidence-files" type="file" multiple accept={evidenceAccept}
      onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
    <div className={`evidence-drop-zone${dragActive ? ' is-drag-active' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }} onDrop={drop}>
      <span className="evidence-upload-icon" aria-hidden="true">⇧</span><strong id="evidence-upload-title">Drag and drop files here</strong><span>or</span>
      <button type="button" className="evidence-browse-button" onClick={() => inputRef.current?.click()}>Browse Files</button>
      <small>JPG, PNG, WEBP or MP4 <b>•</b> Up to 3 files</small>
    </div>
    <div className="evidence-status" aria-live="polite">{messages.map((message) => <p key={message}>{message}</p>)}</div>
    <h2 className="evidence-selected-title">Selected files ({files.length} of 3)</h2>
    {files.length > 0 && <div className="evidence-preview-grid">{files.map((file) => <EvidencePreviewCard key={evidenceFileKey(file)} file={file} previewUrl={previews.find((preview) => preview.key === evidenceFileKey(file))?.url} onRemove={() => removeFile(file)} />)}</div>}
  </section>;
}
