'use client';

import React, { useState } from 'react';
import { Plus, Trash2, X, BarChart2, TrendingUp, PieChart, Target } from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'pie' | 'kpi';

export interface ChartDataRow {
  label: string;
  value: number;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  data: ChartDataRow[];
  color?: string;
}

interface ChartPanelProps {
  charts: ChartConfig[];
  onChange: (charts: ChartConfig[]) => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar',  label: 'Bar Chart',  icon: <BarChart2 className="w-4 h-4" /> },
  { type: 'line', label: 'Line Chart', icon: <TrendingUp className="w-4 h-4" /> },
  { type: 'pie',  label: 'Pie Chart',  icon: <PieChart className="w-4 h-4" /> },
  { type: 'kpi',  label: 'KPI Cards',  icon: <Target className="w-4 h-4" /> },
];

const CHART_COLORS = ['#2563EB','#7C3AED','#059669','#EA580C','#DB2777','#0D9488'];

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultRows(): ChartDataRow[] {
  return [
    { label: 'Q1', value: 42 },
    { label: 'Q2', value: 68 },
    { label: 'Q3', value: 55 },
    { label: 'Q4', value: 89 },
  ];
}

// ── Tiny inline chart previews ────────────────────────────────────────────────
function BarPreview({ data, color }: { data: ChartDataRow[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-16 px-1 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${(d.value / max) * 48}px`, background: color, opacity: 0.8 + i * 0.05 }}
          />
          <span className="text-[8px] text-[#9A9A9A] truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LinePreview({ data, color }: { data: ChartDataRow[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 120; const h = 48;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.value / max) * (h - 8),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length-1].x} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 px-1">
      <defs>
        <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#lg-${color.replace('#','')})`} />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
    </svg>
  );
}

function PiePreview({ data, color }: { data: ChartDataRow[]; color: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = CHART_COLORS;
  let angle = 0;
  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 360;
    const start = angle; angle += slice;
    return { slice, start, color: colors[i % colors.length] };
  });
  const arc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto">
      {slices.map((sl, i) => (
        <path key={i} d={arc(32, 32, 28, sl.start, sl.start + sl.slice)} fill={sl.color} opacity="0.85" />
      ))}
      <circle cx="32" cy="32" r="12" fill="white" />
    </svg>
  );
}

function KpiPreview({ data, color }: { data: ChartDataRow[]; color: string }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1">
      {data.slice(0, 4).map((d, i) => (
        <div key={i} className="rounded p-1.5 text-center" style={{ background: color + '18' }}>
          <div className="text-xs font-bold" style={{ color }}>{d.value}</div>
          <div className="text-[8px] text-[#9A9A9A] truncate">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function ChartPreview({ chart }: { chart: ChartConfig }) {
  const color = chart.color || CHART_COLORS[0];
  if (chart.type === 'bar') return <BarPreview data={chart.data} color={color} />;
  if (chart.type === 'line') return <LinePreview data={chart.data} color={color} />;
  if (chart.type === 'pie') return <PiePreview data={chart.data} color={color} />;
  return <KpiPreview data={chart.data} color={color} />;
}

// ── Chart editor ──────────────────────────────────────────────────────────────
function ChartEditor({ chart, onChange, onDelete }: {
  chart: ChartConfig;
  onChange: (c: ChartConfig) => void;
  onDelete: () => void;
}) {
  const setField = <K extends keyof ChartConfig>(k: K, v: ChartConfig[K]) =>
    onChange({ ...chart, [k]: v });

  const setRowLabel = (i: number, label: string) =>
    onChange({ ...chart, data: chart.data.map((d, j) => j === i ? { ...d, label } : d) });

  const setRowValue = (i: number, raw: string) => {
    const value = parseFloat(raw) || 0;
    onChange({ ...chart, data: chart.data.map((d, j) => j === i ? { ...d, value } : d) });
  };

  const addRow = () => onChange({ ...chart, data: [...chart.data, { label: `Item ${chart.data.length + 1}`, value: 0 }] });
  const removeRow = (i: number) => onChange({ ...chart, data: chart.data.filter((_, j) => j !== i) });

  return (
    <div className="border border-[#E3E1DA] rounded-xl overflow-hidden bg-white">
      {/* Preview */}
      <div className="bg-[#EDEBE6] p-3 border-b border-[#F1F0EC]">
        <p className="text-[10px] font-semibold text-[#C9C6BD] mb-1 uppercase tracking-wide">{chart.title || 'Untitled'}</p>
        <ChartPreview chart={chart} />
      </div>

      <div className="p-3 space-y-3">
        {/* Title */}
        <input
          value={chart.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="Chart title..."
          className="w-full text-xs font-medium border border-[#E3E1DA] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#A8B9AE]"
        />

        {/* Type selector */}
        <div className="grid grid-cols-4 gap-1">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.type}
              onClick={() => setField('type', ct.type)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[9px] font-medium transition-all ${
                chart.type === ct.type
                  ? 'bg-[#4F7563] text-white'
                  : 'bg-[#F1F0EC] text-[#6B6B6B] hover:bg-[#E3E1DA]'
              }`}
            >
              {ct.icon}
              {ct.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Color */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#9A9A9A] font-medium">Color:</span>
          {CHART_COLORS.map(col => (
            <button
              key={col}
              onClick={() => setField('color', col)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${chart.color === col ? 'border-gray-900 scale-110' : 'border-transparent'}`}
              style={{ background: col }}
            />
          ))}
        </div>

        {/* Data rows */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#9A9A9A] font-medium uppercase tracking-wide">Data</span>
            <button onClick={addRow} className="flex items-center gap-0.5 text-[10px] text-[#4F7563] hover:text-[#263F34] font-medium">
              <Plus className="w-3 h-3" /> Add row
            </button>
          </div>
          <div className="space-y-1">
            {chart.data.map((row, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input
                  value={row.label}
                  onChange={e => setRowLabel(i, e.target.value)}
                  placeholder="Label"
                  className="flex-1 text-[10px] border border-[#E3E1DA] rounded px-2 py-1 focus:outline-none focus:border-[#A8B9AE]"
                />
                <input
                  type="number"
                  value={row.value}
                  onChange={e => setRowValue(i, e.target.value)}
                  className="w-16 text-[10px] border border-[#E3E1DA] rounded px-2 py-1 focus:outline-none focus:border-[#A8B9AE] text-right"
                />
                <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Delete chart */}
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-[#D96A6A] hover:text-[#7a2929] hover:bg-[#FCF1F1] rounded-lg transition-all font-medium border border-red-100"
        >
          <Trash2 className="w-3 h-3" />
          Remove chart
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function ChartPanel({ charts, onChange }: ChartPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addChart = (type: ChartType) => {
    const id = uid();
    const newChart: ChartConfig = {
      id,
      type,
      title: CHART_TYPES.find(t => t.type === type)?.label || 'Chart',
      data: defaultRows(),
      color: CHART_COLORS[charts.length % CHART_COLORS.length],
    };
    onChange([...charts, newChart]);
    setExpandedId(id);
  };

  const updateChart = (id: string, updated: ChartConfig) =>
    onChange(charts.map(c => c.id === id ? updated : c));

  const deleteChart = (id: string) => {
    onChange(charts.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wide">Charts</p>

      {charts.length === 0 && (
        <p className="text-[10px] text-[#C9C6BD] text-center py-2">No charts on this page yet.</p>
      )}

      {charts.map(chart => (
        <div key={chart.id}>
          <button
            onClick={() => setExpandedId(expandedId === chart.id ? null : chart.id)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-[#EDEBE6] hover:bg-[#F1F0EC] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {CHART_TYPES.find(t => t.type === chart.type)?.icon}
              <span className="text-xs font-medium text-[#111111] truncate max-w-[120px]">{chart.title || 'Untitled'}</span>
            </div>
            <span className="text-[10px] text-[#C9C6BD]">{expandedId === chart.id ? '▲' : '▼'}</span>
          </button>
          {expandedId === chart.id && (
            <div className="mt-1">
              <ChartEditor
                chart={chart}
                onChange={updated => updateChart(chart.id, updated)}
                onDelete={() => deleteChart(chart.id)}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add chart buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.type}
            onClick={() => addChart(ct.type)}
            className="flex items-center gap-1.5 p-2 rounded-lg border border-dashed border-[#C9C6BD] text-[10px] text-[#6B6B6B] hover:border-[#A8B9AE] hover:text-[#4F7563] hover:bg-[#EEF5F1] transition-all font-medium"
          >
            <Plus className="w-3 h-3" />
            {ct.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Expose for use in X import
export { ChartPreview };
