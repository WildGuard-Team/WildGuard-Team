# My Reports implementation and verification

Frontend route: `/reports/my-reports`. Sidebar selection reuses the existing `is-active` style. Map, Alerts and Settings retain their Coming soon labels. No admin status controls are exposed.

## API

`GET /api/reports/my-reports` uses the existing authentication cookie and community-member middleware. Optional `status` is `under_review`, `approved`, or `rejected`. Unknown query fields and invalid/repeated statuses return 400. Empty results return `{ "reports": [] }` with HTTP 200. Responses are not cacheable.

Example response (illustrative values):

```json
{
  "reports": [{
    "_id": "670000000000000000000001",
    "referenceNumber": "WG-20261008-A1B2C3D4E5F6",
    "reportType": "WILDLIFE_SIGHTING",
    "description": "An elephant was seen near the forest.",
    "location": {
      "source": "MANUAL",
      "coordinates": { "latitude": 7, "longitude": 80 },
      "displayName": "Forest entrance",
      "manualLocation": "Forest entrance"
    },
    "status": "under_review",
    "createdAt": "2026-10-08T08:30:00.000Z"
  }]
}
```

The MongoDB query always scopes by authenticated `reporterId`, never an incoming user id. It sorts by `createdAt` and `_id` descending. Missing legacy status is included by the under-review query and normalized when serializing, without rewriting old records. New reports default to `under_review`. The existing POST idempotency implementation, reference generator, upload implementation, and connection configuration are preserved.

## Exact IndexedDB shape

Database: `wildguard-pending-reports`, version 1. Store: `reports`. Compound primary key: `[ownerId, clientSubmissionId]`; index: `ownerId`. This makes repeat saves an upsert and isolates accounts sharing the browser.

```js
{
  ownerId: "authenticated-user-id",
  clientSubmissionId: "550e8400-e29b-41d4-a716-446655440000",
  reportType: "WILDLIFE_SIGHTING",
  description: "An elephant was seen near the forest.",
  incidentDateTime: "2026-10-08T08:30:00.000Z", // frozen UTC instant
  location: {
    source: "MANUAL", // GPS | MAP | MANUAL
    coordinates: { latitude: 7, longitude: 80 },
    displayName: "Forest entrance", // optional
    manualLocation: "Forest entrance" // only for MANUAL
  },
  status: "offline_pending",
  savedAt: "2026-10-08T08:31:00.000Z", // first save retained on upsert
  evidence: [{
    blob: File, // actual structured-cloned binary, not a URL/base64 string
    name: "photo.png",
    type: "image/png",
    lastModified: 1791448200000
  }]
}
```

Storage exports `savePendingReport(ownerId, report)`, `getPendingReports(ownerId)`, `getPendingReport(ownerId, clientSubmissionId)`, `deletePendingReport(ownerId, clientSubmissionId)`, and `restorePendingSubmission(record)`.

The final submit handler generates a UUID once and retains it in the existing draft recovery snapshot. It freezes the UTC incident instant before the first request; retries do not reinterpret the date in a new timezone. Requests without evidence use JSON. Requests with evidence use `clientSubmissionId`, `reportType`, `description`, `incidentDateTime`, JSON-stringified `location`, and repeated `evidence` FormData fields. Both paths include the existing authentication cookie.

Only explicit offline state or network transport errors save a pending report. Backend validation, authorization, upload and server errors remain errors. Retry accepts 201 or the existing duplicate-safe 200 response, then removes the local item after the IndexedDB transaction commits. Failed removal keeps the same key, making another retry safe. Reconnection loads the list but never automatically submits reports.

## Files created or changed

| File | Reason |
| --- | --- |
| `server/src/modules/community-reports/config/community-report.constants.js` | Shared allowed statuses. |
| `server/src/modules/community-reports/models/community-report.model.js` | Default status and owner/date read index; retains idempotency index. |
| `server/src/modules/community-reports/repositories/community-report.repository.js` | Owner-scoped filtered query and safe projection. |
| `server/src/modules/community-reports/validation/my-reports.validation.js` | Validates status and rejects extra query fields. |
| `server/src/modules/community-reports/services/my-reports.service.js` | Safe response fields and legacy status normalization. |
| `server/src/modules/community-reports/controllers/my-reports.controller.js` | Validates, calls service, returns `{ reports }`. |
| `server/src/modules/community-reports/routes/community-report.routes.js` | Authenticated GET route. |
| `server/test/my-reports.test.js` | Real MongoDB ownership, status, legacy, ordering, auth and safe-field verification. |
| `client/src/App.jsx` | Adds My Reports route and passes the navigation message. |
| `client/src/context/AuthContext.jsx` | Tab-scoped display-only offline profile; backend authorization remains unchanged. |
| `client/src/features/community-reports/components/CommunityLayout.jsx` | Activates existing My Reports navigation item. |
| `client/src/features/community-reports/components/CommunityIcon.jsx` | Adds refresh icon in existing icon system. |
| `client/src/features/community-reports/context/community-report-draft.storage.js` | Retains submission id during draft recovery. |
| `client/src/features/community-reports/pages/ReviewReportPage.jsx` | Stable UUID, offline save, and pending navigation while preserving success flow. |
| `client/src/features/community-reports/pages/MyReportsPage.jsx` | Filters, combined list, owner-scoped storage, retry buttons, loading/error/empty states. |
| `client/src/features/community-reports/pages/my-reports.css` | Existing dashboard styling with a scrollable card area within the locked layout. |
| `client/src/features/community-reports/services/report.service.js` | Shared normalized submission, transport-error classification, duplicate-safe 200 support, GET service. |
| `client/src/features/community-reports/services/pending-reports.indexeddb.js` | Native durable IndexedDB storage and evidence reconstruction. |
| `client/test/report-service.test.js` | Submission serialization, binary metadata, response and error classification tests. |
| `client/test/pending-reports.html` | Browser entry for native IndexedDB regression verification. |
| `client/test/pending-reports.browser.js` | Real browser save/upsert, full reload, owner isolation, restoration and removal checks. |
| `docs/my-reports.md` | API contract, data shape, changed files, test results and manual acceptance steps. |

## Actual checks

- `npm test`: 18 passed, including existing auth and duplicate-retry tests. Required elevated local-network access after sandbox restrictions.
- `node --test client/test/report-service.test.js`: 2 passed.
- `npm run build`: passed (122 modules); initial sandbox attempt failed resolving workspace paths, elevated rerun succeeded.
- `npm run lint`: 3 pre-existing errors and 1 pre-existing warning: `EvidencePreviewCard.jsx` synchronous effect state; `ReportDraftContext.jsx` synchronous effect state and missing memo dependency; `evidence-mapper.js` control-character regex. Those files were not changed.
- ESLint on all changed/new JS and JSX files: passed.
- `git diff --check`: passed.
- Browser opened `http://localhost:3000/test/pending-reports.html`: PASS for native IndexedDB upsert, account isolation, persistence after full page reload, unchanged id/UTC instant, evidence bytes and metadata restoration, and scoped removal. The test cleans up its own records.

## Remaining manual acceptance

The browser verification above covers actual IndexedDB. A signed-in visual review and complete DevTools Offline submission journey were not performed; the available browser opened at login.

1. Sign in, submit a valid report online with evidence, and confirm the existing success page. Open My Reports; check its reference in All Reports and Under Review.
2. Finish a second valid draft. In Chrome DevTools Network choose Offline, confirm and submit. Check the exact saved-on-device message and one Pending card, with no success-page navigation.
3. Switch online and reload; confirm the pending card and evidence survive. A fully offline reload additionally requires the browser to have cached the app shell (see limitation below).
4. Switch Offline and click Retry submit. Confirm “You’re still offline. Try again when connected.” and no POST request.
5. Switch online. Confirm no automatic POST. Click Retry submit and confirm only that button shows Submitting. After success the pending card disappears and the reference appears under Under Review.
6. Simulate a connection loss after the server commits. Retry using the same id and verify HTTP 200 with `duplicateRetry: true`, one MongoDB record, and the original reference.
7. Switch accounts and confirm no locally pending or server reports from the previous account appear. Test approved/rejected filters with authorized test-database status fixtures, never community-member status controls.

## Limitations

- The existing app has no offline service worker. IndexedDB survives reload, but an uncached full offline navigation cannot load the app itself. The display-only offline identity survives in the same tab; a new session requires signing in online. No credential or authorization is inferred from the cached profile.
- Browser storage can be cleared or evicted by the browser/user. A quota/storage failure keeps the draft on screen and reports the error; it does not claim a successful local save.
- The preserved multi-process concurrent upload limitation from the prior implementation remains: MongoDB prevents duplicate reports, but two independent servers can upload before the losing insert rolls its evidence back.
- No real Cloudinary upload was performed during this task. Existing upload behavior is exercised with a test uploader; production credentials and external assets were not used.
