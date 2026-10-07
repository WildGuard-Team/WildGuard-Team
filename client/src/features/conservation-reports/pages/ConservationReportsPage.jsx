import { useEffect, useState } from 'react';
import ParkManagerLayout from '../components/ParkManagerLayout.jsx';
import ReportFilterForm from '../components/ReportFilterForm.jsx';
import ReportResults from '../components/ReportResults.jsx';
import ReportTypeSelector from '../components/ReportTypeSelector.jsx';
import { PATROL_ROUTES } from '../config/report-options.js';
import {
  generateConservationReport, getConservationReportOptions,
} from '../services/conservation-report.api.js';
import {
  toReportRequest, validateReportForm,
} from '../validation/report-parameters.validation.js';
import './conservation-reports.css';

export default function ConservationReportsPage({ navigate }) {
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [noData, setNoData] = useState('');

  useEffect(() => {
    let active = true;
    getConservationReportOptions()
      .catch((error) => { if (active) setApiError(error.message); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  function selectReportType(reportType) {
    setForm((current) => ({
      ...current, reportType, location: '', incidentType: '', severity: '',
      routeSourceId: '', status: '', conflictType: '',
    }));
    setErrors((current) => ({ ...current, reportType: undefined }));
    setApiError(''); setNoData('');
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'park' && current.routeSourceId) {
        const selectedRoute = PATROL_ROUTES.find((route) => route.value === current.routeSourceId);
        if (selectedRoute && value && selectedRoute.park !== value) next.routeSourceId = '';
      }
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
    setApiError(''); setNoData('');
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateReportForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsGenerating(true); setApiError(''); setNoData('');
    try {
      const result = await generateConservationReport(toReportRequest(form));
      if (result.noData) {
        setReport(null); setNoData(result.message);
      } else {
        setReport(result.report);
        window.requestAnimationFrame(() => document.querySelector('.cr-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function generateAnother() {
    setReport(null); setNoData(''); setApiError(''); setErrors({});
    setForm(createInitialForm());
    window.requestAnimationFrame(() => document.querySelector('.cr-workspace')?.scrollIntoView({ behavior: 'smooth' }));
  }

  return <ParkManagerLayout navigate={navigate}><div className="cr-workspace">
    {report ? <ReportResults report={report} onGenerateAnother={generateAnother} /> : <>
      <header className="cr-page-heading"><div><span>Operations / Conservation Reports</span><h1>Generate Conservation Report</h1><p>Turn conservation records into clear statistics, trends and coverage insights.</p></div><div className="cr-heading-badge"><i />Live database calculations</div></header>
      {optionsLoading && <div className="cr-page-status"><i className="cr-button-spinner" />Preparing report options…</div>}
      {apiError && <div className="cr-alert cr-alert-error" role="alert"><strong>Unable to complete the request</strong><span>{apiError}</span></div>}
      {noData && <div className="cr-alert cr-alert-empty" role="status"><strong>No data found</strong><span>{noData} Change the filters and try again.</span></div>}
      <ReportTypeSelector value={form.reportType} onChange={selectReportType} error={errors.reportType} />
      {form.reportType && <ReportFilterForm form={form} errors={errors} onChange={updateForm} onSubmit={submit} isGenerating={isGenerating} />}
    </>}
  </div></ParkManagerLayout>;
}

function createInitialForm() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  return {
    reportType: '', startDate: toDateInput(start), endDate: toDateInput(end),
    park: '', location: '', incidentType: '', severity: '', routeSourceId: '', status: '', conflictType: '',
  };
}

function toDateInput(value) {
  return value.toISOString().slice(0, 10);
}
