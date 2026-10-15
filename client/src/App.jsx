import { useEffect, useState } from 'react';

import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';

import LoginPage from './features/auth/pages/LoginPage.jsx';
import RegisterPage from './features/auth/pages/RegisterPage.jsx';
import RangerRegisterPage from './features/auth/pages/RangerRegisterPage.jsx';
import PendingRangersPage from './features/auth/pages/PendingRangersPage.jsx';

import MemberLandingPage from './pages/MemberLandingPage.jsx';

import RangerDashboardPage from './features/field-incidents/pages/RangerDashboardPage.jsx';
import MyFieldIncidentsPage from './features/field-incidents/pages/MyFieldIncidentsPage.jsx';
import FieldIncidentTypePage from './features/field-incidents/pages/FieldIncidentTypePage.jsx';
import FieldIncidentDetailsPage from './features/field-incidents/pages/FieldIncidentDetailsPage.jsx';
import FieldIncidentEvidencePage from './features/field-incidents/pages/FieldIncidentEvidencePage.jsx';
import FieldIncidentReviewPage from './features/field-incidents/pages/FieldIncidentReviewPage.jsx';
import FieldIncidentConfirmationPage from './features/field-incidents/pages/FieldIncidentConfirmationPage.jsx';

import FieldIncidentSyncManager
  from './features/field-incidents/components/FieldIncidentSyncManager.jsx';

import {
  FieldIncidentDraftProvider,
} from './features/field-incidents/context/FieldIncidentDraftContext.jsx';

import {
  ReportDraftProvider,
} from './features/community-reports/context/ReportDraftContext.jsx';

import {
  useReportDraft,
} from './features/community-reports/context/useReportDraft.js';

import {
  hasCompleteCommunityReportDetails,
} from './features/community-reports/context/community-report-draft.storage.js';

import ReportTypePage from './features/community-reports/pages/ReportTypePage.jsx';
import ReportDetailsPage from './features/community-reports/pages/ReportDetailsPage.jsx';
import ReportEvidencePage from './features/community-reports/pages/ReportEvidencePage.jsx';
import ReviewReportPage from './features/community-reports/pages/ReviewReportPage.jsx';
import ReportConfirmationPage from './features/community-reports/pages/ReportConfirmationPage.jsx';
import MyReportsPage from './features/community-reports/pages/MyReportsPage.jsx';
import SubmittedReportDetailsPage from './features/community-reports/pages/SubmittedReportDetailsPage.jsx';
import ManagerCommunityReportsPage from './features/community-reports/pages/ManagerCommunityReportsPage.jsx';

import ConservationReportsPage from './features/conservation-reports/pages/ConservationReportsPage.jsx';
import ParkManagerDashboardPage from './features/conservation-reports/pages/ParkManagerDashboardPage.jsx';
import ConservationReportHistoryPage from './features/conservation-reports/pages/ConservationReportHistoryPage.jsx';
import ParkMapPage from './features/conservation-reports/pages/ParkMapPage.jsx';
import IncidentReportsPage from './features/incident-management/pages/IncidentReportsPage.jsx';

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

function AppRoutes() {
  const {
    user,
    isCheckingSession,
  } = useAuth();

  const {
    draft,
    evidenceHydrationStatus,
  } = useReportDraft();

  const [
    path,
    setPath,
  ] = useState(
    window.location.pathname,
  );

  const [
    message,
    setMessage,
  ] = useState('');

  useEffect(() => {
    const handlePopState = () => {
      setPath(
        window.location.pathname,
      );

      setMessage('');
    };

    window.addEventListener(
      'popstate',
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState,
      );
    };
  }, []);

  useEffect(() => {
    if (
      isCheckingSession
    ) {
      return;
    }

    let homePath =
      '/member';

    if (
      user?.role === 'PARK_MANAGER'
    ) {
      homePath =
        '/manager/dashboard';
    } else if (
      user?.role === 'PARK_RANGER'
    ) {
      homePath =
        '/ranger';
    }

    /*
     * Logged-in users should not stay
     * on public authentication pages.
     */
    if (
      user
      && (
        path === '/login'
        || path === '/register'
        || path === '/register-ranger'
        || path === '/'
      )
    ) {
      navigate(
        homePath,
        {
          replace: true,
        },
      );

      return;
    }

    /*
     * Park Manager route protection.
     */
    if (
      user?.role === 'PARK_MANAGER'
      && !path.startsWith(
        '/manager/',
      )
    ) {
      navigate(
        '/manager/reports',
        {
          replace: true,
        },
      );

      return;
    }

    /*
     * Park Ranger route protection.
     */
    if (
      user?.role === 'PARK_RANGER'
      && !path.startsWith(
        '/ranger',
      )
    ) {
      navigate(
        '/ranger',
        {
          replace: true,
        },
      );

      return;
    }

    /*
     * Community Member cannot access
     * Manager or Ranger pages.
     */
    if (
      user
      && user.role !== 'PARK_MANAGER'
      && user.role !== 'PARK_RANGER'
      && (
        path.startsWith(
          '/manager/',
        )
        || path.startsWith(
          '/ranger',
        )
      )
    ) {
      navigate(
        '/member',
        {
          replace: true,
        },
      );

      return;
    }

    /*
     * Unauthenticated route protection.
     */
    if (
      !user
      && path !== '/login'
      && path !== '/register'
      && path !== '/register-ranger'
    ) {
      navigate(
        '/login',
        {
          replace: true,
        },
      );
    }
  }, [
    isCheckingSession,
    path,
    user,
  ]);

  /*
   * Community report draft protection.
   */
  useEffect(() => {
    if (
      isCheckingSession
      || !user
      || user.role !== 'COMMUNITY_MEMBER'
    ) {
      return;
    }

    if (
      path === '/reports/details'
      && !draft.reportType
    ) {
      navigate(
        '/reports/type',
        {
          replace: true,
        },
      );
    } else if (
      (
        path === '/reports/evidence'
        || path === '/reports/review'
      )
      && !hasCompleteCommunityReportDetails(
        draft,
      )
    ) {
      navigate(
        draft.reportType
          ? '/reports/details'
          : '/reports/type',
        {
          replace: true,
        },
      );
    } else if (
      path === '/reports/review'
      && draft.evidenceRestoreRequired
      && evidenceHydrationStatus !== 'loading'
      && evidenceHydrationStatus !== 'idle'
    ) {
      navigate(
        '/reports/evidence',
        {
          replace: true,
        },
      );
    }
  }, [
    draft,
    evidenceHydrationStatus,
    isCheckingSession,
    path,
    user,
  ]);

  function navigate(
    nextPath,
    options = {},
  ) {
    const nextUrl =
      new URL(
        nextPath,
        window.location.origin,
      );

    const nextLocation =
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

    const currentLocation =
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (
      currentLocation
      !== nextLocation
    ) {
      window.history[
        options.replace
          ? 'replaceState'
          : 'pushState'
      ](
        {},
        '',
        nextLocation,
      );

      setPath(
        nextUrl.pathname,
      );
    }

    setMessage(
      options.message
      ?? '',
    );
  }

  const isPublicPath =
    path === '/login'
    || path === '/register'
    || path === '/register-ranger';

  if (
    isCheckingSession
    || (
      user
      && (
        path === '/login'
        || path === '/register'
        || path === '/register-ranger'
        || path === '/'
      )
    )
    || (
      !user
      && !isPublicPath
    )
  ) {
    return (
      <main
        className="session-loading"
        aria-live="polite"
      >
        <span
          className="loading-mark"
        />

        Checking your WildGuard session…
      </main>
    );
  }

  /*
   * Park Manager routes
   */
  if (user?.role === 'PARK_MANAGER' && path === '/manager/incidents') {
    return <IncidentReportsPage navigate={navigate} />;
  }

  if (
    user?.role === 'PARK_MANAGER'
    && path === '/manager/dashboard'
  ) {
    return (
      <ParkManagerDashboardPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_MANAGER'
    && path === '/manager/community-reports'
  ) {
    return (
      <ManagerCommunityReportsPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_MANAGER'
    && path === '/manager/reports/history'
  ) {
    return (
      <ConservationReportHistoryPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_MANAGER'
    && path === '/manager/map'
  ) {
    return (
      <ParkMapPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_MANAGER'
    && path === '/manager/rangers'
  ) {
    return (
      <PendingRangersPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_MANAGER'
  ) {
    return (
      <ConservationReportsPage
        navigate={navigate}
      />
    );
  }

  /*
   * Park Ranger routes
   */
  if (user?.role === 'PARK_RANGER' && path === '/ranger/incidents') {
    return <MyFieldIncidentsPage navigate={navigate} />;
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger/incidents/confirmation'
  ) {
    return (
      <FieldIncidentConfirmationPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger/incidents/review'
  ) {
    return (
      <FieldIncidentReviewPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger/incidents/evidence'
  ) {
    return (
      <FieldIncidentEvidencePage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger/incidents/details'
  ) {
    return (
      <FieldIncidentDetailsPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger/incidents/new'
  ) {
    return (
      <FieldIncidentTypePage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'PARK_RANGER'
    && path === '/ranger'
  ) {
    return (
      <RangerDashboardPage
        navigate={navigate}
      />
    );
  }

  /*
   * Community Member routes
   */
  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/my-reports'
  ) {
    return (
      <MyReportsPage
        key={user.id}
        navigate={navigate}
        message={message}
      />
    );
  }

  const reportDetailsMatch = path.match(/^\/reports\/my-reports\/([^/]+)\/?$/);

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && reportDetailsMatch
  ) {
    return (
      <SubmittedReportDetailsPage
        key={`${user.id}:${reportDetailsMatch[1]}`}
        reportId={reportDetailsMatch[1]}
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/type'
  ) {
    return (
      <ReportTypePage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/details'
  ) {
    return (
      <ReportDetailsPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/evidence'
  ) {
    return (
      <ReportEvidencePage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/review'
  ) {
    return (
      <ReviewReportPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
    && path === '/reports/confirmation'
  ) {
    return (
      <ReportConfirmationPage
        navigate={navigate}
      />
    );
  }

  if (
    user?.role === 'COMMUNITY_MEMBER'
  ) {
    return (
      <MemberLandingPage
        navigate={navigate}
      />
    );
  }

  /*
   * Public routes
   */
  if (
    path === '/register-ranger'
  ) {
    return (
      <RangerRegisterPage
        navigate={navigate}
      />
    );
  }

  if (
    path === '/register'
  ) {
    return (
      <RegisterPage
        navigate={navigate}
      />
    );
  }

  return (
    <LoginPage
      navigate={navigate}
      successMessage={message}
    />
  );
}
