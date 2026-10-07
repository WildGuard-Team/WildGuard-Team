import { CONSERVATION_REPORT_TYPE_VALUES } from '../config/conservation-report.constants.js';

export function createReportStrategyRegistry(strategies = []) {
  const strategiesByType = new Map();
  for (const strategy of strategies) {
    validateStrategy(strategy);
    if (strategiesByType.has(strategy.reportType)) {
      throw new Error(`Duplicate report strategy: ${strategy.reportType}.`);
    }
    strategiesByType.set(strategy.reportType, strategy);
  }

  return Object.freeze({
    get(reportType) {
      return strategiesByType.get(reportType) ?? null;
    },
    supportedTypes() {
      return [...strategiesByType.keys()];
    },
  });
}

function validateStrategy(strategy) {
  if (!strategy || typeof strategy.reportType !== 'string' || typeof strategy.generate !== 'function') {
    throw new TypeError('A report strategy requires reportType and generate.');
  }
  if (!CONSERVATION_REPORT_TYPE_VALUES.includes(strategy.reportType)) {
    throw new TypeError(`Unsupported conservation report strategy: ${strategy.reportType}.`);
  }
}
