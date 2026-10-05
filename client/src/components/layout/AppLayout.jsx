export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header><span className="brand">WildGuard</span><span>Community wildlife reporting</span></header>
      <main>{children}</main>
      <footer>Phase 1 · Project foundation</footer>
    </div>
  );
}
