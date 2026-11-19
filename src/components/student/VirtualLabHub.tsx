"use client";

import { useState } from "react";
import { Calculator, Cpu, Layers } from "lucide-react";
import { TextileToolsClient } from "./TextileToolsClient";
import FabricLabHub from "./FabricLabHub";

type LabSection = "core" | "fe201";

export default function VirtualLabHub() {
  const [section, setSection] = useState<LabSection>("fe201");

  return (
    <div className="space-y-5 pb-16 sm:pb-6">
      {/* Subject-Wise Virtual Lab Hub Header */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0B1220] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              <Cpu className="h-3.5 w-3.5" />
              <span>JTEC Subject-Wise Virtual Lab &amp; Textile Tools</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
              Interactive Engineering Labs
            </h1>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            Active Term: Level 2 &middot; Term 2
          </span>
        </div>

        {/* Course Cards */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSection("fe201")}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
              section === "fe201"
                ? "border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            <div
              className={`rounded-xl p-2.5 ${
                section === "fe201" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  L2-T2
                </span>
                <span className="truncate text-sm font-bold text-white">
                  FE 201 / 202: Fabric Manufacturing-I
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                3D Loom Simulator, Live Weaving, Timing Diagram &amp; Parts Inspector
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSection("core")}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
              section === "core"
                ? "border-violet-400/70 bg-violet-500/15 shadow-[0_0_24px_rgba(167,139,250,0.12)]"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            <div
              className={`rounded-xl p-2.5 ${
                section === "core" ? "bg-violet-500/20 text-violet-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                  ALL TERMS
                </span>
                <span className="truncate text-sm font-bold text-white">
                  Core Yarn 3D Lab &amp; Calculators
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                10-System Yarn Count, Yarn A vs B 3D Comparator, Unit &amp; GSM Converter
              </p>
            </div>
          </button>
        </div>
      </div>

      {section === "fe201" ? <FabricLabHub /> : <TextileToolsClient />}
    </div>
  );
}