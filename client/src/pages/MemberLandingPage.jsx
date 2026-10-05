import { useAuth } from '../context/useAuth.js';
import CommunityLayout from '../features/community-reports/components/CommunityLayout.jsx';
import CommunityIcon from '../features/community-reports/components/CommunityIcon.jsx';

export default function MemberLandingPage({ navigate }) {
  const { user } = useAuth();

  return (
    <CommunityLayout navigate={navigate} active="dashboard"><section className="dashboard-welcome"><p>Community member dashboard</p><h1>Welcome back, {user.fullName}.</h1><span>Help WildGuard protect wildlife by sharing incidents in your community.</span><button type="button" className="primary-button" onClick={() => navigate('/reports/type')}>Submit a Community Report <CommunityIcon name="chevron" size={20} /></button></section></CommunityLayout>
  );
}
