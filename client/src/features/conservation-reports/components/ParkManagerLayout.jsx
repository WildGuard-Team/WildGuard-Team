import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ManagerIcon from './ManagerIcon.jsx';

const navigation = [
  ['dashboard', 'Dashboard'],
  ['reports', 'Conservation Reports', '/manager/reports'],
  ['rangers', 'Ranger Approvals', '/manager/rangers'],
  ['history', 'Report History'],
  ['map', 'Park Map'],
  ['settings', 'Settings'],
];

export default function ParkManagerLayout({
  children,
  navigate,
}) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentPath = window.location.pathname;

  useEffect(() => {
    document.documentElement.classList.add(
      'manager-page-active',
    );

    document.body.classList.add(
      'manager-page-active',
    );

    return () => {
      document.documentElement.classList.remove(
        'manager-page-active',
      );

      document.body.classList.remove(
        'manager-page-active',
      );
    };
  }, []);

  async function signOut() {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      await logout();

      navigate('/login');
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="manager-app">
      <button
        className="manager-sidebar-toggle"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <ManagerIcon name="menu" />
      </button>

      <aside
        className={`manager-sidebar${open ? ' is-open' : ''}`}
        aria-label="Park Manager navigation"
      >
        <div className="manager-brand">
          <img
            src="/logo.jpg"
            alt="WildGuard"
          />

          <span>
            <strong>WildGuard</strong>
            <small>Park Manager</small>
          </span>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <ManagerIcon name="close" />
          </button>
        </div>

        <nav>
          {navigation.map(
            ([icon, label, path]) => {
              if (path) {
                const isActive =
                  currentPath === path;

                return (
                  <button
                    key={label}
                    type="button"
                    className={
                      isActive
                        ? 'is-active'
                        : ''
                    }
                    onClick={() => {
                      navigate(path);
                      setOpen(false);
                    }}
                  >
                    <ManagerIcon name={icon} />
                    <span>{label}</span>
                  </button>
                );
              }

              return (
                <span
                  key={label}
                  className="manager-nav-unavailable"
                  aria-disabled="true"
                >
                  <ManagerIcon name={icon} />
                  <span>{label}</span>
                  <small>Coming soon</small>
                </span>
              );
            }
          )}
        </nav>

        <div className="manager-sidebar-footer">
          <FormAlert>
            {logoutError}
          </FormAlert>

          <button
            type="button"
            onClick={signOut}
            disabled={isLoggingOut}
          >
            <ManagerIcon name="logout" />

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
          className="manager-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="manager-main">
        <header className="manager-header">
          <span className="manager-notification">
            <ManagerIcon name="bell" />
            <i />
          </span>

          <span className="manager-avatar">
            {user.fullName.slice(0, 1)}
          </span>

          <span className="manager-user">
            <strong>
              {user.fullName}
            </strong>

            <small>
              Park Manager
            </small>
          </span>

          <ManagerIcon
            name="chevron"
            size={18}
          />
        </header>

        <main className="manager-content">
          {children}
        </main>
      </div>
    </div>
  );
}