import { CONSERVATION_REPORT_TYPE_VALUES } from '../config/conservation-report.constants.js';
import { HttpError } from '../../../shared/http-error.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;

export async function listGeneratedReports({ managerId, query = {} }, reports) {
  const allowed = new Set(['page', 'limit', 'reportType']);
  if (Object.keys(query).some((key) => !allowed.has(key))) {
    throw new HttpError(400, 'Only page, limit and reportType are allowed.');
  }

  const page = positiveInteger(query.page, 1, 'page');
  const limit = positiveInteger(query.limit, DEFAULT_PAGE_SIZE, 'limit');
  if (limit > MAX_PAGE_SIZE) throw new HttpError(400, `limit cannot exceed ${MAX_PAGE_SIZE}.`);
  const reportType = query.reportType || undefined;
  if (reportType && !CONSERVATION_REPORT_TYPE_VALUES.includes(reportType)) {
    throw new HttpError(400, 'Invalid conservation report type.');
  }

  const criteria = { managerId, reportType, skip: (page - 1) * limit, limit };
  const [documents, total] = await Promise.all([
    reports.listForManager(criteria),
    reports.countForManager(criteria),
  ]);

  return {
    reports: documents.map(toHistoryItem),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new HttpError(400, `${name} must be a positive integer.`);
  }
  return Number(value);
}

function toHistoryItem(document) {
  const report = typeof document.toObject === 'function' ? document.toObject() : document;
  return {
    reportId: report.reportId,
    reportType: report.reportType,
    parameters: report.parameters,
    generatedAt: report.generatedAt,
    dataProvenance: report.dataProvenance,
    fileLocation: report.fileLocation,
  };
}
