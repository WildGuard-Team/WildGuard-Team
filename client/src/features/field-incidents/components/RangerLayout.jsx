import { useEffect, useState } from 'react';

import { useAuth } from '../../../context/useAuth.js';
import FormAlert from '../../auth/components/FormAlert.jsx';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';

const navigation = [
  ['dashboard', 'Dashboard', '/ranger'],
  ['report', 'Report Field Incident', '/ranger/incidents/new'],
  ['folder', 'My Incidents', '/ranger/incidents'],
  ['map', 'Map'],
  ['bell', 'Alerts'],
  ['settings', 'Settings'],
];

export default function RangerLayout({
  children,
  navigate,
  active = 'dashboard',
}) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add(
      'community-page-active',
    );

    document.body.classList.add(
      'community-page-active',
    );

    return () => {
      document.documentElement.classList.remove(
        'community-page-active',
      );

      document.body.classList.remove(
        'community-page-active',
      );
    };
  }, []);

  async function signOut() {
    setIsLoggingOut(true);
    setError('');

    try {
      await logout();
      navigate('/login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="community-app">
      <button
        className="sidebar-toggle"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <CommunityIcon name="menu" />
      </button>

      <aside
        className={`community-sidebar${open ? ' is-open' : ''}`}
        aria-label="Park Ranger navigation"
      >
        <div className="sidebar-brand">
          <img
            src="/logo.jpg"
            alt="WildGuard"
          />

          <span>
            Park Ranger
          </span>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <CommunityIcon name="close" />
          </button>
        </div>

        <nav>
          {navigation.map(
            ([icon, label, path]) =>
              path ? (
                <button
                  key={label}
                  type="button"
                  className={
                    active === icon
                      ? 'is-active'
                      : ''
                  }
                  onClick={() => {
                    navigate(path);
                    setOpen(false);
                  }}
                >
                  <CommunityIcon name={icon} />
                  <span>{label}</span>
                </button>
              ) : (
                <span
                  key={label}
                  className="sidebar-unavailable"
                  aria-disabled="true"
                >
                  <CommunityIcon name={icon} />

                  <span>
                    {label}
                  </span>

                  <small>
                    Coming soon
                  </small>
                </span>
              )
          )}
        </nav>

        <div className="sidebar-footer">
          <FormAlert>
            {error}
          </FormAlert>

          <button
            type="button"
            onClick={signOut}
            disabled={isLoggingOut}
          >
            <CommunityIcon name="logout" />

            <span>
              {isLoggingOut
                ? 'Logging out…'
                : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="community-main">
        <header className="community-header">
          <span className="header-notification">
            <CommunityIcon
              name="bell"
              size={22}
            />
            <i />
          </span>

          <span className="header-avatar">
            {user.fullName.slice(0, 1)}
          </span>

          <span className="header-name">
            {user.fullName}
          </span>

          <CommunityIcon
            name="chevron"
            size={19}
          />
        </header>

        <main className="community-content">
          {children}
        </main>
      </div>
    </div>
  );
}
