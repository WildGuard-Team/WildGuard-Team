# Community Report coverage

Generated from real c8/Node and Vitest/V8 reports on 2026-10-08T19:55:27.211Z.

Run from the repository root: `npm run coverage:community-reports`. Node >=22.12 and local MongoDB at 127.0.0.1:27017 are required. Tests create isolated test records and clean up their own owner IDs; they do not use the application database.

## Scope and method

Every JavaScript/JSX source in `server/src/modules/community-reports` and `client/src/features/community-reports`, plus `client/src/pages/MemberLandingPage.jsx`, is included, including never-imported files. CSS/assets, auth infrastructure, App routing, other modules, and test files are outside this selected module's coverage denominator. No ignore directives or source exclusions were added to inflate coverage. Both workspace commands enforce >=80% lines/functions/branches independently and for every individual scoped source file. The report generator verifies that no scoped source file is omitted.

Frontend tests exercise real React views/hooks and real fake-indexeddb storage. External fetch, Cloudinary, geocoding, Leaflet rendering and browser APIs are controlled boundaries, not live-provider end-to-end claims. Backend tests combine isolated units/HTTP endpoints with the existing real MongoDB ownership/index/concurrency integration tests. The existing four Node service contracts are ported unchanged to Vitest for the baseline; the manual browser IndexedDB fixture had no automated coverage command. V8 branch denominators can grow when new paths are executed, so baseline branch percentages alone are not comparable to the final totals.

## Measured result

| Scope | Lines | Functions | Branches |
| --- | --- | --- | --- |
| backend | 100% (948/948) | 100% (66/66) | 97.15% (444/457) |
| frontend | 100% (727/727) | 98.43% (314/319) | 96.61% (827/856) |
| Combined (weighted counts, not an average) | 100% (1675/1675) | 98.7% (380/385) | 96.8% (1271/1313) |

## Original-contract baseline

| Scope | Lines | Functions | Branches |
| --- | --- | --- | --- |
| backend baseline | 73.62% (698/948) | 66.66% (44/66) | 80.42% (189/235) |
| frontend baseline | 7.84% (57/727) | 3.44% (11/319) | 5.95% (51/856) |

## Remaining limitations

The remaining paths include optional provider diagnostic fallbacks, suppressed IndexedDB cleanup failures/transaction errors, request-lock guards, late GPS/reverse-lookup races, absent legacy fields, configured API-base fallbacks, and the browser sign-in redirect callback. They are not hidden or asserted as covered. Mocked UI/browser boundaries do not replace real-browser end-to-end validation. No feature source or feature behavior was modified for this coverage task.

## All remaining uncovered files, lines, functions and branches

Coordinates are one-based lines and zero-based columns from the instrumented source maps. Implicit else arms sometimes have no arm-specific span; those use the enclosing condition span and are marked explicitly. Missing end columns are omitted, not invented. Branch arm IDs identify distinct zero-hit paths, even when the enclosing line was executed. A covered line can still contain an unexecuted statement or callback, so these are listed separately.

### server/src/modules/community-reports/integrations/geocoding.provider.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: branch 17, arm 0 at 33:44-33:51; branch 18, arm 0 at 33:82-33:89; branch 52, arm 0 at 103:5-103:6

### server/src/modules/community-reports/middleware/evidence-upload.middleware.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: branch 14, arm 0 at 25:6-25:71

### server/src/modules/community-reports/routes/community-report.routes.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: branch 2, arm 0 at 28:33-28:102

### server/src/modules/community-reports/services/evidence-upload.service.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: branch 33, arm 0 at 64:28-64:35; branch 34, arm 0 at 65:34-65:41; branch 35, arm 0 at 66:58-66:65; branch 36, arm 0 at 67:28-67:35; branch 37, arm 0 at 68:40-68:47; branch 38, arm 0 at 69:46-69:53; branch 39, arm 0 at 71:35-71:42; branch 40, arm 0 at 72:28-72:35

### client/src/features/community-reports/components/EvidenceGallery.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: if 20, arm 1 at 61:6-61 (implicit arm; enclosing span)

### client/src/features/community-reports/components/EvidenceUploader.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: if 3, arm 1 at 27:227-27:291 (implicit arm; enclosing span)

### client/src/features/community-reports/components/IncidentDetailsForm.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: binary-expr 2, arm 1 at 11:129-11:133

### client/src/features/community-reports/components/LocationSearch.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: if 6, arm 1 at 50:142-50:212 (implicit arm; enclosing span)

### client/src/features/community-reports/context/ReportDraftContext.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: (anonymous_5) at 21:89-21:91; (anonymous_12) at 42:107-42:109; (anonymous_16) at 45:114-45:116
- Uncovered branch arms: if 4, arm 1 at 21:6-21 (implicit arm; enclosing span); if 8, arm 1 at 26:88-26:161 (implicit arm; enclosing span); cond-expr 13, arm 1 at 32:133-32:140; cond-expr 15, arm 1 at 35:126-35:133

### client/src/features/community-reports/hooks/useCurrentLocation.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: if 2, arm 1 at 17:6-17 (implicit arm; enclosing span); if 3, arm 1 at 21:4-24 (implicit arm; enclosing span)

### client/src/features/community-reports/pages/MyReportsPage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 55:54-55
- Uncovered functions: None
- Uncovered branch arms: if 15, arm 0 at 55:4-55

### client/src/features/community-reports/pages/ReportDetailsPage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 66:35-66; 89:21-89
- Uncovered functions: None
- Uncovered branch arms: cond-expr 6, arm 1 at 54:14-54; if 9, arm 1 at 59:6-59 (implicit arm; enclosing span); if 13, arm 0 at 66:4-66; if 17, arm 0 at 89:4-89; cond-expr 21, arm 0 at 101:152-101:166; binary-expr 22, arm 1 at 105:34-105

### client/src/features/community-reports/pages/ReportEvidencePage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 11:22-11
- Uncovered functions: None
- Uncovered branch arms: if 1, arm 0 at 11:4-11

### client/src/features/community-reports/pages/ReviewReportPage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 50:50-50
- Uncovered functions: None
- Uncovered branch arms: if 10, arm 0 at 50:4-50

### client/src/features/community-reports/pages/SubmittedReportDetailsPage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 57:519-57:553
- Uncovered functions: (anonymous_4) at 57:519-57:553
- Uncovered branch arms: None

### client/src/features/community-reports/services/evidence-draft.indexeddb.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 5:322-5:393
- Uncovered functions: (anonymous_12) at 5:322-5:393
- Uncovered branch arms: if 1, arm 1 at 4:171-4:293 (implicit arm; enclosing span); binary-expr 3, arm 0 at 5:329-5:346; binary-expr 3, arm 1 at 5:350-5:392

### client/src/features/community-reports/services/locationApi.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: binary-expr 0, arm 1 at 1:84-1

### client/src/features/community-reports/services/report.service.js

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: None
- Uncovered functions: None
- Uncovered branch arms: binary-expr 0, arm 1 at 3:58-3:64

### client/src/pages/MemberLandingPage.jsx

- Uncovered executable lines: None
- Uncovered statements on otherwise covered lines: 18:32-18
- Uncovered functions: None
- Uncovered branch arms: binary-expr 1, arm 1 at 12:28-12:30; if 3, arm 0 at 18:2-18; binary-expr 6, arm 1 at 26:40-26:42; binary-expr 18, arm 1 at 56:46-56:48; binary-expr 19, arm 1 at 56:78-56:80

## Full file inventory

| Source file | Lines | Functions | Branches |
| --- | --- | --- | --- |
| server/src/modules/community-reports/config/community-report.constants.js | 100% (15/15) | 100% (0/0) | 100% (1/1) |
| server/src/modules/community-reports/config/evidence.constants.js | 100% (11/11) | 100% (0/0) | 100% (1/1) |
| server/src/modules/community-reports/config/geocoding.config.js | 100% (2/2) | 100% (0/0) | 100% (1/1) |
| server/src/modules/community-reports/controllers/create-community-report.controller.js | 100% (23/23) | 100% (3/3) | 100% (15/15) |
| server/src/modules/community-reports/controllers/my-report-details.controller.js | 100% (10/10) | 100% (1/1) | 100% (4/4) |
| server/src/modules/community-reports/controllers/my-reports.controller.js | 100% (10/10) | 100% (1/1) | 100% (4/4) |
| server/src/modules/community-reports/controllers/reverse-location.controller.js | 100% (22/22) | 100% (3/3) | 100% (13/13) |
| server/src/modules/community-reports/controllers/search-location.controller.js | 100% (14/14) | 100% (2/2) | 100% (7/7) |
| server/src/modules/community-reports/integrations/geocoding.provider.js | 100% (118/118) | 100% (10/10) | 94.82% (55/58) |
| server/src/modules/community-reports/middleware/evidence-upload.middleware.js | 100% (33/33) | 100% (3/3) | 94.73% (18/19) |
| server/src/modules/community-reports/middleware/require-community-member.middleware.js | 100% (21/21) | 100% (1/1) | 100% (12/12) |
| server/src/modules/community-reports/models/community-report.model.js | 100% (74/74) | 100% (0/0) | 100% (1/1) |
| server/src/modules/community-reports/repositories/community-report.repository.js | 100% (28/28) | 100% (5/5) | 100% (9/9) |
| server/src/modules/community-reports/routes/community-report.routes.js | 100% (30/30) | 100% (1/1) | 87.5% (7/8) |
| server/src/modules/community-reports/services/create-community-report.service.js | 100% (120/120) | 100% (5/5) | 100% (44/44) |
| server/src/modules/community-reports/services/evidence-delete.service.js | 100% (7/7) | 100% (1/1) | 100% (5/5) |
| server/src/modules/community-reports/services/evidence-upload.service.js | 100% (82/82) | 100% (4/4) | 81.39% (35/43) |
| server/src/modules/community-reports/services/location-search.service.js | 100% (34/34) | 100% (3/3) | 100% (27/27) |
| server/src/modules/community-reports/services/my-report-details.service.js | 100% (31/31) | 100% (2/2) | 100% (19/19) |
| server/src/modules/community-reports/services/my-reports.service.js | 100% (14/14) | 100% (1/1) | 100% (8/8) |
| server/src/modules/community-reports/services/reverse-geocoding.service.js | 100% (29/29) | 100% (2/2) | 100% (28/28) |
| server/src/modules/community-reports/utils/evidence-mapper.js | 100% (33/33) | 100% (3/3) | 100% (11/11) |
| server/src/modules/community-reports/utils/location-mapper.js | 100% (19/19) | 100% (3/3) | 100% (13/13) |
| server/src/modules/community-reports/utils/reference-number.js | 100% (8/8) | 100% (1/1) | 100% (2/2) |
| server/src/modules/community-reports/validation/create-community-report.validation.js | 100% (39/39) | 100% (2/2) | 100% (22/22) |
| server/src/modules/community-reports/validation/incident-date-time.validation.js | 100% (27/27) | 100% (1/1) | 100% (29/29) |
| server/src/modules/community-reports/validation/location.validation.js | 100% (73/73) | 100% (6/6) | 100% (40/40) |
| server/src/modules/community-reports/validation/my-report-details.validation.js | 100% (9/9) | 100% (1/1) | 100% (5/5) |
| server/src/modules/community-reports/validation/my-reports.validation.js | 100% (12/12) | 100% (1/1) | 100% (8/8) |
| client/src/features/community-reports/components/CommunityIcon.jsx | 100% (2/2) | 100% (1/1) | 100% (1/1) |
| client/src/features/community-reports/components/CommunityLayout.jsx | 100% (17/17) | 100% (9/9) | 100% (13/13) |
| client/src/features/community-reports/components/EvidenceGallery.jsx | 100% (46/46) | 100% (18/18) | 98.7% (76/77) |
| client/src/features/community-reports/components/EvidencePreviewCard.jsx | 100% (11/11) | 100% (3/3) | 100% (22/22) |
| client/src/features/community-reports/components/EvidenceUploader.jsx | 100% (17/17) | 100% (13/13) | 88.88% (8/9) |
| client/src/features/community-reports/components/IncidentDetailsForm.jsx | 100% (4/4) | 100% (3/3) | 90% (9/10) |
| client/src/features/community-reports/components/LocationMap.jsx | 100% (17/17) | 100% (10/10) | 100% (19/19) |
| client/src/features/community-reports/components/LocationSearch.jsx | 100% (30/30) | 100% (10/10) | 94.44% (17/18) |
| client/src/features/community-reports/components/ReadOnlyReportMap.jsx | 100% (3/3) | 100% (2/2) | 100% (8/8) |
| client/src/features/community-reports/components/ReportLayout.jsx | 100% (2/2) | 100% (1/1) | 100% (9/9) |
| client/src/features/community-reports/components/ReportProgress.jsx | 100% (3/3) | 100% (2/2) | 100% (2/2) |
| client/src/features/community-reports/components/ReportProgressTimeline.jsx | 100% (8/8) | 100% (2/2) | 100% (28/28) |
| client/src/features/community-reports/components/ReportStatusBadge.jsx | 100% (2/2) | 100% (1/1) | 100% (4/4) |
| client/src/features/community-reports/components/ReportTypeCard.jsx | 100% (4/4) | 100% (3/3) | 100% (2/2) |
| client/src/features/community-reports/components/ReviewAttachments.jsx | 100% (2/2) | 100% (3/3) | 100% (12/12) |
| client/src/features/community-reports/components/SelectedLocation.jsx | 100% (6/6) | 100% (1/1) | 100% (16/16) |
| client/src/features/community-reports/components/SubmissionOverlay.jsx | 100% (1/1) | 100% (1/1) | 100% (0/0) |
| client/src/features/community-reports/context/ReportDraftContext.jsx | 100% (39/39) | 88.88% (24/27) | 91.11% (41/45) |
| client/src/features/community-reports/context/community-report-draft.storage.js | 100% (36/36) | 100% (11/11) | 100% (64/64) |
| client/src/features/community-reports/context/report-draft-context.js | 100% (1/1) | 100% (0/0) | 100% (0/0) |
| client/src/features/community-reports/context/useReportDraft.js | 100% (3/3) | 100% (1/1) | 100% (2/2) |
| client/src/features/community-reports/hooks/useCurrentLocation.js | 100% (26/26) | 100% (7/7) | 85.71% (12/14) |
| client/src/features/community-reports/hooks/useDashboardReports.js | 100% (21/21) | 100% (6/6) | 100% (10/10) |
| client/src/features/community-reports/hooks/useReportDetails.js | 100% (17/17) | 100% (6/6) | 100% (10/10) |
| client/src/features/community-reports/pages/MyReportsPage.jsx | 100% (54/54) | 100% (18/18) | 98.63% (72/73) |
| client/src/features/community-reports/pages/ReportConfirmationPage.jsx | 100% (6/6) | 100% (3/3) | 100% (2/2) |
| client/src/features/community-reports/pages/ReportDetailsPage.jsx | 100% (45/45) | 100% (20/20) | 88% (44/50) |
| client/src/features/community-reports/pages/ReportEvidencePage.jsx | 100% (9/9) | 100% (5/5) | 92.3% (12/13) |
| client/src/features/community-reports/pages/ReportTypePage.jsx | 100% (7/7) | 100% (5/5) | 100% (2/2) |
| client/src/features/community-reports/pages/ReviewReportPage.jsx | 100% (55/55) | 100% (13/13) | 98% (49/50) |
| client/src/features/community-reports/pages/SubmittedReportDetailsPage.jsx | 100% (6/6) | 83.33% (5/6) | 100% (28/28) |
| client/src/features/community-reports/services/evidence-draft.indexeddb.js | 100% (13/13) | 96.77% (30/31) | 87.5% (21/24) |
| client/src/features/community-reports/services/locationApi.js | 100% (17/17) | 100% (4/4) | 93.75% (15/16) |
| client/src/features/community-reports/services/pending-reports.indexeddb.js | 100% (38/38) | 100% (28/28) | 100% (10/10) |
| client/src/features/community-reports/services/report.service.js | 100% (53/53) | 100% (11/11) | 98.11% (52/53) |
| client/src/features/community-reports/utils/report-display.js | 100% (8/8) | 100% (2/2) | 100% (12/12) |
| client/src/features/community-reports/utils/report-options.js | 100% (2/2) | 100% (2/2) | 100% (2/2) |
| client/src/features/community-reports/utils/report-status.js | 100% (3/3) | 100% (2/2) | 100% (2/2) |
| client/src/features/community-reports/validation/evidence.validation.js | 100% (22/22) | 100% (3/3) | 100% (20/20) |
| client/src/features/community-reports/validation/incidentDateTime.validation.js | 100% (15/15) | 100% (4/4) | 100% (23/23) |
| client/src/features/community-reports/validation/reportDetails.validation.js | 100% (16/16) | 100% (2/2) | 100% (29/29) |
| client/src/pages/MemberLandingPage.jsx | 100% (40/40) | 100% (19/19) | 90.38% (47/52) |

Raw reproducible artifacts: `coverage/community-reports/{backend,frontend}/coverage-final.json`, `coverage-summary.json`, `lcov.info`, and `index.html`. Coverage output is Git-ignored; this Markdown snapshot is checked in.
