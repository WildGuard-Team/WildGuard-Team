import CommunityIcon from './CommunityIcon.jsx';
import EvidencePreviewCard from './EvidencePreviewCard.jsx';
import { evidenceFileKey } from '../validation/evidence.validation.js';

export default function ReviewAttachments({ files, isRestoring, recoveryRequired, warning, onEdit, onRemove, onSkip }) {
  return <section className="review-attachments" aria-labelledby="review-attachments-title" aria-busy={isRestoring}>
    <div className="community-review__section-heading">
      <h2 id="review-attachments-title">Attachments</h2>
      <button type="button" className="community-review__edit" onClick={onEdit} aria-label="Edit evidence"><CommunityIcon name="edit" /></button>
    </div>
    {isRestoring ? <p className="review-attachments__loading" role="status"><span aria-hidden="true" />Restoring attached evidence…</p>
      : recoveryRequired ? <div className="review-attachments__empty">
        <p role="status">{warning || 'Your report details were restored, but the evidence files could not be recovered. Please select them again.'}</p>
        <button type="button" className="secondary-button" onClick={onEdit}>Select evidence again</button>
        <button type="button" className="community-review__text-action" onClick={onSkip}>Continue without evidence</button>
      </div> : <>
        {warning && <p className="form-alert form-alert--error" role="status">{warning}</p>}
        {files.length ? <div className="review-attachment-grid">
          {files.map((file) => <EvidencePreviewCard key={evidenceFileKey(file)} file={file} compact onRemove={() => onRemove(file)} />)}
          {files.length < 3 && <button type="button" className="review-attachments__add" onClick={onEdit}><CommunityIcon name="plus" size={32} /><span>Add File</span></button>}
        </div> : <div className="review-attachments__empty">
          <p>No evidence attached (optional)</p>
          <button type="button" className="secondary-button" onClick={onEdit}><CommunityIcon name="plus" size={20} />Add Evidence</button>
        </div>}
      </>}
  </section>;
}
