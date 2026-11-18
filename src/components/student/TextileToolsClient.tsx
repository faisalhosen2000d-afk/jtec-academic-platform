"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Scale,
  Layers,
  Droplets,
  Shirt,
  FlaskConical,
  ArrowRightLeft,
  Info,
  Sparkles,
} from "lucide-react";
import Yarn3DLab, { type Lab3DMode } from "./Yarn3DLab";

type ToolTab = "yarn" | "units" | "weaving" | "dyeing" | "garment" | "ttqc";

type CountSystemId =
  | "tex"
  | "denier"
  | "dtex"
  | "ktex"
  | "jute"
  | "ne"
  | "nm"
  | "nek"
  | "lea"
  | "ysw";

interface CountSystemMeta {
  id: CountSystemId;
  label: string;
  short: string;
  type: "Direct" | "Indirect";
  definition: string;
  toTex: (v: number) => number;
  fromTex: (tex: number) => number;
}

const COUNT_SYSTEMS: CountSystemMeta[] = [
  {
    id: "tex",
    label: "Tex (Universal SI)",
    short: "Tex",
    type: "Direct",
    definition: "\u09e7,\u09e6\u09e6\u09e6 \u09ae\u09bf\u099f\u09be\u09b0 \u09b8\u09c1\u09a4\u09be\u09b0 \u0993\u099c\u09a8 \u09af\u09a4 \u0997\u09cd\u09b0\u09be\u09ae",
    toTex: (v) => v,
    fromTex: (t) => t,
  },
  {
    id: "denier",
    label: "Denier (Filament/Polyester)",
    short: "Denier",
    type: "Direct",
    definition: "\u09ef,\u09e6\u09e6\u09e6 \u09ae\u09bf\u099f\u09be\u09b0 \u09b8\u09c1\u09a4\u09be\u09b0 \u0993\u099c\u09a8 \u09af\u09a4 \u0997\u09cd\u09b0\u09be\u09ae (Denier = 9 \u00d7 Tex)",
    toTex: (v) => v / 9,
    fromTex: (t) => t * 9,
  },
  {
    id: "dtex",
    label: "Decitex (dtex)",
    short: "dtex",
    type: "Direct",
    definition: "\u09e7\u09e6,\u09e6\u09e6\u09e6 \u09ae\u09bf\u099f\u09be\u09b0 \u09b8\u09c1\u09a4\u09be\u09b0 \u0993\u099c\u09a8 \u09af\u09a4 \u0997\u09cd\u09b0\u09be\u09ae (dtex = 10 \u00d7 Tex)",
    toTex: (v) => v / 10,
    fromTex: (t) => t * 10,
  },
  {
    id: "ktex",
    label: "Kilotex (ktex / Sliver)",
    short: "ktex",
    type: "Direct",
    definition: "\u09e7,\u09e6\u09e6\u09e6 \u09ae\u09bf\u099f\u09be\u09b0 \u09b8\u09cd\u09b2\u09be\u0987\u09ad\u09be\u09b0/\u09b0\u09cb\u09ad\u09bf\u09df\u09c7\u09b0 \u0993\u099c\u09a8 \u09af\u09a4 \u0995\u09c7\u099c\u09bf",
    toTex: (v) => v * 1000,
    fromTex: (t) => t / 1000,
  },
  {
    id: "jute",
    label: "Jute (lb / spyndle)",
    short: "lb/spyndle",
    type: "Direct",
    definition: "\u09e7\u09ea,\u09ea\u09e6\u09e6 \u0997\u099c (1 spyndle) \u09aa\u09be\u099f\u09c7\u09b0 \u09b8\u09c1\u09a4\u09be\u09b0 \u0993\u099c\u09a8 \u09af\u09a4 \u09aa\u09be\u0989\u09a8\u09cd\u09a1",
    toTex: (v) => v * 34.45,
    fromTex: (t) => t / 34.45,
  },
  {
    id: "ne",
    label: "Ne (English Cotton)",
    short: "Ne",
    type: "Indirect",
    definition: "\u09e7 \u09aa\u09be\u0989\u09a8\u09cd\u09a1 (453.6 gm) \u0993\u099c\u09a8\u09c7 \u09af\u09a4\u099f\u09bf 840 yd \u09b9\u09cd\u09af\u09be\u0982\u0995 \u09a5\u09be\u0995\u09c7",
    toTex: (v) => 590.54 / Math.max(0.0001, v),
    fromTex: (t) => 590.54 / Math.max(0.0001, t),
  },
  {
    id: "nm",
    label: "Nm (Metric Count)",
    short: "Nm",
    type: "Indirect",
    definition: "\u09e7 \u0995\u09c7\u099c\u09bf (1000 gm) \u0993\u099c\u09a8\u09c7 \u09af\u09a4 \u0995\u09bf\u09b2\u09cb\u09ae\u09bf\u099f\u09be\u09b0 (1000 m) \u09b8\u09c1\u09a4\u09be \u09a5\u09be\u0995\u09c7",
    toTex: (v) => 1000 / Math.max(0.0001, v),
    fromTex: (t) => 1000 / Math.max(0.0001, t),
  },
  {
    id: "nek",
    label: "NeK (Worsted Wool)",
    short: "NeK",
    type: "Indirect",
    definition: "\u09e7 \u09aa\u09be\u0989\u09a8\u09cd\u09a1 \u0993\u099c\u09a8\u09c7 \u09af\u09a4\u099f\u09bf 560 yd \u09b9\u09cd\u09af\u09be\u0982\u0995 \u09a5\u09be\u0995\u09c7",
    toTex: (v) => 885.81 / Math.max(0.0001, v),
    fromTex: (t) => 885.81 / Math.max(0.0001, t),
  },
  {
    id: "lea",
    label: "Lea / NeL (Linen)",
    short: "Lea",
    type: "Indirect",
    definition: "\u09e7 \u09aa\u09be\u0989\u09a8\u09cd\u09a1 \u0993\u099c\u09a8\u09c7 \u09af\u09a4\u099f\u09bf 300 yd \u09b2\u09bf \u09a5\u09be\u0995\u09c7",
    toTex: (v) => 1653.52 / Math.max(0.0001, v),
    fromTex: (t) => 1653.52 / Math.max(0.0001, t),
  },
  {
    id: "ysw",
    label: "YSW (Yorkshire Woollen)",
    short: "YSW",
    type: "Indirect",
    definition: "\u09e7 \u09aa\u09be\u0989\u09a8\u09cd\u09a1 \u0993\u099c\u09a8\u09c7 \u09af\u09a4\u099f\u09bf 256 yd \u09b8\u09cd\u0995\u09bf\u09a8 \u09a5\u09be\u0995\u09c7",
    toTex: (v) => 1937.71 / Math.max(0.0001, v),
    fromTex: (t) => 1937.71 / Math.max(0.0001, t),
  },
];

function Fraction({
  num,
  den,
  prefix,
  suffix,
}: {
  num: string;
  den: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm sm:text-base text-slate-100">
      {prefix && <span className="text-cyan-300 font-semibold">{prefix}</span>}
      <span className="inline-flex flex-col items-center leading-tight">
        <span className="px-2 pb-1 border-b border-cyan-400/70 text-center">{num}</span>
        <span className="px-2 pt-1 text-center text-amber-200">{den}</span>
      </span>
      {suffix && <span className="text-emerald-300 font-semibold">{suffix}</span>}
    </span>
  );
}

type LengthUnit = "yd" | "in" | "m" | "cm" | "hank" | "lea" | "spyndle";
const LENGTH_TO_YD: Record<LengthUnit, number> = {
  yd: 1,
  in: 1 / 36,
  m: 1.0936133,
  cm: 1.0936133 / 100,
  hank: 840,
  lea: 120,
  spyndle: 14400,
};

type WeightUnit = "lb" | "oz" | "gm" | "grain" | "kg" | "ton";
const WEIGHT_TO_GM: Record<WeightUnit, number> = {
  gm: 1,
  lb: 453.6,
  oz: 453.6 / 16,
  grain: 453.6 / 7000,
  kg: 1000,
  ton: 1_000_000,
};

export function TextileToolsClient() {
  const [activeTab, setActiveTab] = useState<ToolTab>("yarn");

  // Yarn A (Primary Converter)
  const [fromSys, setFromSys] = useState<CountSystemId>("ne");
  const [toSys, setToSys] = useState<CountSystemId>("tex");
  const [inputCount, setInputCount] = useState<number>(30);
  const [plyCount, setPlyCount] = useState<number>(1);
  const [lab3DMode, setLab3DMode] = useState<Lab3DMode>("ply");

  // Yarn B (Comparison Yarn)
  const [cmpSys, setCmpSys] = useState<CountSystemId>("tex");
  const [cmpCount, setCmpCount] = useState<number>(30);
  const [cmpPly, setCmpPly] = useState<number>(1);

  const [wrapTurns, setWrapTurns] = useState<number>(80);
  const [wrapWeightGrains, setWrapWeightGrains] = useState<number>(33.3);
  const [beesleyThreads, setBeesleyThreads] = useState<number>(30);

  const [lenVal, setLenVal] = useState<number>(1);
  const [lenFrom, setLenFrom] = useState<LengthUnit>("hank");
  const [lenTo, setLenTo] = useState<LengthUnit>("yd");

  const [wtVal, setWtVal] = useState<number>(1);
  const [wtFrom, setWtFrom] = useState<WeightUnit>("lb");
  const [wtTo, setWtTo] = useState<WeightUnit>("grain");

  const [gsmInput, setGsmInput] = useState<number>(180);
  const [ozInput, setOzInput] = useState<number>(5.31);

  const [epi, setEpi] = useState<number>(84);
  const [ppi, setPpi] = useState<number>(64);
  const [warpNe, setWarpNe] = useState<number>(30);
  const [weftNe, setWeftNe] = useState<number>(30);

  const [fabricKg, setFabricKg] = useState<number>(100);
  const [mlRatio, setMlRatio] = useState<number>(8);
  const [shadePct, setShadePct] = useState<number>(2.5);
  const [saltGpl, setSaltGpl] = useState<number>(40);

  const [bodyLenCm, setBodyLenCm] = useState<number>(72);
  const [sleeveLenCm, setSleeveLenCm] = useState<number>(24);
  const [chestWidthCm, setChestWidthCm] = useState<number>(54);
  const [garmentGsm, setGarmentGsm] = useState<number>(160);
  const [wastagePct, setWastagePct] = useState<number>(8);
  const [smv, setSmv] = useState<number>(12);
  const [efficiencyPct, setEfficiencyPct] = useState<number>(65);
  const [cmPerMinUsd, setCmPerMinUsd] = useState<number>(0.08);

  const [beforeWashCm, setBeforeWashCm] = useState<number>(50);
  const [afterWashCm, setAfterWashCm] = useState<number>(48.5);

  const fromMeta = COUNT_SYSTEMS.find((s) => s.id === fromSys) ?? COUNT_SYSTEMS[5]!;
  const toMeta = COUNT_SYSTEMS.find((s) => s.id === toSys) ?? COUNT_SYSTEMS[0]!;
  const cmpMeta = COUNT_SYSTEMS.find((s) => s.id === cmpSys) ?? COUNT_SYSTEMS[0]!;

  const singleTex = useMemo(() => {
    const safeVal = Math.max(0.001, inputCount || 0.001);
    return fromMeta.toTex(safeVal);
  }, [fromMeta, inputCount]);

  const resultantTex = singleTex * plyCount;
  const convertedSingle = toMeta.fromTex(singleTex);
  const convertedResultant = toMeta.fromTex(resultantTex);

  const cmpSingleTex = useMemo(() => {
    const safeVal = Math.max(0.001, cmpCount || 0.001);
    return cmpMeta.toTex(safeVal);
  }, [cmpMeta, cmpCount]);
  const cmpResultantTex = cmpSingleTex * cmpPly;

  const isApproxEqual = Math.abs(resultantTex - cmpResultantTex) / Math.max(0.01, cmpResultantTex) < 0.02;
  const aIsCoarser = resultantTex > cmpResultantTex;
  const weightRatio = aIsCoarser
    ? resultantTex / Math.max(0.001, cmpResultantTex)
    : cmpResultantTex / Math.max(0.001, resultantTex);
  const diameterRatio = Math.sqrt(weightRatio);

  const usageBadge = useMemo(() => {
    if (resultantTex < 14) return "Fine Poplin / Dress Shirtings (\u0996\u09c1\u09ac\u0987 \u09ae\u09bf\u09b9\u09bf \u09b8\u09c1\u09a4\u09be)";
    if (resultantTex < 24) return "Combed T-Shirt Jersey / Polo (\u09b8\u09ac\u099a\u09c7\u09df\u09c7 \u09aa\u09cd\u09b0\u099a\u09b2\u09bf\u09a4 \u0997\u09be\u09b0\u09cd\u09ae\u09c7\u09a8\u09cd\u099f\u09b8 \u09b8\u09c1\u09a4\u09be)";
    if (resultantTex < 45) return "Heavy Fleece / Chino Twill (\u09ae\u09be\u099d\u09be\u09b0\u09bf-\u09ae\u09cb\u099f\u09be \u09ac\u09c1\u09a8\u09a8)";
    if (resultantTex < 120) return "Denim / Canvas / Workwear (\u09ad\u09be\u09b0\u09c0 \u09ae\u09cb\u099f\u09be \u09b8\u09c1\u09a4\u09be)";
    return "Jute / Industrial Cord / Rope (\u0985\u09a4\u09cd\u09af\u09a8\u09cd\u09a4 \u09ae\u09cb\u099f\u09be \u09b8\u09c1\u09a4\u09be)";
  }, [resultantTex]);

  const wrapLengthYd = wrapTurns * 1.5;
  const wrapLengthM = wrapLengthYd * 0.9144;
  const wrapWeightGm = wrapWeightGrains * (453.6 / 7000);
  const wrapNe = (wrapLengthYd * 7000) / (840 * Math.max(0.01, wrapWeightGrains));
  const wrapTex = (wrapWeightGm * 1000) / Math.max(0.01, wrapLengthM);

  const lenConverted = (lenVal * LENGTH_TO_YD[lenFrom]) / LENGTH_TO_YD[lenTo];
  const wtConverted = (wtVal * WEIGHT_TO_GM[wtFrom]) / WEIGHT_TO_GM[wtTo];

  const weavingGsm = (epi / Math.max(1, warpNe) + ppi / Math.max(1, weftNe)) * 23.25;
  const warpCover = epi / Math.sqrt(Math.max(1, warpNe));
  const weftCover = ppi / Math.sqrt(Math.max(1, weftNe));

  const totalWaterL = fabricKg * mlRatio;
  const dyeKg = (fabricKg * shadePct) / 100;
  const saltKg = (totalWaterL * saltGpl) / 1000;

  const consKgPerDozen =
    (((bodyLenCm + sleeveLenCm + 4) * (chestWidthCm + 3) * 2 * garmentGsm) / 10_000_000) *
    12 *
    (1 + wastagePct / 100);
  const cmPerDozenUsd = (smv * 12 * cmPerMinUsd) / Math.max(0.05, efficiencyPct / 100);

  const shrinkagePct = ((afterWashCm - beforeWashCm) / Math.max(0.1, beforeWashCm)) * 100;

  const tabs: { id: ToolTab; label: string; icon: typeof Calculator }[] = [
    { id: "yarn", label: "Yarn & 3D Lab", icon: Calculator },
    { id: "units", label: "Unit Converter", icon: Scale },
    { id: "weaving", label: "Weaving & GSM", icon: Layers },
    { id: "dyeing", label: "Dyeing & Wet", icon: Droplets },
    { id: "garment", label: "Garment & CM", icon: Shirt },
    { id: "ttqc", label: "TTQC & Shrinkage", icon: FlaskConical },
  ];

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              JTEC Interactive Textile Lab &amp; Calculators
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {"\u09e7\u09e6\u099f\u09bf Count System, 3D Multi-Ply \u0993 Lab \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09aa\u09be\u09a4\u09bf (Wrap Reel, Beesley's Balance) \u098f\u09ac\u0982 \u0995\u09cd\u09b2\u09be\u09b8\u09c7\u09b0 \u09b8\u09ac Unit Conversion\u0964"}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs font-medium text-cyan-300">
            3D Interactive Lab
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  active
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "yarn" && (
        <div className="space-y-6 pb-20 sm:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-white">Yarn A: 10-System Count &amp; Ply Converter</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 whitespace-nowrap shrink-0">
                  {fromMeta.type} {"->"} {toMeta.type}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{"From System (\u0989\u09ce\u09b8 \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae)"}</label>
                  <select
                    value={fromSys}
                    onChange={(e) => setFromSys(e.target.value as CountSystemId)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  >
                    {COUNT_SYSTEMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{"To System (\u09b2\u0995\u09cd\u09b7\u09cd\u09af \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae)"}</label>
                  <select
                    value={toSys}
                    onChange={(e) => setToSys(e.target.value as CountSystemId)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  >
                    {COUNT_SYSTEMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Single Yarn Count ({fromMeta.short})
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.5"
                    value={inputCount}
                    onChange={(e) => setInputCount(Number(e.target.value) || 0)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{"Ply / Fold (\u0995\u09df\u099f\u09bf \u09b8\u09c1\u09a4\u09be \u098f\u0995\u09b8\u09be\u09a5\u09c7)"}</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlyCount(p)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${
                          plyCount === p
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {p}-Ply
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5">
                  <div className="text-[11px] text-slate-400">Single Yarn ({toMeta.short})</div>
                  <div className="text-xl font-bold text-cyan-300 mt-0.5">
                    {convertedSingle.toFixed(2)} {toMeta.short}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">1-Ply = {singleTex.toFixed(2)} Tex</div>
                </div>

                <div className="rounded-xl bg-slate-950/90 border border-emerald-500/30 p-3.5">
                  <div className="text-[11px] text-emerald-300">
                    Resultant {plyCount}-Ply ({toMeta.short})
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {convertedResultant.toFixed(2)} {toMeta.short}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Total = {resultantTex.toFixed(2)} Tex
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-cyan-950/30 border border-cyan-500/20 p-3 text-xs text-cyan-200">
                <span className="font-semibold">{"\u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u09c7\u09b0 \u0995\u09cd\u09b7\u09c7\u09a4\u09cd\u09b0:"}</span> {usageBadge}
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span>{"\u09b8\u09c2\u09a4\u09cd\u09b0 (Stacked Fraction) \u0993 \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8 \u09ac\u09bf\u09b6\u09cd\u09b2\u09c7\u09b7\u09a3"}</span>
              </h3>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="text-xs text-slate-400">
                  {"\u09e7) \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u0987\u09a8\u09aa\u09c1\u099f"} ({fromMeta.short}) {"\u09a5\u09c7\u0995\u09c7 \u0986\u09a8\u09cd\u09a4\u09b0\u09cd\u099c\u09be\u09a4\u09bf\u0995"} <span className="text-cyan-300">Tex</span>{"-\u098f \u09b0\u09c2\u09aa\u09be\u09a8\u09cd\u09a4\u09b0:"}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {fromMeta.type === "Indirect" ? (
                    <Fraction
                      prefix="Tex ="
                      num={fromMeta.id === "ne" ? "590.54" : fromMeta.id === "nm" ? "1000" : fromMeta.id === "nek" ? "885.81" : fromMeta.id === "lea" ? "1653.52" : "1937.71"}
                      den={`${fromMeta.short} (${inputCount})`}
                      suffix={`= ${singleTex.toFixed(2)} Tex`}
                    />
                  ) : (
                    <div className="font-mono text-sm text-slate-100">
                      <span className="text-cyan-300 font-semibold">Tex =</span>{" "}
                      {fromMeta.id === "tex"
                        ? `${inputCount} Tex`
                        : fromMeta.id === "denier"
                        ? `${inputCount} / 9 = ${singleTex.toFixed(2)} Tex`
                        : fromMeta.id === "dtex"
                        ? `${inputCount} / 10 = ${singleTex.toFixed(2)} Tex`
                        : fromMeta.id === "ktex"
                        ? `${inputCount} * 1000 = ${singleTex.toFixed(2)} Tex`
                        : `${inputCount} * 34.45 = ${singleTex.toFixed(2)} Tex`}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
                  {"\u09e8)"} <span className="text-emerald-300">{plyCount}-Ply Resultant Count</span> {"\u09a8\u09bf\u09b0\u09cd\u09a3\u09df:"}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {toMeta.type === "Indirect" ? (
                    <Fraction
                      prefix={`Resultant ${toMeta.short} =`}
                      num={`Single ${toMeta.short} (${convertedSingle.toFixed(2)})`}
                      den={`Ply (${plyCount})`}
                      suffix={`= ${convertedResultant.toFixed(2)} ${toMeta.short}`}
                    />
                  ) : (
                    <div className="font-mono text-sm text-slate-100">
                      <span className="text-emerald-300 font-semibold">Resultant {toMeta.short} =</span>{" "}
                      {convertedSingle.toFixed(2)} * {plyCount} ={" "}
                      <span className="text-emerald-400 font-bold">{convertedResultant.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-amber-950/20 border border-amber-500/25 p-3.5 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-amber-300">{"\u0995\u09c7\u09a8 \u0993 \u0995\u09cb\u09a5\u09be\u09df \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8 \u09b9\u099a\u09cd\u099b\u09c7?"}</div>
                <p>
                  <span className="text-white font-medium">{fromMeta.short}:</span> {fromMeta.definition}
                </p>
                <p>
                  <span className="text-white font-medium">Ply ({plyCount}-Ply):</span> {"\u09ae\u09cb\u099f \u09b8\u09c1\u09a4\u09be \u09ae\u09cb\u099f\u09be \u09b9\u09df (Resultant Tex ="} {resultantTex.toFixed(1)} Tex). {"\u09a4\u09be\u0987 Direct \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae\u09c7 \u09ae\u09be\u09a8"} <span className="text-cyan-300">{"\u09ac\u09be\u09dc\u09c7"}</span> {"(\u0997\u09c1\u09a3 \u09b9\u09df), \u0995\u09bf\u09a8\u09cd\u09a4\u09c1 Indirect \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae\u09c7 \u09ae\u09be\u09a8"} <span className="text-amber-300">{"\u0995\u09ae\u09c7"}</span> {"(\u09ad\u09be\u0997 \u09b9\u09df)\u0964"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  3D Interactive Yarn &amp; Lab Instruments
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {"\u0995\u09c7\u09a8 \u098f\u0995\u09be\u09a7\u09bf\u0995 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09be \u09b9\u09df \u098f\u09ac\u0982 \u0995\u09c0\u09ad\u09be\u09ac\u09c7 \u09ae\u09be\u09a8 \u09ac\u09b8\u09be\u09a8\u09cb \u09b9\u09df \u09a4\u09be \u09e9\u09a1\u09bf-\u09a4\u09c7 \u09a6\u09c7\u0996\u09cb"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLab3DMode("ply")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    lab3DMode === "ply"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                      : "bg-slate-950 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  1. Yarn A vs B (3D)
                </button>
                <button
                  type="button"
                  onClick={() => setLab3DMode("wrap_reel")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    lab3DMode === "wrap_reel"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                      : "bg-slate-950 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  2. Wrap Reel + Balance (Cone)
                </button>
                <button
                  type="button"
                  onClick={() => setLab3DMode("beesley")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    lab3DMode === "beesley"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                      : "bg-slate-950 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  3. Beesley&apos;s Balance (Swatch)
                </button>
              </div>
            </div>

            {lab3DMode === "ply" && (
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-indigo-300">
                    {"Yarn B (\u09a4\u09c1\u09b2\u09a8\u09be\u09ae\u09c2\u09b2\u0995 \u09b8\u09c1\u09a4\u09be) \u2014 \u0995\u09cb\u09a8\u099f\u09bf \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be?"}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">
                      {"\u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be\u09b0 \u0995\u09ae\u09a8 \u09a4\u09c1\u09b2\u09a8\u09be (\u09e7-\u0995\u09cd\u09b2\u09bf\u0995):"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFromSys("ne");
                        setInputCount(30);
                        setPlyCount(1);
                        setCmpSys("tex");
                        setCmpCount(30);
                        setCmpPly(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 border border-slate-700"
                    >
                      30 Ne vs 30 Tex
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFromSys("tex");
                        setInputCount(30);
                        setPlyCount(1);
                        setCmpSys("denier");
                        setCmpCount(30);
                        setCmpPly(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700"
                    >
                      30 Tex vs 30 Denier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFromSys("ne");
                        setInputCount(20);
                        setPlyCount(1);
                        setCmpSys("nm");
                        setCmpCount(20);
                        setCmpPly(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 border border-slate-700"
                    >
                      20 Ne vs 20 Nm
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Yarn B System</label>
                    <select
                      value={cmpSys}
                      onChange={(e) => setCmpSys(e.target.value as CountSystemId)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs sm:text-sm text-white"
                    >
                      {COUNT_SYSTEMS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({s.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Yarn B Count ({cmpMeta.short})</label>
                    <input
                      type="number"
                      min={0.1}
                      step="0.5"
                      value={cmpCount}
                      onChange={(e) => setCmpCount(Number(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs sm:text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Yarn B Ply</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCmpPly(p)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                            cmpPly === p
                              ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {p}P
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Yarn3DLab
              mode={lab3DMode}
              plyCount={plyCount}
              singleTex={singleTex}
              activeLabel={`${inputCount} ${fromMeta.short}, ${plyCount}-Ply`}
              compareLabel={`${cmpCount} ${cmpMeta.short}, ${cmpPly}-Ply`}
              compareSingleTex={cmpSingleTex}
              comparePly={cmpPly}
              wrapTurns={wrapTurns}
              wrapWeightGrains={wrapWeightGrains}
              beesleyThreads={beesleyThreads}
            />

            {lab3DMode === "ply" && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">
                    {"\u0997\u09be\u09a3\u09bf\u09a4\u09bf\u0995 \u09b0\u09be\u09df (Tex \u09a4\u09c1\u09b2\u09a8\u09be)"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      isApproxEqual
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : aIsCoarser
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                        : "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                    }`}
                  >
                    {isApproxEqual
                      ? "\u09a6\u09c1\u099f\u09cb \u09b8\u09c1\u09a4\u09be \u09aa\u09cd\u09b0\u09be\u09df \u09b8\u09ae\u09be\u09a8 \u09ae\u09cb\u099f\u09be"
                      : aIsCoarser
                      ? `\u09b8\u09c1\u09a4\u09be A (${inputCount} ${fromMeta.short}, ${plyCount}-Ply) \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be`
                      : `\u09b8\u09c1\u09a4\u09be B (${cmpCount} ${cmpMeta.short}, ${cmpPly}-Ply) \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="rounded-lg bg-slate-900 px-3 py-2 border border-slate-800 text-cyan-300">
                    Yarn A ({inputCount} {fromMeta.short}, {plyCount}P) = <span className="font-bold text-white">{resultantTex.toFixed(2)} Tex</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 px-3 py-2 border border-slate-800 text-indigo-300">
                    Yarn B ({cmpCount} {cmpMeta.short}, {cmpPly}P) = <span className="font-bold text-white">{cmpResultantTex.toFixed(2)} Tex</span>
                  </div>
                </div>

                {!isApproxEqual && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aIsCoarser ? "Yarn A" : "Yarn B"}, {aIsCoarser ? "Yarn B" : "Yarn A"}-{"\u098f\u09b0 \u099a\u09c7\u09df\u09c7 \u0993\u099c\u09a8\u09c7"}{" "}
                    <span className="text-amber-300 font-semibold">{weightRatio.toFixed(2)} {"\u0997\u09c1\u09a3 \u09ad\u09be\u09b0\u09c0 \u0993 \u09ac\u09cd\u09af\u09be\u09b8"}</span>{" "}
                    <span className="text-emerald-300 font-semibold">{diameterRatio.toFixed(2)} {"\u0997\u09c1\u09a3 \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be"}</span>।{" "}
                    <span className="text-slate-400">{"\u09a8\u09bf\u09df\u09ae: \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae\u09c7\u09b0 \u09b8\u09c1\u09a4\u09be\u0995\u09c7 Tex-\u098f \u0986\u09a8\u09b2\u09c7 \u09af\u09be\u09b0 Tex \u09af\u09a4 \u09ac\u09c7\u09b6\u09bf, \u09b8\u09c7\u0987 \u09b8\u09c1\u09a4\u09be \u09a4\u09a4 \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be\u0964"}</span>
                  </p>
                )}
              </div>
            )}

            {lab3DMode === "wrap_reel" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                  <div className="text-sm font-semibold text-cyan-300">{"Wrap Reel + Balance \u0987\u09a8\u09aa\u09c1\u099f"}</div>
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Wrap Reel Turns (1 turn = 1.5 yd)</span>
                      <span className="text-white font-mono">{wrapTurns} turns = {wrapLengthYd.toFixed(1)} yd</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={160}
                      step={5}
                      value={wrapTurns}
                      onChange={(e) => setWrapTurns(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Sample Weight (grains)</span>
                      <span className="text-white font-mono">{wrapWeightGrains.toFixed(1)} gr ({wrapWeightGm.toFixed(2)} gm)</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={0.5}
                      value={wrapWeightGrains}
                      onChange={(e) => setWrapWeightGrains(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                  <div className="text-sm font-semibold text-emerald-300">{"\u09b2\u09be\u0987\u09ad \u09b8\u09c2\u09a4\u09cd\u09b0 \u0993 \u09ab\u09b2\u09be\u09ab\u09b2"}</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Fraction
                      prefix="Ne ="
                      num={`${wrapLengthYd.toFixed(0)} yd * 7000`}
                      den={`840 * ${wrapWeightGrains.toFixed(1)} gr`}
                      suffix={`= ${wrapNe.toFixed(2)} Ne`}
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-white font-medium">{"\u0995\u0996\u09a8 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u09b9\u09df?"}</span> {"\u09af\u0996\u09a8 \u09a4\u09cb\u09ae\u09be\u09b0 \u09b9\u09be\u09a4\u09c7 \u09b8\u09c1\u09a4\u09be\u09b0 Cone \u09ac\u09be Bobbin \u09a5\u09be\u0995\u09c7 (80 turns = 120 yd = 1 Lea \u09b2\u09ae\u09cd\u09ac\u09be \u09b8\u09c1\u09a4\u09be \u09a8\u09c7\u0993\u09df\u09be \u09af\u09be\u09df)\u0964 \u098f\u0995\u0987 \u09a6\u09c8\u09b0\u09cd\u0998\u09cd\u09af\u09c7 \u0993\u099c\u09a8"} (<span className="text-amber-300">grains</span>) {"\u09ac\u09be\u09dc\u09b2\u09c7 \u09b8\u09c1\u09a4\u09be \u09ae\u09cb\u099f\u09be \u09b9\u09df, \u09a4\u09be\u0987"} <span className="text-cyan-300">{"Ne \u0995\u09ae\u09c7"}</span> {"\u0986\u09b0"} <span className="text-emerald-300">Tex ({wrapTex.toFixed(1)}) {"\u09ac\u09be\u09dc\u09c7"}</span>.
                  </p>
                </div>
              </div>
            )}

            {lab3DMode === "beesley" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                  <div className="text-sm font-semibold text-cyan-300">{"Beesley's Balance \u0987\u09a8\u09aa\u09c1\u099f"}</div>
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{"\u09b9\u09c1\u0995\u09c7 \u099d\u09cb\u09b2\u09be\u09a8\u09cb \u0995\u09be\u099f\u09be \u09b8\u09c1\u09a4\u09be\u09b0 \u09b8\u0982\u0996\u09cd\u09af\u09be (n)"}</span>
                      <span className="text-white font-mono">{beesleyThreads} {"\u099f\u09bf \u09b8\u09c1\u09a4\u09be"}</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={1}
                      value={beesleyThreads}
                      onChange={(e) => setBeesleyThreads(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                  <div className="text-sm font-semibold text-emerald-300">
                    {"\u09ab\u09b2\u09be\u09ab\u09b2:"} {beesleyThreads} Ne ({(590.54 / beesleyThreads).toFixed(2)} Tex)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-white font-medium">{"\u0995\u09c7\u09a8 \u098f\u099f\u09bf \u09b2\u09be\u0997\u09c7?"}</span> {"\u099b\u09cb\u099f \u0995\u09be\u09aa\u09dc\u09c7\u09b0 \u099f\u09c1\u0995\u09b0\u09be (Fabric Swatch) \u09a5\u09c7\u0995\u09c7 \u09e7\u09e8\u09e6 \u0997\u099c \u09b8\u09c1\u09a4\u09be \u09aa\u09be\u0993\u09df\u09be \u09b8\u09ae\u09cd\u09ad\u09ac \u09a8\u09df! \u09a4\u09be\u0987 \u09a8\u09bf\u09b0\u09cd\u09a6\u09bf\u09b7\u09cd\u099f \u099f\u09c7\u09ae\u09aa\u09cd\u09b2\u09c7\u099f \u09a6\u09bf\u09df\u09c7 \u099b\u09cb\u099f \u099b\u09cb\u099f \u09b8\u09c1\u09a4\u09be \u0995\u09c7\u099f\u09c7 \u09b9\u09c1\u0995\u09c7 \u099d\u09cb\u09b2\u09be\u09a4\u09c7 \u09b9\u09df\u0964 \u09af\u09a4\u099f\u09bf \u09b8\u09c1\u09a4\u09be \u09a6\u09bf\u09b2\u09c7 \u09aa\u09df\u09c7\u09a8\u09cd\u099f\u09be\u09b0 \u09b6\u09c2\u09a8\u09cd\u09af \u09a6\u09be\u0997\u09c7 \u0986\u09b8\u09c7, \u09b8\u09c7\u0987 \u09b8\u0982\u0996\u09cd\u09af\u09be\u0987 \u09b8\u09b0\u09be\u09b8\u09b0\u09bf"} <span className="text-cyan-300">Ne Count</span>!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-base font-semibold text-white mb-3">
              All 10 Systems Live Comparison ({inputCount} {fromMeta.short}, {plyCount}-Ply)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">System</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Single (1-Ply)</th>
                    <th className="py-2 px-3">Resultant ({plyCount}-Ply)</th>
                    <th className="py-2 px-3">{"\u09b8\u0982\u099c\u09cd\u099e\u09be (\u09ac\u09be\u0982\u09b2\u09be\u09df)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {COUNT_SYSTEMS.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-white">{s.label}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            s.type === "Direct"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-cyan-500/15 text-cyan-300"
                          }`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        {s.fromTex(singleTex).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                        {s.fromTex(resultantTex).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-xs">{s.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "units" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span>{"Length Unit Conversion (\u09a6\u09c8\u09b0\u09cd\u0998\u09cd\u09af)"}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="number"
                value={lenVal}
                onChange={(e) => setLenVal(Number(e.target.value) || 0)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
              <select
                value={lenFrom}
                onChange={(e) => setLenFrom(e.target.value as LengthUnit)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="hank">Hank (840 yd)</option>
                <option value="lea">Lea (120 yd)</option>
                <option value="yd">Yard (yd)</option>
                <option value="in">Inch (in)</option>
                <option value="m">Meter (m)</option>
                <option value="cm">Centimeter (cm)</option>
                <option value="spyndle">Spyndle (14400 yd)</option>
              </select>
              <select
                value={lenTo}
                onChange={(e) => setLenTo(e.target.value as LengthUnit)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="yd">Yard (yd)</option>
                <option value="lea">Lea (120 yd)</option>
                <option value="hank">Hank (840 yd)</option>
                <option value="in">Inch (in)</option>
                <option value="m">Meter (m)</option>
                <option value="cm">Centimeter (cm)</option>
                <option value="spyndle">Spyndle (14400 yd)</option>
              </select>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-lg text-cyan-300 font-bold">
              {lenVal} {lenFrom} = {lenConverted.toFixed(4)} {lenTo}
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <li>1 yard = 36 inch</li>
              <li>1 hank = 840 yds = 7 Lea ({"\u0985\u09b0\u09cd\u09a5\u09be\u09ce"} 1 Lea = 120 yds)</li>
              <li>1 meter = 1.0936 yds ({"\u09aa\u09cd\u09b0\u09be\u09df"} 1.09 yds) = 39.37 inch</li>
              <li>1 inch = 2.54 cm | 1 spyndle (Jute) = 14,400 yds</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>{"Weight & Fabric GSM Conversion (\u0993\u099c\u09a8)"}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="number"
                value={wtVal}
                onChange={(e) => setWtVal(Number(e.target.value) || 0)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
              <select
                value={wtFrom}
                onChange={(e) => setWtFrom(e.target.value as WeightUnit)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="lb">Pound (lb)</option>
                <option value="oz">Ounce (oz)</option>
                <option value="gm">Gram (gm)</option>
                <option value="grain">Grain</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ton">Metric Ton</option>
              </select>
              <select
                value={wtTo}
                onChange={(e) => setWtTo(e.target.value as WeightUnit)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="grain">Grain</option>
                <option value="gm">Gram (gm)</option>
                <option value="oz">Ounce (oz)</option>
                <option value="lb">Pound (lb)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ton">Metric Ton</option>
              </select>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-lg text-emerald-400 font-bold">
              {wtVal} {wtFrom} = {wtConverted.toFixed(4)} {wtTo}
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <li>1 lb = 16 oz = 453.6 gm = 7000 grain</li>
              <li>1 kg = 2.2046 lb | 1 ton = 2204.6 lb ({"\u09aa\u09cd\u09b0\u09be\u09df"} 2204 lb) = 1000 kg</li>
            </ul>

            <div className="border-t border-slate-800 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">GSM (g/m2)</label>
                <input
                  type="number"
                  value={gsmInput}
                  onChange={(e) => {
                    const g = Number(e.target.value) || 0;
                    setGsmInput(g);
                    setOzInput(Number((g / 33.90575).toFixed(3)));
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">oz/yd2 (1 oz/yd2 = 33.91 GSM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ozInput}
                  onChange={(e) => {
                    const o = Number(e.target.value) || 0;
                    setOzInput(o);
                    setGsmInput(Number((o * 33.90575).toFixed(2)));
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "weaving" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Weaving GSM &amp; Cover Factor Calculator</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">EPI</label>
              <input type="number" value={epi} onChange={(e) => setEpi(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">PPI</label>
              <input type="number" value={ppi} onChange={(e) => setPpi(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Warp Count (Ne)</label>
              <input type="number" value={warpNe} onChange={(e) => setWarpNe(Number(e.target.value) || 1)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weft Count (Ne)</label>
              <input type="number" value={weftNe} onChange={(e) => setWeftNe(Number(e.target.value) || 1)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Estimated GSM</div>
              <div className="text-xl font-bold text-cyan-300">{weavingGsm.toFixed(2)} g/m2</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Warp Cover Factor (K1)</div>
              <div className="text-xl font-bold text-emerald-400">{warpCover.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Weft Cover Factor (K2)</div>
              <div className="text-xl font-bold text-amber-300">{weftCover.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dyeing" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Dyeing Recipe (M:L, % owf &amp; g/L)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fabric Weight (kg)</label>
              <input type="number" value={fabricKg} onChange={(e) => setFabricKg(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Liquor Ratio (1 : M:L)</label>
              <input type="number" value={mlRatio} onChange={(e) => setMlRatio(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dye Shade (% owf)</label>
              <input type="number" step="0.1" value={shadePct} onChange={(e) => setShadePct(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Salt (g/L)</label>
              <input type="number" value={saltGpl} onChange={(e) => setSaltGpl(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Total Liquor Volume</div>
              <div className="text-xl font-bold text-cyan-300">{totalWaterL.toFixed(1)} Liters</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Required Dye</div>
              <div className="text-xl font-bold text-emerald-400">{dyeKg.toFixed(3)} kg</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Required Salt</div>
              <div className="text-xl font-bold text-amber-300">{saltKg.toFixed(2)} kg</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "garment" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Garment Fabric Consumption &amp; CM Costing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Body Length (cm)</label>
              <input type="number" value={bodyLenCm} onChange={(e) => setBodyLenCm(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sleeve Length (cm)</label>
              <input type="number" value={sleeveLenCm} onChange={(e) => setSleeveLenCm(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">1/2 Chest (cm)</label>
              <input type="number" value={chestWidthCm} onChange={(e) => setChestWidthCm(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fabric GSM</label>
              <input type="number" value={garmentGsm} onChange={(e) => setGarmentGsm(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wastage (%)</label>
              <input type="number" value={wastagePct} onChange={(e) => setWastagePct(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">SMV (min)</label>
              <input type="number" value={smv} onChange={(e) => setSmv(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Efficiency (%)</label>
              <input type="number" value={efficiencyPct} onChange={(e) => setEfficiencyPct(Number(e.target.value) || 1)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cost / Min ($)</label>
              <input type="number" step="0.01" value={cmPerMinUsd} onChange={(e) => setCmPerMinUsd(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">Fabric Consumption / Dozen</div>
              <div className="text-xl font-bold text-cyan-300">{consKgPerDozen.toFixed(2)} kg / dz</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
              <div className="text-xs text-slate-400">CM Cost / Dozen</div>
              <div className="text-xl font-bold text-emerald-400">${cmPerDozenUsd.toFixed(2)} / dz</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ttqc" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">TTQC Dimensional Stability (Shrinkage %)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Before Wash (cm)</label>
              <input type="number" step="0.1" value={beforeWashCm} onChange={(e) => setBeforeWashCm(Number(e.target.value) || 0.1)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">After Wash (cm)</label>
              <input type="number" step="0.1" value={afterWashCm} onChange={(e) => setAfterWashCm(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
            <Fraction
              prefix="Shrinkage % ="
              num={`(${afterWashCm} - ${beforeWashCm}) * 100`}
              den={`${beforeWashCm}`}
              suffix={`= ${shrinkagePct.toFixed(2)}%`}
            />
            <span className={`text-sm font-semibold ${Math.abs(shrinkagePct) <= 3 ? "text-emerald-400" : "text-amber-300"}`}>
              {shrinkagePct < 0
                ? "\u09b8\u0999\u09cd\u0995\u09c1\u099a\u09bf\u09a4 \u09b9\u09df\u09c7\u099b\u09c7 (Shrinkage)"
                : "\u09aa\u09cd\u09b0\u09b8\u09be\u09b0\u09bf\u09a4 \u09b9\u09df\u09c7\u099b\u09c7 (Elongation)"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextileToolsClient;