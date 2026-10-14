import assert from 'node:assert/strict';
import test from 'node:test';
import { listGeneratedReports } from '../src/modules/conservation-reports/services/list-generated-reports.service.js';

test('report history remains manager-scoped, filtered and paginated', async () => {
  const calls = [];
  const repository = {
    async listForManager(criteria) {
      calls.push(['list', criteria]);
      return [{
        reportId: 'CR-2026-HISTORY01', reportType: 'INCIDENT_REPORT',
        parameters: { startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'), filters: {} },
        generatedAt: new Date('2026-02-01'), dataProvenance: ['DATABASE_RECORDS'],
        fileLocation: '/api/conservation-reports/CR-2026-HISTORY01',
      }];
    },
    async countForManager(criteria) { calls.push(['count', criteria]); return 12; },
  };

  const result = await listGeneratedReports({
    managerId: 'manager-1',
    query: { page: '2', limit: '5', reportType: 'INCIDENT_REPORT' },
  }, repository);

  assert.deepEqual(calls[0][1], { managerId: 'manager-1', reportType: 'INCIDENT_REPORT', skip: 5, limit: 5 });
  assert.equal(calls[1][1].managerId, 'manager-1');
  assert.equal(result.reports[0].reportId, 'CR-2026-HISTORY01');
  assert.deepEqual(result.pagination, { page: 2, limit: 5, total: 12, totalPages: 3 });
});

test('report history rejects unsupported filters and invalid pagination', async () => {
  const repository = { listForManager() {}, countForManager() {} };
  await assert.rejects(
    listGeneratedReports({ managerId: 'manager-1', query: { requestedBy: 'another-manager' } }, repository),
    /Only page, limit and reportType are allowed/,
  );
  await assert.rejects(
    listGeneratedReports({ managerId: 'manager-1', query: { limit: '100' } }, repository),
    /limit cannot exceed 25/,
  );
  await assert.rejects(
    listGeneratedReports({ managerId: 'manager-1', query: { reportType: 'UNKNOWN_REPORT' } }, repository),
    /Invalid conservation report type/,
  );
});
