import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';

const COLORS = Object.freeze({
  forest: '#075f43', dark: '#17323a', muted: '#647a73', pale: '#e8f5ef',
  border: '#d5e5de', white: '#ffffff', stripe: '#f5faf7', amber: '#fff6d8',
});
const PAGE_MARGIN = 42;
const LOGO_PATH = fileURLToPath(new URL('../../../../../assets/logo.jpg', import.meta.url));

export function exportConservationReportPdf(report, { logoPath = LOGO_PATH } = {}) {
  if (!existsSync(logoPath)) throw new Error('WildGuard logo is unavailable for PDF generation.');
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4', margin: PAGE_MARGIN, bufferPages: true,
      info: { Title: `WildGuard ${report.reportId}`, Author: 'WildGuard' },
    });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    drawDocument(document, report, logoPath);
    addPageFooters(document, report.reportId);
    document.end();
  });
}

function drawDocument(document, report, logoPath) {
  drawCoverHeader(document, report, logoPath);
  drawMetadata(document, report);
  drawFilters(document, report.parameters.filters ?? {});
  drawSummary(document, report);
  if (report.results.dataSource) drawDataSource(document, report.results.dataSource);
  drawCharts(document, report);
  drawDetailedRecords(document, report);
}

function drawCoverHeader(document, report, logoPath) {
  const logoSize = 62;
  document.image(logoPath, (document.page.width - logoSize) / 2, 26, { fit: [logoSize, logoSize] });
  document.y = 96;
  document.fillColor(COLORS.forest).font('Helvetica-Bold').fontSize(17)
    .text('WILDGUARD', { align: 'center', characterSpacing: 1.5 });
  document.moveDown(0.35).fillColor(COLORS.dark).fontSize(22)
    .text(reportTitle(report.reportType), { align: 'center' });
  document.moveDown(0.25).fillColor(COLORS.muted).font('Helvetica').fontSize(9)
    .text('Conservation operations report', { align: 'center' });
  document.moveDown(1);
  document.strokeColor(COLORS.forest).lineWidth(2)
    .moveTo(PAGE_MARGIN, document.y).lineTo(document.page.width - PAGE_MARGIN, document.y).stroke();
  document.moveDown(1.1);
}

function drawMetadata(document, report) {
  sectionHeading(document, 'Report details');
  const items = [
    ['Report ID', report.reportId],
    ['Reporting period', `${formatDate(report.parameters.startDate)} - ${formatDate(report.parameters.endDate)}`],
    ['Generated at', formatDateTime(report.generatedAt)],
    ['Stored location', report.fileLocation],
  ];
  const gap = 8;
  const width = (contentWidth(document) - gap) / 2;
  for (let start = 0; start < items.length; start += 2) {
    ensureSpace(document, 58);
    const y = document.y;
    items.slice(start, start + 2).forEach(([label, value], index) => {
      const x = PAGE_MARGIN + index * (width + gap);
      document.roundedRect(x, y, width, 50, 5).fillAndStroke(COLORS.stripe, COLORS.border);
      document.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), x + 10, y + 9, { width: width - 20 });
      document.fillColor(COLORS.dark).fontSize(9).text(String(value), x + 10, y + 23, { width: width - 20, height: 21, ellipsis: true });
    });
    document.y = y + 58;
  }
  document.y += 4;
}

function drawFilters(document, filters) {
  const entries = Object.entries(filters);
  if (entries.length === 0) return;
  sectionHeading(document, 'Applied filters');
  const text = entries.map(([key, value]) => `${formatLabel(key)}: ${displayValue(value)}`).join('   |   ');
  const height = document.heightOfString(text, { width: contentWidth(document) - 20 }) + 20;
  ensureSpace(document, height);
  const y = document.y;
  document.roundedRect(PAGE_MARGIN, y, contentWidth(document), height, 5).fillAndStroke(COLORS.pale, COLORS.border);
  document.fillColor(COLORS.forest).font('Helvetica').fontSize(8.5)
    .text(text, PAGE_MARGIN + 10, y + 10, { width: contentWidth(document) - 20 });
  document.y = y + height + 14;
}

function drawSummary(document, report) {
  const summary = report.results.summary ?? {};
  sectionHeading(document, 'Summary statistics');
  const entries = Object.entries(summary);
  const columns = 3;
  const gap = 7;
  const width = (contentWidth(document) - gap * (columns - 1)) / columns;
  for (let start = 0; start < entries.length; start += columns) {
    ensureSpace(document, 59);
    const y = document.y;
    entries.slice(start, start + columns).forEach(([key, value], index) => {
      const x = PAGE_MARGIN + index * (width + gap);
      document.roundedRect(x, y, width, 52, 5).fillAndStroke(COLORS.white, COLORS.border);
      document.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(6.8)
        .text(summaryLabel(key).toUpperCase(), x + 9, y + 9, { width: width - 18, height: 10, ellipsis: true });
      document.fillColor(COLORS.forest).fontSize(key === 'topHotspot' ? 9 : 15)
        .text(summaryValue(report.reportType, key, value), x + 9, key === 'topHotspot' ? y + 23 : y + 25, { width: width - 18, height: 23, ellipsis: true });
    });
    document.y = y + 59;
  }
  document.y += 8;
}

function drawDataSource(document, dataSource) {
  const text = `${dataSource.label}. This report uses the documented seeded patrol dataset and does not represent a live patrol-recording module.`;
  document.font('Helvetica').fontSize(8);
  const height = document.heightOfString(text, { width: contentWidth(document) - 20 }) + 25;
  ensureSpace(document, height);
  const y = document.y;
  document.roundedRect(PAGE_MARGIN, y, contentWidth(document), height, 5).fillAndStroke(COLORS.amber, '#e5d18d');
  document.fillColor('#70591b').font('Helvetica-Bold').fontSize(8).text('DATA SOURCE', PAGE_MARGIN + 10, y + 8);
  document.font('Helvetica').text(text, PAGE_MARGIN + 10, y + 19, { width: contentWidth(document) - 20 });
  document.y = y + height + 14;
}

function drawCharts(document, report) {
  const charts = chartDefinitions(report);
  if (charts.length === 0) return;
  sectionHeading(document, 'Charts and breakdowns');
  charts.forEach((chart) => drawBarChart(document, chart));
}

function drawBarChart(document, chart) {
  const rows = chart.data ?? [];
  const rowHeight = 18;
  const height = 37 + Math.max(1, rows.length) * rowHeight;
  ensureSpace(document, Math.min(height, usablePageHeight(document)));
  const x = PAGE_MARGIN;
  let y = document.y;
  document.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(10).text(chart.title, x, y);
  y += 18;
  if (rows.length === 0) {
    document.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('No chart data available.', x, y);
    document.y = y + rowHeight + 10;
    return;
  }
  const maximum = Math.max(1, ...rows.map((item) => Number(item[chart.valueKey]) || 0));
  rows.forEach((item) => {
    if (y + rowHeight > document.page.height - 65) {
      document.addPage();
      y = PAGE_MARGIN;
    }
    const rawLabel = String(item[chart.labelKey] ?? 'Unknown');
    const label = rawLabel.includes('_') ? formatLabel(rawLabel) : rawLabel;
    const value = Number(item[chart.valueKey]) || 0;
    document.fillColor(COLORS.muted).font('Helvetica').fontSize(7.2)
      .text(label, x, y + 2, { width: 124, height: 11, ellipsis: true });
    document.roundedRect(x + 130, y + 3, 305, 8, 4).fill('#e4eee9');
    if (value > 0) {
      document.roundedRect(x + 130, y + 3, Math.max(2, 305 * value / maximum), 8, 4).fill(COLORS.forest);
    }
    document.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(7.2)
      .text(`${value}${chart.suffix ?? ''}`, x + 444, y + 1, { width: 67, align: 'right' });
    y += rowHeight;
  });
  document.y = y + 11;
}

function drawDetailedRecords(document, report) {
  recordTables(report).forEach((table) => {
    sectionHeading(document, table.title);
    drawTable(document, table.columns, table.rows);
  });
}

function drawTable(document, columns, rows) {
  const tableWidth = contentWidth(document);
  const columnWidth = tableWidth / columns.length;
  const headerHeight = 25;
  const rowHeight = 29;
  const drawHeader = () => {
    ensureSpace(document, headerHeight + rowHeight);
    const y = document.y;
    document.rect(PAGE_MARGIN, y, tableWidth, headerHeight).fill(COLORS.forest);
    columns.forEach((column, index) => {
      document.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(6.5)
        .text(column.toUpperCase(), PAGE_MARGIN + index * columnWidth + 5, y + 8, { width: columnWidth - 10, height: 10, ellipsis: true });
    });
    document.y = y + headerHeight;
  };
  drawHeader();
  rows.forEach((row, rowIndex) => {
    if (document.y + rowHeight > document.page.height - 65) {
      document.addPage();
      drawHeader();
    }
    const y = document.y;
    document.rect(PAGE_MARGIN, y, tableWidth, rowHeight).fill(rowIndex % 2 === 0 ? COLORS.white : COLORS.stripe);
    document.rect(PAGE_MARGIN, y, tableWidth, rowHeight).stroke(COLORS.border);
    row.forEach((cell, index) => {
      document.fillColor(COLORS.dark).font('Helvetica').fontSize(6.5)
        .text(displayValue(cell), PAGE_MARGIN + index * columnWidth + 5, y + 6, { width: columnWidth - 10, height: rowHeight - 10, ellipsis: true });
    });
    document.y = y + rowHeight;
  });
  document.y += 10;
}

function chartDefinitions(report) {
  const breakdowns = report.results.breakdowns ?? {};
  if (report.reportType === CONSERVATION_REPORT_TYPES.INCIDENT) return [
    { title: `Incidents by ${String(report.results.timeGranularity).toLowerCase()}`, data: breakdowns.byTime, labelKey: 'label', valueKey: 'count' },
    { title: 'Incidents by type', data: breakdowns.byType, labelKey: 'label', valueKey: 'count' },
    { title: 'Severity distribution', data: breakdowns.bySeverity, labelKey: 'label', valueKey: 'count' },
    { title: 'Incidents by location', data: breakdowns.byLocation, labelKey: 'label', valueKey: 'count' },
  ];
  if (report.reportType === CONSERVATION_REPORT_TYPES.PATROL_COVERAGE) return [
    { title: 'Daily distance covered', data: breakdowns.byDate, labelKey: 'label', valueKey: 'distanceKm', suffix: ' km' },
    { title: 'Patrol status', data: breakdowns.byStatus, labelKey: 'label', valueKey: 'count' },
    { title: 'Completed patrols by route', data: breakdowns.byRoute, labelKey: 'routeName', valueKey: 'completedPatrols' },
  ];
  if (report.reportType === CONSERVATION_REPORT_TYPES.CONFLICT_TREND) return [
    { title: `Conflict trend by ${String(report.results.timeGranularity).toLowerCase()}`, data: breakdowns.byTime, labelKey: 'label', valueKey: 'count' },
    { title: 'Conflict types', data: breakdowns.byConflictType, labelKey: 'label', valueKey: 'count' },
    { title: 'Conflict hotspots', data: breakdowns.byLocation, labelKey: 'label', valueKey: 'count' },
    { title: 'Species involved', data: breakdowns.bySpecies, labelKey: 'label', valueKey: 'count' },
  ];
  return [];
}

function recordTables(report) {
  if (report.reportType === CONSERVATION_REPORT_TYPES.INCIDENT) return [{
    title: 'Incident records', columns: ['Date', 'Type', 'Severity', 'Park', 'Location', 'Species'],
    rows: (report.results.incidents ?? []).map((item) => [formatDateTime(item.occurredAt), formatLabel(item.incidentType), item.severity, item.park, item.location, item.species ?? 'Not recorded']),
  }];
  if (report.reportType === CONSERVATION_REPORT_TYPES.PATROL_COVERAGE) return [
    {
      title: 'Route coverage', columns: ['Route', 'Patrols', 'Completed', 'Distance', 'Hours', 'Zone coverage'],
      rows: (report.results.breakdowns?.byRoute ?? []).map((item) => [item.routeName, item.totalPatrols, item.completedPatrols, `${item.distanceKm} km`, item.patrolHours, `${item.zoneCoveragePercent}%`]),
    },
    {
      title: 'Patrol records', columns: ['Started', 'Route', 'Team', 'Status', 'Distance', 'Duration', 'Zones'],
      rows: (report.results.patrols ?? []).map((item) => [formatDateTime(item.startedAt), item.routeName, item.rangerTeam, formatLabel(item.status), `${item.distanceKm} km`, `${item.durationHours} hrs`, item.zonesCovered]),
    },
  ];
  if (report.reportType === CONSERVATION_REPORT_TYPES.CONFLICT_TREND) return [{
    title: 'Conflict records', columns: ['Date', 'Type', 'Severity', 'Park', 'Location', 'Species'],
    rows: (report.results.conflicts ?? []).map((item) => [formatDateTime(item.occurredAt), formatLabel(item.conflictType), item.severity, item.park, item.location, item.species]),
  }];
  return [];
}

function sectionHeading(document, title) {
  ensureSpace(document, 30);
  document.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(12).text(title, PAGE_MARGIN, document.y);
  document.moveDown(0.55);
}

function ensureSpace(document, requiredHeight) {
  if (document.y + requiredHeight > document.page.height - 65) document.addPage();
}

function addPageFooters(document, reportId) {
  const range = document.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    document.switchToPage(index);
    const y = document.page.height - 54;
    document.strokeColor(COLORS.border).lineWidth(0.6)
      .moveTo(PAGE_MARGIN, y - 7).lineTo(document.page.width - PAGE_MARGIN, y - 7).stroke();
    document.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text(`WildGuard | ${reportId}`, PAGE_MARGIN, y, { width: 300, lineBreak: false })
      .text(`Page ${index + 1} of ${range.count}`, document.page.width - PAGE_MARGIN - 100, y, { width: 100, align: 'right', lineBreak: false });
  }
}

function contentWidth(document) { return document.page.width - PAGE_MARGIN * 2; }
function usablePageHeight(document) { return document.page.height - PAGE_MARGIN - 65; }

function reportTitle(type) {
  return ({
    [CONSERVATION_REPORT_TYPES.INCIDENT]: 'Incident Report',
    [CONSERVATION_REPORT_TYPES.PATROL_COVERAGE]: 'Patrol Coverage Report',
    [CONSERVATION_REPORT_TYPES.CONFLICT_TREND]: 'Conflict Trend Report',
  })[type] ?? formatLabel(type);
}

function formatLabel(value) {
  if (typeof value !== 'string') return displayValue(value);
  return value.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (Array.isArray(value)) return value.map(formatLabel).join(', ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${formatLabel(key)}: ${displayValue(item)}`).join(', ');
  return String(value);
}

function summaryValue(reportType, key, value) {
  if (key === 'topHotspot') return value?.label ?? 'Not available';
  if (key === 'trendDirection') return formatLabel(value);
  if (key === 'trendChangePercent') {
    if (value === null || value === undefined) return 'No baseline';
    return `${Number(value) > 0 ? '+' : ''}${value}%`;
  }
  if (key.endsWith('Percent')) return `${displayValue(value)}%`;
  if (reportType === CONSERVATION_REPORT_TYPES.PATROL_COVERAGE) {
    if (key.endsWith('DistanceKm')) return `${displayValue(value)} km`;
    if (key.endsWith('PatrolHours')) return `${displayValue(value)} hrs`;
  }
  return displayValue(value);
}

function summaryLabel(key) {
  return formatLabel(key).replace(/ Km$/, '').replace(/ Percent$/, '');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}
