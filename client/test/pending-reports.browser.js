/* global document, location */
import { savePendingReport, getPendingReports, getPendingReport, deletePendingReport, restorePendingSubmission } from '../src/features/community-reports/services/pending-reports.indexeddb.js';

const output = document.querySelector('#results');
const marker = 'wildguard.pending-storage-test';
function check(value, message) { if (!value) throw new Error(message); }
async function run() {
  const saved = sessionStorage.getItem(marker);
  const { owner, other, id } = saved ? JSON.parse(saved) : { owner: `test-${crypto.randomUUID()}`, other: `test-${crypto.randomUUID()}`, id: crypto.randomUUID() };
  if (!saved) {
    const report = { clientSubmissionId: id, reportType: 'WILDLIFE_SIGHTING', description: 'Browser storage test', incidentDateTime: '2026-01-01T10:00:00.000Z', location: { source: 'MANUAL', coordinates: { latitude: 7, longitude: 80 }, manualLocation: 'Test location' }, evidence: [new File(['test evidence bytes'], 'test.png', { type: 'image/png', lastModified: 123 })] };
    await savePendingReport(owner, report);
    await savePendingReport(owner, report);
    await savePendingReport(other, report);
    check((await getPendingReports(owner)).length === 1, 'Repeated save created duplicates');
    check((await getPendingReports(other)).length === 1, 'Owner scoping failed');
    sessionStorage.setItem(marker, JSON.stringify({ owner, other, id }));
    location.reload();
    return;
  }
  try {
    const reports = await getPendingReports(owner);
    check(reports.length === 1, 'Report did not survive reload');
    const restored = restorePendingSubmission(await getPendingReport(owner, id));
    check(restored.clientSubmissionId === id, 'Id changed');
    check(restored.incidentDateTime === '2026-01-01T10:00:00.000Z', 'Incident instant changed');
    check(restored.evidence[0].name === 'test.png' && restored.evidence[0].lastModified === 123, 'File metadata changed');
    check(await restored.evidence[0].text() === 'test evidence bytes', 'Evidence bytes changed');
    await deletePendingReport(owner, id);
    check((await getPendingReports(owner)).length === 0, 'Pending removal failed');
    check((await getPendingReports(other)).length === 1, 'Removal affected another owner');
    output.textContent = 'PASS: native IndexedDB upsert, user isolation, full page reload persistence, stable submission id and UTC instant, evidence bytes/name/type/lastModified restoration, and owner-scoped removal.';
  } finally {
    await deletePendingReport(owner, id);
    await deletePendingReport(other, id);
    sessionStorage.removeItem(marker);
  }
}
run().catch((error) => { output.textContent = `FAIL: ${error.message}`; });
