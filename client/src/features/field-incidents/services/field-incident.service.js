const apiBaseUrl =
  (import.meta.env?.VITE_API_BASE_URL ?? '/api')
    .replace(/\/+$/, '');

export async function getMyFieldIncidents() {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/field-incidents/mine`, {
      method: 'GET',
      credentials: 'include',
    });
  } catch {
    throw new FieldIncidentNetworkError('Unable to reach WildGuard.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to view field incident history.');
    }
    if (response.status >= 500) {
      throw new Error('WildGuard is temporarily unavailable. Please try again.');
    }
    throw new Error(payload?.error?.message ?? 'Unable to load your field incidents.');
  }
  if (!Array.isArray(payload?.incidents)) {
    throw new Error('Unable to load your field incidents.');
  }
  return payload.incidents;
}

export class FieldIncidentNetworkError
  extends Error {
  constructor(message) {
    super(message);

    this.name =
      'FieldIncidentNetworkError';
  }
}

function createIncidentDateTime(
  incidentDate,
  incidentTime,
) {
  const value =
    new Date(
      `${incidentDate}T${incidentTime}:00`,
    );

  if (
    Number.isNaN(
      value.getTime(),
    )
  ) {
    throw new Error(
      'Incident date and time are invalid.',
    );
  }

  return value.toISOString();
}

function createRequestBody(
  draft,
) {
  const source =
    draft.location.source
    || 'MANUAL';

  return {
    clientIncidentId:
      draft.clientIncidentId,

    incidentType:
      draft.incidentType,

    incidentDateTime:
      createIncidentDateTime(
        draft.incidentDate,
        draft.incidentTime,
      ),

    riskLevel:
      draft.riskLevel,

    parkZone:
      draft.parkZone.trim(),

    blockArea:
      draft.blockArea.trim(),

    location: {
      source,

      coordinates:
        draft.location.coordinates,

      description:
        draft.location.description.trim(),
    },

    description:
      draft.description.trim(),

    additionalNotes:
      draft.additionalNotes.trim(),
  };
}

function toFormData(
  incident,
  evidence,
) {
  const formData =
    new FormData();

  if (
    incident.clientIncidentId
  ) {
    formData.append(
      'clientIncidentId',
      incident.clientIncidentId,
    );
  }

  formData.append(
    'incidentType',
    incident.incidentType,
  );

  formData.append(
    'incidentDateTime',
    incident.incidentDateTime,
  );

  formData.append(
    'riskLevel',
    incident.riskLevel,
  );

  formData.append(
    'parkZone',
    incident.parkZone,
  );

  formData.append(
    'blockArea',
    incident.blockArea,
  );

  formData.append(
    'location',
    JSON.stringify(
      incident.location,
    ),
  );

  formData.append(
    'description',
    incident.description,
  );

  formData.append(
    'additionalNotes',
    incident.additionalNotes,
  );

  evidence.forEach(
    (file) => {
      formData.append(
        'evidence',
        file,
      );
    },
  );

  return formData;
}

export async function submitFieldIncident(
  draft,
) {
  const incident =
    createRequestBody(
      draft,
    );

  const hasEvidence =
    draft.evidence.length > 0;

  let response;

  try {
    response = await fetch(
      `${apiBaseUrl}/field-incidents`,
      {
        method: 'POST',

        credentials: 'include',

        ...(hasEvidence
          ? {
              body:
                toFormData(
                  incident,
                  draft.evidence,
                ),
            }
          : {
              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  incident,
                ),
            }),
      },
    );
  } catch {
    throw new FieldIncidentNetworkError(
      'Unable to reach WildGuard.',
    );
  }

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401
    ) {
      throw new Error(
        'Your session has expired. Please sign in again.',
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        'You do not have permission to submit field incidents.',
      );
    }

    if (
      response.status === 409
    ) {
      throw new Error(
        'This field incident has already been submitted.',
      );
    }

    if (
      response.status === 413
    ) {
      throw new Error(
        'One or more evidence files are too large.',
      );
    }

    if (
      response.status === 503
    ) {
      throw new Error(
        'Evidence upload is temporarily unavailable. Please try again.',
      );
    }

    if (
      response.status >= 500
    ) {
      throw new Error(
        'WildGuard is temporarily unavailable. Please try again.',
      );
    }

    throw new Error(
      payload?.error?.message
      ?? 'The field incident could not be submitted.',
    );
  }

  if (
    response.status !== 201
    || !payload?.incident?.referenceNumber
  ) {
    throw new Error(
      'The field incident could not be confirmed.',
    );
  }

  return payload.incident;
}
