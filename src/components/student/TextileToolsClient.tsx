"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Droplets,
  FlaskConical,
  Grid3X3,
  Layers,
  Ruler,
  Scissors,
  Sparkles,
  XCircle,
  BookOpen,
} from "lucide-react";

type ToolTab = "yarn" | "fabric" | "dyeing" | "garment" | "ttqc";

export function TextileToolsClient() {
  const [tab, setTab] = useState<ToolTab>("yarn");

  // 1. Yarn (YE)
  const [ne, setNe] = useState(30);
  const [tm, setTm] = useState(4.2);
  const [leaLbs, setLeaLbs] = useState(78);

  // 2. Fabric (FE)
  const [warpNe, setWarpNe] = useState(30);
  const [weftNe, setWeftNe] = useState(30);
  const [epi, setEpi] = useState(96);
  const [ppi, setPpi] = useState(76);
  const [warpCrimp, setWarpCrimp] = useState(6);
  const [weftCrimp, setWeftCrimp] = useState(5);

  // 3. Dyeing (WPE)
  const [fabricKg, setFabricKg] = useState(150);
  const [liquorRatio, setLiquorRatio] = useState(8);
  const [shadePct, setShadePct] = useState(2.5);
  const [saltGl, setSaltGl] = useState(60);
  const [sodaGl, setSodaGl] = useState(15);

  // 4. Garment & IE (AE)
  const [bodyLen, setBodyLen] = useState(72);
  const [sleeveLen, setSleeveLen] = useState(23);
  const [halfChest, setHalfChest] = useState(54);
  const [allowance, setAllowance] = useState(5);
  const [garmentGsm, setGarmentGsm] = useState(180);
  const [wastagePct, setWastagePct] = useState(10);
  const [smv, setSmv] = useState(14.5);
  const [cpm, setCpm] = useState(0.045);
  const [lineEff, setLineEff] = useState(55);

  // 5. TTQC Lab
  const [beforeWarp, setBeforeWarp] = useState(350);
  const [afterWarp, setAfterWarp] = useState(338);
  const [beforeWeft, setBeforeWeft] = useState(350);
  const [afterWeft, setAfterWeft] = useState(341);
  const [maxShrinkLimit, setMaxShrinkLimit] = useState(5);

  // Derived Yarn
  const tex = useMemo(() => (ne > 0 ? 590.5 / ne : 0), [ne]);
  const denier = useMemo(() => tex * 9, [tex]);
  const tpi = useMemo(() => tm * Math.sqrt(Math.max(1, ne)), [tm, ne]);
  const csp = useMemo(() => ne * leaLbs, [ne, leaLbs]);
  const yarnRadiusPx = useMemo(() => Math.min(26, Math.max(4, 95 / Math.sqrt(Math.max(4, ne)))), [ne]);

  // Derived Fabric
  const fabricGsm = useMemo(() => {
    const wPart = (epi * (1 + warpCrimp / 100)) / Math.max(1, warpNe);
    const fPart = (ppi * (1 + weftCrimp / 100)) / Math.max(1, weftNe);
    return 23.25 * (wPart + fPart);
  }, [epi, ppi, warpNe, weftNe, warpCrimp, weftCrimp]);

  const coverFactor = useMemo(() => {
    const k1 = epi / Math.sqrt(Math.max(1, warpNe));
    const k2 = ppi / Math.sqrt(Math.max(1, weftNe));
    const kc = k1 + k2 - (k1 * k2) / 28;
    const pct = Math.min(100, Math.max(0, (kc / 28) * 100));
    return { k1, k2, kc, pct };
  }, [epi, ppi, warpNe, weftNe]);

  // Derived Dyeing
  const totalWaterL = useMemo(() => fabricKg * liquorRatio, [fabricKg, liquorRatio]);
  const totalDyeKg = useMemo(() => (fabricKg * shadePct) / 100, [fabricKg, shadePct]);
  const totalSaltKg = useMemo(() => (totalWaterL * saltGl) / 1000, [totalWaterL, saltGl]);
  const totalSodaKg = useMemo(() => (totalWaterL * sodaGl) / 1000, [totalWaterL, sodaGl]);

  // Derived Garment
  const consPerDozenKg = useMemo(() => {
    const areaCm2 = (bodyLen + sleeveLen + allowance) * (halfChest + allowance) * 2;
    const baseKgDozen = (areaCm2 * garmentGsm * 12) / 10_000_000;
    return baseKgDozen * (1 + wastagePct / 100);
  }, [bodyLen, sleeveLen, halfChest, allowance, garmentGsm, wastagePct]);

  const cmPerPiece = useMemo(
    () => (lineEff > 0 ? (smv * cpm) / (lineEff / 100) : 0),
    [smv, cpm, lineEff]
  );

  // Derived TTQC
  const warpShrinkPct = useMemo(
    () => (beforeWarp > 0 ? ((beforeWarp - afterWarp) / beforeWarp) * 100 : 0),
    [beforeWarp, afterWarp]
  );
  const weftShrinkPct = useMemo(
    () => (beforeWeft > 0 ? ((beforeWeft - afterWeft) / beforeWeft) * 100 : 0),
    [beforeWeft, afterWeft]
  );
  const ttqcPass =
    Math.abs(warpShrinkPct) <= maxShrinkLimit && Math.abs(weftShrinkPct) <= maxShrinkLimit;

  const guideByTab: Record<
    ToolTab,
    {
      title: string;
      howTo: string[];
      terms: Array<{ name: string; desc: string }>;
      formulas: Array<{ label: string; expr: string }>;
    }
  > = {
    yarn: {
      title: "Yarn & Spinning Guide (YE)",
      howTo: [
        "1. Slide English Cotton Count (Ne) from 6s (coarse denim) to 80s (fine shirting) and watch the yarn diameter shrink live.",
        "2. Enter Twist Multiplier (TM) and Lea Strength (lbs) from your spinning lab sheet to check yarn strength grade (CSP).",
      ],
      terms: [
        { name: "Ne (English Count)", desc: "Indirect system: number of 840-yard hanks per 1 lb. Higher Ne means finer (thinner) yarn." },
        { name: "Tex & Denier", desc: "Direct systems: weight in grams per 1,000m (Tex) or 9,000m (Denier). Higher Tex/Denier means thicker yarn." },
        { name: "TM & TPI", desc: "Turns Per Inch (TPI) controls yarn twist tightness; higher TPI increases strength up to an optimum point." },
        { name: "CSP", desc: "Count Strength Product (Ne x Lea Strength in lbs). 2200+ indicates high-strength combed yarn." },
      ],
      formulas: [
        { label: "Tex", expr: `590.5 / ${ne} Ne = ${tex.toFixed(2)} Tex` },
        { label: "Denier", expr: `${tex.toFixed(2)} Tex x 9 = ${denier.toFixed(1)} Denier` },
        { label: "TPI", expr: `${tm} x sqrt(${ne}) = ${tpi.toFixed(2)} TPI` },
        { label: "CSP", expr: `${ne} Ne x ${leaLbs} lbs = ${Math.round(csp)}` },
      ],
    },
    fabric: {
      title: "Fabric & Weaving Guide (FE)",
      howTo: [
        "1. Enter Warp/Weft Ne, EPI, PPI, and Crimp % from your fabric swatch analysis.",
        "2. Watch the Weave Density Grid tighten or loosen and check whether Cloth Cover % is balanced (55-80%) or tight (80%+).",
      ],
      terms: [
        { name: "EPI & PPI", desc: "Ends Per Inch (warp threads) and Picks Per Inch (weft threads) counted using a Pick Glass." },
        { name: "Crimp (%)", desc: "Extra waviness of yarn inside woven cloth due to interlacement; increases fabric GSM." },
        { name: "Fabric GSM", desc: "Grams per Square Meter — standard measure of fabric weight." },
        { name: "Cover Factor (Kc)", desc: "Fraction of fabric area covered by yarns (max 28 = 100% theoretical full cover)." },
      ],
      formulas: [
        {
          label: "Fabric GSM",
          expr: `23.25 x [(${epi}x${(1 + warpCrimp / 100).toFixed(2)})/${warpNe} + (${ppi}x${(1 + weftCrimp / 100).toFixed(2)})/${weftNe}] = ${fabricGsm.toFixed(1)} g/m2`,
        },
        { label: "Warp Cover (K1)", expr: `${epi} / sqrt(${warpNe}) = ${coverFactor.k1.toFixed(2)}` },
        { label: "Weft Cover (K2)", expr: `${ppi} / sqrt(${weftNe}) = ${coverFactor.k2.toFixed(2)}` },
        { label: "Cloth Cover (Kc)", expr: `K1 + K2 - (K1 x K2)/28 = ${coverFactor.kc.toFixed(2)} (${coverFactor.pct.toFixed(0)}%)` },
      ],
    },
    dyeing: {
      title: "Exhaust Dyeing Recipe Guide (WPE)",
      howTo: [
        "1. Set total Fabric Weight (kg) and Machine Liquor Ratio (1:M, e.g., 1:8 for modern jet dyeing).",
        "2. Adjust Shade % (owf) and Salt/Soda Ash (g/L) to see bath depth, color intensity, and exact chemical batch weights.",
      ],
      terms: [
        { name: "Liquor Ratio (M:L)", desc: "Ratio of fabric weight (kg) to total water volume (L). Lower ratio (1:6-1:8) saves water & energy." },
        { name: "Shade % (owf)", desc: "On Weight of Fabric: dye mass calculated as a percentage of dry fabric weight." },
        { name: "g/L (Grams/Liter)", desc: "Concentration of auxiliaries (Glauber Salt / Soda Ash) calculated based on total water volume." },
      ],
      formulas: [
        { label: "Total Water", expr: `${fabricKg} kg x ${liquorRatio} = ${totalWaterL.toFixed(0)} Liters` },
        { label: "Dye Weight", expr: `(${fabricKg} kg x ${shadePct}%) / 100 = ${totalDyeKg.toFixed(2)} kg` },
        { label: "Salt Weight", expr: `(${totalWaterL.toFixed(0)} L x ${saltGl} g/L) / 1000 = ${totalSaltKg.toFixed(1)} kg` },
        { label: "Soda Ash", expr: `(${totalWaterL.toFixed(0)} L x ${sodaGl} g/L) / 1000 = ${totalSodaKg.toFixed(1)} kg` },
      ],
    },
    garment: {
      title: "Garment Consumption & CM Guide (AE)",
      howTo: [
        "1. Enter T-Shirt spec measurements (Length, Sleeve, 1/2 Chest, Seam Allowance) and Fabric GSM.",
        "2. Enter SMV, factory Cost Per Minute (CPM), and Line Efficiency % to calculate fabric kg/dozen and CM costing.",
      ],
      terms: [
        { name: "Consumption (kg/dz)", desc: "Total knit fabric needed for 12 garments including cutting/marker wastage %." },
        { name: "SMV", desc: "Standard Minute Value: total standard minutes required to sew one garment including allowances." },
        { name: "CPM", desc: "Cost Per Minute: monthly factory labor + overhead cost divided by total available operator minutes." },
        { name: "CM Cost", desc: "Cost of Making per piece or per dozen; core pricing metric in apparel merchandising." },
      ],
      formulas: [
        {
          label: "Fabric / Dozen",
          expr: `[((${bodyLen}+${sleeveLen}+${allowance}) x (${halfChest}+${allowance}) x 2 x ${garmentGsm} x 12) / 10^7] x ${(1 + wastagePct / 100).toFixed(2)} = ${consPerDozenKg.toFixed(2)} kg`,
        },
        { label: "CM / Piece", expr: `(${smv} min x $${cpm}) / (${lineEff}% / 100) = $${cmPerPiece.toFixed(2)}` },
        { label: "CM / Dozen", expr: `$${cmPerPiece.toFixed(2)} x 12 = $${(cmPerPiece * 12).toFixed(2)}` },
      ],
    },
    ttqc: {
      title: "TTQC Shrinkage Lab Guide (ISO 3759 / AATCC 135)",
      howTo: [
        "1. Mark a 350mm x 350mm benchmark square on the fabric before washing, then measure after washing & drying.",
        "2. Check the overlay blueprint: if both Warp and Weft shrinkage stay within the buyer limit (usually <= 5%), the lot passes.",
      ],
      terms: [
        { name: "Before Wash (L0)", desc: "Original benchmark distance marked on the fabric template (typically 350mm or 500mm)." },
        { name: "After Wash (L1)", desc: "Measured distance after standardized laundering and drying." },
        { name: "Shrinkage (%)", desc: "Positive % means fabric shrank; negative % means fabric stretched/elongated." },
      ],
      formulas: [
        { label: "Warp Shrinkage", expr: `((${beforeWarp} - ${afterWarp}) / ${beforeWarp}) x 100 = ${warpShrinkPct.toFixed(2)}%` },
        { label: "Weft Shrinkage", expr: `((${beforeWeft} - ${afterWeft}) / ${beforeWeft}) x 100 = ${weftShrinkPct.toFixed(2)}%` },
        { label: "Status Check", expr: `Max(|${warpShrinkPct.toFixed(2)}%|, |${weftShrinkPct.toFixed(2)}%|) <= ${maxShrinkLimit}% -> ${ttqcPass ? "PASS" : "FAIL"}` },
      ],
    },
  };

  const activeGuide = guideByTab[tab];

  const tabs: Array<{ id: ToolTab; label: string; sub: string; icon: typeof Layers }> = [
    { id: "yarn", label: "Yarn & Spinning", sub: "YE", icon: Layers },
    { id: "fabric", label: "Fabric & Weave", sub: "FE", icon: Grid3X3 },
    { id: "dyeing", label: "Dyeing Recipe", sub: "WPE", icon: Droplets },
    { id: "garment", label: "Garment & CM", sub: "AE", icon: Scissors },
    { id: "ttqc", label: "TTQC Testing Lab", sub: "QC", icon: FlaskConical },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#081722] via-[#0B1222] to-[#111329] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
              <Sparkles className="h-3.5 w-3.5" />
              Interactive Visual Engineering Suite
            </span>
            <h1 className="mt-2.5 font-serif text-2xl font-bold text-white sm:text-3xl">
              Textile Mill, Garment &amp; TTQC Visual Calculators
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Adjust sliders &amp; values to watch yarn diameter, weave density, dye bath shade, marker layout, and shrinkage update live.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white shadow-[0_0_18px_rgba(6,182,212,0.18)]"
                    : "border-slate-800 bg-[#060A12] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : "text-slate-500"}`} />
                <span>{t.label}</span>
                <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {t.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* TAB 1: YARN */}
      {tab === "yarn" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-5 lg:col-span-6">
            <h2 className="text-sm font-bold text-white">Yarn Count, Twist (TPI) &amp; CSP</h2>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-400">English Cotton Count (Ne)</span>
                  <span className="font-mono font-bold text-cyan-300">{ne} Ne</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={80}
                  step={1}
                  value={ne}
                  onChange={(e) => setNe(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-slate-400">Twist Multiplier (TM)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={tm}
                    onChange={(e) => setTm(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-slate-400">Lea Strength (lbs)</span>
                  <input
                    type="number"
                    step="1"
                    value={leaLbs}
                    onChange={(e) => setLeaLbs(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {[
                { label: "Tex", val: tex.toFixed(2) },
                { label: "Denier", val: denier.toFixed(1) },
                { label: "TPI", val: tpi.toFixed(2) },
                { label: "CSP", val: Math.round(csp).toString() },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">{m.label}</div>
                  <div className="mt-1 font-mono text-base font-bold text-cyan-300">{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/25 bg-[#0A1020] p-5 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-200">Live Visual: Yarn Thickness &amp; Twist</h3>
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                {csp >= 2200 ? "High Strength (Combed)" : csp >= 1700 ? "Standard (Carded)" : "Low CSP"}
              </span>
            </div>

            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-5">
              <svg viewBox="0 0 360 110" className="w-full max-w-md">
                <defs>
                  <linearGradient id="yarnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0e7490" />
                  </linearGradient>
                </defs>
                <rect
                  x="20"
                  y={55 - yarnRadiusPx}
                  width="240"
                  height={yarnRadiusPx * 2}
                  rx={yarnRadiusPx}
                  fill="url(#yarnGrad)"
                  className="transition-all duration-300"
                />
                {Array.from({ length: Math.min(18, Math.max(4, Math.round(tpi / 2))) }).map((_, i) => {
                  const x = 35 + i * 12;
                  return (
                    <line
                      key={i}
                      x1={x}
                      y1={55 - yarnRadiusPx + 2}
                      x2={x + 7}
                      y2={55 + yarnRadiusPx - 2}
                      stroke="#083344"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx="310"
                  cy="55"
                  r={yarnRadiusPx}
                  fill="url(#yarnGrad)"
                  stroke="#a5f3fc"
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                <text x="310" y="98" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Cross-Section
                </text>
              </svg>
              <p className="mt-2 text-center text-xs text-slate-400">
                Higher <strong className="text-cyan-300">Ne</strong> = finer yarn ({tex.toFixed(1)} g/1000m). Higher{" "}
                <strong className="text-cyan-300">TPI</strong> = tighter twist spirals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FABRIC */}
      {tab === "fabric" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-5 lg:col-span-6">
            <h2 className="text-sm font-bold text-white">Woven GSM &amp; Cover Factor Calculator</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Warp Count (Ne)", val: warpNe, set: setWarpNe },
                { label: "Weft Count (Ne)", val: weftNe, set: setWeftNe },
                { label: "Ends / Inch (EPI)", val: epi, set: setEpi },
                { label: "Picks / Inch (PPI)", val: ppi, set: setPpi },
                { label: "Warp Crimp (%)", val: warpCrimp, set: setWarpCrimp },
                { label: "Weft Crimp (%)", val: weftCrimp, set: setWeftCrimp },
              ].map((f) => (
                <label key={f.label} className="space-y-1 text-xs">
                  <span className="text-slate-400">{f.label}</span>
                  <input
                    type="number"
                    value={f.val}
                    onChange={(e) => f.set(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Fabric GSM</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-300">{fabricGsm.toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Cloth Cover (Kc)</div>
                <div className="mt-1 font-mono text-lg font-bold text-cyan-300">{coverFactor.kc.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Full Cover %</div>
                <div className="mt-1 font-mono text-lg font-bold text-violet-300">{coverFactor.pct.toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-violet-500/25 bg-[#0A1020] p-5 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-violet-200">Live Visual: Weave Density Grid</h3>
              <span className="text-xs font-semibold text-slate-400">
                {coverFactor.pct >= 80 ? "Tight / High Cover" : coverFactor.pct >= 55 ? "Balanced Weave" : "Open / Sheer"}
              </span>
            </div>
            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-5">
              <svg viewBox="0 0 220 150" className="w-full max-w-xs">
                {Array.from({ length: Math.min(18, Math.max(4, Math.round(epi / 10))) }).map((_, i) => {
                  const count = Math.min(18, Math.max(4, Math.round(epi / 10)));
                  const x = 15 + (i * 190) / Math.max(1, count - 1);
                  const strokeW = Math.min(8, Math.max(2, 120 / Math.max(6, warpNe)));
                  return (
                    <line
                      key={`w-${i}`}
                      x1={x}
                      y1="10"
                      x2={x}
                      y2="140"
                      stroke="#38bdf8"
                      strokeOpacity="0.75"
                      strokeWidth={strokeW}
                    />
                  );
                })}
                {Array.from({ length: Math.min(14, Math.max(4, Math.round(ppi / 10))) }).map((_, j) => {
                  const count = Math.min(14, Math.max(4, Math.round(ppi / 10)));
                  const y = 15 + (j * 120) / Math.max(1, count - 1);
                  const strokeW = Math.min(8, Math.max(2, 120 / Math.max(6, weftNe)));
                  return (
                    <line
                      key={`f-${j}`}
                      x1="10"
                      y1={y}
                      x2="210"
                      y2={y}
                      stroke="#a78bfa"
                      strokeOpacity="0.65"
                      strokeWidth={strokeW}
                    />
                  );
                })}
              </svg>
              <p className="mt-2 text-center text-xs text-slate-400">
                Blue = Warp ({epi} EPI), Violet = Weft ({ppi} PPI). Increasing EPI/PPI tightens the cloth cover.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYEING */}
      {tab === "dyeing" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-5 lg:col-span-6">
            <h2 className="text-sm font-bold text-white">Exhaust Dyeing Recipe Calculator (owf% &amp; M:L)</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Fabric Weight (kg)", val: fabricKg, set: setFabricKg, step: "5" },
                { label: "Liquor Ratio (1 : M)", val: liquorRatio, set: setLiquorRatio, step: "1" },
                { label: "Dye Shade (% owf)", val: shadePct, set: setShadePct, step: "0.25" },
                { label: "Glauber Salt (g/L)", val: saltGl, set: setSaltGl, step: "5" },
                { label: "Soda Ash (g/L)", val: sodaGl, set: setSodaGl, step: "1" },
              ].map((f) => (
                <label key={f.label} className="space-y-1 text-xs">
                  <span className="text-slate-400">{f.label}</span>
                  <input
                    type="number"
                    step={f.step}
                    value={f.val}
                    onChange={(e) => f.set(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Water", val: `${totalWaterL.toFixed(0)} L` },
                { label: "Dye Required", val: `${totalDyeKg.toFixed(2)} kg` },
                { label: "Salt", val: `${totalSaltKg.toFixed(1)} kg` },
                { label: "Soda Ash", val: `${totalSodaKg.toFixed(1)} kg` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                  <div className="text-[10px] uppercase text-slate-400">{m.label}</div>
                  <div className="mt-1 font-mono text-sm font-bold text-cyan-300">{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/25 bg-[#0A1020] p-5 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-200">Live Visual: Virtual Dye-Bath Tank</h3>
              <span className="font-mono text-xs text-slate-400">M:L = 1:{liquorRatio}</span>
            </div>
            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-5">
              <div className="relative h-40 w-44 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-slate-600 bg-slate-950">
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                  style={{
                    height: `${Math.min(95, Math.max(20, liquorRatio * 7))}%`,
                    backgroundColor: `rgba(139, 92, 246, ${Math.min(0.92, Math.max(0.2, shadePct / 5))})`,
                  }}
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-white/25 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                  {fabricKg} kg Fabric
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Bath depth scales with <strong className="text-cyan-300">1:{liquorRatio}</strong> ratio; shade intensity reflects{" "}
                <strong className="text-violet-300">{shadePct}% owf</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GARMENT */}
      {tab === "garment" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-5 lg:col-span-6">
            <h2 className="text-sm font-bold text-white">Knit T-Shirt Consumption &amp; CM Costing</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Body Length (cm)", val: bodyLen, set: setBodyLen },
                { label: "Sleeve Length (cm)", val: sleeveLen, set: setSleeveLen },
                { label: "1/2 Chest (cm)", val: halfChest, set: setHalfChest },
                { label: "Allowance (cm)", val: allowance, set: setAllowance },
                { label: "Fabric GSM", val: garmentGsm, set: setGarmentGsm },
                { label: "Wastage (%)", val: wastagePct, set: setWastagePct },
                { label: "Garment SMV (min)", val: smv, set: setSmv },
                { label: "Factory CPM ($)", val: cpm, set: setCpm },
                { label: "Line Eff. (%)", val: lineEff, set: setLineEff },
              ].map((f) => (
                <label key={f.label} className="space-y-1 text-xs">
                  <span className="text-slate-400">{f.label}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={f.val}
                    onChange={(e) => f.set(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-2.5 py-1.5 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Fabric / Dozen</div>
                <div className="mt-1 font-mono text-base font-bold text-emerald-300">{consPerDozenKg.toFixed(2)} kg</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">CM / Piece</div>
                <div className="mt-1 font-mono text-base font-bold text-cyan-300">${cmPerPiece.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">CM / Dozen</div>
                <div className="mt-1 font-mono text-base font-bold text-violet-300">${(cmPerPiece * 12).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-[#0A1020] p-5 lg:col-span-6">
            <h3 className="text-sm font-bold text-emerald-200">Live Visual: Garment Spec &amp; Wastage Split</h3>
            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-5 space-y-4">
              <svg viewBox="0 0 220 150" className="w-full max-w-[230px]">
                <path
                  d="M65,25 L90,20 Q110,32 130,20 L155,25 L190,52 L172,72 L152,58 L152,135 L68,135 L68,58 L48,72 L30,52 Z"
                  fill="#0f172a"
                  stroke="#34d399"
                  strokeWidth="2"
                />
                <line x1="68" y1="88" x2="152" y2="88" stroke="#38bdf8" strokeDasharray="3 3" />
                <text x="110" y="83" textAnchor="middle" fill="#38bdf8" fontSize="9">
                  1/2 Chest: {halfChest}cm
                </text>
                <line x1="164" y1="25" x2="164" y2="135" stroke="#a78bfa" strokeDasharray="3 3" />
                <text x="170" y="108" fill="#a78bfa" fontSize="9">
                  L: {bodyLen}cm
                </text>
                <text x="42" y="42" fill="#fbbf24" fontSize="8.5">
                  SL: {sleeveLen}cm
                </text>
              </svg>

              <div className="w-full space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Usable Fabric ({(100 - wastagePct).toFixed(0)}%)</span>
                  <span className="text-amber-300">Wastage ({wastagePct}%)</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${Math.max(0, 100 - wastagePct)}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${Math.min(100, wastagePct)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TTQC */}
      {tab === "ttqc" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-5 lg:col-span-6">
            <h2 className="text-sm font-bold text-white">TTQC Lab: Fabric Shrinkage Test (ISO 3759 / AATCC 135)</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Warp Before Wash (mm)", val: beforeWarp, set: setBeforeWarp },
                { label: "Warp After Wash (mm)", val: afterWarp, set: setAfterWarp },
                { label: "Weft Before Wash (mm)", val: beforeWeft, set: setBeforeWeft },
                { label: "Weft After Wash (mm)", val: afterWeft, set: setAfterWeft },
                { label: "Buyer Max Limit (%)", val: maxShrinkLimit, set: setMaxShrinkLimit },
              ].map((f) => (
                <label key={f.label} className="space-y-1 text-xs">
                  <span className="text-slate-400">{f.label}</span>
                  <input
                    type="number"
                    value={f.val}
                    onChange={(e) => f.set(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-500/50"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Warp Shrink</div>
                <div className="mt-1 font-mono text-base font-bold text-cyan-300">{warpShrinkPct.toFixed(2)}%</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Weft Shrink</div>
                <div className="mt-1 font-mono text-base font-bold text-violet-300">{weftShrinkPct.toFixed(2)}%</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060A12] p-3 text-center">
                <div className="text-[10px] uppercase text-slate-400">Lab Result</div>
                <div className={`mt-1 inline-flex items-center gap-1 text-sm font-bold ${ttqcPass ? "text-emerald-400" : "text-rose-400"}`}>
                  {ttqcPass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {ttqcPass ? "PASS" : "FAIL"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/25 bg-[#0A1020] p-5 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-200">Live Visual: Before vs After Template Overlay</h3>
              <Ruler className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="my-4 flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-[#060A12] p-6">
              <div className="relative flex h-40 w-40 items-center justify-center border-2 border-dashed border-slate-500">
                <span className="absolute -top-5 text-[10px] text-slate-400">
                  Original ({beforeWarp}x{beforeWeft}mm)
                </span>
                <div
                  className={`flex items-center justify-center border-2 transition-all duration-300 ${
                    ttqcPass ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-rose-400 bg-rose-500/20 text-rose-200"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(55, (afterWeft / Math.max(1, beforeWeft)) * 100))}%`,
                    height: `${Math.min(100, Math.max(55, (afterWarp / Math.max(1, beforeWarp)) * 100))}%`,
                  }}
                >
                  <span className="font-mono text-[10.5px] font-bold">
                    {afterWarp}x{afterWeft}mm
                  </span>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                Dashed box = pre-wash benchmark; shaded box = post-wash dimensional stability (limit &le; {maxShrinkLimit}%).
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Engineering Guide & Live Formula Breakdown */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <BookOpen className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">{activeGuide.title} — How It Works &amp; Live Formulas</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#060A12] p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">How to Use &amp; Check</h4>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
              {activeGuide.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#060A12] p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">Module &amp; Term Glossary</h4>
            <dl className="space-y-2 text-xs">
              {activeGuide.terms.map((t) => (
                <div key={t.name}>
                  <dt className="font-semibold text-slate-100">{t.name}</dt>
                  <dd className="text-slate-400">{t.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#060A12] p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Live Calculation Steps</h4>
            <div className="space-y-2">
              {activeGuide.formulas.map((f) => (
                <div key={f.label} className="rounded-lg border border-slate-800/80 bg-[#0A1020] px-3 py-2">
                  <div className="text-[10.5px] font-semibold uppercase text-slate-400">{f.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-emerald-300 break-all">{f.expr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
