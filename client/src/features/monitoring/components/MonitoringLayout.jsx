import { useEffect, useState } from "react";
import { useAuth } from "../../../context/useAuth.js";
import FormAlert from "../../auth/components/FormAlert.jsx";

const navigation = [
  ["dashboard", "Dashboard", "/monitoring"],
  ["data", "Monitoring Data", "/monitoring/data"],
  ["simulate", "Simulate Reading", "/monitoring/simulate"],
  ["sensor", "Sensors", "/monitoring/sensors"],
  ["alert", "Alerts", "/monitoring/alerts"],
  ["logs", "Processing Logs", "/monitoring/logs"],
];

function getActiveNavigation(path) {
  if (path === "/monitoring") return "dashboard";
  if (path.startsWith("/monitoring/data")) return "data";
  if (path.startsWith("/monitoring/simulate")) return "simulate";
  if (path.startsWith("/monitoring/sensors")) return "sensor";
  if (path.startsWith("/monitoring/alerts")) return "alert";
  if (path.startsWith("/monitoring/logs")) return "logs";

  return "dashboard";
}

function MonitoringIcon({ name }) {
  const icons = {
    dashboard: "▦",
    data: "▤",
    simulate: "◉",
    sensor: "⌁",
    alert: "⚠",
    logs: "☷",
    menu: "☰",
    close: "×",
    logout: "↪",
  };

  return (
    <span className="monitoring-icon" aria-hidden="true">
      {icons[name] ?? "•"}
    </span>
  );
}

export default function MonitoringLayout({
  children,
  navigate,
  path,
  title,
  subtitle,
}) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const active = getActiveNavigation(path);

  useEffect(() => {
    document.documentElement.classList.add("monitoring-page-active");
    document.body.classList.add("monitoring-page-active");

    return () => {
      document.documentElement.classList.remove("monitoring-page-active");
      document.body.classList.remove("monitoring-page-active");
    };
  }, []);

  async function signOut() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setError("");

    try {
      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleNavigation(nextPath) {
    navigate(nextPath);
    setOpen(false);
  }

  const displayName = user?.fullName?.trim() || "System Administrator";

  const avatarLetter = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="monitoring-app">
      <button
        className="monitoring-sidebar-toggle"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <MonitoringIcon name="menu" />
      </button>

      <aside
        className={`monitoring-sidebar${open ? " is-open" : ""}`}
        aria-label="System Administrator navigation"
      >
        <div className="monitoring-sidebar-brand">
          <img src="/logo.jpg" alt="WildGuard" />

          <div>
            <strong>WildGuard</strong>
            <span>System Administrator</span>
          </div>

          <button
            type="button"
            className="monitoring-sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <MonitoringIcon name="close" />
          </button>
        </div>

        <nav className="monitoring-navigation">
          {navigation.map(([icon, label, navigationPath]) => (
            <button
              key={navigationPath}
              type="button"
              className={active === icon ? "is-active" : ""}
              aria-current={active === icon ? "page" : undefined}
              onClick={() => handleNavigation(navigationPath)}
            >
              <MonitoringIcon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="monitoring-sidebar-footer">
          <div className="monitoring-sidebar-profile">
            <span className="monitoring-sidebar-avatar">{avatarLetter}</span>

            <div>
              <strong>{displayName}</strong>
              <small>System Administrator</small>
            </div>
          </div>

          <FormAlert>{error}</FormAlert>

          <button
            type="button"
            className="monitoring-sidebar-logout"
            onClick={signOut}
            disabled={isLoggingOut}
          >
            <MonitoringIcon name="logout" />

            <span>{isLoggingOut ? "Logging out…" : "Logout"}</span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="monitoring-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="monitoring-main">
        <header className="monitoring-header">
          <div className="monitoring-header-title">
            <p>Wildlife Conservation Operations</p>

            <h1>{title}</h1>

            {subtitle && <span>{subtitle}</span>}
          </div>

          <div className="monitoring-header-user">
            <span className="monitoring-header-avatar">{avatarLetter}</span>

            <div>
              <strong>{displayName}</strong>
              <small>System Administrator</small>
            </div>
          </div>
        </header>

        <main className="monitoring-content">{children}</main>
      </div>
    </div>
  );
}
