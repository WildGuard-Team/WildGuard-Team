export function createClientIncidentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function getCurrentTime(now) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function createEmptyDraft() {
  const now = new Date();
  return {
    clientIncidentId: createClientIncidentId(),
    incidentType: '',
    incidentDate: getCurrentDate(now),
    incidentTime: getCurrentTime(now),
    riskLevel: '',
    parkZone: '',
    blockArea: '',
    location: { source: null, coordinates: null, manualCoordinates: '', description: '' },
    description: '',
    additionalNotes: '',
    evidence: [],
  };
}
