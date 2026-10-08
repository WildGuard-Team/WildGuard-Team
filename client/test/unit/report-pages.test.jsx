import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import MyReportsPage from '../../src/features/community-reports/pages/MyReportsPage.jsx';
import SubmittedReportDetailsPage from '../../src/features/community-reports/pages/SubmittedReportDetailsPage.jsx';
import MemberLandingPage from '../../src/pages/MemberLandingPage.jsx';
import CommunityLayout from '../../src/features/community-reports/components/CommunityLayout.jsx';
import { getPendingReports, deletePendingReport, restorePendingSubmission } from '../../src/features/community-reports/services/pending-reports.indexeddb.js';

const session = vi.hoisted(() => ({ user: { id: 'member-1', fullName: 'Chenath Perera' }, logout: vi.fn(), resetDraft: vi.fn() }));
vi.mock('../../src/context/useAuth.js', () => ({ useAuth: () => session }));
vi.mock('../../src/features/community-reports/context/useReportDraft.js', () => ({ useReportDraft: () => session }));
vi.mock('../../src/features/community-reports/services/pending-reports.indexeddb.js', () => ({ getPendingReports: vi.fn(), deletePendingReport: vi.fn(), restorePendingSubmission: vi.fn() }));
vi.mock('../../src/features/community-reports/components/ReadOnlyReportMap.jsx', () => ({ default: ({ coordinates }) => coordinates ? <div aria-label="Read-only report location" /> : null }));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const report = (overrides = {}) => ({ _id: 'report/1', referenceNumber: 'WG-20260101-ABC', reportType: 'WILDLIFE_SIGHTING', description: 'Elephant seen beside the forest entrance.', createdAt: '2026-01-01T10:00:00Z', status: 'under_review', location: { source: 'MANUAL', manualLocation: 'Forest entrance' }, evidence: [], ...overrides });
const pending = () => ({ ...report({ _id: undefined, referenceNumber: undefined, status: 'offline_pending' }), clientSubmissionId: 'retry-1', savedAt: '2026-02-01T10:00:00Z' });
let fetchMock;
beforeEach(() => {
  vi.clearAllMocks();
  session.user = { id: 'member-1', fullName: 'Chenath Perera' };
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  getPendingReports.mockResolvedValue([]);
  deletePendingReport.mockResolvedValue(undefined);
  restorePendingSubmission.mockReturnValue({ clientSubmissionId: 'retry-1', evidence: [] });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('My Reports real loading and filter states', () => {
  it('merges local and server reports newest first, then navigates only submitted reports to details', async () => {
    const request = deferred();
    getPendingReports.mockResolvedValue([pending()]);
    fetchMock.mockReturnValue(request.promise);
    const navigate = vi.fn();
    render(<MyReportsPage navigate={navigate} message="Saved on this device." />);
    expect(screen.getByText('Loading reports…')).toBeTruthy();
    expect(screen.getByText('Saved on this device.')).toBeTruthy();
    request.resolve(response({ reports: [report()] }));
    await screen.findByText('WG-20260101-ABC');
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('SAVED OFFLINE')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /View details/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /View details/ }));
    expect(navigate).toHaveBeenCalledWith('/reports/my-reports/report%2F1');
    expect(getPendingReports).toHaveBeenCalledWith('member-1');
  });

  it('sends each server status filter, keeps Pending local, and does not reload the already selected filter', async () => {
    fetchMock.mockResolvedValue(response({ reports: [] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    await screen.findByText('You have no reports yet.');
    fireEvent.click(screen.getByRole('button', { name: 'All Reports' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const [label, status, text] of [['Under Review', 'under_review', 'You have no reports under review.'], ['Approved', 'approved', 'You have no approved reports yet.'], ['Rejected', 'rejected', 'You have no rejected reports.']]) {
      fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
      await screen.findByText(text);
      expect(fetchMock.mock.lastCall[0]).toBe(`/api/reports/my-reports?status=${status}`);
      expect(screen.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed')).toBe('true');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Pending', exact: true }));
    await screen.findByText('No reports are waiting to be submitted.');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reports' }));
    await waitFor(() => expect(getPendingReports).toHaveBeenCalledTimes(3));
  });

  it('shows partial results and both storage/network failures, then recovers on retry', async () => {
    getPendingReports.mockRejectedValueOnce(new Error('storage private details')).mockResolvedValue([]);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(response({ reports: [report()] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Unable to read reports saved on this device.');
    expect(alert.textContent).toContain('Check your connection.');
    expect(alert.textContent).not.toContain('private details');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await screen.findByText('WG-20260101-ABC');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('retains local reports when the server denies access', async () => {
    getPendingReports.mockResolvedValue([pending()]);
    fetchMock.mockResolvedValue(response({}, 401));
    render(<MyReportsPage navigate={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Your session has expired.');
    expect(screen.getByRole('button', { name: 'Retry submit' })).toBeTruthy();
  });

  it('does not fetch submitted reports offline and reconnects when the browser goes online', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fetchMock.mockResolvedValue(response({ reports: [] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    await screen.findByText('Connect to view submitted reports, or select Pending.');
    expect(fetchMock).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    await screen.findByText('You have no reports yet.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response and aborts when a filter changes', async () => {
    const stale = deferred();
    fetchMock.mockReturnValueOnce(stale.promise).mockResolvedValue(response({ reports: [] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    const signal = fetchMock.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('button', { name: 'Approved', exact: true }));
    await screen.findByText('You have no approved reports yet.');
    await act(async () => stale.resolve(response({ reports: [report()] })));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByText('WG-20260101-ABC')).toBeNull();
  });

  it('renders manual, coordinate, missing location and invalid saved date fallbacks', async () => {
    fetchMock.mockResolvedValue(response({ reports: [report({ _id: 'one', location: { displayName: 'Kandy' } }), report({ _id: 'two', location: { coordinates: { latitude: 7, longitude: 80 } } }), report({ _id: 'three', location: null, createdAt: 'invalid', referenceNumber: null })] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    await screen.findByText('Kandy');
    expect(screen.getByText('7.00000, 80.00000')).toBeTruthy();
    expect(screen.getByText('Location not available')).toBeTruthy();
    expect(screen.getByText('Submitted date unavailable')).toBeTruthy();
  });
});

describe('offline retry safety', () => {
  it('locks an in-flight retry, removes the local copy only after success and reloads', async () => {
    const submit = deferred();
    getPendingReports.mockResolvedValueOnce([pending()]).mockResolvedValue([]);
    fetchMock.mockResolvedValueOnce(response({ reports: [] })).mockReturnValueOnce(submit.promise).mockResolvedValue(response({ reports: [report()] }));
    render(<MyReportsPage navigate={vi.fn()} />);
    const button = await screen.findByRole('button', { name: 'Retry submit' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Submitting…' }).disabled).toBe(true);
    expect(deletePendingReport).not.toHaveBeenCalled();
    submit.resolve(response({ report: { id: 'one', referenceNumber: 'WG-retry' }, duplicateRetry: true }));
    await screen.findByText('Report submitted successfully.');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/reports')).toHaveLength(1);
    expect(deletePendingReport).toHaveBeenCalledWith('member-1', 'retry-1');
  });

  it.each(['network', 'local-delete'])('keeps the local copy retryable after %s failure', async (failure) => {
    getPendingReports.mockResolvedValue([pending()]);
    fetchMock.mockResolvedValueOnce(response({ reports: [] }));
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    else {
      fetchMock.mockResolvedValueOnce(response({ report: { referenceNumber: 'WG-retry' } }, 201));
      deletePendingReport.mockRejectedValueOnce(new Error('disk failed'));
    }
    render(<MyReportsPage navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry submit' }));
    await screen.findByText(failure === 'network' ? /Unable to reach WildGuard/ : /local copy could not be removed/);
    expect(screen.getByRole('button', { name: 'Retry submit' }).disabled).toBe(false);
    if (failure === 'network') expect(deletePendingReport).not.toHaveBeenCalled();
  });

  it('refuses retry while still offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    getPendingReports.mockResolvedValue([pending()]);
    render(<MyReportsPage navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry submit' }));
    expect(screen.getByText('You’re still offline. Try again when connected.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Report Details', () => {
  it('shows loading then full successful report with status, actual dates, evidence empty state and back navigation', async () => {
    const request = deferred();
    fetchMock.mockReturnValue(request.promise);
    const navigate = vi.fn();
    render(<SubmittedReportDetailsPage reportId="report/1" navigate={navigate} />);
    expect(screen.getByRole('heading', { name: 'Loading report…' })).toBeTruthy();
    request.resolve(response({ report: report({ incidentDateTime: '2025-12-31T10:00:00Z', status: 'approved', location: { source: 'GPS', displayName: 'Kandy', coordinates: { latitude: 7, longitude: 80 } } }) }));
    await screen.findByRole('heading', { name: 'Wildlife Sighting' });
    expect(screen.getByText('Elephant seen beside the forest entrance.')).toBeTruthy();
    expect(screen.getByText('GPS')).toBeTruthy();
    expect(screen.getByLabelText('Read-only report location')).toBeTruthy();
    expect(document.querySelectorAll('time[datetime="2025-12-31T10:00:00Z"]')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Report progress' }).textContent).toContain('Approved');
    fireEvent.click(screen.getByRole('button', { name: 'Back to My Reports' }));
    expect(navigate).toHaveBeenCalledWith('/reports/my-reports');
  });

  it('supports legacy reports without description, reference, dates, location or evidence', async () => {
    fetchMock.mockResolvedValue(response({ report: report({ description: '', referenceNumber: '', createdAt: null, location: null, evidence: null, status: 'unknown' }) }));
    render(<SubmittedReportDetailsPage reportId="legacy" navigate={vi.fn()} />);
    await screen.findByText('Description not available.');
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(screen.getByText('Location not available')).toBeTruthy();
    expect(screen.getByText('Submission date unavailable')).toBeTruthy();
    expect(screen.queryByLabelText('Read-only report location')).toBeNull();
  });

  it.each([400, 401, 403, 404, 500])('renders a safe %s error and only appropriate recovery controls', async (status) => {
    fetchMock.mockResolvedValue(response({ error: { message: 'private provider data' } }, status));
    const navigate = vi.fn();
    render(<SubmittedReportDetailsPage reportId="bad" navigate={navigate} />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('private provider data');
    expect(within(alert).queryByRole('button', { name: 'Try again' }) !== null).toBe(status === 500);
    expect(within(alert).queryByRole('button', { name: 'Sign in again' }) !== null).toBe(status === 401);
    expect(within(alert).getByRole('heading').textContent).toBe([400, 404].includes(status) ? 'Report not found' : 'Unable to load report');
    fireEvent.click(within(alert).getByRole('button', { name: 'Back to My Reports' }));
    expect(navigate).toHaveBeenCalledWith('/reports/my-reports');
  });

  it('recovers from network failure on retry and renders rejected progress without invented review dates', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network')).mockResolvedValue(response({ report: report({ status: 'rejected', location: { source: 'MAP', manualLocation: 'Yala' } }) }));
    render(<SubmittedReportDetailsPage reportId="one" navigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Yala');
    expect(within(screen.getByRole('region', { name: 'Location' })).getByText('Map')).toBeTruthy();
    const timeline = screen.getByRole('list', { name: 'Report progress' });
    expect(timeline.querySelector('[aria-current="step"]').textContent).toContain('Rejected');
    expect(timeline.querySelectorAll('time')).toHaveLength(1);
  });
});

describe('dashboard and shared member navigation', () => {
  it('shows loading, honest zero counts, and begins a clean draft from the empty state', async () => {
    const request = deferred();
    fetchMock.mockReturnValue(request.promise);
    const navigate = vi.fn();
    session.user.fullName = '   ';
    render(<MemberLandingPage navigate={navigate} />);
    expect(screen.getByRole('heading', { name: 'Welcome back, there.' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Loading recent reports' })).toBeTruthy();
    request.resolve(response({ reports: [] }));
    await screen.findByText('You have not submitted any reports yet.');
    expect(document.querySelectorAll('.dashboard-summary-card__value')).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit a Community Report' })[1]);
    expect(session.resetDraft).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/reports/type');
  });

  it('shows unavailable counts on failure and reloads on retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network')).mockResolvedValue(response({ reports: [] }));
    render(<MemberLandingPage navigate={vi.fn()} />);
    await screen.findByRole('alert');
    expect(screen.getAllByLabelText('Unavailable')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('You have not submitted any reports yet.');
  });

  it('counts all server statuses, sorts recent rows, and links rows and View all to the real routes', async () => {
    fetchMock.mockResolvedValue(response({ reports: [report({ _id: 'old', status: 'approved' }), report({ _id: 'new', reportType: 'HUMAN_WILDLIFE_CONFLICT', createdAt: '2026-02-02T10:00:00Z', location: { coordinates: { latitude: 7, longitude: 80 } } }), report({ _id: 'second', reportType: 'SUSPICIOUS_ACTIVITY', status: 'rejected', createdAt: '2026-02-01T10:00:00Z', location: null })] }));
    const navigate = vi.fn();
    render(<MemberLandingPage navigate={navigate} />);
    const rows = await screen.findAllByRole('button', { name: /View details for/ });
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Human–Wildlife Conflict');
    expect(screen.getByText('7.00000, 80.00000')).toBeTruthy();
    expect(screen.getByText('Location not available')).toBeTruthy();
    expect([...document.querySelectorAll('.dashboard-summary-card__value')].map((element) => element.textContent)).toEqual(['3', '1', '1']);
    fireEvent.click(rows[0]);
    expect(navigate).toHaveBeenCalledWith('/reports/my-reports/new');
    fireEvent.click(screen.getByRole('button', { name: 'View all reports' }));
    expect(navigate).toHaveBeenCalledWith('/reports/my-reports');
  });

  it.each([
    [null, 'Submitted date unavailable'], [0, 'Submitted just now'], [60000, 'Submitted 1 minute ago'], [120000, 'Submitted 2 minutes ago'],
    [3600000, 'Submitted 1 hour ago'], [7200000, 'Submitted 2 hours ago'], [86400000, 'Submitted 1 day ago'], [172800000, 'Submitted 2 days ago'],
    [864000000, 'Submitted '], [-86400000, 'Submitted '],
  ])('formats a report age of %s milliseconds for the recent-report metadata', async (elapsed, text) => {
    const now = Date.parse('2026-06-01T10:00:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    fetchMock.mockResolvedValue(response({ reports: [report({ createdAt: elapsed === null ? 'invalid' : new Date(now - elapsed).toISOString(), location: { displayName: 'Kandy' } })] }));
    render(<MemberLandingPage navigate={vi.fn()} />);
    const row = await screen.findByRole('button', { name: /View details for/ });
    expect(row.textContent).toContain(text);
    expect(row.textContent).toContain('Kandy');
  });

  it('opens/closes mobile navigation, resets draft only for Submit Report, and handles failed then successful logout', async () => {
    const navigate = vi.fn();
    session.logout.mockRejectedValueOnce(new Error('Unable to log out.')).mockResolvedValue(undefined);
    const { unmount } = render(<CommunityLayout navigate={navigate}><p>Member content</p></CommunityLayout>);
    expect(document.body.classList.contains('community-page-active')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(document.querySelector('.community-sidebar').classList.contains('is-open')).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Close navigation' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close navigation' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(session.resetDraft).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/member');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByText('Unable to log out.');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'));
    unmount();
    expect(document.body.classList.contains('community-page-active')).toBe(false);
  });
});
