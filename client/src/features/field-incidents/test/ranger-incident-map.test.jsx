import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RangerIncidentMapPage from '../pages/RangerIncidentMapPage.jsx';
import RangerIncidentMap from '../components/RangerIncidentMap.jsx';
import useRangerMapLocation from '../hooks/useRangerMapLocation.js';
import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { FIELD_INCIDENT_SYNC_EVENT } from '../services/field-incident-sync.service.js';

const mocks = vi.hoisted(() => ({
  getMyIncidents: vi.fn(), getPendingIncidents: vi.fn(), submit: vi.fn(), savePending: vi.fn(),
  deletePending: vi.fn(), markAttempt: vi.fn(), clearPending: vi.fn(),
  user: { id: 'ranger-a', fullName: 'Nimal Perera' },
  container: null, containerSize: { width: 1200, height: 600 }, tileEvents: {}, mapEvents: null, details: null,
  map: {
    setView: vi.fn(), fitBounds: vi.fn(), invalidateSize: vi.fn(), getZoom: vi.fn(() => 7),
    getContainer: vi.fn(() => document.createElement('div')), on: vi.fn(), off: vi.fn(),
  },
}));

vi.mock('../../../context/useAuth.js', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../components/RangerLayout.jsx', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../services/field-incident.service.js', async (importOriginal) => ({
  ...await importOriginal(), getMyFieldIncidents: mocks.getMyIncidents, submitFieldIncident: mocks.submit,
}));
vi.mock('../services/field-incident-offline-db.js', async (importOriginal) => ({
  ...await importOriginal(), getPendingFieldIncidents: mocks.getPendingIncidents,
  savePendingFieldIncident: mocks.savePending, deletePendingFieldIncident: mocks.deletePending,
  markPendingFieldIncidentAttempt: mocks.markAttempt, clearPendingFieldIncidentsForOwner: mocks.clearPending,
}));
vi.mock('../components/FieldIncidentDetailsModal.jsx', () => ({
  default: ({ incident, onClose }) => {
    mocks.details = incident;
    return <section role="dialog" aria-label="Shared incident details">
      <p>{incident.description}</p><p>{incident.status}</p>
      <button type="button" onClick={onClose}>Close incident details</button>
    </section>;
  },
}));
vi.mock('leaflet', () => ({ default: {
  divIcon: (options) => ({ ...options, options }), icon: (options) => ({ ...options, options }),
  latLngBounds: (positions) => positions,
} }));
vi.mock('react-leaflet', async () => {
  const { useState } = await import('react');
  function TestMarker({ position, icon, draggable, children, eventHandlers, title, alt }) {
    const [open, setOpen] = useState(false);
    // Leaflet consumes these options when creating a marker; React Leaflet does not update them.
    const [initialTitle] = useState(title);
    const [initialAlt] = useState(alt);
    return <div data-testid="incident-map-marker" data-position={JSON.stringify(position)}
      data-title={initialTitle} data-alt={initialAlt}
      data-icon={JSON.stringify(icon?.options ?? icon ?? {})} data-draggable={String(Boolean(draggable))}>
      <button type="button" aria-label={initialAlt || initialTitle || `Open marker at ${position.join(', ')}`} title={initialTitle}
        onClick={() => { setOpen(true); eventHandlers?.click?.(); }}>Open marker</button>
      {open && children}
    </div>;
  }
  return {
    MapContainer: (props) => { mocks.container = props; return <div data-testid="leaflet-map">{props.children}</div>; },
    Marker: TestMarker,
    CircleMarker: ({ center, children }) => <TestMarker position={center} icon={{ className: 'current-location' }}>{children}</TestMarker>,
    Popup: ({ children }) => <section data-testid="incident-popup">{children}</section>,
    Tooltip: ({ children }) => <span>{children}</span>,
    TileLayer: ({ eventHandlers }) => { mocks.tileEvents = eventHandlers ?? {}; return <div data-testid="map-tiles" />; },
    ZoomControl: () => null,
    useMap: () => mocks.map,
    useMapEvents: (events) => { mocks.mapEvents = events; return mocks.map; },
  };
});

function submittedIncident(overrides = {}) {
  return {
    id: 'server-1', clientIncidentId: 'client-submitted', referenceNumber: 'FI-20261016-ABC123',
    incidentType: 'POACHING', riskLevel: 'HIGH', status: FIELD_INCIDENT_SUBMITTED,
    incidentDateTime: '2026-10-16T06:30:00Z', createdAt: '2026-10-16T07:00:00Z',
    parkZone: 'Yala National Park', blockArea: 'Block 1', description: 'Snare found near the patrol road.',
    additionalNotes: '', evidence: [],
    location: { source: 'GPS', coordinates: { latitude: 6.3725, longitude: 81.5169 }, description: 'Beside the road' },
    ...overrides,
  };
}

function pendingIncident(overrides = {}) {
  return {
    ownerId: 'ranger-a', clientIncidentId: 'client-pending', status: FIELD_INCIDENT_PENDING_SYNC,
    createdAt: '2026-10-16T08:00:00Z',
    draft: {
      incidentType: 'WILDLIFE_SIGHTING', riskLevel: 'LOW', incidentDate: '2026-10-16', incidentTime: '13:30',
      parkZone: 'Wilpattu National Park', blockArea: 'North sector', description: 'Deer sighting on patrol.',
      location: { source: 'GPS', coordinates: { latitude: 8.45, longitude: 80.02 }, description: 'Near the forest track' },
      evidence: [],
    },
    ...overrides,
  };
}

function markers() { return screen.queryAllByTestId('incident-map-marker'); }
function markerAt(position) {
  return markers().find((marker) => marker.getAttribute('data-position') === JSON.stringify(position));
}
function openMarker(position) {
  const marker = markerAt(position);
  expect(marker).toBeTruthy();
  const label = marker.getAttribute('data-alt') || marker.getAttribute('data-title') || `Open marker at ${position.join(', ')}`;
  fireEvent.click(within(marker).getByRole('button', { name: label }));
  return marker;
}
function renderMap(incidents, overrides = {}) {
  return render(<RangerIncidentMap incidents={incidents} onViewIncident={vi.fn()} onReport={vi.fn()}
    isLoading={false} hasLoadError={false} hasActiveFilters={false} {...overrides} />);
}
function setGeolocation(value) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value });
}
function expectNoLocationWrites() {
  for (const write of [mocks.submit, mocks.savePending, mocks.deletePending, mocks.markAttempt, mocks.clearPending]) {
    expect(write).not.toHaveBeenCalled();
  }
  expect(globalThis.fetch).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'ranger-a', fullName: 'Nimal Perera' };
  mocks.container = null; mocks.tileEvents = {}; mocks.mapEvents = null; mocks.details = null;
  mocks.containerSize = { width: 1200, height: 600 };
  mocks.map.getZoom.mockReturnValue(7);
  mocks.map.getContainer.mockImplementation(() => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      clientWidth: { get: () => mocks.containerSize.width },
      clientHeight: { get: () => mocks.containerSize.height },
    });
    return container;
  });
  mocks.getMyIncidents.mockResolvedValue([]);
  mocks.getPendingIncidents.mockResolvedValue([]);
  setGeolocation(undefined);
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback) => { callback(); return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('incident map page with the existing ranger history hook', () => {
  it('combines authenticated history and only the current ranger queue, deduplicating submitted records', async () => {
    mocks.getMyIncidents.mockResolvedValue([
      submittedIncident(), submittedIncident({ id: 'no-gps', clientIncidentId: 'no-gps', location: { coordinates: null } }),
    ]);
    mocks.getPendingIncidents.mockResolvedValue([
      pendingIncident(), pendingIncident({ clientIncidentId: 'client-submitted' }),
      pendingIncident({ ownerId: 'ranger-b', clientIncidentId: 'foreign' }),
    ]);
    render(<RangerIncidentMapPage navigate={vi.fn()} />);
    await waitFor(() => expect(markers()).toHaveLength(2));
    expect(mocks.getMyIncidents).toHaveBeenCalledWith();
    expect(mocks.getPendingIncidents).toHaveBeenCalledWith('ranger-a');
    expect(screen.getByLabelText('Mapped Incidents: 2')).toBeTruthy();
    expect(screen.getByLabelText('High Risk: 1')).toBeTruthy();
    expect(screen.getByLabelText('Pending Sync: 1')).toBeTruthy();
    expect(screen.getByText(/1 incident does not contain valid GPS coordinates/)).toBeTruthy();
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    expect(markerAt([8.45, 80.02])).toBeTruthy();
  });

  it('updates visible markers immediately for combined type, risk, status and search filters', async () => {
    mocks.getMyIncidents.mockResolvedValue([submittedIncident()]);
    mocks.getPendingIncidents.mockResolvedValue([pendingIncident()]);
    render(<RangerIncidentMapPage navigate={vi.fn()} />);
    await waitFor(() => expect(markers()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText('Incident Type'), { target: { value: 'POACHING' } });
    expect(markers()).toHaveLength(1);
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Risk Level'), { target: { value: 'HIGH' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: FIELD_INCIDENT_PENDING_SYNC } });
    expect(markers()).toHaveLength(0);
    expect(screen.getByText('No incidents match these filters.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(markers()).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: FIELD_INCIDENT_PENDING_SYNC } });
    expect(markers()).toHaveLength(1);
    expect(markerAt([8.45, 80.02])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'BLOCK 1' } });
    expect(markers()).toHaveLength(1);
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    expect(mocks.getMyIncidents).toHaveBeenCalledTimes(1);
    expect(mocks.getPendingIncidents).toHaveBeenCalledTimes(1);
  });

  it('turns a pending marker into one submitted marker on owner-scoped sync and keeps the shared details selection', async () => {
    mocks.getPendingIncidents.mockResolvedValue([pendingIncident()]);
    render(<RangerIncidentMapPage navigate={vi.fn()} />);
    await waitFor(() => expect(markers()).toHaveLength(1));
    const pendingMarker = openMarker([8.45, 80.02]);
    expect(pendingMarker.getAttribute('data-icon')).toContain('is-pending');
    expect(pendingMarker.getAttribute('data-title')).toContain('Pending synchronization');
    expect(pendingMarker.getAttribute('data-alt')).toContain('Pending synchronization');
    fireEvent.click(within(pendingMarker).getByRole('button', { name: 'View Incident' }));
    const detailsDialog = screen.getByRole('dialog', { name: 'Shared incident details' });
    expect(mocks.details.status).toBe(FIELD_INCIDENT_PENDING_SYNC);
    const viewChangesBeforeSync = mocks.map.setView.mock.calls.length;
    const boundsChangesBeforeSync = mocks.map.fitBounds.mock.calls.length;

    const confirmed = submittedIncident({
      id: 'new-server-incident', clientIncidentId: 'client-pending', incidentType: 'WILDLIFE_SIGHTING',
      description: 'Deer sighting on patrol.', riskLevel: 'LOW',
      location: { source: 'GPS', coordinates: { latitude: 8.45, longitude: 80.02 } },
    });
    const readsBeforeForeignEvent = mocks.getMyIncidents.mock.calls.length;
    await act(async () => { window.dispatchEvent(new CustomEvent(FIELD_INCIDENT_SYNC_EVENT, {
      detail: { ownerId: 'ranger-b', syncedIncidents: [confirmed] },
    })); });
    expect(mocks.getMyIncidents).toHaveBeenCalledTimes(readsBeforeForeignEvent);
    expect(mocks.details.status).toBe(FIELD_INCIDENT_PENDING_SYNC);

    mocks.getMyIncidents.mockResolvedValue([confirmed]);
    // Keep the old local copy in this read to exercise the existing synchronization deduplication.
    await act(async () => { window.dispatchEvent(new CustomEvent(FIELD_INCIDENT_SYNC_EVENT, {
      detail: { ownerId: 'ranger-a', syncedIncidents: [confirmed] },
    })); });
    await waitFor(() => expect(mocks.details.status).toBe(FIELD_INCIDENT_SUBMITTED));
    expect(markers()).toHaveLength(1);
    expect(markerAt([8.45, 80.02]).getAttribute('data-icon')).toContain('is-submitted');
    expect(markerAt([8.45, 80.02]).getAttribute('data-icon')).not.toContain('is-pending');
    const syncedMarker = markerAt([8.45, 80.02]);
    for (const attribute of ['data-title', 'data-alt']) {
      expect(syncedMarker.getAttribute(attribute)).toContain(confirmed.referenceNumber);
      expect(syncedMarker.getAttribute(attribute)).toContain('Submitted');
      expect(syncedMarker.getAttribute(attribute)).not.toContain('Pending synchronization');
    }
    expect(within(syncedMarker).getByRole('button', {
      name: `Wildlife Sighting · ${confirmed.referenceNumber} · Submitted`,
    })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Wildlife Sighting.*Pending synchronization/ })).toBeNull();
    expect(mocks.map.setView).toHaveBeenCalledTimes(viewChangesBeforeSync);
    expect(mocks.map.fitBounds).toHaveBeenCalledTimes(boundsChangesBeforeSync);
    expect(screen.getByLabelText('Pending Sync: 0')).toBeTruthy();
    expect(mocks.details.id).toBe('new-server-incident');
    expect(screen.getByRole('dialog', { name: 'Shared incident details' })).toBe(detailsDialog);
    fireEvent.click(screen.getByRole('button', { name: 'Close incident details' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expectNoLocationWrites();
  });

  it('shows available pending locations after a server error and reloads both sources on Retry', async () => {
    mocks.getMyIncidents.mockRejectedValue(new Error('Unable to reach WildGuard.'));
    mocks.getPendingIncidents.mockResolvedValue([pendingIncident()]);
    render(<RangerIncidentMapPage navigate={vi.fn()} />);
    const warning = await screen.findByRole('alert');
    expect(warning.textContent).toContain('Some incident locations could not be loaded.');
    expect(warning.textContent).toContain('Available incident locations are still shown on the map.');
    expect(markers()).toHaveLength(1);
    expect(screen.getByLabelText('Mapped Incidents: unavailable')).toBeTruthy();
    expect(screen.getByLabelText('Pending Sync: 1')).toBeTruthy();
    mocks.getMyIncidents.mockResolvedValue([submittedIncident()]);
    fireEvent.click(within(warning).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(markers()).toHaveLength(2));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.getMyIncidents).toHaveBeenCalledTimes(2);
    expect(mocks.getPendingIncidents).toHaveBeenCalledTimes(2);
  });

  it('continues showing submitted locations when IndexedDB is unavailable', async () => {
    mocks.getMyIncidents.mockResolvedValue([submittedIncident()]);
    mocks.getPendingIncidents.mockRejectedValue(new Error('IndexedDB unavailable'));
    render(<RangerIncidentMapPage navigate={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Offline incidents could not be loaded.');
    expect(markers()).toHaveLength(1);
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    expect(screen.getByLabelText('Pending Sync: unavailable')).toBeTruthy();
    expect(screen.queryByText('No mapped incidents yet.')).toBeNull();
  });

  it('keeps loading separate from an empty history and uses the existing reporting route', async () => {
    let finishServerRead;
    mocks.getMyIncidents.mockImplementation(() => new Promise((resolve) => { finishServerRead = resolve; }));
    const navigate = vi.fn();
    render(<RangerIncidentMapPage navigate={navigate} />);
    expect(screen.getByText('Loading incident locations…')).toBeTruthy();
    expect(screen.getByLabelText('Mapped Incidents: loading')).toBeTruthy();
    expect(screen.getByLabelText('Incident Type').disabled).toBe(true);
    expect(screen.queryByText('No mapped incidents yet.')).toBeNull();
    await act(async () => { finishServerRead([]); });
    expect(await screen.findByText('No mapped incidents yet.')).toBeTruthy();
    for (const reportButton of screen.getAllByRole('button', { name: 'Report Field Incident' })) {
      fireEvent.click(reportButton);
      expect(navigate).toHaveBeenLastCalledWith('/ranger/incidents/new');
    }
  });

  it('discards a previous ranger response when the authenticated account changes during loading', async () => {
    let finishOldRead;
    const currentRangerIncident = submittedIncident({
      id: 'ranger-b-incident', clientIncidentId: 'ranger-b-client',
      location: { coordinates: { latitude: 7.3, longitude: 81.1 } },
    });
    mocks.getMyIncidents.mockImplementationOnce(() => new Promise((resolve) => { finishOldRead = resolve; }))
      .mockResolvedValue([currentRangerIncident]);
    mocks.getPendingIncidents.mockImplementation((ownerId) => Promise.resolve(ownerId === 'ranger-a' ? [pendingIncident()] : []));
    const view = render(<RangerIncidentMapPage navigate={vi.fn()} />);
    mocks.user = { id: 'ranger-b', fullName: 'Kamal Silva' };
    view.rerender(<RangerIncidentMapPage navigate={vi.fn()} />);
    await waitFor(() => expect(markerAt([7.3, 81.1])).toBeTruthy());
    await act(async () => { finishOldRead([submittedIncident()]); });
    expect(markers()).toHaveLength(1);
    expect(markerAt([6.3725, 81.5169])).toBeUndefined();
    expect(markerAt([8.45, 80.02])).toBeUndefined();
    expect(mocks.getPendingIncidents).toHaveBeenCalledWith('ranger-b');
  });
});

describe('read-only incident map rendering', () => {
  it('preserves latitude/longitude order, fits multiple markers and keeps markers read-only', async () => {
    const incidents = [submittedIncident(), submittedIncident({
      id: 'server-2', clientIncidentId: 'second', location: { coordinates: { latitude: 8.45, longitude: 80.02 } },
    })];
    renderMap(incidents);
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    expect(markerAt([8.45, 80.02])).toBeTruthy();
    for (const marker of markers()) expect(marker.getAttribute('data-draggable')).toBe('false');
    expect(mocks.mapEvents?.click).toBeUndefined();
    await waitFor(() => expect(mocks.map.fitBounds).toHaveBeenCalledWith(
      expect.arrayContaining([[6.3725, 81.5169], [8.45, 80.02]]), expect.any(Object),
    ));
    expectNoLocationWrites();
  });

  it('centers a single marker and offers a Sri Lanka empty map without inventing coordinates', async () => {
    const view = renderMap([submittedIncident()]);
    await waitFor(() => expect(mocks.map.setView).toHaveBeenCalledWith([6.3725, 81.5169], 13));
    view.rerender(<RangerIncidentMap incidents={[]} onViewIncident={vi.fn()} onReport={vi.fn()}
      isLoading={false} hasLoadError={false} hasActiveFilters={false} />);
    await waitFor(() => expect(mocks.map.setView).toHaveBeenLastCalledWith([7.8731, 80.7718], 7));
    expect(markers()).toHaveLength(0);
    expect(screen.getByText('No mapped incidents yet.')).toBeTruthy();
  });

  it('refits all incident locations after a desktop-to-mobile resize without reframing unchanged dimensions', () => {
    renderMap([submittedIncident(), submittedIncident({
      id: 'server-2', clientIncidentId: 'second', location: { coordinates: { latitude: 8.45, longitude: 80.02 } },
    })]);
    expect(mocks.map.fitBounds).toHaveBeenCalledTimes(1);
    mocks.containerSize = { width: 350, height: 420 };
    fireEvent(window, new Event('resize'));
    expect(mocks.map.fitBounds).toHaveBeenCalledTimes(2);
    expect(mocks.map.fitBounds).toHaveBeenLastCalledWith(
      [[6.3725, 81.5169], [8.45, 80.02]], { padding: [40, 40], maxZoom: 14 },
    );
    fireEvent(window, new Event('resize'));
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.map.fitBounds).toHaveBeenCalledTimes(2);
    expect(markers()).toHaveLength(2);
    expectNoLocationWrites();
  });

  it('keeps the current-location view and selected zoom when the map resizes', () => {
    setGeolocation({ getCurrentPosition: (success) => success({ coords: { latitude: 7.2, longitude: 80.5 } }) });
    renderMap([submittedIncident(), submittedIncident({
      id: 'server-2', clientIncidentId: 'second', location: { coordinates: { latitude: 8.45, longitude: 80.02 } },
    })]);
    fireEvent.click(screen.getByRole('button', { name: 'My Location' }));
    mocks.map.getZoom.mockReturnValue(12);
    mocks.containerSize = { width: 350, height: 420 };
    fireEvent(window, new Event('resize'));
    expect(mocks.map.setView).toHaveBeenLastCalledWith([7.2, 80.5], 12);
    expect(mocks.map.fitBounds).toHaveBeenCalledTimes(1);
    expect(markerAt([7.2, 80.5])).toBeTruthy();
    expectNoLocationWrites();
  });

  it('shows submitted popup details and forwards the original incident to the shared details action', () => {
    const incident = submittedIncident();
    const onViewIncident = vi.fn();
    renderMap([incident], { onViewIncident });
    const marker = openMarker([6.3725, 81.5169]);
    expect(marker.textContent).toContain('Poaching / Snare');
    expect(marker.textContent).toContain('FI-20261016-ABC123');
    expect(marker.textContent).toContain('Yala National Park');
    expect(marker.textContent).toContain('Block 1');
    expect(marker.textContent).toMatch(/high/i);
    expect(marker.textContent).toMatch(/submitted/i);
    fireEvent.click(within(marker).getByRole('button', { name: 'View Incident' }));
    expect(onViewIncident).toHaveBeenCalledWith(incident);
  });

  it('shows an amber pending marker and a pending reference without inventing an FI number', () => {
    const incident = submittedIncident({ status: FIELD_INCIDENT_PENDING_SYNC, referenceNumber: null });
    renderMap([incident]);
    const marker = openMarker([6.3725, 81.5169]);
    expect(marker.getAttribute('data-icon')).toMatch(/pending|amber|orange/i);
    expect(marker.textContent).toContain('Pending synchronization');
    expect(marker.textContent).not.toContain('FI-');
  });

  it('retains incident markers and actions if map tiles fail', async () => {
    renderMap([submittedIncident()]);
    await act(async () => { mocks.tileEvents.tileerror?.(); });
    expect(markers()).toHaveLength(1);
    expect(screen.getByText(/tiles.*(?:unavailable|load)|(?:unable|could not).*tiles/i)).toBeTruthy();
    const marker = openMarker([6.3725, 81.5169]);
    expect(within(marker).getByRole('button', { name: 'View Incident' })).toBeTruthy();
  });
});

describe('current ranger location', () => {
  it('centers on a distinct current-location indicator without changing or persisting incident coordinates', async () => {
    let success;
    const getCurrentPosition = vi.fn((onSuccess) => { success = onSuccess; });
    setGeolocation({ getCurrentPosition });
    const setSessionItem = vi.spyOn(Storage.prototype, 'setItem');
    renderMap([submittedIncident()]);
    fireEvent.click(screen.getByRole('button', { name: 'My Location' }));
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
    });
    await act(async () => { success({ coords: { latitude: 7.2, longitude: 80.5 } }); });
    await waitFor(() => expect(mocks.map.setView).toHaveBeenLastCalledWith([7.2, 80.5], 14));
    expect(markerAt([6.3725, 81.5169])).toBeTruthy();
    expect(markerAt([7.2, 80.5])).toBeTruthy();
    expect(markerAt([7.2, 80.5]).getAttribute('data-icon')).toContain('current-location');
    expect(markers()).toHaveLength(2);
    expect(setSessionItem).not.toHaveBeenCalled();
    expectNoLocationWrites();
  });

  it('removes the no-incidents overlay after finding the current position on an otherwise empty map', async () => {
    setGeolocation({ getCurrentPosition: (success) => success({ coords: { latitude: 7.2, longitude: 80.5 } }) });
    renderMap([]);
    expect(screen.getByText('No mapped incidents yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'My Location' }));
    await waitFor(() => expect(markerAt([7.2, 80.5])).toBeTruthy());
    expect(screen.queryByText('No mapped incidents yet.')).toBeNull();
    expectNoLocationWrites();
  });

  it('shows location denial without preventing incident popup access', () => {
    setGeolocation({ getCurrentPosition: (_success, fail) => fail({ code: 1 }) });
    renderMap([submittedIncident()]);
    fireEvent.click(screen.getByRole('button', { name: 'My Location' }));
    expect(screen.getByText('Location permission was denied.')).toBeTruthy();
    expect(within(openMarker([6.3725, 81.5169])).getByRole('button', { name: 'View Incident' })).toBeTruthy();
    expectNoLocationWrites();
  });

  it('handles an unavailable geolocation API and unavailable GPS without writes', async () => {
    const { result } = renderHook(useRangerMapLocation);
    await act(async () => { result.current.requestLocation(); });
    expect(result.current.position).toBeNull();
    expect(result.current.error).toMatch(/not support|unavailable|not available/i);
    setGeolocation({ getCurrentPosition: (_success, fail) => fail({ code: 2 }) });
    await act(async () => { result.current.requestLocation(); });
    expect(result.current.position).toBeNull();
    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toMatch(/unavailable|not available/i);
    expectNoLocationWrites();
  });
});
