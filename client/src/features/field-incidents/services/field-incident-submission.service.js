import { FieldIncidentNetworkError, submitFieldIncident } from './field-incident.service.js';
import { savePendingFieldIncident } from './field-incident-offline-db.js';
import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';

const browserIsOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

async function queueIncident(draft, ownerId, savePending) {
  let pendingIncident;
  try {
    pendingIncident = await savePending({ ownerId, draft });
  } catch (cause) {
    throw new Error(
      'The incident could not be saved for offline synchronization. Keep this page open and try again.',
      { cause },
    );
  }
  return {
    type: 'OFFLINE_QUEUED',
    incident: {
      clientIncidentId: pendingIncident.clientIncidentId,
      referenceNumber: null,
      status: FIELD_INCIDENT_PENDING_SYNC,
      createdAt: pendingIncident.createdAt,
    },
  };
}

export async function submitOrQueueFieldIncident(
  { draft, ownerId },
  { submit = submitFieldIncident, savePending = savePendingFieldIncident, isOnline = browserIsOnline } = {},
) {
  if (!isOnline()) return queueIncident(draft, ownerId, savePending);
  try {
    return { type: 'ONLINE_SUBMITTED', incident: await submit(draft) };
  } catch (error) {
    if (!(error instanceof FieldIncidentNetworkError)) throw error;
    return queueIncident(draft, ownerId, savePending);
  }
}
