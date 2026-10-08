import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { useCurrentLocation } from '../../src/features/community-reports/hooks/useCurrentLocation.js';
import LocationSearch from '../../src/features/community-reports/components/LocationSearch.jsx';
import LocationMap from '../../src/features/community-reports/components/LocationMap.jsx';
import ReadOnlyReportMap from '../../src/features/community-reports/components/ReadOnlyReportMap.jsx';
import SelectedLocation from '../../src/features/community-reports/components/SelectedLocation.jsx';
import ReportProgress from '../../src/features/community-reports/components/ReportProgress.jsx';
import { searchLocations } from '../../src/features/community-reports/services/locationApi.js';

const mapMock = vi.hoisted(() => ({ map: { invalidateSize: vi.fn(), setView: vi.fn(), getZoom: vi.fn(() => 7) }, events: null, container: null, marker: null }));
vi.mock('leaflet', () => ({ default: { icon: vi.fn((options) => options) } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => { mapMock.container = props; return <div data-testid="map">{children}</div>; },
  Marker: ({ children, ...props }) => { mapMock.marker = props; return <div data-testid="marker">{children}</div>; },
  TileLayer: () => <div data-testid="tile-layer" />, Tooltip: ({ children }) => <span>{children}</span>,
  useMap: () => mapMock.map, useMapEvents: (events) => { mapMock.events = events; },
}));
vi.mock('../../src/features/community-reports/services/locationApi.js', () => ({ searchLocations: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mapMock.events = null; mapMock.marker = null; Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined }); });

describe('current location hook', () => {
  it('handles unsupported browsers without a pending request', async () => {
    const { result } = renderHook(useCurrentLocation);
    let coordinates; await act(async () => { coordinates = await result.current.requestCurrentLocation(); });
    expect(coordinates).toBeNull(); expect(result.current.isLocating).toBe(false);
    expect(result.current.locationError).toContain('does not support location access');
  });
  it('returns GPS coordinates with high-accuracy options and prevents a duplicate concurrent request', async () => {
    let success;
    const getCurrentPosition = vi.fn((onSuccess) => { success = onSuccess; });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    const { result } = renderHook(useCurrentLocation);
    let request; act(() => { request = result.current.requestCurrentLocation(); });
    expect(result.current.isLocating).toBe(true);
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    let duplicate; await act(async () => { duplicate = await result.current.requestCurrentLocation(); });
    expect(duplicate).toBeNull(); expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    let coordinates; await act(async () => { success({ coords: { latitude: 7, longitude: 80 } }); coordinates = await request; });
    expect(coordinates).toEqual({ latitude: 7, longitude: 80 }); expect(result.current.isLocating).toBe(false); expect(result.current.locationError).toBe('');
  });
  it.each([[1, 'permission was denied'], [2, 'location is unavailable'], [3, 'lookup timed out'], [999, 'Unable to get your current location.']])('exposes an actionable GPS error for code %s', async (code, message) => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, error) => error({ code }) } });
    const { result } = renderHook(useCurrentLocation);
    let coordinates; await act(async () => { coordinates = await result.current.requestCurrentLocation(); });
    expect(coordinates).toBeNull(); expect(result.current.locationError).toContain(message); expect(result.current.isLocating).toBe(false);
  });
  it('settles a pending request after unmount without trying to update the removed view', async () => {
    let fail;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, error) => { fail = error; } } });
    const { result, unmount } = renderHook(useCurrentLocation);
    let request; act(() => { request = result.current.requestCurrentLocation(); }); unmount();
    fail({ code: 1 }); expect(await request).toBeNull();
  });
});

describe('manual location search', () => {
  function setup(initial = '') {
    const select = vi.fn();
    function Wrapper() { const [value, change] = useState(initial); return <LocationSearch value={value} onChange={change} onSelect={select} />; }
    return { ...render(<Wrapper />), select };
  }
  it('requires three characters and accepts keyboard searches/results without leaving stale errors', async () => {
    const { select } = setup('ab');
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(screen.getByText('Enter at least 3 characters to search.')).toBeTruthy(); expect(searchLocations).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Village, road, landmark, or park area'), { target: { value: '  Park road  ' } });
    expect(screen.queryByText('Enter at least 3 characters to search.')).toBeNull();
    const location = { placeId: 'park', displayName: 'Wildlife Park', coordinates: { latitude: 7, longitude: 80 } };
    searchLocations.mockResolvedValueOnce([location]);
    fireEvent.keyDown(screen.getByLabelText('Village, road, landmark, or park area'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: 'Wildlife Park' }));
    expect(searchLocations).toHaveBeenCalledWith('Park road'); expect(select).toHaveBeenCalledWith(location, 'Park road');
    expect(screen.queryByRole('list')).toBeNull();
  });
  it('shows loading, empty and provider errors and prevents repeated searches while pending', async () => {
    let resolve;
    searchLocations.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    setup('park');
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(screen.getByRole('button', { name: 'Searching…' }).disabled).toBe(true);
    fireEvent.keyDown(screen.getByLabelText('Village, road, landmark, or park area'), { key: 'Enter' });
    expect(searchLocations).toHaveBeenCalledTimes(1);
    await act(async () => { resolve([]); });
    expect(screen.getByText('No matching locations were found. Try a nearby landmark or road.')).toBeTruthy();
    searchLocations.mockRejectedValueOnce(new Error('Provider is unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText('Provider is unavailable')).toBeTruthy();
  });
  it.each(['resolve', 'reject'])('ignores %s from a search that settles after unmount', async (settlement) => {
    let resolve; let reject;
    searchLocations.mockImplementationOnce(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
    const { unmount } = setup('park'); fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true })); unmount();
    await act(async () => { if (settlement === 'resolve') resolve([]); else reject(new Error('Late error')); });
    expect(screen.queryByRole('search')).toBeNull();
  });
});

describe('editable and read-only map contracts', () => {
  it('uses Sri Lanka defaults without a selection and supports map clicks', async () => {
    const select = vi.fn(); render(<LocationMap coordinates={null} onMapSelect={select} onMarkerDrag={vi.fn()} />);
    expect(mapMock.container.center).toEqual([7.8731, 80.7718]); expect(mapMock.container.zoom).toBe(7);
    expect(mapMock.container.scrollWheelZoom).toBe(true); expect(screen.queryByTestId('marker')).toBeNull();
    act(() => mapMock.events.click({ latlng: { lat: 8, lng: 81 } })); expect(select).toHaveBeenCalledWith({ latitude: 8, longitude: 81 });
    await waitFor(() => expect(mapMock.map.invalidateSize).toHaveBeenCalled()); expect(mapMock.map.setView).not.toHaveBeenCalled();
  });
  it('renders and updates an editable marker, keeps existing zoom, and reports dragged coordinates', async () => {
    const drag = vi.fn(); mapMock.map.getZoom.mockReturnValueOnce(15);
    const view = render(<LocationMap coordinates={{ latitude: 7, longitude: 80 }} onMapSelect={vi.fn()} onMarkerDrag={drag} />);
    expect(mapMock.marker.position).toEqual([7, 80]); expect(mapMock.marker.draggable).toBe(true);
    expect(mapMock.map.setView).toHaveBeenCalledWith([7, 80], 15);
    act(() => mapMock.marker.eventHandlers.dragend({ target: { getLatLng: () => ({ lat: 9, lng: 82 }) } }));
    expect(drag).toHaveBeenCalledWith({ latitude: 9, longitude: 82 });
    view.rerender(<LocationMap coordinates={{ latitude: 8, longitude: 81 }} onMapSelect={vi.fn()} onMarkerDrag={drag} />);
    expect(mapMock.map.setView).toHaveBeenLastCalledWith([8, 81], 13);
    await waitFor(() => expect(mapMock.map.invalidateSize).toHaveBeenCalled());
  });
  it.each([null, {}, { latitude: NaN, longitude: 80 }, { latitude: '7', longitude: 80 }, { latitude: 91, longitude: 80 }, { latitude: -91, longitude: 80 }, { latitude: 7, longitude: 181 }, { latitude: 7, longitude: -181 }])('does not show submitted report maps for invalid coordinates %j', (coordinates) => {
    const { container } = render(<ReadOnlyReportMap coordinates={coordinates} />); expect(container.innerHTML).toBe('');
  });
  it.each([{ latitude: 7, longitude: 80 }, { latitude: -90, longitude: -180 }, { latitude: 90, longitude: 180 }])('valid submitted maps cannot modify report coordinates %j', (coordinates) => {
    render(<ReadOnlyReportMap coordinates={coordinates} />);
    expect(screen.getByRole('region', { name: 'Report location map' })).toBeTruthy();
    expect(mapMock.container.scrollWheelZoom).toBe(false); expect(mapMock.marker.draggable).toBe(false);
    expect(mapMock.marker.eventHandlers).toBeUndefined(); expect(mapMock.events).toBeNull(); expect(screen.getByText('Report location')).toBeTruthy();
  });
  it('selected location prioritizes readable text and displays missing/manual/coordinate fallbacks plus warnings', () => {
    const view = render(<SelectedLocation location={{ source: null, coordinates: null }} error="Pick a location" warning="Lookup failed" />);
    expect(screen.getByText('No location selected yet')).toBeTruthy(); expect(screen.getByText('Pick a location')).toBeTruthy(); expect(screen.getByText('Lookup failed')).toBeTruthy();
    view.rerender(<SelectedLocation location={{ source: 'MANUAL', coordinates: null }} />); expect(screen.getByText('Manual location selected')).toBeTruthy();
    view.rerender(<SelectedLocation location={{ source: 'MAP', coordinates: { latitude: 7, longitude: 80 } }} />); expect(screen.getByText('7.00000, 80.00000')).toBeTruthy();
    view.rerender(<SelectedLocation location={{ source: 'GPS', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Park' }} />); expect(screen.getByText('Park')).toBeTruthy();
  });
  it('report progress marks completed/current steps and leaves upcoming steps separate', () => {
    const { container } = render(<ReportProgress currentStep={2} />);
    expect(screen.getByRole('list', { name: 'Report submission progress' })).toBeTruthy();
    expect(container.querySelectorAll('li.is-current')).toHaveLength(2); expect(screen.getByText('Optional evidence').className).toBe('');
  });
});
