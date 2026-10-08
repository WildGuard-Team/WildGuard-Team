const paths = {
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 3h2m4 0h2',
  document: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h4',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4l3 2',
  'check-circle': 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14.01l-3-3',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  edit: 'm14 5 5 5M3 21l5-1L21 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L4 16l-1 5Z',
  plus: 'M12 4v16M4 12h16',
  play: 'm8 5 11 7-11 7V5Z',
  dashboard: 'M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8Z',
  report: 'M12 3 21 19H3L12 3Zm0 5.2v4.4m0 3.2v.1',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  folder: 'M4 5h6l2 2h8v12H4V5Zm4 6h8m-8 4h6',
  bell: 'M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
  settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm0-13.5v3m0 14v3m10-10h-3M5 12H2m17.1-7.1-2.1 2.1M7 17.1l-2.1 2.1m14.2 0-2.1-2.1M7 6.9 4.9 4.8',
  logout: 'M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m4-4 4-4-4-4m4 4H9',
  paw: 'M12 20c-3.5 0-6-1.5-6-4.2 0-1.8 1.3-3.4 3.2-3.4.9 0 1.7.3 2.3.8.2-2.4.5-6.2 2.5-6.2s2.3 3.8 2.5 6.2c.6-.5 1.4-.8 2.3-.8 1.9 0 3.2 1.6 3.2 3.4C18 18.5 15.5 20 12 20ZM6.2 9.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Zm11.6 0a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m13-5a4 4 0 0 1 5 3.5V20m-5-9.5a3 3 0 1 0 0-6m-4 6a3.5 3.5 0 1 0-7 0',
  shield: 'M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Zm0 6v5m0 3v.1',
  chevron: 'm9 18 6-6-6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
};

export default function CommunityIcon({ name, size = 24, className }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
