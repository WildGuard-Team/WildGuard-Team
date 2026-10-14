import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import coverage from 'istanbul-lib-coverage';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportRoot = path.join(root, 'coverage/community-reports');
const metricNames = ['lines', 'functions', 'branches'];
const combined = coverage.createCoverageMap({});
const rows = [];
const gaps = [];
const inventory = [];

async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(absolute) : /\.(js|jsx)$/.test(entry.name) ? [absolute] : [];
  }))).flat();
}

function ranges(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const groups = [];
  for (const number of sorted) {
    const last = groups.at(-1);
    if (last && number === last[1] + 1) last[1] = number;
    else groups.push([number, number]);
  }
  return groups.map(([first, last]) => first === last ? String(first) : `${first}-${last}`).join(', ') || 'None';
}
function position(location, fallback) {
  const hasArmSpan = Number.isFinite(location?.start?.line);
  const span = hasArmSpan ? location : fallback;
  const point = (value) => Number.isFinite(value?.column) ? `${value.line}:${value.column}` : `${value.line}`;
  const start = point(span.start);
  const end = point(span.end);
  return `${start === end ? start : `${start}-${end}`}${hasArmSpan ? '' : ' (implicit arm; enclosing span)'}`;
}
function formatMetric(metric) { return `${metric.pct}% (${metric.covered}/${metric.total})`; }
function summaryRow(name, summary) { return `| ${name} | ${metricNames.map((metric) => formatMetric(summary[metric])).join(' | ')} |`; }

for (const side of ['backend', 'frontend']) {
  const raw = JSON.parse(await readFile(path.join(reportRoot, side, 'coverage-final.json'), 'utf8'));
  const map = coverage.createCoverageMap(raw);
  const expected = await sources(path.join(root, side === 'backend' ? 'server/src/modules/community-reports' : 'client/src/features/community-reports'));
  if (side === 'frontend') expected.push(path.join(root, 'client/src/pages/MemberLandingPage.jsx'));
  const measured = new Set(map.files().map((file) => path.normalize(file)));
  const missing = expected.filter((file) => !measured.has(path.normalize(file)));
  if (missing.length) throw new Error(`Coverage omitted scoped source files: ${missing.join(', ')}`);
  combined.merge(map);
  const summary = map.getCoverageSummary().toJSON();
  rows.push(summaryRow(side, summary));
  for (const absolute of map.files().sort()) {
    const file = map.fileCoverageFor(absolute);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    const uncoveredLines = file.getUncoveredLines().map(Number);
    const uncoveredStatements = Object.entries(file.s).filter(([, count]) => count === 0).map(([id]) => position(file.statementMap[id]));
    const uncoveredFunctions = Object.entries(file.f).filter(([, count]) => count === 0).map(([id]) => {
      const fn = file.fnMap[id];
      return `${fn.name} at ${position(fn.loc)}`;
    });
    const uncoveredBranches = Object.entries(file.b).flatMap(([id, counts]) => counts.flatMap((count, index) => {
      if (count !== 0) return [];
      const branch = file.branchMap[id];
      return [`${branch.type} ${id}, arm ${index} at ${position(branch.locations[index], branch.loc)}`];
    }));
    inventory.push(summaryRow(relative, file.toSummary().toJSON()));
    if (uncoveredLines.length || uncoveredStatements.length || uncoveredFunctions.length || uncoveredBranches.length) {
      gaps.push(`### ${relative}\n\n- Uncovered executable lines: ${ranges(uncoveredLines)}\n- Uncovered statements on otherwise covered lines: ${uncoveredStatements.join('; ') || 'None'}\n- Uncovered functions: ${uncoveredFunctions.join('; ') || 'None'}\n- Uncovered branch arms: ${uncoveredBranches.join('; ') || 'None'}\n`);
    }
  }
}
rows.push(summaryRow('Combined (weighted counts, not an average)', combined.getCoverageSummary().toJSON()));
const baselineRows = [];
for (const side of ['backend', 'frontend']) {
  try {
    const raw = JSON.parse(await readFile(path.join(reportRoot, 'baseline', side, 'coverage-summary.json'), 'utf8'));
    baselineRows.push(summaryRow(`${side} baseline`, raw.total));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const output = `# Community Report coverage\n\nGenerated from real c8/Node and Vitest/V8 reports on ${new Date().toISOString()}.\n\nRun from the repository root: \`npm run coverage:community-reports\`. Node >=22.12 and local MongoDB at 127.0.0.1:27017 are required. Tests create isolated test records and clean up their own owner IDs; they do not use the application database.\n\n## Scope and method\n\nEvery JavaScript/JSX source in \`server/src/modules/community-reports\` and \`client/src/features/community-reports\`, plus \`client/src/pages/MemberLandingPage.jsx\`, is included, including never-imported files. CSS/assets, auth infrastructure, App routing, other modules, and test files are outside this selected module's coverage denominator. No ignore directives or source exclusions were added to inflate coverage. Both workspace commands enforce >=80% lines/functions/branches independently.\n\nFrontend tests exercise real React views/hooks and real fake-indexeddb storage. External fetch, Cloudinary, geocoding, Leaflet rendering and browser APIs are controlled boundaries, not live-provider end-to-end claims. Backend tests combine isolated units/HTTP endpoints with the existing real MongoDB ownership/index/concurrency integration tests. The existing four Node service contracts are ported unchanged to Vitest for the baseline; the manual browser IndexedDB fixture had no automated coverage command. V8 branch denominators can grow when new paths are executed, so baseline branch percentages alone are not comparable to the final totals.\n\n## Measured result\n\n| Scope | Lines | Functions | Branches |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n${baselineRows.length ? `## Original-contract baseline\n\n| Scope | Lines | Functions | Branches |\n| --- | --- | --- | --- |\n${baselineRows.join('\n')}\n\n` : ''}## All remaining uncovered files, lines, functions and branches\n\nCoordinates are one-based lines and zero-based columns from the instrumented source maps; branch arm IDs identify distinct zero-hit paths, even when the enclosing line was executed.\n\n${gaps.join('\n') || 'None.'}\n## Full file inventory\n\n| Source file | Lines | Functions | Branches |\n| --- | --- | --- | --- |\n${inventory.join('\n')}\n\nRaw reproducible artifacts: \`coverage/community-reports/{backend,frontend}/coverage-final.json\`, \`coverage-summary.json\`, \`lcov.info\`, and \`index.html\`. Coverage output is Git-ignored; this Markdown snapshot is checked in.\n`;
const outputPath = path.join(root, 'docs/community-report-coverage.md');
const finalOutput = output
  .replace('Both workspace commands enforce >=80% lines/functions/branches independently.', 'Both workspace commands enforce >=80% lines/functions/branches independently and for every individual scoped source file. The report generator verifies that no scoped source file is omitted.')
  .replace('Coordinates are one-based lines and zero-based columns from the instrumented source maps; branch arm IDs identify distinct zero-hit paths, even when the enclosing line was executed.', 'Coordinates are one-based lines and zero-based columns from the instrumented source maps. Implicit else arms sometimes have no arm-specific span; those use the enclosing condition span and are marked explicitly. Missing end columns are omitted, not invented. Branch arm IDs identify distinct zero-hit paths, even when the enclosing line was executed. A covered line can still contain an unexecuted statement or callback, so these are listed separately.')
  .replace('## All remaining uncovered files, lines, functions and branches', '## Remaining limitations\n\nThe remaining paths include optional provider diagnostic fallbacks, suppressed IndexedDB cleanup failures/transaction errors, request-lock guards, late GPS/reverse-lookup races, absent legacy fields, configured API-base fallbacks, and the browser sign-in redirect callback. They are not hidden or asserted as covered. Mocked UI/browser boundaries do not replace real-browser end-to-end validation. No feature source or feature behavior was modified for this coverage task.\n\n## All remaining uncovered files, lines, functions and branches');
await writeFile(outputPath, finalOutput, 'utf8');
console.log(rows.join('\n'));
console.log(`Complete uncovered inventory: ${outputPath}`);
