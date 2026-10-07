import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportShareUrl, downloadReportCsv, shareReport,
} from '../src/features/conservation-reports/services/report-delivery.service.js';

test('share URL targets the protected Park Manager report view', () => {
  assert.equal(
    buildReportShareUrl('CR-2026-ABC123', 'http://localhost:3000'),
    'http://localhost:3000/manager/reports?report=CR-2026-ABC123',
  );
});

test('share falls back to copying the report link', async () => {
  let copied;
  const result = await shareReport({ reportId: 'CR-2026-ABC123' }, {
    origin: 'http://localhost:3000',
    navigatorObject: { clipboard: { writeText: async (value) => { copied = value; } } },
  });

  assert.equal(result.method, 'copied');
  assert.equal(copied, result.url);
});

test('CSV download releases its object URL after triggering the browser download', async () => {
  const events = [];
  const link = {
    style: {}, click: () => events.push('clicked'), remove: () => events.push('removed'),
  };
  const dependencies = {
    fetchExport: async () => ({ blob: { csv: true }, fileName: 'CR-2026-ABC123.csv' }),
    documentObject: {
      createElement: () => link,
      body: { append: () => events.push('appended') },
    },
    urlObject: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: (value) => events.push(`revoked:${value}`),
    },
  };

  const fileName = await downloadReportCsv('CR-2026-ABC123', dependencies);

  assert.equal(fileName, 'CR-2026-ABC123.csv');
  assert.equal(link.href, 'blob:test');
  assert.equal(link.download, fileName);
  assert.deepEqual(events, ['appended', 'clicked', 'removed', 'revoked:blob:test']);
});

test('failed CSV export rejects without starting a browser download', async () => {
  let createdLink = false;
  await assert.rejects(() => downloadReportCsv('CR-2026-ABC123', {
    fetchExport: async () => { throw new Error('Export unavailable'); },
    documentObject: { createElement: () => { createdLink = true; } },
    urlObject: {},
  }), /Export unavailable/);
  assert.equal(createdLink, false);
});
