import { createContext, useEffect, useMemo, useState } from 'react';
import { getCurrentMember, loginMember, logoutMember } from '../features/auth/services/authApi.js';

const AuthContext = createContext(null);
const offlineProfileKey = 'wildguard.offlineProfile';
// Display-only identity for this tab while offline. API authorization still uses the server cookie.
function rememberProfile(user) {
  try {
    if (user) sessionStorage.setItem(offlineProfileKey, JSON.stringify({ id: user.id, fullName: user.fullName, role: user.role }));
    else sessionStorage.removeItem(offlineProfileKey);
  } catch { /* Offline reload is unavailable when session storage is disabled. */ }
}
function offlineProfile() {
  try {
    const user = JSON.parse(sessionStorage.getItem(offlineProfileKey));
    return typeof user?.id === 'string' && typeof user.fullName === 'string' && user.role === 'COMMUNITY_MEMBER' ? user : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    if (navigator.onLine === false) {
      Promise.resolve().then(() => { if (active) { setUser(offlineProfile()); setIsCheckingSession(false); } });
      return () => { active = false; };
    }
    getCurrentMember()
      .then(({ user: currentUser }) => { if (active) { rememberProfile(currentUser); setUser(currentUser); } })
      .catch(() => { if (active) { rememberProfile(null); setUser(null); } })
      .finally(() => { if (active) setIsCheckingSession(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    isCheckingSession,
    async login(credentials) {
      const { user: authenticatedUser } = await loginMember(credentials);
      rememberProfile(authenticatedUser);
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    async logout() {
      await logoutMember();
      rememberProfile(null);
      setUser(null);
    },
  }), [user, isCheckingSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
