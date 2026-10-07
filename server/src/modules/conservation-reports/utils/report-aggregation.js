const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function countBy(records, labelOf) {
  const counts = new Map();
  for (const record of records) {
    const label = labelOf(record);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function selectTimeGranularity(startDate, endDate) {
  const days = inclusiveDays(startDate, endDate);
  if (days <= 45) return 'DAY';
  if (days <= 180) return 'WEEK';
  return 'MONTH';
}

export function buildCountTimeSeries(records, { startDate, endDate, dateOf, granularity }) {
  const counts = new Map();
  for (const record of records) {
    const label = bucketLabel(new Date(dateOf(record)), granularity);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const series = [];
  let cursor = bucketStart(startDate, granularity);
  const lastBucket = bucketStart(endDate, granularity);
  while (cursor <= lastBucket) {
    const label = bucketLabel(cursor, granularity);
    series.push({ label, count: counts.get(label) ?? 0 });
    cursor = nextBucket(cursor, granularity);
  }
  return series;
}

export function inclusiveDays(startDate, endDate) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
}

export function roundMetric(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function bucketStart(value, granularity) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  if (granularity === 'MONTH') date.setUTCDate(1);
  if (granularity === 'WEEK') {
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysFromMonday);
  }
  return date;
}

function nextBucket(value, granularity) {
  const date = new Date(value);
  if (granularity === 'MONTH') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCDate(date.getUTCDate() + (granularity === 'WEEK' ? 7 : 1));
  return date;
}

function bucketLabel(value, granularity) {
  const date = bucketStart(value, granularity);
  const isoDate = date.toISOString().slice(0, 10);
  return granularity === 'MONTH' ? isoDate.slice(0, 7) : isoDate;
}
