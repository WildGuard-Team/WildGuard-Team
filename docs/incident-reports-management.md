# Incident Reports Management

The Park Manager portal exposes individual ranger-submitted field incidents at
`/manager/incidents`. This is separate from Conservation Reports and reads the
existing field incident collection. It provides no edit or delete operations.

## Access scope

The endpoint verifies both the JWT role and the current user record. The manager's
existing `assignedPark` field restricts access to that park when configured.
Managers without an assigned park can view reports from all parks, matching the
portal's existing manager access convention and the approved access policy. The
default seeded manager therefore has access to all ranger-submitted reports.

When a park restriction is configured, scope is matched against each incident's
trusted `assignedParkSnapshot`, captured from the ranger account at submission.
The editable report `parkZone` and query
parameters cannot widen authorization. A ranger's later transfer does not change
which park owns their earlier reports. Statistics and park filter choices use the
same authorized scope as incident records.

## Read API

`GET /api/field-incidents/management` supports `search`, `incidentType`, `riskLevel`,
`parkZone`, `startDate`, `endDate`, `status`, `page`, `pageSize`, and `sort`.

- Search covers the incident reference, ranger name, and incident type.
- Date filters cover incident dates inclusively in Asia/Colombo.
- Sort is `newest` (default) or `oldest`; pagination defaults to 25 records.
- The current database model supports `SUBMITTED` status only.
- Responses contain `incidents`, `pagination`, `statistics`, and `filters.parks`.
- Statistics count all authorized reports, independently of table search/filters.
- Ranger data exposes only public identity fields, never email, credentials, or
  authentication details. Incident evidence retains the existing safe media shape.

The frontend preserves the existing report details, evidence, and read-only
IncidentLocationMap. Refresh reloads the current database records and statistics.
No demonstration records are shipped with this feature.
