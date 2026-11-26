"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function StudentMotionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observed = new WeakSet<HTMLElement>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px -10px 0px" }
    );

    const scanAndObserve = () => {
      const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
      targets.forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };

    scanAndObserve();

    const mo = new MutationObserver(() => {
      scanAndObserve();
    });
    mo.observe(root, { childList: true, subtree: true });

    // Safety fallback: never allow any section to stay hidden
    const safetyTimer = window.setTimeout(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.classList.add("is-revealed");
      });
    }, 900);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, [pathname]);

  return (
    <div
      key={pathname}
      ref={containerRef}
      className="jtec-page-transition flex flex-1 flex-col"
    >
      <style>{`
        @keyframes jtecPageEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes jtecCardRise {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .jtec-page-transition {
          animation: jtecPageEnter 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .dash-stagger-1 {
          animation: jtecCardRise 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.02s both;
        }
        .dash-stagger-2 {
          animation: jtecCardRise 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.09s both;
        }
        .dash-stagger-3 {
          animation: jtecCardRise 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
        }
        .dash-stagger-4 {
          animation: jtecCardRise 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.23s both;
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.52s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].is-revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      {children}
    </div>
  );
}

export function AnimatedCountText({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 850,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}