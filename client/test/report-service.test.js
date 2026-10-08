import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareReportSubmission, submitReport, ReportNetworkError } from '../src/features/community-reports/services/report.service.js';
import { restorePendingSubmission } from '../src/features/community-reports/services/pending-reports.indexeddb.js';

test('submission keeps its id, UTC instant and evidence metadata through offline restoration', async (t) => {
  const file = new File(['evidence'], 'photo.png', { type: 'image/png', lastModified: 123 });
  const submission = prepareReportSubmission({ clientSubmissionId: 'same-id', reportType: 'WILDLIFE_SIGHTING', description: 'An elephant was seen.', incidentDateTime: '2026-01-01T10:00', location: { source: 'MANUAL', coordinates: { latitude: 7, longitude: 80 }, manualLocation: 'Forest' }, evidence: [file] });
  const restored = restorePendingSubmission({ ...submission, evidence: [{ blob: file, name: file.name, type: file.type, lastModified: file.lastModified }] });
  assert.equal(restored.incidentDateTime, submission.incidentDateTime);
  assert.equal(restored.evidence[0].name, file.name);
  assert.equal(await restored.evidence[0].text(), 'evidence');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/reports');
    assert.equal(options.credentials, 'include');
    assert.equal(options.body.get('clientSubmissionId'), 'same-id');
    assert.equal(options.body.get('incidentDateTime'), submission.incidentDateTime);
    assert.equal(options.body.getAll('evidence').length, 1);
    return Response.json({ report: { referenceNumber: 'WG-test' }, duplicateRetry: true }, { status: 200 });
  });
  assert.equal((await submitReport(restored)).referenceNumber, 'WG-test');
});

test('only network failures qualify for local saving; validation and server errors do not', async (t) => {
  const submission = { clientSubmissionId: 'same-id', evidence: [] };
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(submitReport(submission), ReportNetworkError);
  for (const status of [400, 401, 403, 413, 500, 503]) {
    mock.mock.mockImplementation(async () => Response.json({ error: { message: 'Invalid report' } }, { status }));
    await assert.rejects(submitReport(submission), (error) => !(error instanceof ReportNetworkError));
  }
  mock.mock.mockImplementation(async () => Response.json({ report: { referenceNumber: 'WG-new' } }, { status: 201 }));
  assert.equal((await submitReport(submission)).referenceNumber, 'WG-new');
});
