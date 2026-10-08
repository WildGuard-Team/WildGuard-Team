# Community Member Report Details

The authenticated viewer is `/reports/my-reports/:reportId`. My Reports server cards and Dashboard recent rows use their real `_id` to open it. Offline pending cards retain their existing retry action; the creation step at `/reports/details` is separate and unchanged.

## API contract

`GET /api/reports/my-reports/:reportId` uses the existing JWT cookie and Community Member middleware. The repository performs `findOne({ _id: reportId, reporterId: authenticatedUserId })`; callers cannot select the owner through query parameters. Invalid MongoDB ObjectIds return 400. A missing or foreign report returns the same 404 `{ "error": { "message": "Report not found." } }`. Success is `200`, `Cache-Control: no-store`, and `{ report }`.

Example shape (illustrative values):

```json
{
  "report": {
    "_id": "507f1f77bcf86cd799439011",
    "referenceNumber": "WG-EXAMPLE",
    "reportType": "WILDLIFE_SIGHTING",
    "description": "The full submitted description.",
    "status": "under_review",
    "createdAt": "2026-10-08T10:30:00.000Z",
    "incidentDateTime": "2026-10-08T09:00:00.000Z",
    "location": {
      "source": "MAP",
      "coordinates": { "latitude": 7.2, "longitude": 80.1 },
      "displayName": "Forest entrance",
      "manualLocation": null
    },
    "evidence": [{
      "secureUrl": "https://res.cloudinary.com/example/image/upload/evidence.jpg",
      "resourceType": "image",
      "originalName": "evidence.jpg",
      "mimeType": "image/jpeg",
      "bytes": 12345,
      "format": "jpg",
      "width": 640,
      "height": 480,
      "duration": null
    }]
  }
}
```

Location coordinates can be `null`; evidence can be `[]`. A missing legacy status becomes `under_review`. Missing stored `createdAt`/`incidentDateTime` are `null`, and the UI shows an unavailable date instead of inventing one. There is no status-update timestamp in the current model, so neither `updatedAt` nor fabricated review dates appear. The response excludes reporter IDs, submission IDs, Cloudinary public IDs, credentials, and raw provider responses. Evidence URLs must be valid HTTPS URLs without embedded credentials.

## Changed and created files

| File | Reason |
| --- | --- |
| `client/src/App.jsx` | Register the protected viewer using existing history routing and key it by user/report. |
| `client/src/features/community-reports/services/report.service.js` | Credentialed, abortable single-report request and safe status-bearing errors. |
| `client/src/features/community-reports/hooks/useReportDetails.js` | Loading, retry, and unmount cancellation. |
| `client/src/features/community-reports/pages/SubmittedReportDetailsPage.jsx` | Compose real report content and loading/error/not-found states in the existing shell. |
| `client/src/features/community-reports/pages/submitted-report-details.css` | Scoped cards, bounded desktop content scrolling, responsive layout, timeline, gallery, and modal. |
| `client/src/features/community-reports/components/ReportStatusBadge.jsx` | Shared status label and styling component. |
| `client/src/features/community-reports/components/report-status.css` | Centralized status colors, with existing compact My Reports styling preserved. |
| `client/src/features/community-reports/utils/report-status.js` | Shared status normalization, labels, and explanations. |
| `client/src/features/community-reports/utils/report-display.js` | Date and location display fallbacks. |
| `client/src/features/community-reports/components/ReportProgressTimeline.jsx` | Current-status progress with only the real submission date. |
| `client/src/features/community-reports/components/EvidenceGallery.jsx` | Saved media thumbnails, file links, broken-image fallback, and accessible native preview dialog. |
| `client/src/features/community-reports/components/ReadOnlyReportMap.jsx` | Render the existing map only for valid, in-range numeric coordinates. |
| `client/src/features/community-reports/components/LocationMap.jsx` | Optional read-only mode omits selection events and marker dragging; default editing behavior is preserved. |
| `client/src/features/community-reports/components/CommunityIcon.jsx` | Add the back-arrow icon to the existing icon set. |
| `client/src/features/community-reports/pages/MyReportsPage.jsx` | Add View details to real server cards and use the shared status badge. |
| `client/src/features/community-reports/pages/my-reports.css` | Style the card action and remove duplicated status colors. |
| `client/src/pages/MemberLandingPage.jsx` | Route recent rows to their real report ID and reuse status labels/badges. |
| `client/src/pages/community-dashboard.css` | Preserve dashboard pill sizing while sharing status colors. |
| `server/src/modules/community-reports/validation/my-report-details.validation.js` | Strict ObjectId validation before a repository query. |
| `server/src/modules/community-reports/repositories/community-report.repository.js` | Owner-scoped detail lookup with an explicit field projection. |
| `server/src/modules/community-reports/services/my-report-details.service.js` | Safe public mapping and indistinguishable missing/foreign behavior. |
| `server/src/modules/community-reports/controllers/my-report-details.controller.js` | Validate the route ID and send the existing `{ report }` response convention. |
| `server/src/modules/community-reports/routes/community-report.routes.js` | Register the detail endpoint under the existing route base and middleware. |
| `server/test/my-report-details.test.js` | Five focused real-MongoDB security, evidence, legacy, list, creation, and retry checks. |
| `client/test/report-service.test.js` | Add request credentials, encoded IDs, response validation, safe errors, and abort checks. |
| `docs/report-details.md` | Document the endpoint, changed files, and verification. |
| `docs/verification/report-details-desktop.jpg` | Desktop proof captured from the real app with isolated test database records. |
| `docs/verification/report-details-mobile.jpg` | Mobile proof from the same app and test records. |

## Verification

- `npm test`: **23/23 passed**, against local MongoDB test databases. Owner success; foreign/missing/spoofed owner 404; invalid IDs 400 without querying; unauthenticated 401; non-member 403; public evidence/coordinates; legacy status; existing POST, duplicate retry, and list contracts all pass.
- `node --test client/test/report-service.test.js`: **4/4 passed**, including existing offline restoration/submission behavior and the new single-report service contracts.
- `npm run build`: **passed**, 134 modules transformed.
- ESLint restricted to all changed/new JavaScript and JSX files: **passed**.
- `npm run lint`: retains the inspected baseline of **3 errors and 1 warning** in unchanged `EvidencePreviewCard.jsx`, `ReportDraftContext.jsx`, and `evidence-mapper.js`. No new lint issues.
- `git diff --check`: **passed**.
- Browser verification used the production build, actual Express/auth/repository code, and records stored in a separate local MongoDB test database. No production mock data or authentication bypass was introduced.
- Real login, Dashboard recent-row destination, My Reports card destination, record reference/type/description/date/location/status, Back to My Reports, all status timelines, image thumbnail loading, non-image link, image dialog/visible Close/Escape/focus restoration, no-evidence state, no-coordinate state, foreign/missing/invalid states, and broken-image fallback passed.
- Layout checked at **1440 × 900, 820 × 900, and 375 × 812**: no horizontal overflow. Desktop document height stays locked to the viewport with necessary detail scrolling inside the content area. Long descriptions and wrapped references remain readable.
- Saved-report map marker is not draggable; absent coordinates render no map. The existing creation flow still accepts map selection, has a draggable marker, and opens the evidence step.

Live uploads to the configured Cloudinary account were not performed. Existing upload handling and rollback/retry contracts passed the backend suite; the gallery loaded a real public Cloudinary sample image. Map tiles depend on the existing external OpenStreetMap service. The isolated browser server and its test records are cleaned up after verification.
