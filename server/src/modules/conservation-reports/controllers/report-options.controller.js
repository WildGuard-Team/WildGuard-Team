import {
  CONSERVATION_REPORT_MAX_RANGE_DAYS, REPORT_TYPE_DEFINITIONS,
} from '../config/conservation-report.constants.js';

export function reportOptionsController(req, res) {
  res.set('Cache-Control', 'private, max-age=300').status(200).json({
    reportTypes: REPORT_TYPE_DEFINITIONS,
    maximumDateRangeDays: CONSERVATION_REPORT_MAX_RANGE_DAYS,
  });
}
