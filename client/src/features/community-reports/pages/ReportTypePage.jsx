import { useState } from 'react';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ReportLayout from '../components/ReportLayout.jsx';
import ReportTypeCard from '../components/ReportTypeCard.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { reportTypes } from '../utils/report-options.js';

export default function ReportTypePage({ navigate }) {
  const { draft, updateDraft } = useReportDraft();
  const [error, setError] = useState('');
  function continueToDetails() {
    if (!draft.reportType) return setError('Choose a report type to continue.');
    navigate('/reports/details');
  }
  return <ReportLayout navigate={navigate} title="Submit Community Report" subtitle="Choose the type of incident you want to report." step={1}>
    <FormAlert>{error}</FormAlert>
    <div className="report-type-list">{reportTypes.map((type) => <ReportTypeCard key={type.value} type={type} selected={draft.reportType === type.value} onSelect={(value) => { updateDraft({ reportType: value }); setError(''); }} />)}</div>
    <div className="report-actions"><button type="button" className="secondary-button" onClick={() => navigate('/member')}>Cancel</button><button type="button" className="primary-button" onClick={continueToDetails}>Continue</button></div>
  </ReportLayout>;
}
