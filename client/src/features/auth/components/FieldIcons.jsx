function Icon({ children }) {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function EmailIcon() {
  return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>;
}

export function LockIcon() {
  return <Icon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>;
}

export function EyeIcon() {
  return <Icon><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></Icon>;
}

export function EyeOffIcon() {
  return <Icon><path d="m3 3 18 18" /><path d="M10.6 6.6A10.7 10.7 0 0 1 12 6.5c6.1 0 9.5 5.5 9.5 5.5a18 18 0 0 1-3.1 3.6M6.2 6.2A17.4 17.4 0 0 0 2.5 12S5.9 17.5 12 17.5a10.6 10.6 0 0 0 2.3-.3" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>;
}
