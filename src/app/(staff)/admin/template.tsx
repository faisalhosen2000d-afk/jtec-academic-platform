"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AdminTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);

    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        href !== pathname &&
        target.target !== "_blank"
      ) {
        setIsNavigating(true);
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, [pathname]);

  return (
    <>
      <style>{`
        @keyframes jtecPageEnter {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.994);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes jtecProgressSweep {
          0% { width: 0%; opacity: 1; }
          60% { width: 78%; opacity: 1; }
          100% { width: 94%; opacity: 0.9; }
        }
        .jtec-page-transition {
          animation: jtecPageEnter 0.34s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: opacity, transform;
        }
        .jtec-top-progress {
          animation: jtecProgressSweep 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-transparent pointer-events-none">
          <div className="h-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.7)] jtec-top-progress" />
        </div>
      )}

      <div key={pathname} className="jtec-page-transition min-h-screen">
        {children}
      </div>
    </>
  );
}