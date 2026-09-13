"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function NoticeSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";

    setValue((currentValue) =>
      currentSearch !== currentValue.trim() ? currentSearch : currentValue,
    );
  }, [searchParams]);

  useEffect(() => {
    const trimmedValue = value.trim();
    const currentSearch = searchParams.get("search") ?? "";

    if (trimmedValue === currentSearch) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (trimmedValue) {
        params.set("search", trimmedValue);
      } else {
        params.delete("search");
      }

      const scrollY = window.scrollY;
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }, 250);

    return () => clearTimeout(timeout);
  }, [value, pathname, router, searchParams]);

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search notices..."
      aria-label="Search notices"
      className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:max-w-md"
    />
  );
}
