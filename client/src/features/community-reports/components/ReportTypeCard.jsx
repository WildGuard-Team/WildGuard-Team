import CommunityIcon from './CommunityIcon.jsx';

const badgeIcons = {
  paw: '/animal-footprint-svgrepo-com.svg',
  users: '/people-svgrepo-com.svg',
  shield: '/warning-alt-svgrepo-com.svg',
};

export default function ReportTypeCard({ type, selected, onSelect }) {
  return <article className={`report-type-card${selected ? ' is-selected' : ''}`}>
    <button type="button" className="report-type-choice" onClick={() => onSelect(type.value)} aria-pressed={selected} aria-label={`Select ${type.title}`}>
      <img className="report-type-photo" src={type.image} alt="" /><span className="community-report-card__badge"><img src={badgeIcons[type.icon]} alt="" aria-hidden="true" /></span><span className="type-radio" aria-hidden="true" />
      <strong>{type.title}</strong><span className="type-description">{type.description}</span>
    </button>
    <button type="button" className="type-select-button" onClick={() => onSelect(type.value)}>Select <CommunityIcon name="chevron" size={21} /></button>
  </article>;
}
