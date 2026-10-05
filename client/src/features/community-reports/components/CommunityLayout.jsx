import { useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import FormAlert from '../../auth/components/FormAlert.jsx';
import CommunityIcon from './CommunityIcon.jsx';

const navigation = [
  ['dashboard', 'Dashboard', '/member'], ['report', 'Submit Report', '/reports/type'],
  ['map', 'Map'], ['folder', 'My Reports'], ['bell', 'Alerts'], ['settings', 'Settings'],
];

export default function CommunityLayout({ children, navigate, active = 'report' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false); const [error, setError] = useState(''); const [isLoggingOut, setIsLoggingOut] = useState(false);
  async function signOut() {
    setIsLoggingOut(true); setError('');
    try { await logout(); navigate('/login'); } catch (requestError) { setError(requestError.message); } finally { setIsLoggingOut(false); }
  }
  return <div className="community-app">
    <button className="sidebar-toggle" type="button" onClick={() => setOpen(true)} aria-label="Open navigation"><CommunityIcon name="menu" /></button>
    <aside className={`community-sidebar${open ? ' is-open' : ''}`} aria-label="Community navigation">
      <div className="sidebar-brand"><img src="/logo.jpg" alt="WildGuard" /><span>Community Member</span><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation"><CommunityIcon name="close" /></button></div>
      <nav>{navigation.map(([icon, label, path]) => path ? <button key={label} className={active === icon ? 'is-active' : ''} type="button" onClick={() => { navigate(path); setOpen(false); }}><CommunityIcon name={icon} /><span>{label}</span></button> : <span key={label} className="sidebar-unavailable" aria-disabled="true"><CommunityIcon name={icon} /><span>{label}</span><small>Coming soon</small></span>)}</nav>
      <div className="sidebar-footer"><FormAlert>{error}</FormAlert><button type="button" onClick={signOut} disabled={isLoggingOut}><CommunityIcon name="logout" /><span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span></button></div>
    </aside>
    {open && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="community-main"><header className="community-header"><span className="header-notification"><CommunityIcon name="bell" size={22} /><i /></span><span className="header-avatar">{user.fullName.slice(0, 1)}</span><span className="header-name">{user.fullName}</span><CommunityIcon name="chevron" size={19} /></header><main className="community-content">{children}</main></div>
  </div>;
}
