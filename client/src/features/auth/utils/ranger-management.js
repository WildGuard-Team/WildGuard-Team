export const RANGER_STATUS_FILTERS = [
  { value: 'ALL', label: 'All', emptyMessage: 'No Ranger registrations found.' },
  { value: 'PENDING', label: 'Pending', emptyMessage: 'No pending Ranger requests.' },
  { value: 'APPROVED', label: 'Approved', emptyMessage: 'No approved Rangers found.' },
  { value: 'REJECTED', label: 'Rejected', emptyMessage: 'No rejected Rangers found.' },
];

export function summarizeRangers(rangers) {
  return rangers.reduce((counts, ranger) => {
    if (Object.hasOwn(counts, ranger.approvalStatus)) counts[ranger.approvalStatus] += 1;
    return counts;
  }, { PENDING: 0, APPROVED: 0, REJECTED: 0, total: rangers.length });
}

export function filterRangers(rangers, status, search) {
  const query = search.trim().toLowerCase();
  return rangers.filter((ranger) => (
    (status === 'ALL' || ranger.approvalStatus === status)
    && (!query || [ranger.fullName, ranger.rangerId, ranger.email, ranger.assignedPark]
      .some((value) => String(value ?? '').toLowerCase().includes(query)))
  ));
}
