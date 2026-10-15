import { useCallback, useEffect, useState } from "react";

import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth.js";

import LoginPage from "./features/auth/pages/LoginPage.jsx";
import RegisterPage from "./features/auth/pages/RegisterPage.jsx";
import MemberLandingPage from "./pages/MemberLandingPage.jsx";

import { ReportDraftProvider } from "./features/community-reports/context/ReportDraftContext.jsx";
import { useReportDraft } from "./features/community-reports/context/useReportDraft.js";
import { hasCompleteCommunityReportDetails } from "./features/community-reports/context/community-report-draft.storage.js";

import ReportTypePage from "./features/community-reports/pages/ReportTypePage.jsx";
import ReportDetailsPage from "./features/community-reports/pages/ReportDetailsPage.jsx";
import ReportEvidencePage from "./features/community-reports/pages/ReportEvidencePage.jsx";
import ReviewReportPage from "./features/community-reports/pages/ReviewReportPage.jsx";
import ReportConfirmationPage from "./features/community-reports/pages/ReportConfirmationPage.jsx";

import SharedAlertsPage from "./features/community-reports/pages/SharedAlertsPage.jsx";
import SharedAlertDetailsPage from "./features/community-reports/pages/SharedAlertDetailsPage.jsx";

import MonitoringRoutes from "./features/monitoring/MonitoringRoutes.jsx";

import "./features/monitoring/styles/monitoring.css";

const ROLES = Object.freeze({
  COMMUNITY_MEMBER: "COMMUNITY_MEMBER",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",

  // Other roles can still access the shared /alerts routes.
  PARK_RANGER: "PARK_RANGER",
  PARK_MANAGER: "PARK_MANAGER",
  CONSERVATION_RESEARCHER: "CONSERVATION_RESEARCHER",
});

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

function getDefaultPath(user) {
  return user?.role === ROLES.SYSTEM_ADMIN ? "/monitoring" : "/member";
}

function isMonitoringPath(path) {
  return path === "/monitoring" || path.startsWith("/monitoring/");
}

function isReportPath(path) {
  return path.startsWith("/reports/");
}

function isSharedAlertDetailsPath(path) {
  return (
    path.startsWith("/alerts/") && path.split("/").filter(Boolean).length === 2
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ReportDraftProvider>
        <AppRoutes />
      </ReportDraftProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, isCheckingSession } = useAuth();

  const { draft, evidenceHydrationStatus } = useReportDraft();

  const [path, setPath] = useState(() => window.location.pathname);

  const [message, setMessage] = useState("");

  const navigate = useCallback((nextPath, options = {}) => {
    const { replace = false, message: nextMessage = "" } = options;

    if (window.location.pathname !== nextPath) {
      const method = replace ? "replaceState" : "pushState";

      window.history[method]({}, "", nextPath);
    }

    setPath(nextPath);
    setMessage(nextMessage);
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname);
      setMessage("");
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  /*
   * Authentication redirects.
   */
  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

    if (user && PUBLIC_PATHS.has(path)) {
      navigate(getDefaultPath(user), {
        replace: true,
      });

      return;
    }

    if (!user && !PUBLIC_PATHS.has(path)) {
      navigate("/login", {
        replace: true,
      });
    }
  }, [isCheckingSession, navigate, path, user]);

  /*
   * Community report flow protection.
   */
  useEffect(() => {
    if (
      isCheckingSession ||
      !user ||
      user.role !== ROLES.COMMUNITY_MEMBER ||
      !isReportPath(path)
    ) {
      return;
    }

    if (path === "/reports/details" && !draft.reportType) {
      navigate("/reports/type", {
        replace: true,
      });

      return;
    }

    if (
      (path === "/reports/evidence" || path === "/reports/review") &&
      !hasCompleteCommunityReportDetails(draft)
    ) {
      navigate(draft.reportType ? "/reports/details" : "/reports/type", {
        replace: true,
      });

      return;
    }

    if (
      path === "/reports/review" &&
      draft.evidenceRestoreRequired &&
      evidenceHydrationStatus !== "loading" &&
      evidenceHydrationStatus !== "idle"
    ) {
      navigate("/reports/evidence", {
        replace: true,
      });
    }
  }, [draft, evidenceHydrationStatus, isCheckingSession, navigate, path, user]);

  const redirectInProgress =
    (user && PUBLIC_PATHS.has(path)) || (!user && !PUBLIC_PATHS.has(path));

  if (isCheckingSession || redirectInProgress) {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-mark" />
        Checking your WildGuard session…
      </main>
    );
  }

  /*
   * Public routes.
   */
  if (!user) {
    if (path === "/register") {
      return <RegisterPage navigate={navigate} />;
    }

    return <LoginPage navigate={navigate} successMessage={message} />;
  }

  /*
   * SYSTEM ADMIN MONITORING MODULE
   *
   * /monitoring/*
   * Only SYSTEM_ADMIN can access these routes.
   */
  if (isMonitoringPath(path)) {
    if (user.role !== ROLES.SYSTEM_ADMIN) {
      return (
        <main className="access-denied">
          <h1>Access Denied</h1>

          <p>
            System Administrator access is required to access the monitoring
            system.
          </p>

          <button type="button" onClick={() => navigate(getDefaultPath(user))}>
            Back
          </button>
        </main>
      );
    }

    return <MonitoringRoutes path={path} navigate={navigate} />;
  }

  /*
   * SHARED ALERT ROUTES
   *
   * All authenticated roles can access these.
   * These pages use the CommunityLayout sidebar.
   */

  if (path === "/alerts") {
    return <SharedAlertsPage navigate={navigate} />;
  }

  if (isSharedAlertDetailsPath(path)) {
    const alertId = path.split("/").filter(Boolean)[1];

    return <SharedAlertDetailsPage navigate={navigate} alertId={alertId} />;
  }

  /*
   * COMMUNITY MEMBER ROUTES
   */
  if (user.role === ROLES.COMMUNITY_MEMBER) {
    if (path === "/reports/type") {
      return <ReportTypePage navigate={navigate} />;
    }

    if (path === "/reports/details") {
      return <ReportDetailsPage navigate={navigate} />;
    }

    if (path === "/reports/evidence") {
      return <ReportEvidencePage navigate={navigate} />;
    }

    if (path === "/reports/review") {
      return <ReviewReportPage navigate={navigate} />;
    }

    if (path === "/reports/confirmation") {
      return <ReportConfirmationPage navigate={navigate} />;
    }

    if (path === "/member") {
      return <MemberLandingPage navigate={navigate} />;
    }
  }

  /*
   * BLOCK OTHER ROLES FROM COMMUNITY-ONLY ROUTES
   */
  if (path === "/member" || isReportPath(path)) {
    return (
      <main className="access-denied">
        <h1>Access Denied</h1>

        <p>You do not have permission to access this page.</p>

        <button type="button" onClick={() => navigate(getDefaultPath(user))}>
          Back to Dashboard
        </button>
      </main>
    );
  }

  /*
   * FALLBACK
   */
  return (
    <main className="access-denied">
      <h1>Page Not Found</h1>

      <button type="button" onClick={() => navigate(getDefaultPath(user))}>
        Back to Dashboard
      </button>
    </main>
  );
}
