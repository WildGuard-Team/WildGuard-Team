import { useCallback, useEffect, useState } from "react";

import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth.js";

import LoginPage from "./features/auth/pages/LoginPage.jsx";
import RegisterPage from "./features/auth/pages/RegisterPage.jsx";
import RangerRegisterPage from "./features/auth/pages/RangerRegisterPage.jsx";
import PendingRangersPage from "./features/auth/pages/PendingRangersPage.jsx";

import MemberLandingPage from "./pages/MemberLandingPage.jsx";

/* =========================
   FIELD INCIDENT / RANGER
========================= */

import RangerDashboardPage from "./features/field-incidents/pages/RangerDashboardPage.jsx";
import MyFieldIncidentsPage from "./features/field-incidents/pages/MyFieldIncidentsPage.jsx";
import FieldIncidentTypePage from "./features/field-incidents/pages/FieldIncidentTypePage.jsx";
import FieldIncidentDetailsPage from "./features/field-incidents/pages/FieldIncidentDetailsPage.jsx";
import FieldIncidentEvidencePage from "./features/field-incidents/pages/FieldIncidentEvidencePage.jsx";
import FieldIncidentReviewPage from "./features/field-incidents/pages/FieldIncidentReviewPage.jsx";
import FieldIncidentConfirmationPage from "./features/field-incidents/pages/FieldIncidentConfirmationPage.jsx";

import FieldIncidentSyncManager from "./features/field-incidents/components/FieldIncidentSyncManager.jsx";

import { FieldIncidentDraftProvider } from "./features/field-incidents/context/FieldIncidentDraftContext.jsx";

/* =========================
   COMMUNITY REPORTS
========================= */

import { ReportDraftProvider } from "./features/community-reports/context/ReportDraftContext.jsx";

import { useReportDraft } from "./features/community-reports/context/useReportDraft.js";

import { hasCompleteCommunityReportDetails } from "./features/community-reports/context/community-report-draft.storage.js";

import ReportTypePage from "./features/community-reports/pages/ReportTypePage.jsx";
import ReportDetailsPage from "./features/community-reports/pages/ReportDetailsPage.jsx";
import ReportEvidencePage from "./features/community-reports/pages/ReportEvidencePage.jsx";
import ReviewReportPage from "./features/community-reports/pages/ReviewReportPage.jsx";
import ReportConfirmationPage from "./features/community-reports/pages/ReportConfirmationPage.jsx";

import MyReportsPage from "./features/community-reports/pages/MyReportsPage.jsx";
import SubmittedReportDetailsPage from "./features/community-reports/pages/SubmittedReportDetailsPage.jsx";
import ManagerCommunityReportsPage from "./features/community-reports/pages/ManagerCommunityReportsPage.jsx";

import SharedAlertsPage from "./features/community-reports/pages/SharedAlertsPage.jsx";
import SharedAlertDetailsPage from "./features/community-reports/pages/SharedAlertDetailsPage.jsx";

/* =========================
   CONSERVATION / MANAGER
========================= */

import ConservationReportsPage from "./features/conservation-reports/pages/ConservationReportsPage.jsx";
import ParkManagerDashboardPage from "./features/conservation-reports/pages/ParkManagerDashboardPage.jsx";
import ConservationReportHistoryPage from "./features/conservation-reports/pages/ConservationReportHistoryPage.jsx";
import ParkMapPage from "./features/conservation-reports/pages/ParkMapPage.jsx";

/* =========================
   MONITORING
========================= */

import MonitoringRoutes from "./features/monitoring/MonitoringRoutes.jsx";

import "./features/monitoring/styles/monitoring.css";

/* =========================
   ROLES
========================= */

const ROLES = Object.freeze({
  COMMUNITY_MEMBER: "COMMUNITY_MEMBER",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  PARK_RANGER: "PARK_RANGER",
  PARK_MANAGER: "PARK_MANAGER",
  CONSERVATION_RESEARCHER: "CONSERVATION_RESEARCHER",
});

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/register-ranger"]);

function getDefaultPath(user) {
  switch (user?.role) {
    case ROLES.SYSTEM_ADMIN:
      return "/monitoring";

    case ROLES.PARK_MANAGER:
      return "/manager/dashboard";

    case ROLES.PARK_RANGER:
      return "/ranger";

    case ROLES.COMMUNITY_MEMBER:
      return "/member";

    default:
      return "/alerts";
  }
}

function isMonitoringPath(path) {
  return path === "/monitoring" || path.startsWith("/monitoring/");
}

function isSharedAlertDetailsPath(path) {
  return (
    path.startsWith("/alerts/") && path.split("/").filter(Boolean).length === 2
  );
}

function isCommunityReportCreationPath(path) {
  return (
    path === "/reports/type" ||
    path === "/reports/details" ||
    path === "/reports/evidence" ||
    path === "/reports/review" ||
    path === "/reports/confirmation"
  );
}

/* =========================
   APP
========================= */

export default function App() {
  return (
    <AuthProvider>
      <ReportDraftProvider>
        <FieldIncidentDraftProvider>
          <FieldIncidentSyncManager />

          <AppRoutes />
        </FieldIncidentDraftProvider>
      </ReportDraftProvider>
    </AuthProvider>
  );
}

/* =========================
   ROUTES
========================= */

function AppRoutes() {
  const { user, isCheckingSession } = useAuth();

  const { draft, evidenceHydrationStatus } = useReportDraft();

  const [path, setPath] = useState(() => window.location.pathname);

  const [message, setMessage] = useState("");

  const navigate = useCallback((nextPath, options = {}) => {
    const { replace = false, message: nextMessage = "" } = options;

    const nextUrl = new URL(nextPath, window.location.origin);

    const nextLocation = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (currentLocation !== nextLocation) {
      window.history[replace ? "replaceState" : "pushState"](
        {},
        "",
        nextLocation,
      );
    }

    setPath(nextUrl.pathname);
    setMessage(nextMessage);
  }, []);

  /* =========================
     BROWSER BACK / FORWARD
  ========================= */

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

  /* =========================
     AUTH REDIRECTS
  ========================= */

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

  /* =========================
     COMMUNITY REPORT FLOW
  ========================= */

  useEffect(() => {
    if (
      isCheckingSession ||
      !user ||
      user.role !== ROLES.COMMUNITY_MEMBER ||
      !isCommunityReportCreationPath(path)
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

  /* =========================
     LOADING / REDIRECT STATE
  ========================= */

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

  /* =========================
     PUBLIC ROUTES
  ========================= */

  if (!user) {
    if (path === "/register-ranger") {
      return <RangerRegisterPage navigate={navigate} />;
    }

    if (path === "/register") {
      return <RegisterPage navigate={navigate} />;
    }

    return <LoginPage navigate={navigate} successMessage={message} />;
  }

  /* =========================
     SHARED ALERT ROUTES

     All authenticated users
     can access these.
  ========================= */

  if (path === "/alerts") {
    return <SharedAlertsPage navigate={navigate} />;
  }

  if (isSharedAlertDetailsPath(path)) {
    const alertId = path.split("/").filter(Boolean)[1];

    return <SharedAlertDetailsPage navigate={navigate} alertId={alertId} />;
  }

  /* =========================
     SYSTEM ADMIN MONITORING
  ========================= */

  if (isMonitoringPath(path)) {
    if (user.role !== ROLES.SYSTEM_ADMIN) {
      return (
        <AccessDenied
          navigate={navigate}
          user={user}
          message="System Administrator access is required to access the monitoring system."
        />
      );
    }

    return <MonitoringRoutes path={path} navigate={navigate} />;
  }

  /* =========================
     PARK MANAGER
  ========================= */

  if (user.role === ROLES.PARK_MANAGER) {
    if (path === "/manager/dashboard") {
      return <ParkManagerDashboardPage navigate={navigate} />;
    }

    if (path === "/manager/community-reports") {
      return <ManagerCommunityReportsPage navigate={navigate} />;
    }

    if (path === "/manager/reports/history") {
      return <ConservationReportHistoryPage navigate={navigate} />;
    }

    if (path === "/manager/map") {
      return <ParkMapPage navigate={navigate} />;
    }

    if (path === "/manager/rangers") {
      return <PendingRangersPage navigate={navigate} />;
    }

    if (path === "/manager/reports") {
      return <ConservationReportsPage navigate={navigate} />;
    }

    if (path.startsWith("/manager/")) {
      return <PageNotFound navigate={navigate} user={user} />;
    }
  }

  /* =========================
     PARK RANGER
  ========================= */

  if (user.role === ROLES.PARK_RANGER) {
    if (path === "/ranger/incidents/confirmation") {
      return <FieldIncidentConfirmationPage navigate={navigate} />;
    }

    if (path === "/ranger/incidents/review") {
      return <FieldIncidentReviewPage navigate={navigate} />;
    }

    if (path === "/ranger/incidents/evidence") {
      return <FieldIncidentEvidencePage navigate={navigate} />;
    }

    if (path === "/ranger/incidents/details") {
      return <FieldIncidentDetailsPage navigate={navigate} />;
    }

    if (path === "/ranger/incidents/new") {
      return <FieldIncidentTypePage navigate={navigate} />;
    }

    if (path === "/ranger/incidents") {
      return <MyFieldIncidentsPage navigate={navigate} />;
    }

    if (path === "/ranger") {
      return <RangerDashboardPage navigate={navigate} />;
    }

    if (path.startsWith("/ranger")) {
      return <PageNotFound navigate={navigate} user={user} />;
    }
  }

  /* =========================
     COMMUNITY MEMBER
  ========================= */

  if (user.role === ROLES.COMMUNITY_MEMBER) {
    if (path === "/reports/my-reports") {
      return (
        <MyReportsPage key={user.id} navigate={navigate} message={message} />
      );
    }

    const reportDetailsMatch = path.match(
      /^\/reports\/my-reports\/([^/]+)\/?$/,
    );

    if (reportDetailsMatch) {
      return (
        <SubmittedReportDetailsPage
          key={`${user.id}:${reportDetailsMatch[1]}`}
          reportId={reportDetailsMatch[1]}
          navigate={navigate}
        />
      );
    }

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

  /* =========================
     ROLE ACCESS PROTECTION
  ========================= */

  if (
    path === "/member" ||
    path.startsWith("/reports/") ||
    path.startsWith("/manager/") ||
    path.startsWith("/ranger")
  ) {
    return (
      <AccessDenied
        navigate={navigate}
        user={user}
        message="You do not have permission to access this page."
      />
    );
  }

  /* =========================
     FALLBACK
  ========================= */

  return <PageNotFound navigate={navigate} user={user} />;
}

/* =========================
   SMALL SHARED COMPONENTS
========================= */

function AccessDenied({ navigate, user, message }) {
  return (
    <main className="access-denied">
      <h1>Access Denied</h1>

      <p>{message}</p>

      <button type="button" onClick={() => navigate(getDefaultPath(user))}>
        Back to Dashboard
      </button>
    </main>
  );
}

function PageNotFound({ navigate, user }) {
  return (
    <main className="access-denied">
      <h1>Page Not Found</h1>

      <button type="button" onClick={() => navigate(getDefaultPath(user))}>
        Back to Dashboard
      </button>
    </main>
  );
}
