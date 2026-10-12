import { useId } from 'react';
import { formatOption } from '../config/report-options.js';

export function BarChart({ title, data = [], labelKey = 'label', valueKey = 'count', valueSuffix = '' }) {
  const maximum = Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));
  return <section className="cr-chart-card"><h3>{title}</h3><div className="cr-bar-chart">{data.length === 0
    ? <p className="cr-chart-empty">No chart data available.</p>
    : data.map((item) => {
      const value = Number(item[valueKey]) || 0;
      return <div className="cr-bar-row" key={`${item[labelKey]}-${value}`}><div><span>{formatLabel(item[labelKey])}</span><strong>{value}{valueSuffix}</strong></div><span className="cr-bar-track"><i style={{ width: `${(value / maximum) * 100}%` }} /></span></div>;
    })}</div></section>;
}

export function LineChart({ title, data = [], valueKey = 'count', valueSuffix = '' }) {
  const gradientId = `cr-area-${useId().replaceAll(':', '')}`;
  const width = 600; const height = 170; const padding = 22;
  const maximum = Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index * (width - (padding * 2))) / (data.length - 1);
    const y = height - padding - ((Number(item[valueKey]) || 0) / maximum) * (height - (padding * 2));
    return { x, y, item };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  return <section className="cr-chart-card cr-line-card"><h3>{title}</h3>{data.length === 0
    ? <p className="cr-chart-empty">No trend data available.</p>
    : <><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} preserveAspectRatio="none"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b8a5d" stopOpacity=".28"/><stop offset="1" stopColor="#0b8a5d" stopOpacity="0"/></linearGradient></defs><line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} className="cr-chart-axis"/><polyline points={`${padding},${height - padding} ${path} ${width - padding},${height - padding}`} fill={`url(#${gradientId})`} stroke="none"/><polyline points={path} fill="none" className="cr-trend-line"/>{points.map(({ x, y, item }) => <circle key={`${item.label}-${x}`} cx={x} cy={y} r="4" className="cr-trend-point"><title>{`${item.label}: ${item[valueKey]}${valueSuffix}`}</title></circle>)}</svg><div className="cr-chart-range"><span>{data[0].label}</span><strong>Peak {maximum}{valueSuffix}</strong><span>{data.at(-1).label}</span></div></>}</section>;
}

function formatLabel(value) {
  if (typeof value !== 'string') return value;
  return value.includes('_') ? formatOption(value) : value;
}
