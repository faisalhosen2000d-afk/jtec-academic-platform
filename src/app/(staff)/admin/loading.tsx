export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#060A12] p-6 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-800/80" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-slate-800/80" />
              <div className="h-6 w-56 rounded-lg bg-slate-800/80" />
            </div>
          </div>
          <div className="h-9 w-24 rounded-xl bg-slate-800/80" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-slate-800/80 bg-[#0A1020]/90 p-5"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-slate-800/80 bg-[#0A1020]/90 p-6"
            />
          ))}
        </div>
      </div>
    </div>
  );
}