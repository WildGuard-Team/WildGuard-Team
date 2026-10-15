export function createIncidentManagementQuery() {
  return {
    search: '', incidentType: '', riskLevel: '', parkZone: '',
    startDate: '', endDate: '', status: '', page: 1, pageSize: 25, sort: 'newest',
  };
}

const filterNames = new Set([
  'search', 'incidentType', 'riskLevel', 'parkZone', 'startDate', 'endDate', 'status',
]);

export function incidentManagementQueryReducer(query, action) {
  switch (action.type) {
    case 'filter':
      return filterNames.has(action.name) ? { ...query, [action.name]: action.value, page: 1 } : query;
    case 'sort':
      return { ...query, sort: action.value === 'oldest' ? 'oldest' : 'newest', page: 1 };
    case 'page':
      return Number.isInteger(action.value) && action.value > 0 ? { ...query, page: action.value } : query;
    case 'pageSize':
      return [10, 25, 50, 100].includes(action.value) ? { ...query, pageSize: action.value, page: 1 } : query;
    case 'clear':
      return { ...createIncidentManagementQuery(), pageSize: query.pageSize };
    default:
      return query;
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateIncidentManagementDates({ startDate, endDate }) {
  if (startDate && !isValidDate(startDate)) return 'Enter a valid start date.';
  if (endDate && !isValidDate(endDate)) return 'Enter a valid end date.';
  if (startDate && endDate && startDate > endDate) {
    return 'The end date must be on or after the start date.';
  }
  return '';
}

export function serializeIncidentManagementQuery(query) {
  const params = new URLSearchParams();
  for (const name of filterNames) {
    const value = String(query[name] ?? '').trim();
    if (value) params.set(name, value);
  }
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  params.set('sort', query.sort);
  return params.toString();
}
