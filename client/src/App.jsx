import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import RegisterPage from './features/auth/pages/RegisterPage.jsx';
import MemberLandingPage from './pages/MemberLandingPage.jsx';
import { ReportDraftProvider } from './features/community-reports/context/ReportDraftContext.jsx';
import ReportTypePage from './features/community-reports/pages/ReportTypePage.jsx';
import ReportDetailsPage from './features/community-reports/pages/ReportDetailsPage.jsx';
import ReportEvidencePage from './features/community-reports/pages/ReportEvidencePage.jsx';
import ReviewReportPage from './features/community-reports/pages/ReviewReportPage.jsx';
import ReportConfirmationPage from './features/community-reports/pages/ReportConfirmationPage.jsx';

export default function App() {
  return <AuthProvider><ReportDraftProvider><AppRoutes /></ReportDraftProvider></AuthProvider>;
}

function AppRoutes() {
  const { user, isCheckingSession } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handlePopState = () => { setPath(window.location.pathname); setMessage(''); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isCheckingSession) return;
    if (user && (path === '/login' || path === '/register' || path === '/')) navigate('/member', { replace: true });
    if (!user && path !== '/login' && path !== '/register') navigate('/login', { replace: true });
  }, [isCheckingSession, path, user]);

  function navigate(nextPath, options = {}) {
    if (window.location.pathname !== nextPath) {
      window.history[options.replace ? 'replaceState' : 'pushState']({}, '', nextPath);
      setPath(nextPath);
    }
    setMessage(options.message ?? '');
  }

  if (isCheckingSession || (user && (path === '/login' || path === '/register' || path === '/')) || (!user && path !== '/login' && path !== '/register')) {
    return <main className="session-loading" aria-live="polite"><span className="loading-mark" />Checking your WildGuard session…</main>;
  }
  if (user && path === '/reports/type') return <ReportTypePage navigate={navigate} />;
  if (user && path === '/reports/details') return <ReportDetailsPage navigate={navigate} />;
  if (user && path === '/reports/evidence') return <ReportEvidencePage navigate={navigate} />;
  if (user && path === '/reports/review') return <ReviewReportPage navigate={navigate} />;
  if (user && path === '/reports/confirmation') return <ReportConfirmationPage navigate={navigate} />;
  if (user) return <MemberLandingPage navigate={navigate} />;
  if (path === '/register') return <RegisterPage navigate={navigate} />;
  return <LoginPage navigate={navigate} successMessage={message} />;
}
