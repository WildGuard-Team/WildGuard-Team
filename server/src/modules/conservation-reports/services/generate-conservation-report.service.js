import { HttpError } from '../../../shared/http-error.js';
import { toReportView } from './generated-report.service.js';
import { createConservationReportId } from '../utils/report-id.js';

const REPORT_ID_ATTEMPTS = 3;

export async function generateConservationReport({
  parameters, managerId, strategies, reports,
  reportIdFactory = createConservationReportId, clock = () => new Date(),
}) {
  const strategy = strategies.get(parameters.reportType);
  if (!strategy) throw new HttpError(501, 'The selected report type is not available yet.');

  const generated = await strategy.generate(parameters);
  if (!generated.hasData) {
    return {
      noData: true,
      message: 'No conservation data is available for the selected criteria.',
      parameters,
    };
  }

  const generatedAt = clock();
  const stored = await storeWithUniqueId({
    reports, reportIdFactory,
    report: {
      reportType: parameters.reportType,
      requestedBy: managerId,
      parameters: {
        startDate: parameters.startDate,
        endDate: parameters.endDate,
        filters: parameters.filters,
      },
      generatedAt,
      results: generated.results,
      dataProvenance: generated.dataProvenance,
    },
  });
  return { noData: false, report: toReportView(stored) };
}

async function storeWithUniqueId({ reports, reportIdFactory, report }) {
  for (let attempt = 0; attempt < REPORT_ID_ATTEMPTS; attempt += 1) {
    const reportId = reportIdFactory(report.generatedAt);
    try {
      return await reports.create({
        ...report,
        reportId,
        fileLocation: `/api/conservation-reports/${reportId}`,
      });
    } catch (error) {
      if (!isReportIdCollision(error) || attempt === REPORT_ID_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error('Unable to allocate a conservation report ID.');
}

function isReportIdCollision(error) {
  return error?.code === 11000 && Boolean(error?.keyPattern?.reportId);
}
