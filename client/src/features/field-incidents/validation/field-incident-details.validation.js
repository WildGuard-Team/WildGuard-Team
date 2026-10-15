export function hasValidFieldIncidentCoordinates(coordinates) {
  return coordinates !== null
    && typeof coordinates === 'object'
    && !Array.isArray(coordinates)
    && Number.isFinite(coordinates.latitude)
    && Number.isFinite(coordinates.longitude)
    && coordinates.latitude >= -90
    && coordinates.latitude <= 90
    && coordinates.longitude >= -180
    && coordinates.longitude <= 180;
}

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
  
    if (!hasValidFieldIncidentCoordinates({ latitude, longitude })) {
      return null;
    }
  
    return {
      latitude,
      longitude,
    };
  }

export function getFieldIncidentCoordinatesError(location) {
  const invalidCoordinates = location?.coordinates != null
    && !hasValidFieldIncidentCoordinates(location.coordinates);
  const invalidManualInput = typeof location?.manualCoordinates === 'string'
    && location.manualCoordinates.trim()
    && !parseCoordinates(location.manualCoordinates);

  return invalidCoordinates || invalidManualInput
    ? 'Enter valid GPS coordinates: latitude -90 to 90 and longitude -180 to 180.'
    : null;
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
  
    const coordinateError = getFieldIncidentCoordinatesError(draft.location);
    const hasGps =
      hasValidFieldIncidentCoordinates(draft.location.coordinates)
      || parseCoordinates(
        draft.location.manualCoordinates,
      );
  
    if (coordinateError) {
      errors.location = coordinateError;
    } else if (
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
