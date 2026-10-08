export function parseCoordinates(value) {
    if (
      typeof value !== 'string'
      || !value.trim()
    ) {
      return null;
    }
  
    const parts = value
      .split(',')
      .map((part) => part.trim());
  
    if (parts.length !== 2 || parts.some((part) => !part)) {
      return null;
    }
  
    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);
  
    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    ) {
      return null;
    }
  
    return {
      latitude,
      longitude,
    };
  }
  
  export function validateFieldIncidentDetails(
    draft,
  ) {
    const errors = {};
  
    if (!draft.incidentType) {
      errors.incidentType =
        'Incident type is required.';
    }
  
    if (!draft.incidentDate) {
      errors.incidentDate =
        'Incident date is required.';
    }
  
    if (!draft.incidentTime) {
      errors.incidentTime =
        'Incident time is required.';
    }
  
    if (!draft.riskLevel) {
      errors.riskLevel =
        'Select a risk level.';
    }
  
    if (!draft.parkZone.trim()) {
      errors.parkZone =
        'Park or zone is required.';
    }
  
    if (!draft.blockArea.trim()) {
      errors.blockArea =
        'Block or area is required.';
    }
  
    const hasGps =
      draft.location.coordinates
      || parseCoordinates(
        draft.location.manualCoordinates,
      );
  
    if (
      !hasGps
      && !draft.location.description.trim()
    ) {
      errors.location =
        'Provide GPS coordinates or describe the incident location.';
    }
  
    const description =
      draft.description.trim();
  
    if (description.length < 10) {
      errors.description =
        'Incident description must contain at least 10 characters.';
    }
  
    if (description.length > 1000) {
      errors.description =
        'Incident description cannot exceed 1000 characters.';
    }
  
    if (
      draft.additionalNotes.length > 1000
    ) {
      errors.additionalNotes =
        'Additional notes cannot exceed 1000 characters.';
    }
  
    return errors;
  }
