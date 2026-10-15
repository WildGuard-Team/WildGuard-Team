import { createContext, useEffect, useMemo, useState } from 'react';
import { getCurrentMember, loginMember, logoutMember } from '../features/auth/services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentMember()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setIsCheckingSession(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    isCheckingSession,
    async login(credentials) {
      const { user: authenticatedUser } = await loginMember(credentials);
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    async logout() {
      await logoutMember();
      setUser(null);
    },
  }), [user, isCheckingSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
