export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block">
          <div className="space-y-4 p-5">
            <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 animate-pulse rounded bg-slate-200" />
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            </div>
          </header>

          <section className="space-y-6 p-5 md:p-8">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
              <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
              <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
            </div>

            <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
          </section>
        </main>
      </div>
    </div>
  );
}
