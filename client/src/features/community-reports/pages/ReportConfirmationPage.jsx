import CommunityLayout from '../components/CommunityLayout.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import './report-confirmation.css';

const successIllustration = '/Elephant%20and%20Deer%20Conservation%20Success.png';

export default function ReportConfirmationPage({ navigate }) {
  const { submittedReport, resetDraft } = useReportDraft();
  if (!submittedReport) { navigate('/reports/type', { replace: true }); return null; }
  function submitAnother() { resetDraft(); navigate('/reports/type'); }
  return <CommunityLayout navigate={navigate}>
    <section className="report-confirmation" aria-labelledby="report-confirmation-title">
      <div className="report-confirmation__content">
        <div className="report-confirmation__copy">
          <h1 id="report-confirmation-title">Report submitted successfully</h1>
          <p className="report-confirmation__thanks">Thank you for helping protect your community and wildlife.</p>
          <section className="report-confirmation__reference" aria-labelledby="report-reference-label">
            <p id="report-reference-label">Your report reference number</p>
            <strong>{submittedReport.referenceNumber}</strong>
            <span>Keep this reference number for your records.</span>
          </section>
          <div className="report-confirmation__actions">
            <button type="button" className="primary-button" onClick={submitAnother}>Submit another report</button>
            <button type="button" className="secondary-button" onClick={() => { resetDraft(); navigate('/member'); }}>Back to dashboard</button>
          </div>
        </div>
        <div className="report-confirmation__illustration">
          <img src={successIllustration} alt="Elephant and deer among green foliage with a success check mark" />
        </div>
      </div>
    </section>
  </CommunityLayout>;
}
