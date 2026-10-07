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
