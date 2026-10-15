// @vitest-environment node
// Mechanical Vitest port of the four pre-existing native Node contracts.
import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { prepareReportSubmission, submitReport, ReportNetworkError, getMyReport, ReportDetailsError } from '../../src/features/community-reports/services/report.service.js';
import { restorePendingSubmission } from '../../src/features/community-reports/services/pending-reports.indexeddb.js';

afterEach(() => vi.restoreAllMocks());

test('submission keeps its id, UTC instant and evidence metadata through offline restoration', async () => {
  const file = new File(['evidence'], 'photo.png', { type: 'image/png', lastModified: 123 });
  const submission = prepareReportSubmission({ clientSubmissionId: 'same-id', reportType: 'WILDLIFE_SIGHTING', description: 'An elephant was seen.', incidentDateTime: '2026-01-01T10:00', location: { source: 'MANUAL', coordinates: { latitude: 7, longitude: 80 }, manualLocation: 'Forest' }, evidence: [file] });
  const restored = restorePendingSubmission({ ...submission, evidence: [{ blob: file, name: file.name, type: file.type, lastModified: file.lastModified }] });
  assert.equal(restored.incidentDateTime, submission.incidentDateTime);
  assert.equal(restored.evidence[0].name, file.name);
  assert.equal(await restored.evidence[0].text(), 'evidence');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    assert.equal(url, '/api/reports');
    assert.equal(options.credentials, 'include');
    assert.equal(options.body.get('clientSubmissionId'), 'same-id');
    assert.equal(options.body.get('incidentDateTime'), submission.incidentDateTime);
    assert.equal(options.body.getAll('evidence').length, 1);
    return Response.json({ report: { referenceNumber: 'WG-test' }, duplicateRetry: true }, { status: 200 });
  });
  assert.equal((await submitReport(restored)).referenceNumber, 'WG-test');
});

test('only network failures qualify for local saving; validation and server errors do not', async () => {
  const submission = { clientSubmissionId: 'same-id', evidence: [] };
  const mock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(submitReport(submission), ReportNetworkError);
  for (const status of [400, 401, 403, 413, 500, 503]) {
    mock.mockImplementation(async () => Response.json({ error: { message: 'Invalid report' } }, { status }));
    await assert.rejects(submitReport(submission), (error) => !(error instanceof ReportNetworkError));
  }
  mock.mockImplementation(async () => Response.json({ report: { referenceNumber: 'WG-new' } }, { status: 201 }));
  assert.equal((await submitReport(submission)).referenceNumber, 'WG-new');
});

test('single report requests preserve the authenticated cookie and abort signal, with safely encoded IDs', async () => {
  const controller = new AbortController();
  const report = { _id: '507f1f77bcf86cd799439011', description: 'Complete report description.' };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    assert.equal(url, '/api/reports/my-reports/invalid%2Fid%3FreporterId%3Dother');
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, controller.signal);
    return Response.json({ report });
  });
  assert.deepEqual(await getMyReport('invalid/id?reporterId=other', controller.signal), report);
});

test('single report errors distinguish invalid and missing reports without exposing server messages', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ error: { message: 'private database detail' } }, { status: 404 }));
  for (const status of [400, 401, 403, 404, 500]) {
    fetchMock.mockImplementation(async () => Response.json({ error: { message: 'private database detail' } }, { status }));
    await assert.rejects(getMyReport('507f1f77bcf86cd799439011'), (error) => error instanceof ReportDetailsError && error.status === status && !error.message.includes('private database'));
  }
  fetchMock.mockImplementation(async () => Response.json({ reports: [] }));
  await assert.rejects(getMyReport('507f1f77bcf86cd799439011'), (error) => error instanceof ReportDetailsError && error.status === 502);
  fetchMock.mockImplementation(async () => { throw new DOMException('Cancelled', 'AbortError'); });
  await assert.rejects(getMyReport('507f1f77bcf86cd799439011'), { name: 'AbortError' });
});
