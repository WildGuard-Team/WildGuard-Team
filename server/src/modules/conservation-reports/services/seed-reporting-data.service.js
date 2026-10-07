import { reportingSourceData } from '../seeds/reporting-source-data.js';

export async function seedReportingData(repository, data = reportingSourceData) {
  const [incidents, routes, patrols] = await Promise.all([
    repository.upsertIncidents(data.incidents),
    repository.upsertRoutes(data.routes),
    repository.upsertPatrols(data.patrols),
  ]);
  return { incidents, routes, patrols };
}
