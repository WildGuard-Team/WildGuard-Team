import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import RegisterPage from './features/auth/pages/RegisterPage.jsx';
import MemberLandingPage from './pages/MemberLandingPage.jsx';

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
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
    if (!user && path === '/member') navigate('/login', { replace: true });
  }, [isCheckingSession, path, user]);

  function navigate(nextPath, options = {}) {
    if (window.location.pathname !== nextPath) {
      window.history[options.replace ? 'replaceState' : 'pushState']({}, '', nextPath);
      setPath(nextPath);
    }
    setMessage(options.message ?? '');
  }

  if (isCheckingSession || (user && path !== '/member') || (!user && path === '/member')) {
    return <main className="session-loading" aria-live="polite"><span className="loading-mark" />Checking your WildGuard session…</main>;
  }
  if (user) return <MemberLandingPage navigate={navigate} />;
  if (path === '/register') return <RegisterPage navigate={navigate} />;
  return <LoginPage navigate={navigate} successMessage={message} />;
}
