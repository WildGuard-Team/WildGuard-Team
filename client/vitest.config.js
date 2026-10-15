import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/unit/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/features/community-reports/**/*.{js,jsx}', 'src/pages/MemberLandingPage.jsx'],
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: '../coverage/community-reports/frontend',
      thresholds: { perFile: true, lines: 80, functions: 80, branches: 80 },
    },
  },
});
