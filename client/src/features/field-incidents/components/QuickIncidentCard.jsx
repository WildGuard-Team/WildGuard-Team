import { useState } from 'react';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import { fieldIncidentImages } from '../config/field-incident-images.js';

export default function QuickIncidentCard({ type, onSelectType }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = fieldIncidentImages[type.value];

  return (
    <button type="button" className="ranger-quick-card" aria-label={`Report ${type.title}`}
      onClick={() => onSelectType(type.value)}>
      <span className="ranger-quick-media">
        {image?.src && !imageFailed ? (
          <img src={image.src} alt={image.alt} loading="lazy" decoding="async"
            onError={() => setImageFailed(true)} />
        ) : (
          <span className="ranger-quick-image-placeholder" role="img"
            aria-label={image?.src ? `${image.alt}: photo unavailable` : image?.alt || 'Incident photo unavailable'}>
            <span>Photo unavailable</span>
          </span>
        )}
      </span>
      <span className="ranger-quick-card-content">
        <span className="ranger-quick-card-icon"><CommunityIcon name={type.icon} size={25} /></span>
        <span className="ranger-quick-card-copy">
          <strong>{type.title}</strong>
          <small>{type.description}</small>
        </span>
        <span className="ranger-quick-card-arrow"><CommunityIcon name="chevron" size={17} /></span>
      </span>
    </button>
  );
}
