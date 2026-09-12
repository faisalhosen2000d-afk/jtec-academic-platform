import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <section className="text-center">
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              Jhenaidah Textile Engineering College
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              JTEC Academic Platform
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              A centralized academic platform for students and authorized
              college staff.
            </p>
          </section>

          {/* Login Options */}
          <section className="mt-12">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Student */}
              <article className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                <div className="flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                    🎓
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold">
                    Student
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Access academic materials, notices, results, and other
                    student services.
                  </p>
                </div>

                <div className="mt-7">
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Student Login
                  </Link>
                </div>
              </article>

              {/* Staff */}
              <article className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md sm:p-8">
                <div className="flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                    🛡️
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold">
                    Administration
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Access administrative and academic management tools for
                    authorized college staff.
                  </p>
                </div>

                <div className="mt-7">
                  <Link
                    href="/staff-login"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Administration Login
                  </Link>
                </div>
              </article>
            </div>
          </section>

          {/* Footer note */}
          <p className="mt-10 text-center text-xs text-muted-foreground">
            Authorized users only. Access is controlled according to account
            role and permissions.
          </p>
        </div>
      </div>
    </main>
  );
}
