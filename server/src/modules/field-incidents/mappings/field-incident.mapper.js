function toGeoJsonPoint(coordinates) {
  if (!coordinates) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [coordinates.longitude, coordinates.latitude],
  };
}

function toPublicEvidence(evidence) {
  return {
    secureUrl: evidence.secureUrl,
    resourceType: evidence.resourceType,
    originalName: evidence.originalName,
    mimeType: evidence.mimeType,
    bytes: evidence.bytes,
    format: evidence.format ?? null,
    width: evidence.width ?? null,
    height: evidence.height ?? null,
    duration: evidence.duration ?? null,
  };
}

export function toPublicIncident(incident) {
  const coordinates = incident.location?.point?.coordinates;

  return {
    id: incident.id,
    referenceNumber: incident.referenceNumber,
    clientIncidentId: incident.clientIncidentId ?? null,
    incidentType: incident.incidentType,
    incidentDateTime: incident.incidentDateTime?.toISOString(),
    riskLevel: incident.riskLevel,
    parkZone: incident.parkZone,
    blockArea: incident.blockArea,
    location: {
      source: incident.location.source,
      coordinates: coordinates
        ? { latitude: coordinates[1], longitude: coordinates[0] }
        : null,
      description: incident.location.description ?? '',
    },
    description: incident.description,
    additionalNotes: incident.additionalNotes,
    evidence: (incident.evidence ?? []).map(toPublicEvidence),
    status: incident.status,
    createdAt: incident.createdAt,
  };
}

export function toFieldIncidentCreatePayload(input, ranger, evidence, referenceNumber) {
  return {
    referenceNumber,
    // Preserve omission for requests without an idempotency key.
    ...(input.clientIncidentId ? { clientIncidentId: input.clientIncidentId } : {}),
    rangerUserId: ranger.id,
    rangerIdSnapshot: ranger.rangerId,
    assignedParkSnapshot: ranger.assignedPark,
    incidentType: input.incidentType,
    incidentDateTime: input.incidentDateTime,
    riskLevel: input.riskLevel,
    parkZone: input.parkZone,
    blockArea: input.blockArea,
    location: {
      source: input.location.source,
      point: toGeoJsonPoint(input.location.coordinates),
      description: input.location.description,
    },
    description: input.description,
    additionalNotes: input.additionalNotes,
    evidence,
    status: 'SUBMITTED',
  };
}
