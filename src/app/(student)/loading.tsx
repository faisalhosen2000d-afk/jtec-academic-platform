export default function StudentLoading() {
  return (
    <div className="relative flex-1 bg-[#060A12] p-6">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-5 opacity-60">
        <div className="h-28 rounded-2xl border border-slate-800/70 bg-[#0A1020] animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-2xl border border-slate-800/70 bg-[#0A1020] animate-pulse" />
          <div className="h-24 rounded-2xl border border-slate-800/70 bg-[#0A1020] animate-pulse" />
          <div className="h-24 rounded-2xl border border-slate-800/70 bg-[#0A1020] animate-pulse" />
        </div>
      </div>
    </div>
  );
}