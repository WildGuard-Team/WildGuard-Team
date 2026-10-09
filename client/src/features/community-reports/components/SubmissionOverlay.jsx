export default function SubmissionOverlay() {
  return <div className="submission-overlay" role="dialog" aria-modal="true" aria-labelledby="submitting-title"><div className="submission-dialog" role="status"><span className="submission-spinner" /><h2 id="submitting-title">Submitting Report</h2><p>Please wait while your report is securely submitted.</p></div></div>;
}
