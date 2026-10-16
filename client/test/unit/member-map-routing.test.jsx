import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';

const mocks = vi.hoisted(() => ({ auth: {}, draft: { draft: {}, evidenceHydrationStatus: 'ready', resetDraft: vi.fn() } }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ AuthProvider: ({ children }) => children }));
vi.mock('../../src/context/useAuth.js', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../src/features/community-reports/context/ReportDraftContext.jsx', () => ({ ReportDraftProvider: ({ children }) => children }));
vi.mock('../../src/features/community-reports/context/useReportDraft.js', () => ({ useReportDraft: () => mocks.draft }));
vi.mock('../../src/features/field-incidents/context/FieldIncidentDraftContext.jsx', () => ({ FieldIncidentDraftProvider: ({ children }) => children }));
vi.mock('../../src/features/field-incidents/components/FieldIncidentSyncManager.jsx', () => ({ default: () => null }));
vi.mock('../../src/features/community-reports/components/LocationMap.jsx', () => ({ default: () => <div>Location map</div> }));
vi.mock('../../src/features/auth/pages/LoginPage.jsx', () => ({ default: () => <h1>Sign in</h1> }));
vi.mock('../../src/pages/MemberLandingPage.jsx', () => ({ default: ({ navigate }) => <button onClick={() => navigate('/member/map')}>Open member map</button> }));
vi.mock('../../src/features/conservation-reports/pages/ConservationReportsPage.jsx', () => ({ default: () => <h1>Manager reports</h1> }));
vi.mock('../../src/features/field-incidents/pages/RangerDashboardPage.jsx', () => ({ default: () => <h1>Ranger dashboard</h1> }));

beforeEach(() => {
  mocks.auth = { user: { id: 'member-1', role: 'COMMUNITY_MEMBER', fullName: 'Test Member' }, isCheckingSession: false };
  window.history.replaceState({}, '', '/member/map');
});

describe('authenticated member map routing', () => {
  it('supports a direct visit and preserves browser back navigation', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'My Location' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard', exact: true }));
    expect(window.location.pathname).toBe('/member');
    fireEvent.click(screen.getByRole('button', { name: 'Open member map' }));
    expect(window.location.pathname).toBe('/member/map');
    expect(screen.getByRole('heading', { name: 'My Location' })).toBeTruthy();
    window.history.replaceState({}, '', '/member');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('button', { name: 'Open member map' })).toBeTruthy();
  });

  it('redirects unsigned visitors to login without rendering the map', async () => {
    mocks.auth.user = null; render(<App />);
    expect(screen.queryByRole('heading', { name: 'My Location' })).toBeNull();
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(window.location.pathname).toBe('/login');
  });

  it('waits for session verification', () => {
    mocks.auth.isCheckingSession = true; render(<App />);
    expect(screen.getByText('Checking your WildGuard session…')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'My Location' })).toBeNull();
  });

  it.each([
    ['PARK_MANAGER', '/manager/reports', 'Manager reports'],
    ['PARK_RANGER', '/ranger', 'Ranger dashboard'],
  ])('keeps %s in its existing role routes', async (role, path, heading) => {
    mocks.auth.user.role = role; render(<App />);
    expect(screen.queryByRole('heading', { name: 'My Location' })).toBeNull();
    await waitFor(() => expect(window.location.pathname).toBe(path));
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
  });
});
