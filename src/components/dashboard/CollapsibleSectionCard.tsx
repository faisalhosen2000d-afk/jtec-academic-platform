"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

type CollapsibleSectionCardProps = {
  storageKey: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultCollapsed?: boolean;
  borderHoverCls?: string;
  className?: string;
  children: React.ReactNode;
};

export function CollapsibleSectionCard({
  storageKey,
  title,
  subtitle,
  icon,
  headerRight,
  defaultCollapsed = false,
  borderHoverCls = "hover:border-cyan-500/35",
  className = "",
  children,
}: CollapsibleSectionCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`jtec_dash_hide_${storageKey}`);
      if (saved === "1") setCollapsed(true);
      if (saved === "0") setCollapsed(false);
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          `jtec_dash_hide_${storageKey}`,
          next ? "1" : "0",
        );
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  return (
    <section
      className={`rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 ${borderHoverCls} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-serif text-lg font-bold text-white">{title}</h3>
            {subtitle && !collapsed ? (
              <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!collapsed ? headerRight : null}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-emerald-500/50 hover:text-emerald-300 active:scale-95"
          >
            {collapsed ? (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                <span>Show</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                <span>Hide</span>
              </>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          collapsed
            ? "grid-rows-[0fr] opacity-0"
            : "mt-5 grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}