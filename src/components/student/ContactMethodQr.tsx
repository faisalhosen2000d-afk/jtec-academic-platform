"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ContactMethodQrProps = {
  label: string;
  value: string;
  destination: string;
};

export default function ContactMethodQr({
  label,
  value,
  destination,
}: ContactMethodQrProps) {
  const [open, setOpen] = useState(false);

  const qrModal = open ? (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-[#0A1020] p-6 text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold text-white">
              {label} QR Code
            </h3>
            <p className="mt-1 break-all text-xs text-slate-400">
              {value}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-xl border border-slate-800 bg-[#0E172A] p-1.5 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-center rounded-xl bg-white p-5 shadow-inner">
          <QRCodeSVG
            value={destination}
            size={210}
            level="M"
            includeMargin
          />
        </div>

        <p className="mt-4 break-words text-center text-xs text-slate-400">
          Scan this QR Code to use this contact method.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0A1020] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
      >
        <QrCode className="h-3.5 w-3.5 text-emerald-400" />
        QR Code
      </button>

      {typeof document !== "undefined" && qrModal
        ? createPortal(qrModal, document.body)
        : null}
    </>
  );
}