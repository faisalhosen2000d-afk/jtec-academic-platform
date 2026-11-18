"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function PremiumSelect({ value, onChange, children }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = React.Children.toArray(children)
    .filter((child: any) => child?.type === "option")
    .map((child: any) => ({
      value: child.props.value ?? child.props.children,
      label: String(child.props.children),
    }));

  const selected = options.find((o: any) => String(o.value) === String(value)) || options[0];

  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B1120] border text-left transition-all duration-200 ${
          open
            ? "border-cyan-500/70 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
          {selected?.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[260px] rounded-xl bg-[#0F172A]/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl shadow-black/90 overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {options.map((opt: any) => {
              const isSelected = String(opt.value) === String(value);
              const isDirect = opt.label.includes("(Direct)");
              const isIndirect = opt.label.includes("(Indirect)");
              const cleanLabel = opt.label.replace("(Direct)", "").replace("(Indirect)", "").trim();

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="text-xs font-medium truncate">{cleanLabel}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDirect && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Direct
                      </span>
                    )}
                    {isIndirect && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Indirect
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
