export default function FieldIncidentReviewCard({ label, children, onEdit, disabled, className }) {
  return (
    <section className={className}>
      <div>
        <h2>{label}</h2>
        {children}
      </div>
      <button type="button" disabled={disabled} onClick={onEdit}>Edit</button>
    </section>
  );
}
