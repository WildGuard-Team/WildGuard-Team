import assert from 'node:assert/strict';
import test from 'node:test';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { HttpError } from '../src/shared/http-error.js';
import { createCommunityReport } from '../src/modules/community-reports/services/create-community-report.service.js';
import { validateEvidenceFiles, uploadEvidenceFiles } from '../src/modules/community-reports/services/evidence-upload.service.js';
import { deleteEvidenceAssets } from '../src/modules/community-reports/services/evidence-delete.service.js';
import { getMyReports } from '../src/modules/community-reports/services/my-reports.service.js';
import { getMyReportDetails } from '../src/modules/community-reports/services/my-report-details.service.js';
import { sanitizeEvidenceOriginalName, toEvidenceMetadata, toPublicEvidence } from '../src/modules/community-reports/utils/evidence-mapper.js';
import { toGeoJsonPoint, toApiCoordinates, toPublicLocation } from '../src/modules/community-reports/utils/location-mapper.js';
import { EVIDENCE_IMAGE_MAX_BYTES, EVIDENCE_VIDEO_MAX_BYTES } from '../src/modules/community-reports/config/evidence.constants.js';

const owner = '0123456789abcdef01234567';
const input = () => ({ clientSubmissionId: 'submission-1', reportType: 'WILDLIFE_SIGHTING', description: 'An elephant near the forest.', incidentDateTime: new Date('2024-01-01T10:00:00Z'), location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Forest entrance' } });
const file = (overrides = {}) => ({ buffer: Buffer.from('png'), size: 3, mimetype: 'image/png', originalname: 'photo.png', ...overrides });
const stored = (data = {}) => ({ id: 'abcdef0123456789abcdef01', _id: 'abcdef0123456789abcdef01', ...input(), source: 'WEB', referenceNumber: 'WG-20240101-ABCDEF123456', location: { source: 'MAP', point: { type: 'Point', coordinates: [80, 7] }, displayName: 'Forest entrance' }, createdAt: new Date('2024-01-02'), ...data });

function cloudinaryFake({ results = [], failDestroy = false, failStream = false } = {}) {
  const uploaded = [], deleted = [];
  return { uploaded, deleted, uploader: {
    upload_stream(options, callback) {
      const index = uploaded.length;
      return new Writable({
        write(chunk, encoding, done) { done(failStream ? new Error('stream disconnected') : undefined); },
        final(done) {
          const result = results[index] ?? { public_id: `asset-${index}`, secure_url: 'https://example.test/photo.png', resource_type: options.resource_type, bytes: 3, format: 'png' };
          uploaded.push({ options, result });
          if (result instanceof Error) callback(result);
          else if (result === 'no-result') callback(null, null);
          else callback(null, result);
          done();
        },
      });
    },
    async destroy(publicId, options) { deleted.push({ publicId, options }); if (failDestroy) throw new Error('provider unavailable'); return { result: 'ok' }; },
  } };
}

test('evidence validation covers allowed media, inclusive size limits, unsupported types and empty files', () => {
  assert.deepEqual(validateEvidenceFiles(), []);
  assert.deepEqual(validateEvidenceFiles(['image/jpeg', 'image/png', 'image/webp'].map((mimetype) => file({ mimetype, size: EVIDENCE_IMAGE_MAX_BYTES }))), ['image', 'image', 'image']);
  assert.deepEqual(validateEvidenceFiles([file({ mimetype: 'video/mp4', size: EVIDENCE_VIDEO_MAX_BYTES })]), ['video']);
  for (const bad of [null, file({ buffer: 'png' }), file({ size: 0 })]) assert.throws(() => validateEvidenceFiles([bad]), { status: 400, message: 'Evidence files must not be empty.' });
  assert.throws(() => validateEvidenceFiles([file({ mimetype: 'application/pdf' })]), { status: 400, message: 'Unsupported evidence file type.' });
  assert.throws(() => validateEvidenceFiles(Array.from({ length: 4 }, () => file())), { status: 413 });
  assert.throws(() => validateEvidenceFiles([file({ size: EVIDENCE_IMAGE_MAX_BYTES + 1 })]), { status: 413, message: 'Image files must not exceed 5 MB.' });
  assert.throws(() => validateEvidenceFiles([file({ mimetype: 'video/mp4', size: EVIDENCE_VIDEO_MAX_BYTES + 1 })]), { status: 413, message: 'Video files must not exceed 25 MB.' });
});

test('uploads preserve media options, record each completed asset and expose sanitized metadata', async () => {
  const cloudinary = cloudinaryFake();
  const completed = [];
  const result = await uploadEvidenceFiles([file({ originalname: '../forest\u0000.png' }), file({ mimetype: 'video/mp4', originalname: 'clip.mp4' })], cloudinary, (asset) => completed.push(asset));
  assert.deepEqual(completed, result);
  assert.equal(result[0].originalName, '.._forest_.png');
  assert.deepEqual(cloudinary.uploaded.map(({ options }) => options), ['image', 'video'].map((resource_type) => ({ folder: 'wildguard/community-reports', resource_type, overwrite: false, unique_filename: true, use_filename: false })));
  assert.equal(result[1].resourceType, 'video');
});

test('upload callback absence, callback errors and stream errors reject without fabricating evidence', async (t) => {
  for (const cloudinary of [cloudinaryFake({ results: ['no-result'] }), cloudinaryFake({ results: [new Error('private provider detail')] }), cloudinaryFake({ failStream: true })]) {
    const assets = [];
    await assert.rejects(uploadEvidenceFiles([file()], cloudinary, (asset) => assets.push(asset)));
    assert.deepEqual(assets, []);
  }
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  const cause = Object.assign(new Error('private provider detail'), { statusCode: 502, code: 'SERVICE_DOWN', cause: new Error('upstream') });
  await assert.rejects(uploadEvidenceFiles([file()], cloudinaryFake({ results: [cause] }), () => {}, 'development'), cause);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1].httpCode, 502);
  assert.equal(errors[0][1].resourceType, 'image');
});

test('evidence deletion attempts every asset and rejects partial cleanup failure', async () => {
  const deleted = [];
  const cloudinary = { uploader: { async destroy(id, options) { deleted.push({ id, options }); if (id === 'bad') throw new Error('failed'); } } };
  await assert.rejects(deleteEvidenceAssets([{ publicId: 'bad', resourceType: 'image' }, { publicId: 'good', resourceType: 'video' }], cloudinary), { message: 'One or more evidence assets could not be removed.' });
  assert.deepEqual(deleted, [{ id: 'bad', options: { resource_type: 'image', invalidate: true } }, { id: 'good', options: { resource_type: 'video', invalidate: true } }]);
  await deleteEvidenceAssets([], cloudinary);
});

test('new report creation passes owner, GeoJSON coordinates and server source without leaking private fields', async () => {
  let written;
  const repository = { async findBySubmission(reporterId, id) { assert.equal(reporterId, owner); assert.equal(id, 'submission-1'); return null; }, async create(data) { written = data; return stored(data); } };
  const result = await createCommunityReport(input(), owner, repository);
  assert.equal(result.duplicateRetry, undefined);
  assert.equal(written.reporterId, owner);
  assert.equal(written.source, 'WEB');
  assert.deepEqual(written.location.point, { type: 'Point', coordinates: [80, 7] });
  assert.match(written.referenceNumber, /^WG-\d{8}-[A-F0-9]{12}$/);
  assert.equal(result.report.incidentDateTime, '2024-01-01T10:00:00.000Z');
  assert.deepEqual(result.report.location.coordinates, { latitude: 7, longitude: 80 });
  assert.equal(result.report.reporterId, undefined);
  assert.equal(result.report.clientSubmissionId, undefined);
});

test('persisted retry is owner-scoped, returns original legacy report, and skips evidence revalidation/upload', async () => {
  let creates = 0;
  const cloudinary = cloudinaryFake();
  const original = stored({ incidentDateTime: undefined, evidence: undefined });
  const repository = { async findBySubmission(reporterId, id) { assert.deepEqual([reporterId, id], [owner, 'submission-1']); return original; }, async create() { creates += 1; } };
  const result = await createCommunityReport(input(), owner, repository, [file({ mimetype: 'unsupported' })], cloudinary);
  assert.equal(result.duplicateRetry, true);
  assert.equal(result.report.incidentDateTime, null);
  assert.deepEqual(result.report.evidence, []);
  assert.equal(creates, 0);
  assert.equal(cloudinary.uploaded.length, 0);
});

test('coalesced concurrent retries share one persistence attempt and a failed attempt releases its lock', async () => {
  let release, creates = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const repository = { async findBySubmission() { return null; }, async create(data) { creates += 1; await gate; return stored(data); } };
  const first = createCommunityReport(input(), owner, repository);
  const retry = createCommunityReport(input(), owner, repository);
  release();
  const results = await Promise.all([first, retry]);
  assert.equal(creates, 1);
  assert.equal(results[1].duplicateRetry, true);
  assert.deepEqual(results[0].report, results[1].report);
  let fail = true;
  const retryable = { async findBySubmission() { return null; }, async create(data) { if (fail) throw new Error('db unavailable'); return stored(data); } };
  await assert.rejects(createCommunityReport(input(), owner, retryable), { status: 500 });
  fail = false;
  assert.ok((await createCommunityReport(input(), owner, retryable)).report.id);
});

test('reference collisions exhaust the bounded retry budget and clean uploaded evidence once', async () => {
  let attempts = 0;
  const cloudinary = cloudinaryFake();
  const repository = { async findBySubmission() { return null; }, async create() { attempts += 1; throw { code: 11000, keyValue: { referenceNumber: 'collision' } }; } };
  await assert.rejects(createCommunityReport(input(), owner, repository, [file()], cloudinary), { status: 500, message: 'The report could not be saved.' });
  assert.equal(attempts, 5);
  assert.deepEqual(cloudinary.deleted.map(({ publicId }) => publicId), ['asset-0']);
});

test('partial upload failure rolls back completed assets and hides provider errors', async () => {
  const cloudinary = cloudinaryFake({ results: [{ public_id: 'first', secure_url: 'https://example.test/image.png', resource_type: 'image', bytes: 3 }, new Error('private credentials')] });
  let writes = 0;
  const repository = { async findBySubmission() { return null; }, async create() { writes += 1; } };
  await assert.rejects(createCommunityReport(input(), owner, repository, [file(), file()], cloudinary), { status: 503, message: 'Evidence upload is temporarily unavailable.' });
  assert.equal(writes, 0);
  assert.deepEqual(cloudinary.deleted.map(({ publicId }) => publicId), ['first']);
});

test('an explicit upload HttpError is retained and persistence rollback failures do not replace the safe response', async (t) => {
  const repository = { async findBySubmission() { return null; }, async create() { throw new Error('private database details'); } };
  await assert.rejects(createCommunityReport(input(), owner, repository, [file()], cloudinaryFake({ results: [new HttpError(429, 'Upload temporarily rate limited.')] })), { status: 429, message: 'Upload temporarily rate limited.' });
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const cloudinary = cloudinaryFake({ failDestroy: true });
  await assert.rejects(createCommunityReport(input(), owner, repository, [file()], cloudinary, 'development'), { status: 500, message: 'The report could not be saved.' });
  assert.equal(cloudinary.deleted.length, 1);
  assert.equal(warnings[0][1].operation, 'persistence');
});

test('My Reports passes owner/filter unchanged and supplies legacy defaults without exposing internal fields', async () => {
  const id = new mongoose.Types.ObjectId('0123456789abcdef01234567');
  const reports = await getMyReports(owner, 'approved', { async findByReporter(reporterId, status) { assert.deepEqual([reporterId, status], [owner, 'approved']); return [{ _id: id, description: 'legacy', reporterId: 'secret', clientSubmissionId: 'secret' }, { ...stored(), status: 'approved', location: null }]; } });
  assert.equal(reports[0].status, 'under_review');
  assert.equal(reports[0].createdAt.toISOString(), id.getTimestamp().toISOString());
  assert.equal(reports[0].location, null);
  assert.equal(reports[0].reporterId, undefined);
  assert.equal(reports[0].clientSubmissionId, undefined);
  assert.equal(reports[1].status, 'approved');
  assert.deepEqual(await getMyReports(owner, undefined, { async findByReporter() { return []; } }), []);
  const failure = new Error('database unavailable');
  await assert.rejects(getMyReports(owner, undefined, { async findByReporter() { throw failure; } }), failure);
});

test('Report Details scopes the lookup to owner and filters malformed/private evidence while preserving safe metadata', async () => {
  const good = { secureUrl: 'https://example.test/photo.png', resourceType: 'image', originalName: 'photo.png', mimeType: 'image/png', bytes: 3, width: 400, height: 300, format: 'png', duration: 1, publicId: 'private-id' };
  const report = await getMyReportDetails(owner, 'abcdef0123456789abcdef01', { async findByIdAndReporter(id, reporterId) {
    assert.deepEqual([id, reporterId], ['abcdef0123456789abcdef01', owner]);
    return { _id: id, evidence: [null, {}, { secureUrl: 5 }, { secureUrl: 'not a url' }, { secureUrl: 'http://example.test/a' }, { secureUrl: 'https://user:password@example.test/a' }, good] };
  } });
  assert.equal(report.status, 'under_review');
  assert.equal(report.location, null);
  assert.equal(report.createdAt, null);
  assert.equal(report.incidentDateTime, null);
  assert.deepEqual(report.evidence, [toPublicEvidence(good)]);
  assert.equal(report.evidence[0].publicId, undefined);
  await assert.rejects(getMyReportDetails(owner, 'foreign-id', { async findByIdAndReporter() { return null; } }), { status: 404, message: 'Report not found.' });
  const failure = new Error('db unavailable');
  await assert.rejects(getMyReportDetails(owner, 'id', { async findByIdAndReporter() { throw failure; } }), failure);
});

test('location mappers preserve longitude/latitude order and handle legacy missing points', () => {
  assert.equal(toGeoJsonPoint(undefined), undefined);
  assert.deepEqual(toGeoJsonPoint({ latitude: -7, longitude: 81 }), { type: 'Point', coordinates: [81, -7] });
  for (const point of [undefined, null, {}, { coordinates: [] }, { coordinates: [80] }, { coordinates: [80, 7, 3] }]) assert.equal(toApiCoordinates(point), null);
  assert.deepEqual(toPublicLocation({ source: 'MANUAL', manualLocation: 'Kandy' }), { source: 'MANUAL', coordinates: null, displayName: null, manualLocation: 'Kandy' });
});

test('evidence names are normalized, bounded and stripped of path/control characters; metadata defaults are explicit', () => {
  assert.equal(sanitizeEvidenceOriginalName('  Ａ/photo\\name\u0000.png  '), 'A_photo_name_.png');
  for (const name of [undefined, null, 42, '   ']) assert.equal(sanitizeEvidenceOriginalName(name), 'evidence');
  assert.equal(sanitizeEvidenceOriginalName('a'.repeat(300)).length, 255);
  const metadata = toEvidenceMetadata({ public_id: 'secret', secure_url: 'https://example.test/a', resource_type: 'image', bytes: 3 }, file());
  assert.equal(metadata.publicId, 'secret');
  assert.deepEqual(toPublicEvidence(metadata), { secureUrl: 'https://example.test/a', resourceType: 'image', originalName: 'photo.png', mimeType: 'image/png', bytes: 3, format: null, width: null, height: null, duration: null });
});
