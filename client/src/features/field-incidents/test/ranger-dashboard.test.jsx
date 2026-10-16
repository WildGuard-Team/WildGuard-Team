import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FieldIncidentDraftProvider } from '../context/FieldIncidentDraftContext.jsx';
import { useFieldIncidentDraft } from '../context/useFieldIncidentDraft.js';
import FieldIncidentDetailsForm from '../components/FieldIncidentDetailsForm.jsx';
import RangerDashboardPage from '../pages/RangerDashboardPage.jsx';
import { fieldIncidentTypes } from '../utils/field-incident-options.js';
import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';

const mocks = vi.hoisted(() => ({ history: {}, retry: vi.fn(), useHistory: vi.fn() }));
vi.mock('../../../context/useAuth.js', () => ({
  useAuth: () => ({ user: { id: 'ranger-a', fullName: 'Nimal Perera' } }),
}));
vi.mock('../hooks/useFieldIncidentHistory.js', () => ({ default: mocks.useHistory }));
vi.mock('../components/RangerLayout.jsx', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

function DraftProbe() {
  const { draft, submittedIncident, setEvidence, setSubmittedIncident, updateDraft } = useFieldIncidentDraft();
  return <>
    <button type="button" onClick={() => {
      setEvidence([new File(['old photo'], 'old-evidence.jpg', { type: 'image/jpeg' })]);
      setSubmittedIncident({ referenceNumber: 'FI-OLD', clientIncidentId: 'stale-incident' });
    }}>Load stale evidence and confirmation</button>
    <output data-testid="draft-state">{JSON.stringify({ draft, submittedIncident })}</output>
    <section aria-label="Details form preview">
      <FieldIncidentDetailsForm draft={draft} errors={{}}
        onChange={(event) => updateDraft({ [event.target.name]: event.target.value })} />
    </section>
  </>;
}

function renderDashboard() {
  const navigate = vi.fn();
  const result = render(<FieldIncidentDraftProvider>
    <RangerDashboardPage navigate={navigate} />
    <DraftProbe />
  </FieldIncidentDraftProvider>);
  return { ...result, navigate };
}

function currentDraftState() {
  return JSON.parse(screen.getByTestId('draft-state').textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.history = { incidents: [], isLoading: false, serverError: '', offlineWarning: '', retry: mocks.retry };
  mocks.useHistory.mockImplementation(() => mocks.history);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('ranger dashboard reporting shortcuts', () => {
  it.each(fieldIncidentTypes)('$title opens details with a new incident and no stale draft fields', (type) => {
    sessionStorage.setItem('wildguard.fieldIncidentDraft.v1', JSON.stringify({
      clientIncidentId: 'stale-incident', incidentType: 'OTHER', incidentDate: '2020-01-01', incidentTime: '01:02',
      riskLevel: 'HIGH', parkZone: 'Old park', blockArea: 'Old block', description: 'Previous description',
      additionalNotes: 'Previous notes',
      location: { source: 'GPS', coordinates: { latitude: 6.3, longitude: 81.4 }, manualCoordinates: '6.3, 81.4', description: 'Old position' },
    }));
    const { navigate } = renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Load stale evidence and confirmation' }));
    expect(currentDraftState().draft.evidence).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: (name) => name.toLowerCase().includes(type.title.toLowerCase()) }));

    expect(navigate).toHaveBeenCalledWith('/ranger/incidents/details');
    const { draft, submittedIncident } = currentDraftState();
    expect(draft.clientIncidentId).toBeTruthy();
    expect(draft.clientIncidentId).not.toBe('stale-incident');
    expect(draft).toMatchObject({
      incidentType: type.value, riskLevel: '', parkZone: '', blockArea: '', description: '', additionalNotes: '', evidence: [],
      location: { source: null, coordinates: null, manualCoordinates: '', description: '' },
    });
    expect(draft.incidentDate).not.toBe('2020-01-01');
    expect(submittedIncident).toBeNull();
    expect(screen.getByLabelText('Incident type').value).toBe(type.title);
    expect(screen.getByLabelText('Park / Zone').value).toBe('');
    expect(screen.getByLabelText('Incident description').value).toBe('');
    expect(mocks.useHistory).toHaveBeenCalledWith('ranger-a');
    const savedDraft = JSON.parse(sessionStorage.getItem('wildguard.fieldIncidentDraft.v1'));
    expect(savedDraft.clientIncidentId).toBe(draft.clientIncidentId);
    expect(savedDraft.incidentType).toBe(type.value);
    expect(savedDraft.location.coordinates).toBeNull();
  });

  it('keeps normal report entry and view-all navigation without clearing an existing draft', () => {
    sessionStorage.setItem('wildguard.fieldIncidentDraft.v1', JSON.stringify({
      clientIncidentId: 'in-progress', incidentType: 'POACHING', description: 'Continue this report',
    }));
    const { navigate } = renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Report Field Incident/i }));
    expect(navigate).toHaveBeenLastCalledWith('/ranger/incidents/new');
    fireEvent.click(screen.getByRole('button', { name: /View all incident types/i }));
    expect(navigate).toHaveBeenLastCalledWith('/ranger/incidents/new');
    expect(currentDraftState().draft).toMatchObject({
      clientIncidentId: 'in-progress', incidentType: 'POACHING', description: 'Continue this report',
    });
  });

  it('keeps a quick report accessible and usable when its photograph fails to load', () => {
    const { navigate } = renderDashboard();
    const card = screen.getByRole('button', { name: 'Report Wildlife Sighting' });
    const photo = within(card).getByRole('img');
    const description = photo.alt;
    expect(photo.getAttribute('loading')).toBe('lazy');
    fireEvent.error(photo);
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByRole('img', { name: `${description}: photo unavailable` })).toBeTruthy();
    expect(within(card).getByText('Photo unavailable')).toBeTruthy();
    expect(within(card).getByText('Wildlife Sighting')).toBeTruthy();
    fireEvent.click(card);
    expect(navigate).toHaveBeenLastCalledWith('/ranger/incidents/details');
    expect(screen.getByLabelText('Incident type').value).toBe('Wildlife Sighting');
  });

  it('shows a descriptive, lazy-loaded photograph for every incident category', () => {
    renderDashboard();
    for (const type of fieldIncidentTypes) {
      const card = screen.getByRole('button', { name: `Report ${type.title}` });
      const photo = within(card).getByRole('img');
      expect(photo.tagName).toBe('IMG');
      expect(photo.getAttribute('src')?.trim()).toBeTruthy();
      expect(photo.getAttribute('alt')?.trim().length).toBeGreaterThan(10);
      expect(photo.getAttribute('alt')).not.toMatch(/unavailable|placeholder/i);
      expect(photo.getAttribute('loading')).toBe('lazy');
      expect(within(card).queryByText('Photo unavailable')).toBeNull();
    }
  });
});

describe('ranger dashboard incident counts', () => {
  it('shows the ranger history totals and opens My Incidents from each stat', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    mocks.history.incidents = [
      { id: 'today', status: FIELD_INCIDENT_SUBMITTED, createdAt: now.toISOString() },
      { id: 'old', status: FIELD_INCIDENT_SUBMITTED, createdAt: yesterday.toISOString() },
      { id: 'pending', status: FIELD_INCIDENT_PENDING_SYNC, createdAt: now.toISOString() },
    ];
    const { navigate } = renderDashboard();
    for (const label of ['Total My Incidents: 3', 'Submitted Today: 1', 'Pending Sync: 1']) {
      fireEvent.click(screen.getByRole('button', { name: `${label}. View My Incidents` }));
      expect(navigate).toHaveBeenLastCalledWith('/ranger/incidents');
    }
    expect(navigate).toHaveBeenCalledTimes(3);
  });

  it('shows loading states instead of misleading zero counts', () => {
    mocks.history.isLoading = true;
    renderDashboard();
    const summary = screen.getByRole('region', { name: 'Your incident summary' });
    expect(within(summary).getByRole('status').textContent).toBe('Loading incident counts…');
    for (const label of ['Total My Incidents', 'Submitted Today', 'Pending Sync']) {
      expect(screen.getByRole('button', { name: `${label}: loading. View My Incidents` }).textContent).toContain('—');
    }
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a loaded empty history as zero', () => {
    renderDashboard();
    for (const label of ['Total My Incidents', 'Submitted Today', 'Pending Sync']) {
      expect(screen.getByRole('button', { name: `${label}: 0. View My Incidents` })).toBeTruthy();
    }
    expect(within(screen.getByRole('region', { name: 'Your incident summary' })).queryByRole('status')).toBeNull();
  });

  it.each([
    { source: 'server', error: { serverError: 'Unable to reach the incident service.' },
      unavailable: ['Total My Incidents', 'Submitted Today'], available: 'Pending Sync' },
    { source: 'offline storage', error: { offlineWarning: 'Offline incidents could not be loaded.' },
      unavailable: ['Total My Incidents', 'Pending Sync'], available: 'Submitted Today' },
  ])('keeps valid $source partial counts and exposes a retry action', ({ error, unavailable, available }) => {
    Object.assign(mocks.history, error);
    renderDashboard();
    expect(screen.getByRole('alert').textContent).toContain('Some incident counts are unavailable.');
    expect(screen.getByRole('alert').textContent).toContain(Object.values(error)[0]);
    for (const label of unavailable) {
      expect(screen.getByRole('button', { name: `${label}: unavailable. View My Incidents` }).textContent).toContain('Temporarily unavailable');
    }
    expect(screen.getByRole('button', { name: `${available}: 0. View My Incidents` })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.retry).toHaveBeenCalledTimes(1);
  });
});
