const MAXIMUM_RANGE_DAYS = 366;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function validateReportForm(form) {
  const errors = {};
  if (!form.reportType) errors.reportType = 'Select a report type.';
  if (!form.startDate) errors.startDate = 'Select a start date.';
  if (!form.endDate) errors.endDate = 'Select an end date.';
  if (!form.startDate || !form.endDate) return errors;

  const start = parseDate(form.startDate);
  const end = parseDate(form.endDate);
  if (!start) errors.startDate = 'Enter a valid start date.';
  if (!end) errors.endDate = 'Enter a valid end date.';
  if (!start || !end) return errors;
  if (start > end) errors.endDate = 'End date must be on or after the start date.';
  const days = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;
  if (days > MAXIMUM_RANGE_DAYS) errors.endDate = `Date range cannot exceed ${MAXIMUM_RANGE_DAYS} days.`;
  return errors;
}

export function toReportRequest(form) {
  const filters = {};
  if (form.park) filters.park = form.park;

  const supportsLocation =
    form.reportType === 'INCIDENT_REPORT' ||
    form.reportType === 'CONFLICT_TREND_REPORT';

  if (supportsLocation && form.location) {
    filters.location = form.location.trim();
  }
  if (form.reportType === 'INCIDENT_REPORT') {
    if (form.incidentType) filters.incidentTypes = [form.incidentType];
    if (form.severity) filters.severities = [form.severity];
  }
  if (form.reportType === 'PATROL_COVERAGE_REPORT') {
    if (form.routeSourceId) filters.routeSourceIds = [form.routeSourceId];
    if (form.status) filters.statuses = [form.status];
  }
  if (form.reportType === 'CONFLICT_TREND_REPORT') {
    if (form.severity) filters.severities = [form.severity];
    if (form.conflictType) filters.conflictTypes = [form.conflictType];
  }
  return {
    reportType: form.reportType,
    startDate: form.startDate,
    endDate: form.endDate,
    filters,
  };
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
