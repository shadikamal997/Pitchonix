'use client';

import React from 'react';

// =============================================================================
//  Phase 42.5A — TemplateRadar
//
//  Pure-SVG 6-axis radar chart. No chart library — keeps bundle size low
//  and lets us style every line / dot precisely. Used in the template
//  chooser to compare templates side by side.
//
//  Axes: ATS · Visual · Executive · Creative · Readability · Print
// =============================================================================

export interface TemplateInsightAxes {
  ats:         number;
  visual:      number;
  executive:   number;
  creative:    number;
  readability: number;
  print:       number;
}

export interface TemplateRadarProps {
  axes:    TemplateInsightAxes;
  size?:   number;     // pixel size of square viewport
  color?:  string;     // stroke + fill colour for the data polygon
  showLabels?: boolean;
  className?: string;
}

const AXES: Array<{ key: keyof TemplateInsightAxes; label: string }> = [
  { key: 'ats',         label: 'ATS' },
  { key: 'visual',      label: 'Visual' },
  { key: 'executive',   label: 'Exec' },
  { key: 'creative',    label: 'Creative' },
  { key: 'readability', label: 'Read' },
  { key: 'print',       label: 'Print' },
];

export const TemplateRadar: React.FC<TemplateRadarProps> = ({
  axes, size = 180, color = '#7C3AED', showLabels = true, className,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - (showLabels ? 24 : 8);

  // Compute polygon vertices for the data + each ring.
  const N = AXES.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

  const point = (i: number, value: number /* 0..1 */) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r * value, cy + Math.sin(a) * r * value];
  };

  const dataPoints = AXES.map(({ key }, i) => point(i, (axes[key] ?? 0) / 100));
  const dataPolyStr = dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // 4 background rings at 25 / 50 / 75 / 100 %.
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Template radar chart"
    >
      {/* Rings */}
      {rings.map((p, i) => (
        <polygon
          key={i}
          points={AXES.map((_, j) => {
            const [x, y] = point(j, p);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={i === rings.length - 1 ? 1.4 : 0.8}
        />
      ))}

      {/* Axis spokes */}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#F1F5F9" strokeWidth={0.8} />;
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolyStr}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Data dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      ))}

      {/* Axis labels */}
      {showLabels && AXES.map(({ key, label }, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight={600}
            fill="#475569"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

// =============================================================================
//  Side-by-side comparison radar (two overlaid polygons)
// =============================================================================
export const TemplateRadarCompare: React.FC<{
  a: TemplateInsightAxes; aLabel: string; aColor?: string;
  b: TemplateInsightAxes; bLabel: string; bColor?: string;
  size?: number;
}> = ({ a, b, aLabel, bLabel, aColor = '#7C3AED', bColor = '#2563EB', size = 200 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 28;
  const N = AXES.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const poly = (axes: TemplateInsightAxes) => AXES.map(({ key }, i) => {
    const v = (axes[key] ?? 0) / 100;
    const x = cx + Math.cos(angleFor(i)) * r * v;
    const y = cy + Math.sin(angleFor(i)) * r * v;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="inline-flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img">
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <polygon key={i}
            points={AXES.map((_, j) => {
              const a = angleFor(j);
              return `${(cx + Math.cos(a) * r * p).toFixed(1)},${(cy + Math.sin(a) * r * p).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#E2E8F0" strokeWidth={i === 3 ? 1.4 : 0.8}
          />
        ))}
        <polygon points={poly(a)} fill={aColor} fillOpacity={0.18} stroke={aColor} strokeWidth={1.5} />
        <polygon points={poly(b)} fill={bColor} fillOpacity={0.18} stroke={bColor} strokeWidth={1.5} />
        {AXES.map(({ key, label }, i) => {
          const ang = angleFor(i);
          const x = cx + Math.cos(ang) * (r + 14);
          const y = cy + Math.sin(ang) * (r + 14);
          return <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={600} fill="#475569">{label}</text>;
        })}
      </svg>
      <div className="flex items-center gap-3 text-[11px] mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ background: aColor }} /> {aLabel}</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ background: bColor }} /> {bLabel}</span>
      </div>
    </div>
  );
};
