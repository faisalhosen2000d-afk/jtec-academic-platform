"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

interface ModernDateTimePickerProps {
  id?: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalDateTimeString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseDateTimeString(val: string): Date | null {
  if (!val) return null;
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    0,
    0,
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(val: string): string {
  const d = parseDateTimeString(val);
  if (!d) return "";
  const h24 = d.getHours();
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${pad2(h12)}:${pad2(d.getMinutes())} ${ampm}`;
}

export function ModernDateTimePicker({
  id,
  name,
  placeholder = "No expiry (Never)",
  defaultValue = "",
  onChange,
}: ModernDateTimePickerProps) {
  const [value, setValue] = useState<string>(defaultValue);
  const [open, setOpen] = useState(false);

  const initialDate = useMemo(() => parseDateTimeString(defaultValue) ?? new Date(), [defaultValue]);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const selectedDate = useMemo(() => parseDateTimeString(value), [value]);

  const currentHour24 = selectedDate ? selectedDate.getHours() : 23;
  const currentMinute = selectedDate ? selectedDate.getMinutes() : 59;
  const isPM = currentHour24 >= 12;
  const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;

  function commitValue(next: string) {
    setValue(next);
    onChange?.(next);
  }

  function selectDay(day: number) {
    const base = selectedDate ?? new Date(viewYear, viewMonth, day, 23, 59, 0, 0);
    const next = new Date(viewYear, viewMonth, day, base.getHours(), base.getMinutes(), 0, 0);
    commitValue(toLocalDateTimeString(next));
  }

  function updateTime(hour12: number, minute: number, pm: boolean) {
    const base = selectedDate ?? new Date(viewYear, viewMonth, new Date().getDate(), 23, 59, 0, 0);
    let h24 = hour12 % 12;
    if (pm) h24 += 12;
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h24, minute, 0, 0);
    commitValue(toLocalDateTimeString(next));
  }

  function applyPreset(daysOffset: number | null, hoursOffset?: number) {
    if (daysOffset === null && !hoursOffset) {
      commitValue("");
      setOpen(false);
      return;
    }
    const now = new Date();
    if (hoursOffset) {
      const target = new Date(now.getTime() + hoursOffset * 3600 * 1000);
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
      commitValue(toLocalDateTimeString(target));
    } else if (daysOffset !== null) {
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset, 23, 59, 0, 0);
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
      commitValue(toLocalDateTimeString(target));
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();

  const cells: Array<number | null> = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div ref={containerRef} className="relative">
      <input id={id} type="hidden" name={name} value={value} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-[#060A12] px-3.5 text-sm transition-all ${
          open
            ? "border-cyan-400/80 ring-2 ring-cyan-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
          {value ? (
            <span className="truncate font-medium text-white">
              {formatDisplay(value)}
            </span>
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </span>

        {value ? (
          <button
            type="button"
            aria-label="Clear expiry date"
            onClick={(e) => {
              e.stopPropagation();
              commitValue("");
            }}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="rounded-md border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Optional
          </span>
        )}
      </div>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[310px] max-w-[360px] rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
          {/* Quick Presets */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset(null, 24)}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              +24 Hours
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              +30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(null)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              No Expiry
            </button>
          </div>

          {/* Month Header */}
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#060A12] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#060A12] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <span key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected =
                selectedDate !== null &&
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getDate() === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-cyan-400 to-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.45)]"
                      : isToday
                        ? "border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                        : "text-slate-200 hover:bg-slate-800/90 hover:text-white"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Selector */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Time</span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Hour"
                value={currentHour12}
                onChange={(e) => updateTime(Number(e.target.value), currentMinute, isPM)}
                className="h-8 rounded-lg border border-slate-700 bg-[#060A12] px-2 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500">:</span>

              <select
                aria-label="Minute"
                value={currentMinute}
                onChange={(e) => updateTime(currentHour12, Number(e.target.value), isPM)}
                className="h-8 rounded-lg border border-slate-700 bg-[#060A12] px-2 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>

              <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 bg-[#060A12]">
                <button
                  type="button"
                  onClick={() => updateTime(currentHour12, currentMinute, false)}
                  className={`px-2 py-1 text-[11px] font-bold transition-colors ${
                    !isPM ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => updateTime(currentHour12, currentMinute, true)}
                  className={`px-2 py-1 text-[11px] font-bold transition-colors ${
                    isPM ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                commitValue(toLocalDateTimeString(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0)));
              }}
              className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Today (11:59 PM)
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.3)] transition-all hover:from-cyan-300 hover:to-cyan-400"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}