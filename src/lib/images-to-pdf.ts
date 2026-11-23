import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type ExtractedQuestionPaper = {
  headers?: string[];
  time?: string;
  marks?: string;
  instructions?: string[];
  questions?: Array<{
    number?: string;
    text?: string;
    marks?: string;
  }>;
};

function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00D7/g, "x")
    .replace(/\u00F7/g, "/")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2248/g, "~=")
    .replace(/\u00B0/g, " deg ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function buildCleanQuestionPdf(
  extracted: ExtractedQuestionPaper,
  outputName: string,
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const a4W = 595.28;
  const a4H = 841.89;
  const marginX = 56;
  const contentW = a4W - marginX * 2;
  const marksColW = 52;
  const questionTextMaxW = contentW - marksColW - 14;

  let page = pdfDoc.addPage([a4W, a4H]);
  let y = a4H - 54;

  const ensureSpace = (needed: number) => {
    if (y - needed < 54) {
      page = pdfDoc.addPage([a4W, a4H]);
      y = a4H - 54;
    }
  };

  // Centered Academic Headers
  const headers = (extracted.headers ?? []).map(sanitizeForWinAnsi).filter(Boolean);
  headers.forEach((line, idx) => {
    const size = idx === 0 ? 13 : idx === headers.length - 1 ? 11.5 : 11;
    const f = idx === 0 || idx === headers.length - 1 ? fontBold : fontRegular;
    const wrapped = wrapLines(line, f, size, contentW);
    for (const wLine of wrapped) {
      ensureSpace(size + 5);
      const w = f.widthOfTextAtSize(wLine, size);
      page.drawText(wLine, {
        x: Math.max(marginX, (a4W - w) / 2),
        y,
        size,
        font: f,
        color: rgb(0.08, 0.08, 0.1),
      });
      y -= size + 5;
    }
  });

  y -= 6;

  // Time (left) & Marks (right)
  const timeStr = sanitizeForWinAnsi(extracted.time ?? "");
  const marksStr = sanitizeForWinAnsi(extracted.marks ?? "");
  if (timeStr || marksStr) {
    ensureSpace(18);
    if (timeStr) {
      page.drawText(timeStr, {
        x: marginX,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.08, 0.1),
      });
    }
    if (marksStr) {
      const mw = fontBold.widthOfTextAtSize(marksStr, 11);
      page.drawText(marksStr, {
        x: a4W - marginX - mw,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.08, 0.1),
      });
    }
    y -= 10;
  }

  // Divider rule
  page.drawLine({
    start: { x: marginX, y },
    end: { x: a4W - marginX, y },
    thickness: 0.9,
    color: rgb(0.25, 0.25, 0.3),
  });
  y -= 18;

  // Optional instructions
  const instructions = (extracted.instructions ?? []).map(sanitizeForWinAnsi).filter(Boolean);
  for (const inst of instructions) {
    const lines = wrapLines(inst, fontItalic, 10.5, contentW);
    for (const ln of lines) {
      ensureSpace(15);
      page.drawText(ln, {
        x: marginX,
        y,
        size: 10.5,
        font: fontItalic,
        color: rgb(0.18, 0.18, 0.22),
      });
      y -= 15;
    }
  }
  if (instructions.length > 0) y -= 6;

  // Questions with right-aligned marks
  const questions = extracted.questions ?? [];
  for (const q of questions) {
    const qNum = sanitizeForWinAnsi(q.number ?? "");
    const qText = sanitizeForWinAnsi(q.text ?? "");
    const qMarks = sanitizeForWinAnsi(q.marks ?? "");
    if (!qNum && !qText) continue;

    const fullText = qNum ? `${qNum} ${qText}` : qText;
    const lines = wrapLines(fullText, fontRegular, 11, questionTextMaxW);
    const neededH = Math.max(18, lines.length * 16 + 6);
    ensureSpace(neededH);

    lines.forEach((ln, li) => {
      page.drawText(ln, {
        x: marginX,
        y: y - li * 16,
        size: 11,
        font: fontRegular,
        color: rgb(0.06, 0.06, 0.08),
      });
    });

    if (qMarks) {
      const mw = fontBold.widthOfTextAtSize(qMarks, 11);
      page.drawText(qMarks, {
        x: a4W - marginX - mw,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.08, 0.1),
      });
    }

    y -= lines.length * 16 + 6;
  }

  const pdfBytes = await pdfDoc.save();
  const safeName = outputName.toLowerCase().endsWith(".pdf")
    ? outputName
    : `${outputName}.pdf`;

  return new File([new Uint8Array(pdfBytes)], safeName, {
    type: "application/pdf",
  });
}

async function fileToJpegBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1200;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.78),
  );
  if (!blob) throw new Error("Could not process image.");
  return new Uint8Array(await blob.arrayBuffer());
}

export async function compressImageForOcr(file: File): Promise<File> {
  const bytes = await fileToJpegBytes(file);
  return new File([new Uint8Array(bytes)], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export async function convertImagesToSinglePdf(
  files: File[],
  outputName: string,
): Promise<File> {
  if (files.length === 0) {
    throw new Error("Please select at least one image or PDF.");
  }

  if (
    files.length === 1 &&
    files[0] &&
    (files[0].type === "application/pdf" || files[0].name.toLowerCase().endsWith(".pdf"))
  ) {
    return files[0];
  }

  const pdfDoc = await PDFDocument.create();
  const a4W = 595.28;
  const a4H = 841.89;
  const margin = 20;

  for (const file of files) {
    const jpegBytes = await fileToJpegBytes(file);
    const img = await pdfDoc.embedJpg(jpegBytes);

    const maxW = a4W - margin * 2;
    const maxH = a4H - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;

    const page = pdfDoc.addPage([a4W, a4H]);
    page.drawImage(img, {
      x: (a4W - drawW) / 2,
      y: (a4H - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeName = outputName.toLowerCase().endsWith(".pdf")
    ? outputName
    : `${outputName}.pdf`;

  return new File([new Uint8Array(pdfBytes)], safeName, {
    type: "application/pdf",
  });
}