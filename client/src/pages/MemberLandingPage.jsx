import { useAuth } from '../context/useAuth.js';
import CommunityLayout from '../features/community-reports/components/CommunityLayout.jsx';
import CommunityIcon from '../features/community-reports/components/CommunityIcon.jsx';
import { useReportDraft } from '../features/community-reports/context/useReportDraft.js';

export default function MemberLandingPage({ navigate }) {
  const { user } = useAuth();
  const { resetDraft } = useReportDraft();

  return (
    <CommunityLayout navigate={navigate} active="dashboard"><section className="dashboard-welcome"><p>Community member dashboard</p><h1>Welcome back, {user.fullName}.</h1><span>Help WildGuard protect wildlife by sharing incidents in your community.</span><button type="button" className="primary-button" onClick={() => { resetDraft(); navigate('/reports/type'); }}>Submit a Community Report <CommunityIcon name="chevron" size={20} /></button></section></CommunityLayout>
  );
}
