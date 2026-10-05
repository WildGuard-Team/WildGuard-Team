import { useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import FormAlert from '../features/auth/components/FormAlert.jsx';

export default function MemberLandingPage({ navigate }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function signOut() {
    setIsLoading(true);
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="member-page">
      <section className="member-card">
        <img src="/logo.jpg" alt="WildGuard" />
        <p className="member-kicker">Community member</p>
        <h1>Welcome, {user.fullName}.</h1>
        <p>Your WildGuard account is ready. Help your community by submitting a wildlife report.</p>
        <FormAlert type="error">{error}</FormAlert>
        <button className="primary-button" type="button" onClick={() => navigate('/reports/type')}>Submit a Community Report</button>
        <div className="member-logout">
        <button className="primary-button" type="button" onClick={signOut} disabled={isLoading}>{isLoading ? 'Signing out…' : 'Log out'}</button>
        </div>
      </section>
    </main>
  );
}
