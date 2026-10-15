import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import ReportTypePage from '../../src/features/community-reports/pages/ReportTypePage.jsx';
import ReportDetailsPage from '../../src/features/community-reports/pages/ReportDetailsPage.jsx';
import ReportEvidencePage from '../../src/features/community-reports/pages/ReportEvidencePage.jsx';
import ReviewReportPage from '../../src/features/community-reports/pages/ReviewReportPage.jsx';
import ReportConfirmationPage from '../../src/features/community-reports/pages/ReportConfirmationPage.jsx';
import { ReportDraftContext } from '../../src/features/community-reports/context/report-draft-context.js';
import { ReportNetworkError, submitReport } from '../../src/features/community-reports/services/report.service.js';
import { savePendingReport } from '../../src/features/community-reports/services/pending-reports.indexeddb.js';
import { reverseGeocode, searchLocations } from '../../src/features/community-reports/services/locationApi.js';

const mocks = vi.hoisted(() => ({ requestLocation: vi.fn(), auth: { user: { id: 'member-1', fullName: 'Test Member' }, logout: vi.fn() } }));
vi.mock('../../src/context/useAuth.js', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../src/features/community-reports/hooks/useCurrentLocation.js', () => ({ useCurrentLocation: () => ({ requestCurrentLocation: mocks.requestLocation, isLocating: false, locationError: '' }) }));
vi.mock('../../src/features/community-reports/components/LocationMap.jsx', () => ({ default: ({ onMapSelect, onMarkerDrag }) => <div><button type="button" onClick={() => onMapSelect({ latitude: 7, longitude: 80 })}>Choose map point</button><button type="button" onClick={() => onMarkerDrag({ latitude: 8, longitude: 81 })}>Move marker</button></div> }));
vi.mock('../../src/features/community-reports/services/locationApi.js', () => ({ reverseGeocode: vi.fn(), searchLocations: vi.fn() }));
vi.mock('../../src/features/community-reports/services/pending-reports.indexeddb.js', () => ({ savePendingReport: vi.fn() }));
vi.mock('../../src/features/community-reports/services/report.service.js', async (original) => ({ ...await original(), submitReport: vi.fn() }));

function validDraft(changes = {}) {
  return { draftId: 'draft-1', reportType: 'WILDLIFE_SIGHTING', description: 'An elephant was seen crossing the village road.', incidentDateTime: '2025-01-02T10:30', location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Village road', manualLocation: '' }, evidence: [], evidenceRestoreRequired: false, wasRestored: false, ...changes };
}
function submitButton() { return screen.getAllByRole('button', { name: 'Submit Report', exact: true }).find((button) => button.type === 'submit'); }
function setup(Page, changes = {}, context = {}) {
  const navigate = vi.fn();
  const clearDraft = vi.fn(); const setSubmittedReport = vi.fn(); const resetDraft = vi.fn();
  function Wrapper() {
    const [draft, setDraft] = useState(validDraft(changes));
    const value = { draft, updateDraft: (update) => setDraft((current) => ({ ...current, ...update })), updateLocation: (update) => setDraft((current) => { const next = typeof update === 'function' ? update(current.location) : update; return next ? { ...current, location: { ...current.location, ...next } } : current; }), setEvidence: (evidence) => setDraft((current) => ({ ...current, evidence })), continueWithoutEvidence: () => setDraft((current) => ({ ...current, evidence: [], evidenceRestoreRequired: false })), evidenceHydrationStatus: 'ready', evidenceRestoreError: '', clearDraft, setSubmittedReport, resetDraft, ...context };
    return <ReportDraftContext.Provider value={value}><Page navigate={navigate} /></ReportDraftContext.Provider>;
  }
  const view = render(<Wrapper />);
  return { ...view, navigate, clearDraft, setSubmittedReport, resetDraft };
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  URL.createObjectURL = vi.fn(() => 'blob:test-evidence'); URL.revokeObjectURL = vi.fn();
  reverseGeocode.mockResolvedValue({ displayName: 'Resolved park' });
});

describe('community report creation pages', () => {
  it('requires a report type, clears the validation message after selection, and navigates or cancels', () => {
    const { navigate } = setup(ReportTypePage, { reportType: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
    expect(screen.getByText('Choose a report type to continue.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select Wildlife Sighting' }));
    expect(screen.queryByText('Choose a report type to continue.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Select Wildlife Sighting' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getAllByRole('button', { name: 'Select', exact: true })[1]);
    expect(screen.getByRole('button', { name: 'Select Human–Wildlife Conflict' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
    expect(navigate).toHaveBeenCalledWith('/reports/details');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(navigate).toHaveBeenCalledWith('/member');
  });

  it('shows validation and restores an invalid date, then accepts valid incident details', () => {
    const { navigate } = setup(ReportDetailsPage, { description: '', incidentDateTime: '', wasRestored: true, location: { source: null, coordinates: null, displayName: '', manualLocation: '' } });
    expect(screen.getByText('Your saved report details were restored.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
    expect(screen.getByText('Description must be between 10 and 2,000 characters.')).toBeTruthy();
    expect(screen.getByText('Choose a location on the map, search for one, or use your current location.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Describe what you observed'), { target: { value: 'A deer was trapped beside the road.' } });
    fireEvent.change(screen.getByLabelText('Incident Date & Time'), { target: { value: '2025-01-02T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    expect(navigate).toHaveBeenCalledWith('/reports/type');
  });

  it('resolves map and GPS coordinates, keeps selected coordinates after address errors, and continues', async () => {
    const { navigate } = setup(ReportDetailsPage);
    reverseGeocode.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole('button', { name: 'Choose map point' }));
    expect(await screen.findByText('Coordinates were selected, but no readable address was found.')).toBeTruthy();
    expect(screen.getByText('7.00000, 80.00000')).toBeTruthy();
    reverseGeocode.mockRejectedValueOnce(new Error('Lookup unavailable.'));
    fireEvent.click(screen.getByRole('button', { name: 'Move marker' }));
    expect(await screen.findByText('Lookup unavailable. Your selected coordinates will be kept.')).toBeTruthy();
    mocks.requestLocation.mockResolvedValueOnce({ latitude: 6, longitude: 79 });
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
    expect(await screen.findByText('Resolved park')).toBeTruthy();
    expect(screen.getByText('Current GPS Location')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
    expect(navigate).toHaveBeenCalledWith('/reports/evidence');
    expect(reverseGeocode).toHaveBeenLastCalledWith({ latitude: 6, longitude: 79 });
  });

  it('a manual search supersedes a slow address lookup so stale coordinates cannot overwrite the chosen place', async () => {
    let resolveLookup;
    reverseGeocode.mockImplementationOnce(() => new Promise((resolve) => { resolveLookup = resolve; }));
    searchLocations.mockResolvedValue([{ placeId: 'park-1', displayName: 'Chosen park', coordinates: { latitude: 9, longitude: 82 } }]);
    setup(ReportDetailsPage);
    fireEvent.click(screen.getByRole('button', { name: 'Choose map point' }));
    expect(screen.getByRole('button', { name: 'Confirming location…' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Village, road, landmark, or park area'), { target: { value: 'Park road' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chosen park' }));
    await act(async () => resolveLookup({ displayName: 'Stale park' }));
    expect(screen.getByText('Chosen park')).toBeTruthy();
    expect(screen.queryByText('Stale park')).toBeNull();
    expect(screen.getByText('Entered Manually')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Move marker' }));
    expect(await screen.findByText('Resolved park')).toBeTruthy();
    expect(screen.getByText('Entered Manually')).toBeTruthy();
  });

  it('reports GPS failure without discarding the already selected map location', async () => {
    mocks.requestLocation.mockRejectedValueOnce(new Error('No GPS'));
    setup(ReportDetailsPage);
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
    expect(await screen.findByText('Unable to get your current location. Select a point on the map or search manually.')).toBeTruthy();
    expect(screen.getByText('Village road')).toBeTruthy();
    mocks.requestLocation.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
    await waitFor(() => expect(mocks.requestLocation).toHaveBeenCalledTimes(2));
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('ignores a delayed GPS failure after leaving the details step', async () => {
    let rejectLocation;
    mocks.requestLocation.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectLocation = reject; }));
    const { unmount } = setup(ReportDetailsPage);
    fireEvent.click(screen.getByRole('button', { name: /Use My Current Location/ }));
    unmount(); rejectLocation(new Error('Late GPS failure'));
    await Promise.resolve();
    expect(screen.queryByText(/Unable to get your current location/)).toBeNull(); expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('evidence restoration is visible, files can be attached, and skip removes restored evidence', () => {
    const { container, navigate } = setup(ReportEvidencePage, { wasRestored: true, evidenceRestoreRequired: true }, { evidenceHydrationStatus: 'loading', evidenceRestoreError: 'Recovery failed' });
    expect(screen.getByText('Restoring attached evidence…')).toBeTruthy();
    expect(screen.getByText('Recovery failed')).toBeTruthy();
    expect(screen.getByText(/Please select your evidence files again/)).toBeTruthy();
    const file = new File(['image'], 'deer.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [file] } });
    expect(screen.getByRole('img', { name: 'Preview of deer.png' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without evidence', exact: true }));
    expect(screen.getByText('Selected files (0 of 3)')).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith('/reports/review');
    expect(screen.getByRole('button', { name: 'Continue to Review' }).disabled).toBe(true);
  });

  it.each([['Back', '/reports/details'], ['Continue to Review', '/reports/review'], ['Skip for now', '/reports/review']])('evidence %s follows the selected navigation action', (label, path) => {
    const { navigate } = setup(ReportEvidencePage);
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    expect(navigate).toHaveBeenCalledWith(path);
  });

  it('requires accuracy confirmation and submits once, preserving the submission identity and server reference', async () => {
    let resolveSubmit; submitReport.mockImplementationOnce(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    const { container, navigate, clearDraft, setSubmittedReport } = setup(ReviewReportPage, { clientSubmissionId: 'retry-id' });
    expect(submitButton().disabled).toBe(true);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/Please confirm that the information/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    fireEvent.submit(container.querySelector('form')); fireEvent.submit(container.querySelector('form'));
    expect(submitReport).toHaveBeenCalledTimes(1);
    expect(submitReport.mock.calls[0][0].clientSubmissionId).toBe('retry-id');
    expect(screen.getByText('Submitting report…')).toBeTruthy();
    resolveSubmit({ _id: 'report-1', referenceNumber: 'WG-2025-001' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/reports/confirmation'));
    expect(setSubmittedReport).toHaveBeenCalledWith({ _id: 'report-1', referenceNumber: 'WG-2025-001' });
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(savePendingReport).not.toHaveBeenCalled();
  });

  it('keeps the draft on server validation errors and offers editable report summaries', async () => {
    submitReport.mockRejectedValueOnce(new Error('Description was rejected by the server.'));
    const file = new File(['image'], 'deer.png', { type: 'image/png' });
    const { navigate, clearDraft } = setup(ReviewReportPage, { evidence: [file], location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: '', manualLocation: '' } });
    expect(screen.getByText('7.00000, 80.00000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove deer.png' }));
    expect(screen.getByText('No evidence attached (optional)')).toBeTruthy();
    for (const label of ['Edit report type', 'Edit incident date and time', 'Edit location', 'Edit description', 'Edit evidence']) fireEvent.click(screen.getByRole('button', { name: label }));
    expect(navigate).toHaveBeenCalledWith('/reports/type'); expect(navigate).toHaveBeenCalledWith('/reports/details'); expect(navigate).toHaveBeenCalledWith('/reports/evidence');
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    fireEvent.click(submitButton());
    expect(await screen.findByText('Description was rejected by the server.')).toBeTruthy();
    expect(clearDraft).not.toHaveBeenCalled(); expect(savePendingReport).not.toHaveBeenCalled();
    expect(submitButton().disabled).toBe(false);
  });

  it.each([true, false])('queues recoverable connection failures locally (online=%s)', async (online) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
    submitReport.mockRejectedValueOnce(new ReportNetworkError()); savePendingReport.mockResolvedValueOnce(undefined);
    const { navigate, clearDraft } = setup(ReviewReportPage);
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    fireEvent.click(submitButton());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/reports/my-reports', { message: 'Report saved on this device. It will be ready to send when you reconnect.' }));
    expect(savePendingReport).toHaveBeenCalledWith('member-1', expect.objectContaining({ clientSubmissionId: expect.any(String), reportType: 'WILDLIFE_SIGHTING' }));
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(submitReport).toHaveBeenCalledTimes(online ? 1 : 0);
  });

  it('does not lose the draft when offline persistence fails', async () => {
    submitReport.mockRejectedValueOnce(new ReportNetworkError()); savePendingReport.mockRejectedValueOnce(new Error('Quota exceeded'));
    const { clearDraft, navigate } = setup(ReviewReportPage);
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    fireEvent.click(submitButton());
    expect(await screen.findByText('Your report could not be saved on this device. Keep this page open and try again when connected.')).toBeTruthy();
    expect(clearDraft).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    [{ description: '' }, {}, 'Please check your report details and evidence before submitting.'],
    [{ evidenceRestoreRequired: true }, { evidenceHydrationStatus: 'loading' }, 'Please wait for attached evidence to finish restoring.'],
    [{ evidenceRestoreRequired: true }, { evidenceHydrationStatus: 'failed' }, 'Please select your evidence again or continue without evidence.'],
  ])('blocks invalid or unrecovered drafts even on a direct submit event', (changes, context, message) => {
    const { container } = setup(ReviewReportPage, changes, context);
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(message)).toBeTruthy(); expect(submitReport).not.toHaveBeenCalled();
  });

  it('makes absent date and location visible instead of implying a complete report', () => {
    setup(ReviewReportPage, { incidentDateTime: '', location: { source: null, coordinates: null, displayName: '', manualLocation: '' } });
    expect(screen.getByText('Incident date and time is required.')).toBeTruthy(); expect(screen.getByText('Location not available')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('I confirm that the information provided is accurate and complete.'));
    expect(submitButton().disabled).toBe(true);
  });

  it('confirmation requires a real result and offers reset/navigation actions', () => {
    const view = setup(ReportConfirmationPage);
    expect(view.navigate).toHaveBeenCalledWith('/reports/type', { replace: true });
    view.unmount();
    const next = setup(ReportConfirmationPage, {}, { submittedReport: { referenceNumber: 'WG-001' } });
    expect(screen.getByText('WG-001')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit another report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(next.resetDraft).toHaveBeenCalledTimes(2);
    expect(next.navigate).toHaveBeenCalledWith('/reports/type'); expect(next.navigate).toHaveBeenCalledWith('/member');
  });
});
