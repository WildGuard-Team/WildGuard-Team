import ApiHealth from '../components/common/ApiHealth.jsx';

export default function SetupPage() {
  return (
    <section className="setup-card" aria-labelledby="setup-heading">
      <p className="eyebrow">WildGuard development workspace</p>
      <h1 id="setup-heading">Project setup is running.</h1>
      <p>The React frontend is ready. This foundation connects our team’s future wildlife reporting modules.</p>
      <ApiHealth />
      <p className="next-step">Next milestone: Community Member registration and login.</p>
    </section>
  );
}
