# Conservation reporting data foundation

This module belongs only to the Park Manager's **Generate Conservation Report** use case. It does not provide incident-entry, conflict-entry, or patrol-recording workflows.

## Seeded reporting data

Run the following command from the repository root after configuring `server/.env`:

```sh
npm run seed:reporting-data
```

The command imports the versioned `SE3070-CONSERVATION-REPORT-DEMO-V1` dataset. Every imported document is labelled `SEEDED_ASSIGNMENT_DATA`. Unique `sourceId` values are upserted, so rerunning the command updates the same records instead of creating duplicates.

The collections are intentionally reporting-owned data sources:

- `report_source_incidents`
- `report_patrol_routes`
- `report_patrol_records`

They allow the report implementation to perform real MongoDB queries and calculations without implementing another team member's operational module. Generated patrol reports must visibly state that their source is seeded assignment data.

## Patrol coverage definitions

- **Total patrols:** all patrol records matching the selected filters.
- **Completed patrols:** matching records with `COMPLETED` status.
- **Distance patrolled:** sum of distance for completed patrols.
- **Patrol hours:** sum of completed patrol end time minus start time.
- **Route coverage:** distinct completed routes divided by defined routes in the selected park/route scope.
- **Zone coverage:** distinct zones visited by completed patrols divided by zones defined for the selected routes.
- **Completion rate:** completed patrols divided by all matching patrols.
- **Averages:** completed-patrol distance or hours divided by completed patrol count.

All percentages and decimal metrics are rounded to two decimal places. Date boundaries are inclusive.

## Park Manager reporting foundation

The protected reporting API is mounted at `/api/conservation-reports`:

- `GET /options` returns the three supported report types and their applicable filters.
- `GET /:reportId` returns a stored report only when it belongs to the authenticated Park Manager.

Both endpoints require the existing JWT cookie and verify that the token role and current database role are `PARK_MANAGER`. Public registration continues to create only `COMMUNITY_MEMBER` accounts. For local assessment, run `npm run seed:park-manager` from the repository root. This creates or repairs the fixed assessment account `parkmanager@wildguard.lk` with password `Manager@123`; the password is stored only as a bcrypt hash. A user-management workflow is intentionally outside this use case.

Generation parameters use `YYYY-MM-DD` dates, an inclusive maximum range of 366 days, and only the filters declared for the selected report type. The validation layer normalizes dates, text, codes, duplicates, and rejects unknown or inapplicable fields before any database query is made.

## Incident Report generation

`POST /api/conservation-reports` generates an Incident Report for an authenticated Park Manager. The request uses the shared report parameters and supports park, location, incident type, and severity filters. The source query uses inclusive date boundaries and escapes user-entered location text before building a case-insensitive MongoDB expression.

`GET /api/conservation-reports/:reportId/export` downloads an authenticated manager's stored report as CSV. The export contains the stored metadata, applied parameters, calculated summary statistics, and detailed records. Export generation is read-only, so a failed download does not remove or alter the stored report view.

The stored result contains calculated totals, distinct locations, high/critical counts, average incidents per day, breakdowns by type/location/severity, a zero-filled time series, and the filtered incident table. Time grouping is selected from the requested range: daily up to 45 days, weekly up to 180 days, and monthly for longer ranges. Every chart series is derived from the same filtered records as the displayed total.

A successful generation returns HTTP `201` and stores a stable `/api/conservation-reports/:reportId` view location. When no records match, the API returns HTTP `200` with `noData: true` and does not store an empty report. Other report strategies remain separate and are added without modifying the Incident strategy.

## Patrol Coverage Report generation

The same `POST /api/conservation-reports` endpoint accepts `PATROL_COVERAGE_REPORT` with park, route, and patrol-status filters. MongoDB supplies the matching patrol records and the route definitions used as the coverage denominator.

The result contains completed/cancelled totals, distance, patrol hours, route coverage, zone coverage, completion rate, averages, observations, per-route metrics, status counts, a zero-filled daily series, and a detailed patrol table. Distance, time, route, and zone values are calculated from filtered records rather than fixed UI values.

Every Patrol Coverage result includes `dataSource.type: SEEDED_ASSIGNMENT_DATA` and the visible label **Based on seeded patrol data**. This provides a real data-backed reporting dependency without introducing a patrol-recording use case.

## Conflict Trend Report generation

`CONFLICT_TREND_REPORT` uses the same protected generation endpoint with date, park, location, severity, and conflict-type filters. Its source query always requires `humanWildlifeConflict: true`, so unrelated incidents cannot enter the result.

The result contains total conflicts, affected locations, high-risk and critical totals, average conflicts per day, the leading hotspot, period-over-period direction and percentage change, and breakdowns by conflict type, location, severity, species, and time. The detailed table contains only the filtered human–wildlife conflicts. Hotspots and chart values are computed from the same records as the displayed total.
