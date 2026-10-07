import {
  exportGeneratedConservationReport, exportGeneratedConservationReportPdf,
} from './conservation-report.api.js';

export async function downloadReportCsv(
  reportId,
  dependencies = {
    fetchExport: exportGeneratedConservationReport,
    documentObject: document,
    urlObject: URL,
  },
) {
  return downloadReportFile(reportId, dependencies);
}

export async function downloadReportPdf(
  reportId,
  dependencies = {
    fetchExport: exportGeneratedConservationReportPdf,
    documentObject: document,
    urlObject: URL,
  },
) {
  return downloadReportFile(reportId, dependencies);
}

async function downloadReportFile(reportId, dependencies) {
  const file = await dependencies.fetchExport(reportId);
  const objectUrl = dependencies.urlObject.createObjectURL(file.blob);
  try {
    const link = dependencies.documentObject.createElement('a');
    link.href = objectUrl;
    link.download = file.fileName;
    link.style.display = 'none';
    dependencies.documentObject.body.append(link);
    link.click();
    link.remove();
  } finally {
    dependencies.urlObject.revokeObjectURL(objectUrl);
  }
  return file.fileName;
}

export function buildReportShareUrl(reportId, origin = window.location.origin) {
  const url = new URL('/manager/reports', origin);
  url.searchParams.set('report', reportId);
  return url.toString();
}

export async function shareReport(report, dependencies = {
  navigatorObject: navigator,
  origin: window.location.origin,
}) {
  const url = buildReportShareUrl(report.reportId, dependencies.origin);
  const payload = {
    title: `WildGuard ${report.reportId}`,
    text: 'View this generated conservation report in WildGuard.',
    url,
  };
  if (typeof dependencies.navigatorObject.share === 'function') {
    await dependencies.navigatorObject.share(payload);
    return { method: 'shared', url };
  }
  if (typeof dependencies.navigatorObject.clipboard?.writeText === 'function') {
    await dependencies.navigatorObject.clipboard.writeText(url);
    return { method: 'copied', url };
  }
  throw new Error('Sharing is not supported by this browser.');
}
