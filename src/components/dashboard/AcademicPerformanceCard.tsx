"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { CollapsibleSectionCard } from "./CollapsibleSectionCard";

export type TermTrendPoint = {
  termKey: string;
  gpa: number;
  cgpa: number | null;
};

type AcademicPerformanceCardProps = {
  terms: TermTrendPoint[];
  currentScore: number | null;
  scoreLabel: string;
  isApproved: boolean;
};

export function AcademicPerformanceCard({
  terms,
  currentScore,
  scoreLabel,
  isApproved,
}: AcademicPerformanceCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const chartWidth = 540;
  const chartHeight = 190;
  const padLeft = 42;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 30;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const { points, minY, linePath, areaPath } = useMemo(() => {
    if (terms.length === 0) {
      return { points: [], minY: 2.0, linePath: "", areaPath: "" };
    }

    const scores = terms.map((t) => t.gpa);
    const rawMin = Math.min(...scores);
    const computedMinY = Math.max(0, Math.floor((rawMin - 0.35) * 4) / 4);
    const maxY = 4.0;
    const spanY = Math.max(0.5, maxY - computedMinY);

    const pts = terms.map((t, i) => {
      const x =
        terms.length === 1
          ? padLeft + innerW / 2
          : padLeft + (i / (terms.length - 1)) * innerW;
      const clamped = Math.min(maxY, Math.max(computedMinY, t.gpa));
      const y = padTop + ((maxY - clamped) / spanY) * innerH;
      return { ...t, x, y };
    });

    if (pts.length === 1) {
      const p = pts[0]!;
      return {
        points: pts,
        minY: computedMinY,
        linePath: `M ${padLeft} ${p.y} L ${chartWidth - padRight} ${p.y}`,
        areaPath: `M ${padLeft} ${p.y} L ${chartWidth - padRight} ${p.y} L ${chartWidth - padRight} ${padTop + innerH} L ${padLeft} ${padTop + innerH} Z`,
      };
    }

    let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]!;
      const p1 = pts[i + 1]!;
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const last = pts[pts.length - 1]!;
    const first = pts[0]!;
    const area = `${d} L ${last.x} ${padTop + innerH} L ${first.x} ${padTop + innerH} Z`;

    return { points: pts, minY: computedMinY, linePath: d, areaPath: area };
  }, [terms, innerW, innerH]);

  const activeIdx =
    hoveredIdx !== null ? hoveredIdx : points.length > 0 ? points.length - 1 : null;
  const activePoint = activeIdx !== null ? points[activeIdx] ?? null : null;

  // Semi-circular Gauge math (radius 74)
  const gaugeRadius = 74;
  const semiCircumference = Math.PI * gaugeRadius;
  const normalizedScore =
    currentScore !== null ? Math.min(4, Math.max(0, currentScore)) / 4 : 0;
  const targetOffset = semiCircumference * (1 - normalizedScore);
  const currentOffset = mounted ? targetOffset : semiCircumference;

  const yTicks = [4.0, (4.0 + minY) / 2, minY];

  return (
    <CollapsibleSectionCard
      storageKey="performance_trend"
      title="Academic Performance Trend"
      subtitle="Term-by-term GPA progression and cumulative standing."
      borderHoverCls="hover:border-emerald-500/40"
      className="dash-stagger-3"
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300">
          <TrendingUp className="h-5 w-5" />
        </div>
      }
    >
      <style>{`
        @keyframes drawTrendLine {
          from { stroke-dashoffset: 1200; }
          to { stroke-dashoffset: 0; }
        }
        .trend-line-animate {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: drawTrendLine 1.1s ease-out 0.15s forwards;
        }
      `}</style>

      {!isApproved || terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#060A12]/60 p-8 text-center">
          <Activity className="h-7 w-7 text-slate-500" />
          <p className="mt-2 text-sm font-semibold text-white">
            {isApproved
              ? "No published term results yet"
              : "Verification pending"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Your animated GPA trend graph and CGPA gauge will appear here once
            term results are published.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          {/* Left: Smooth SVG Area-Line Chart */}
          <div className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#060A12] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Term GPA Trajectory
              </span>
              {activePoint ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <span>Term {activePoint.termKey}</span>
                  <span className="text-slate-500">·</span>
                  <span>GPA {activePoint.gpa.toFixed(2)}</span>
                  {activePoint.cgpa !== null && activePoint.termKey !== "1-1" ? (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300">
                        CGPA {activePoint.cgpa.toFixed(2)}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-48 w-full overflow-visible"
              role="img"
              aria-label="Term GPA progression chart"
            >
              <defs>
                <linearGradient id="jtecAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="jtecLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {yTicks.map((tick, idx) => {
                const span = Math.max(0.5, 4.0 - minY);
                const y = padTop + ((4.0 - tick) / span) * innerH;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              {areaPath ? (
                <path d={areaPath} fill="url(#jtecAreaGrad)" />
              ) : null}

              {/* Animated Line */}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#jtecLineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="trend-line-animate"
                />
              ) : null}

              {/* Interactive Nodes & X Labels */}
              {points.map((pt, i) => {
                const isSelected = activeIdx === i;
                return (
                  <g
                    key={pt.termKey}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setHoveredIdx(i)}
                  >
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                    {isSelected ? (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill="#10b981"
                        fillOpacity="0.25"
                      />
                    ) : null}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5 : 4}
                      fill={isSelected ? "#34d399" : "#22d3ee"}
                      stroke="#060A12"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className={`font-mono text-[11px] ${
                        isSelected
                          ? "fill-emerald-300 font-bold"
                          : "fill-slate-400"
                      }`}
                    >
                      {pt.termKey}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right: Semi-Circular Animated CGPA Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-5 text-center">
            <svg viewBox="0 0 180 110" className="w-48 overflow-visible">
              <defs>
                <linearGradient id="jtecGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="60%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>

              <path
                d={`M ${90 - gaugeRadius} 92 A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${90 + gaugeRadius} 92`}
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeLinecap="round"
              />

              <path
                d={`M ${90 - gaugeRadius} 92 A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${90 + gaugeRadius} 92`}
                fill="none"
                stroke="url(#jtecGaugeGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={semiCircumference}
                strokeDashoffset={currentOffset}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
              />
            </svg>

            <div className="-mt-9">
              <p className="font-serif text-3xl font-bold text-white">
                {currentScore !== null ? currentScore.toFixed(2) : "—"}
                <span className="ml-1 text-sm font-normal text-slate-400">
                  / 4.00
                </span>
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Current {scoreLabel}
              </p>
            </div>

            <div className="mt-4 w-full rounded-lg border border-slate-800 bg-[#0A1020] px-3 py-2 text-[11px] text-slate-400">
              Completed{" "}
              <span className="font-bold text-white">{terms.length}</span>{" "}
              {terms.length === 1 ? "term" : "terms"}
            </div>
          </div>
        </div>
      )}
    </CollapsibleSectionCard>
  );
}