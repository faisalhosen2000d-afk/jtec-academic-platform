"use client";

import { useState } from "react";
import { Box, Grid3X3, Workflow, ShieldAlert, Sparkles } from "lucide-react";
import Loom3DSimulator from "./Loom3DSimulator";

type FeModuleId = "loom3d" | "weave_studio" | "passage_calc" | "defects";

const FE_MODULES: Array<{
  id: FeModuleId;
  title: string;
  subtitle: string;
  ready: boolean;
}> = [
  {
    id: "loom3d",
    title: "3D Loom & Live Weaving",
    subtitle: "Shedding, Picking, Beat-up & 0-360 Timing",
    ready: true,
  },
  {
    id: "weave_studio",
    title: "Weave, Drafting & Denim",
    subtitle: "Drafting, Lifting, Denting & Cloth Preview",
    ready: false,
  },
  {
    id: "passage_calc",
    title: "Winding, Warping & Sizing",
    subtitle: "Interactive Passage Diagrams & FE 202 Math",
    ready: false,
  },
  {
    id: "defects",
    title: "Fabric Defects Lab",
    subtitle: "Visual Faults, Causes & Remedies",
    ready: false,
  },
];

export default function FabricLabHub() {
  const [activeModule, setActiveModule] = useState<FeModuleId>("loom3d");

  const getIcon = (id: FeModuleId) => {
    if (id === "loom3d") return <Box className="h-4 w-4" />;
    if (id === "weave_studio") return <Grid3X3 className="h-4 w-4" />;
    if (id === "passage_calc") return <Workflow className="h-4 w-4" />;
    return <ShieldAlert className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 via-slate-900/90 to-indigo-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                FE 201 &amp; FE 202
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Level 2 &middot; Term 2 Virtual Lab
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">
              Fabric Manufacturing-I Interactive Lab
            </h2>
            <p className="text-xs text-slate-300">
              Explore weaving mechanisms, live cloth formation, loom timing, and practical exam concepts without needing a physical machine.
            </p>
          </div>
        </div>

        <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FE_MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                  isActive
                    ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div
                  className={`mt-0.5 rounded-lg p-1.5 ${
                    isActive ? "bg-cyan-500/25 text-cyan-300" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {getIcon(mod.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold">{mod.title}</span>
                    {!mod.ready && (
                      <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
                        Next
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{mod.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeModule === "loom3d" ? (
        <Loom3DSimulator />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-cyan-400" />
          <h3 className="mt-3 text-base font-bold text-white">
            {FE_MODULES.find((m) => m.id === activeModule)?.title}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-400">
            This FE 201 / FE 202 interactive module is scheduled next in our Subject-Wise Virtual Lab rollout. Use the 3D Loom &amp; Live Weaving Simulator tab right now to explore shedding, picking, beat-up, and live cloth formation.
          </p>
        </div>
      )}
    </div>
  );
}