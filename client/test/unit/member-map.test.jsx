import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberMapPage from '../../src/features/community-reports/pages/MemberMapPage.jsx';
import locationMarkerUrl from '../../src/assets/icons/map-location-marker.svg';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(), resetDraft: vi.fn(),
  map: { invalidateSize: vi.fn(), setView: vi.fn(), getZoom: vi.fn(() => 7), getContainer: vi.fn(), scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() } },
  container: null, marker: null, circle: null, tiles: null,
}));
vi.mock('../../src/context/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'member-1', fullName: 'Test Member' }, logout: mocks.logout }) }));
vi.mock('../../src/features/community-reports/context/useReportDraft.js', () => ({ useReportDraft: () => ({ resetDraft: mocks.resetDraft }) }));
vi.mock('leaflet', () => ({ default: { icon: (options) => options } }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => {
    mocks.container = props;
    return <div data-testid="map" ref={(element) => {
      if (!element) return;
      Object.defineProperties(element, { clientWidth: { value: 700 }, clientHeight: { value: 500 } });
      mocks.map.getContainer.mockReturnValue(element);
    }}>{children}</div>;
  },
  Marker: ({ children, ...props }) => { mocks.marker = props; return <div data-testid="marker">{children}</div>; },
  Circle: (props) => { mocks.circle = props; return <div data-testid="accuracy-circle" />; },
  TileLayer: (props) => { mocks.tiles = props; return null; },
  Tooltip: ({ children }) => <span>{children}</span>,
  useMap: () => mocks.map,
  useMapEvents: () => { throw new Error('The current location map must not allow selection.'); },
}));

function geolocation(getCurrentPosition) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
}
function locateButton() { return screen.getByRole('button', { name: 'Use My Current Location' }); }
const position = { coords: { latitude: 6.927079, longitude: 79.861244, accuracy: 18.5 } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.container = null; mocks.marker = null; mocks.circle = null;
  mocks.map.getZoom.mockReturnValue(7);
  mocks.logout.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  vi.stubGlobal('isSecureContext', true);
});
afterEach(() => vi.unstubAllGlobals());

describe('Community Member location page', () => {
  it('starts in Sri Lanka without requesting or manufacturing a user location', async () => {
    const request = vi.fn(); geolocation(request);
    render(<MemberMapPage navigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'My Location' })).toBeTruthy();
    expect(screen.getByText('View your current location on the map.')).toBeTruthy();
    expect(mocks.container.center).toEqual([7.8731, 80.7718]);
    expect(mocks.container.zoom).toBe(7);
    expect(mocks.container.scrollWheelZoom).toBe(true);
    expect(screen.queryByTestId('marker')).toBeNull();
    expect(screen.queryByText('Latitude')).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(mocks.tiles.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(mocks.tiles.attribution).toContain('OpenStreetMap');
    await waitFor(() => expect(mocks.map.invalidateSize).toHaveBeenCalled());
    expect(mocks.map.setView).not.toHaveBeenCalled();
  });

  it('requests once, announces loading, centers on success, and supports an explicit update', () => {
    let success;
    const request = vi.fn((callback) => { success = callback; }); geolocation(request);
    render(<MemberMapPage navigate={vi.fn()} />);
    fireEvent.click(locateButton());
    const loadingButton = screen.getByRole('button', { name: 'Finding your location…' });
    expect(loadingButton.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Finding your location…');
    fireEvent.click(loadingButton);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    act(() => success(position));
    expect(locateButton().disabled).toBe(false);
    expect(mocks.map.setView).toHaveBeenLastCalledWith([6.927079, 79.861244], 13);
    expect(mocks.marker.position).toEqual([6.927079, 79.861244]);
    expect(mocks.marker.draggable).toBe(false);
    expect(mocks.marker.title).toBe('Your current location');
    expect(mocks.marker.icon.iconUrl).toBe(locationMarkerUrl);
    expect(screen.getByText('Your current location')).toBeTruthy();
    expect(screen.getByText('6.927079')).toBeTruthy();
    expect(screen.getByText('79.861244')).toBeTruthy();
    expect(screen.getByText('±18.5 m')).toBeTruthy();
    expect(mocks.circle.center).toEqual([6.927079, 79.861244]);
    expect(mocks.circle.radius).toBe(18.5);
    const viewCalls = mocks.map.setView.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(mocks.map.setView).toHaveBeenCalledTimes(viewCalls);
    fireEvent.click(locateButton());
    act(() => success({ coords: { latitude: 7.1, longitude: 80.2, accuracy: 8 } }));
    expect(request).toHaveBeenCalledTimes(2);
    expect(mocks.map.setView).toHaveBeenLastCalledWith([7.1, 80.2], 13);
    expect(screen.getByText('7.100000')).toBeTruthy();
    expect(mocks.resetDraft).not.toHaveBeenCalled();
  });

  it.each([[1, 'permission was denied'], [2, 'location is unavailable'], [3, 'timed out'], [99, 'Unable to get your current location']])('handles error %s and recovers only after an explicit retry', (code, message) => {
    const request = vi.fn((_success, failure) => failure({ code })); geolocation(request);
    render(<MemberMapPage navigate={vi.fn()} />);
    fireEvent.click(locateButton());
    expect(screen.getByRole('alert').textContent).toContain(message);
    expect(locateButton().disabled).toBe(false);
    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.queryByTestId('marker')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    request.mockImplementationOnce((success) => success(position));
    fireEvent.click(locateButton());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('marker')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps the last measured position when an update fails', () => {
    const request = vi.fn().mockImplementationOnce((success) => success(position)).mockImplementationOnce((_success, failure) => failure({ code: 2 }));
    geolocation(request); render(<MemberMapPage navigate={vi.fn()} />);
    fireEvent.click(locateButton()); fireEvent.click(locateButton());
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('6.927079')).toBeTruthy();
    expect(mocks.marker.position).toEqual([6.927079, 79.861244]);
    expect(mocks.map.setView).toHaveBeenCalledTimes(1);
  });

  it('handles unsupported browsers and insecure contexts without prompting', () => {
    render(<MemberMapPage navigate={vi.fn()} />);
    fireEvent.click(locateButton());
    expect(screen.getByRole('alert').textContent).toContain('does not support location access');
    const request = vi.fn(); geolocation(request); vi.stubGlobal('isSecureContext', false);
    fireEvent.click(locateButton());
    expect(screen.getByRole('alert').textContent).toContain('HTTPS or localhost');
    expect(request).not.toHaveBeenCalled();
    expect(locateButton().disabled).toBe(false);
  });

  it('restores the button if the browser throws synchronously', () => {
    geolocation(() => { throw new Error('Blocked by browser'); });
    render(<MemberMapPage navigate={vi.fn()} />); fireEvent.click(locateButton());
    expect(screen.getByRole('alert').textContent).toContain('Check your browser');
    expect(locateButton().disabled).toBe(false);
  });

  it.each(['success', 'failure'])('ignores late %s after navigating away', (outcome) => {
    let success; let failure;
    geolocation((onSuccess, onFailure) => { success = onSuccess; failure = onFailure; });
    const { unmount } = render(<MemberMapPage navigate={vi.fn()} />);
    fireEvent.click(locateButton()); unmount();
    act(() => outcome === 'success' ? success(position) : failure({ code: 1 }));
    expect(screen.queryByTestId('map')).toBeNull();
  });
});

describe('Community Member navigation', () => {
  it('uses the required order, active Map style and shared mobile drawer, preserving header and logout', async () => {
    const navigate = vi.fn();
    const { container } = render(<MemberMapPage navigate={navigate} />);
    const sidebar = screen.getByRole('complementary', { name: 'Community navigation' });
    const navigation = within(sidebar).getByRole('navigation');
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual(['Dashboard', 'Submit Report', 'Map', 'My Reports']);
    expect(within(sidebar).queryByText('Alerts')).toBeNull();
    expect(within(sidebar).queryByText('Settings')).toBeNull();
    expect(within(sidebar).queryByText('Coming soon')).toBeNull();
    const map = within(navigation).getByRole('button', { name: 'Map', exact: true });
    expect(map.className).toBe('is-active'); expect(map.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('.header-notification svg')).toBeTruthy();
    for (const [label, path] of [['Dashboard', '/member'], ['Submit Report', '/reports/type'], ['Map', '/member/map'], ['My Reports', '/reports/my-reports']]) {
      fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
      expect(sidebar.classList.contains('is-open')).toBe(true);
      fireEvent.click(within(navigation).getByRole('button', { name: label, exact: true }));
      expect(navigate).toHaveBeenLastCalledWith(path);
      expect(sidebar.classList.contains('is-open')).toBe(false);
    }
    expect(mocks.resetDraft).toHaveBeenCalledTimes(1);
    const logout = within(sidebar).getByRole('button', { name: 'Logout', exact: true });
    expect(logout.parentElement.className).toBe('sidebar-footer');
    fireEvent.click(logout);
    await waitFor(() => expect(navigate).toHaveBeenLastCalledWith('/login'));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
