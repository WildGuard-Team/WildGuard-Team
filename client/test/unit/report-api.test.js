import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyReport, getMyReports, prepareReportSubmission, ReportDetailsError, ReportNetworkError, submitReport } from '../../src/features/community-reports/services/report.service.js';
import { reverseGeocode, searchLocations } from '../../src/features/community-reports/services/locationApi.js';

const response = (status, payload, jsonError) => ({ ok: status >= 200 && status < 300, status, json: jsonError ? vi.fn().mockRejectedValue(jsonError) : vi.fn().mockResolvedValue(payload) });
const draft = () => ({ clientSubmissionId: 'retry-id', reportType: 'WILDLIFE_SIGHTING', description: 'Elephants crossing nearby.', incidentDateTime: '2025-01-15T10:30', location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Kandy', manualLocation: 'not sent' }, evidence: [] });
beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('prepare and submit report', () => {
  it('converts local incident time to UTC and sends JSON without evidence or irrelevant manual text', async () => {
    const submission = prepareReportSubmission(draft());
    expect(submission.incidentDateTime).toBe(new Date('2025-01-15T10:30').toISOString());
    expect(submission.location).toEqual({ source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Kandy' });
    const report = { referenceNumber: 'WG-TEST' };
    fetch.mockResolvedValue(response(201, { report }));
    expect(await submitReport(submission)).toEqual(report);
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe('/api/reports');
    expect(request).toMatchObject({ method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(request.body)).toEqual({ ...submission, evidence: undefined });
  });

  it('preserves manual locations, omits empty display names, and rejects missing/invalid/future incident times before fetching', () => {
    const manual = { ...draft(), location: { source: 'MANUAL', coordinates: { latitude: 0, longitude: 0 }, displayName: '', manualLocation: 'River bend' } };
    expect(prepareReportSubmission(manual).location).toEqual({ source: 'MANUAL', coordinates: { latitude: 0, longitude: 0 }, manualLocation: 'River bend' });
    for (const incidentDateTime of ['', 'invalid', '2099-01-01T10:00']) expect(() => prepareReportSubmission({ ...draft(), incidentDateTime })).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses multipart file uploads without overriding the boundary and recognizes a duplicate-safe retry', async () => {
    const evidence = new File(['photo'], 'elephant.png', { type: 'image/png' });
    const submission = prepareReportSubmission({ ...draft(), evidence: [evidence] });
    fetch.mockResolvedValue(response(200, { duplicateRetry: true, report: { referenceNumber: 'WG-ORIGINAL' } }));
    expect(await submitReport(submission)).toEqual({ referenceNumber: 'WG-ORIGINAL' });
    const request = fetch.mock.calls[0][1];
    expect(request.headers).toBeUndefined();
    expect(request.body).toBeInstanceOf(FormData);
    for (const key of ['clientSubmissionId', 'reportType', 'description', 'incidentDateTime']) expect(request.body.get(key)).toBe(submission[key]);
    expect(JSON.parse(request.body.get('location'))).toEqual(submission.location);
    expect(request.body.getAll('evidence')[0].name).toBe('elephant.png');
  });

  it.each([[401, 'session has expired'], [403, 'permission'], [413, 'too large'], [503, 'Evidence upload'], [500, 'temporarily unavailable'], [400, 'Invalid location']])('maps HTTP %s to an actionable error without calling it an offline failure', async (status, expected) => {
    fetch.mockResolvedValue(response(status, { error: { message: 'Invalid location' } }));
    const error = await submitReport(prepareReportSubmission(draft())).catch((value) => value);
    expect(error.message).toContain(expected);
    expect(error).not.toBeInstanceOf(ReportNetworkError);
  });

  it('distinguishes offline errors, interrupted response bodies, malformed JSON, and unconfirmed success', async () => {
    const submission = prepareReportSubmission(draft());
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(submitReport(submission)).rejects.toBeInstanceOf(ReportNetworkError);
    fetch.mockResolvedValueOnce(response(201, null, new TypeError('Body interrupted')));
    await expect(submitReport(submission)).rejects.toBeInstanceOf(ReportNetworkError);
    fetch.mockResolvedValueOnce(response(400, null, new SyntaxError('bad JSON')));
    await expect(submitReport(submission)).rejects.toThrow('The report could not be submitted.');
    for (const unexpected of [response(201, null, new SyntaxError('bad JSON')), response(200, { report: { referenceNumber: 'WG' } }), response(202, { report: { referenceNumber: 'WG' } }), response(201, { report: {} }), response(200, null)]) {
      fetch.mockResolvedValueOnce(unexpected);
      await expect(submitReport(submission)).rejects.toThrow('could not be confirmed');
    }
  });
});

describe('My Reports and Report Details requests', () => {
  it('passes server-side status filters, credentials, cancellation, and no-store on list and detail requests', async () => {
    const controller = new AbortController();
    fetch.mockResolvedValueOnce(response(200, { reports: [] }));
    expect(await getMyReports(undefined, controller.signal)).toEqual([]);
    expect(fetch.mock.calls[0]).toEqual(['/api/reports/my-reports', { credentials: 'include', cache: 'no-store', signal: controller.signal }]);
    fetch.mockResolvedValueOnce(response(200, { reports: [{ _id: 'mine' }] }));
    expect(await getMyReports('under_review', controller.signal)).toEqual([{ _id: 'mine' }]);
    expect(fetch.mock.calls[1][0]).toBe('/api/reports/my-reports?status=under_review');
    fetch.mockResolvedValueOnce(response(200, { report: { _id: 'mine' } }));
    expect(await getMyReport('id/with ?spaces', controller.signal)).toEqual({ _id: 'mine' });
    expect(fetch.mock.calls[2]).toEqual(['/api/reports/my-reports/id%2Fwith%20%3Fspaces', { credentials: 'include', cache: 'no-store', signal: controller.signal }]);
  });

  it('rejects expired sessions, server errors, invalid list schemas, and undecodable list bodies', async () => {
    fetch.mockResolvedValueOnce(response(401, {}));
    await expect(getMyReports()).rejects.toThrow('sign in again to load');
    fetch.mockResolvedValueOnce(response(400, { error: { message: 'Unsupported filter' } }));
    await expect(getMyReports('invalid')).rejects.toThrow('Unsupported filter');
    for (const invalid of [response(500, null), response(200, {}), response(200, { reports: null }), response(200, null, new SyntaxError('bad JSON'))]) {
      fetch.mockResolvedValueOnce(invalid);
      await expect(getMyReports()).rejects.toThrow('Unable to load submitted reports');
    }
  });

  it.each([[400, 'link is invalid'], [401, 'session has expired'], [403, 'not available to your account'], [404, 'could not be found'], [500, 'Unable to load']])('uses safe typed Report Details errors for HTTP %s', async (status, expected) => {
    fetch.mockResolvedValue(response(status, { error: { message: 'private backend stack trace' } }));
    const error = await getMyReport('mine').catch((value) => value);
    expect(error).toBeInstanceOf(ReportDetailsError);
    expect(error.status).toBe(status);
    expect(error.message).toContain(expected);
    expect(error.message).not.toContain('stack trace');
  });

  it('rejects malformed detail responses and propagates cancellation/network errors to the hook', async () => {
    for (const malformed of [response(200, {}), response(200, { report: null }), response(200, { report: { _id: 42 } }), response(200, null, new SyntaxError('bad JSON'))]) {
      fetch.mockResolvedValueOnce(malformed);
      await expect(getMyReport('mine')).rejects.toMatchObject({ status: 502 });
    }
    const cancelled = new DOMException('Request aborted', 'AbortError');
    fetch.mockRejectedValueOnce(cancelled);
    await expect(getMyReport('mine')).rejects.toBe(cancelled);
    fetch.mockRejectedValueOnce(new TypeError('Offline'));
    await expect(getMyReports()).rejects.toThrow('Offline');
  });
});

describe('location lookup API', () => {
  it('encodes search text and coordinate parameters, using the session for both endpoints', async () => {
    fetch.mockResolvedValueOnce(response(200, { results: [{ displayName: 'Kandy' }] }));
    expect(await searchLocations('Kandy & temple')).toEqual([{ displayName: 'Kandy' }]);
    expect(fetch.mock.calls[0]).toEqual(['/api/reports/locations/search?q=Kandy+%26+temple', { credentials: 'include' }]);
    fetch.mockResolvedValueOnce(response(200, { location: { displayName: 'Road' } }));
    expect(await reverseGeocode({ latitude: 0, longitude: -180 })).toEqual({ displayName: 'Road' });
    expect(fetch.mock.calls[1][0]).toBe('/api/reports/locations/reverse?latitude=0&longitude=-180');
    fetch.mockResolvedValueOnce(response(200, {}));
    expect(await searchLocations('unknown')).toEqual([]);
    fetch.mockResolvedValueOnce(response(200, {}));
    expect(await reverseGeocode({ latitude: 1, longitude: 2 })).toBeNull();
  });

  it.each([[401, 'session has expired'], [403, 'not allowed'], [503, 'temporarily unavailable'], [400, 'Search validation failed']])('maps location HTTP %s failures', async (status, expected) => {
    fetch.mockResolvedValue(response(status, { error: { message: 'Search validation failed' } }));
    await expect(searchLocations('Kandy')).rejects.toThrow(expected);
  });

  it('handles offline lookup and unreadable error payloads with appropriate search/reverse fallbacks', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Offline'));
    await expect(searchLocations('Kandy')).rejects.toThrow('Check your connection');
    fetch.mockResolvedValueOnce(response(500, null, new SyntaxError('bad')));
    await expect(searchLocations('Kandy')).rejects.toThrow('Location search failed');
    fetch.mockResolvedValueOnce(response(500, {}));
    await expect(reverseGeocode({ latitude: 1, longitude: 2 })).rejects.toThrow('Address lookup failed');
  });
});
