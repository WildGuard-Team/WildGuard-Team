const reportStatuses = {
  offline_pending: { label: 'SAVED OFFLINE', title: 'Saved offline', description: 'This report is waiting to be submitted.' },
  under_review: { label: 'UNDER REVIEW', title: 'Under Review', description: 'Your report has been received and is waiting for review.' },
  approved: { label: 'APPROVED', title: 'Approved', description: 'Your report has been reviewed and approved.' },
  rejected: { label: 'REJECTED', title: 'Rejected', description: 'Your report has been reviewed and was not approved.' },
};

export function getReportStatus(status) {
  return Object.hasOwn(reportStatuses, status) ? status : 'under_review';
}

export function getReportStatusInfo(status) {
  return reportStatuses[getReportStatus(status)];
}
