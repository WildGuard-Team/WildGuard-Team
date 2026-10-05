import ReportLayout from '../components/ReportLayout.jsx';
import { useReportDraft } from '../context/useReportDraft.js';

export default function ReportConfirmationPage({ navigate }) {
  const { submittedReport, resetDraft } = useReportDraft();
  if (!submittedReport) { navigate('/reports/type', { replace: true }); return null; }
  function submitAnother() { resetDraft(); navigate('/reports/type'); }
  return <ReportLayout navigate={navigate} title="Your report was submitted">
    <p className="confirmation-copy">Thank you for helping protect your community and wildlife.</p>
    <p className="reference-label">Your report reference number</p><p className="reference-number">{submittedReport.referenceNumber}</p>
    <div className="confirmation-actions"><button type="button" className="primary-button" onClick={submitAnother}>Submit another report</button><button type="button" className="secondary-button" onClick={() => { resetDraft(); navigate('/member'); }}>Back to dashboard</button></div>
  </ReportLayout>;
}
