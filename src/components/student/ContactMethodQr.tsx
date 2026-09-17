"use client";

import { useState } from "react";
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        QR Code
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {label} QR Code
                </h3>

                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {value}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex justify-center rounded-lg bg-white p-5">
              <QRCodeSVG
                value={destination}
                size={220}
                level="M"
                includeMargin
              />
            </div>

            <p className="mt-4 break-words text-center text-xs text-muted-foreground">
              Scan this QR Code to use this contact method.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
