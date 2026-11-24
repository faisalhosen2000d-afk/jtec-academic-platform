import {PDFDocument, StandardFonts, rgb, type PDFFont, PDFPage } from "pdf-lib";

export type ExtractedQuestionPaper = {
  headers?: string[];
  time?: string;
  marks?: string;
  instructions?: string[];
  questions?: Array<{
    number?: string;
    text?: string;
    marks?: string;
    table?: string[][];
    hasFigure?: boolean;
    figureBox?: {
      pageIndex?: number;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }>;
};


function normalizeMathScripts(raw: string): string {
  const subMap: Record<string, string> = {
    "\u2080": "0", "\u2081": "1", "\u2082": "2", "\u2083": "3", "\u2084": "4",
    "\u2085": "5", "\u2086": "6", "\u2087": "7", "\u2088": "8", "\u2089": "9",
    "\u208A": "+", "\u208B": "-", "\u208C": "=",
  };
  const supMap: Record<string, string> = {
    "\u2070": "0", "\u2074": "4", "\u2075": "5", "\u2076": "6", "\u2077": "7",
    "\u2078": "8", "\u2079": "9", "\u207A": "+", "\u207B": "-", "\u207F": "n",
  };
  return raw
    .replace(/[\u2080-\u208C]+/g, (m) => "_{" + Array.from(m).map((ch) => subMap[ch] ?? ch).join("") + "}")
    .replace(/[\u2070\u2074-\u207B\u207F]+/g, (m) => "^{" + Array.from(m).map((ch) => supMap[ch] ?? ch).join("") + "}")
    .replace(/\$([^$\r\n]{1,60})\$/g, (_m, inner: string) =>
      inner
        .replace(/\\times/g, "x")
        .replace(/\\cdot/g, ".")
        .replace(/\\pm/g, "\u00B1")
        .replace(/\\leq?/g, "<=")
        .replace(/\\geq?/g, ">=")
        .replace(/\\neq/g, "!=")
        .replace(/\\circ/g, "\u00B0")
        .replace(/\\text\{([^}]*)\}/g, "$1")
        .trim(),
    );
}

type RichSegment = { text: string; kind: "normal" | "sub" | "sup" };

function parseRichSegments(line: string): RichSegment[] {
  const segs: RichSegment[] = [];
  // Match _{...} or ^{...} or single-char _x / ^x immediately after an alphanumeric or ')'
  const regex = /(?<=[A-Za-z0-9)]])(_{([^}]+)}|_([A-Za-z0-9+-])|^{([^}]+)}|^([A-Za-z0-9+-]))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      segs.push({ text: line.slice(lastIdx, match.index), kind: "normal" });
    }
    if (match[2] !== undefined) {
      segs.push({ text: match[2], kind: "sub" });
    } else if (match[3] !== undefined) {
      segs.push({ text: match[3], kind: "sub" });
    } else if (match[4] !== undefined) {
      segs.push({ text: match[4], kind: "sup" });
    } else if (match[5] !== undefined) {
      segs.push({ text: match[5], kind: "sup" });
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < line.length) {
    segs.push({ text: line.slice(lastIdx), kind: "normal" });
  }
  return segs;
}

function measureRichTextWidth(line: string, font: PDFFont, size: number): number {
  const subSize = size * 0.72;
  let total = 0;
  for (const seg of parseRichSegments(line)) {
    total += font.widthOfTextAtSize(seg.text, seg.kind === "normal" ? size : subSize);
  }
  return total;
}

function drawRichTextLine(
  page: PDFPage,
  line: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
): void {
  const subSize = opts.size * 0.72;
  let cursorX = opts.x;
  for (const seg of parseRichSegments(line)) {
    const drawSize = seg.kind === "normal" ? opts.size : subSize;
    const yOffset =
      seg.kind === "sub"
        ? -opts.size * 0.24
        : seg.kind === "sup"
          ? opts.size * 0.35
          : 0;
    page.drawText(seg.text, {
      x: cursorX,
      y: opts.y + yOffset,
      size: drawSize,
      font: opts.font,
      color: opts.color,
    });
    cursorX += opts.font.widthOfTextAtSize(seg.text, drawSize);
  }
}

function sanitizeForWinAnsi(text: string): string {
  return normalizeMathScripts(text)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00D7/g, "x")
    .replace(/\u00F7/g, "/")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2248/g, "~=")
    .replace(/(\d+)\s*\u00B0\s*([cCfFkK])\b/g, (_, n: string, u: string) => `${n}\u00B0${u.toUpperCase()}`)
    .replace(/(\d+)\s*deg\s*([cCfFkK])\b/gi, (_, n: string, u: string) => `${n}\u00B0${u.toUpperCase()}`)
    .replace(/(\d+)\s*deg\b/gi, "$1\u00B0")
    .replace(/[^\x20-\x7E\u00B0\u00B1\u00B2\u00B3\n]/g, " ")
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
      if (measureRichTextWidth(candidate, font, size) <= maxWidth) {
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



function cleanCanvasPaperBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): Uint8Array | null {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;

  // Step 1: Compute grayscale luminance buffer for crisp 3x3 Unsharp Mask sharpening
  const total = w * h;
  const lumBuf = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const r = src[o] ?? 255;
    const g = src[o + 1] ?? 255;
    const b = src[o + 2] ?? 255;
    lumBuf[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Step 2: 3x3 Unsharp Mask (sharpens decimal dots, small digits, and diagram lines)
  const amount = 0.65;
  for (let y = 0; y < h; y++) {
    const yUp = y > 0 ? y - 1 : 0;
    const yDn = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const xLt = x > 0 ? x - 1 : 0;
      const xRt = x < w - 1 ? x + 1 : w - 1;
      const idx = y * w + x;
      const center = lumBuf[idx] ?? 255;
      const avg =
        ((lumBuf[yUp * w + x] ?? center) +
          (lumBuf[yDn * w + x] ?? center) +
          (lumBuf[y * w + xLt] ?? center) +
          (lumBuf[y * w + xRt] ?? center)) *
        0.25;
      let sharp = center + amount * (center - avg);
      if (sharp < 0) sharp = 0;
      if (sharp > 255) sharp = 255;

      // Step 3: Clean white paper background + crisp black ink curve
      let out: number;
      if (sharp >= 228) {
        out = 255;
      } else if (sharp <= 75) {
        out = 0;
      } else {
        const t = (sharp - 75) / (228 - 75);
        out = Math.round(Math.pow(t, 1.55) * 255);
      }

      const o = idx * 4;
      src[o] = out;
      src[o + 1] = out;
      src[o + 2] = out;
      src[o + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const pngUrl = ctx.canvas.toDataURL("image/png");
  const b64 = pngUrl.split(",")[1];
  if (!b64) return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function detectDiagramBoxFromFile(
  file: File,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  let objUrl = "";
  try {
    objUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = objUrl;
    });
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) return null;

    // Downscale to ~400px wide for fast ink-band scanning
    const scanW = Math.min(400, natW);
    const scale = scanW / natW;
    const scanH = Math.max(50, Math.round(natH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = scanW;
    canvas.height = scanH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, scanW, scanH);
    ctx.drawImage(img, 0, 0, scanW, scanH);

    const data = ctx.getImageData(0, 0, scanW, scanH).data;
    // Ignore 4% outer scanner border edges
    const marginX = Math.round(scanW * 0.04);
    const innerW = scanW - marginX * 2;
    const rowDarkCounts = new Uint16Array(scanH);

    for (let y = 0; y < scanH; y++) {
      let dark = 0;
      const rowOff = y * scanW * 4;
      for (let x = marginX; x < scanW - marginX; x++) {
        const idx = rowOff + x * 4;
        const r = data[idx] ?? 255;
        const g = data[idx + 1] ?? 255;
        const b = data[idx + 2] ?? 255;
        if (0.299 * r + 0.587 * g + 0.114 * b < 165) dark++;
      }
      rowDarkCounts[y] = dark;
    }

    // Group vertical ink bands (bridge tiny 3px gaps inside diagrams)
    const minRowDark = Math.max(2, Math.round(innerW * 0.008));
    const bands: Array<{ y1: number; y2: number }> = [];
    let inBand = false;
    let startY = 0;
    let gap = 0;
    const maxGap = Math.max(3, Math.round(scanH * 0.012));

    for (let y = Math.round(scanH * 0.22); y < Math.round(scanH * 0.96); y++) {
      const hasInk = (rowDarkCounts[y] ?? 0) >= minRowDark;
      if (hasInk) {
        if (!inBand) {
          inBand = true;
          startY = y;
        }
        gap = 0;
      } else if (inBand) {
        gap++;
        if (gap > maxGap) {
          bands.push({ y1: startY, y2: y - gap });
          inBand = false;
          gap = 0;
        }
      }
    }
    if (inBand) bands.push({ y1: startY, y2: Math.round(scanH * 0.95) });

    // A diagram is much taller than a single line of text (> 8% of page height)
    const minDiagramH = Math.round(scanH * 0.08);
    const tallBands = bands.filter((b) => b.y2 - b.y1 >= minDiagramH);
    if (tallBands.length === 0) return null;

    // Pick the tallest continuous graphic band
    tallBands.sort((a, b) => (b.y2 - b.y1) - (a.y2 - a.y1));
    const best = tallBands[0];
    if (!best) return null;

    // Find tight horizontal bounds inside best band
    let minX = scanW - marginX;
    let maxX = marginX;
    for (let y = best.y1; y <= best.y2; y++) {
      const rowOff = y * scanW * 4;
      for (let x = marginX; x < scanW - marginX; x++) {
        const idx = rowOff + x * 4;
        const r = data[idx] ?? 255;
        const g = data[idx + 1] ?? 255;
        const b = data[idx + 2] ?? 255;
        if (0.299 * r + 0.587 * g + 0.114 * b < 165) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    if (maxX <= minX + 10) return null;

    return {
      x: Math.round((minX / scanW) * 1000),
      y: Math.round((best.y1 / scanH) * 1000),
      width: Math.round(((maxX - minX) / scanW) * 1000),
      height: Math.round(((best.y2 - best.y1) / scanH) * 1000),
    };
  } catch {
    return null;
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
  }
}

async function cropAndCleanFigurePng(
  file: File,
  rawBox: { x: number; y: number; width: number; height: number },
): Promise<Uint8Array | null> {
  let objUrl = "";
  try {
    // Support both 0..1 fractional coordinates and 0..1000 normalized coordinates
    const isUnitScale =
      rawBox.x >= 0 && rawBox.x <= 1.01 &&
      rawBox.y >= 0 && rawBox.y <= 1.01 &&
      rawBox.width > 0 && rawBox.width <= 1.01 &&
      rawBox.height > 0 && rawBox.height <= 1.01;
    const mult = isUnitScale ? 1000 : 1;
    const box = {
      x: rawBox.x * mult,
      y: rawBox.y * mult,
      width: rawBox.width * mult,
      height: rawBox.height * mult,
    };

    if (
      !Number.isFinite(box.x) ||
      !Number.isFinite(box.y) ||
      !Number.isFinite(box.width) ||
      !Number.isFinite(box.height) ||
      box.width < 25 ||
      box.height < 25
    ) {
      return null;
    }

    objUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = objUrl;
    });

    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) return null;

    const padX = 12;
    const padY = 4;
    const nx1 = Math.max(0, Math.min(1000, box.x - padX));
    const ny1 = Math.max(0, Math.min(1000, box.y - padY));
    const nx2 = Math.max(nx1 + 20, Math.min(1000, box.x + box.width + padX));
    const ny2 = Math.max(ny1 + 20, Math.min(1000, box.y + box.height + padY));

    const sx = Math.round((nx1 / 1000) * natW);
    const sy = Math.round((ny1 / 1000) * natH);
    const sw = Math.max(10, Math.round(((nx2 - nx1) / 1000) * natW));
    const sh = Math.max(10, Math.round(((ny2 - ny1) / 1000) * natH));

    const upScale = sw < 700 ? 2 : sw < 1050 ? 1.5 : 1;
    const outW = Math.round(sw * upScale);
    const outH = Math.round(sh * upScale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    return cleanCanvasPaperBackground(ctx, outW, outH);
  } catch {
    return null;
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
  }
}

export async function buildCleanQuestionPdf(
  extracted: ExtractedQuestionPaper,
  outputName: string,
  sourceFiles?: File[],
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
      drawRichTextLine(page, ln, {
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

  // Questions + right-aligned marks + bordered tables
  const questions = extracted.questions ?? [];
  for (const q of questions) {
    const qNum = sanitizeForWinAnsi(q.number ?? "");
    const qText = sanitizeForWinAnsi(q.text ?? "");
    const qMarks = sanitizeForWinAnsi(q.marks ?? "");
    if (!qNum && !qText && (!q.table || q.table.length === 0) && !q.figureBox) continue;

    const fullText = qNum ? `${qNum} ${qText}` : qText;
    const lines = fullText ? wrapLines(fullText, fontRegular, 11, questionTextMaxW) : [];
    const neededH = Math.max(18, lines.length * 16 + 6);
    ensureSpace(neededH);

    lines.forEach((ln, li) => {
      drawRichTextLine(page, ln, {
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

    // Render bordered grid table if present
    if (Array.isArray(q.table) && q.table.length > 0) {
      const cleanRows = q.table
        .map((row) => row.map((cell) => sanitizeForWinAnsi(String(cell ?? ""))))
        .filter((row) => row.some((cell) => cell.length > 0));

      if (cleanRows.length > 0) {
        const colCount = Math.max(...cleanRows.map((r) => r.length));
        const rowH = 22;
        const tableH = cleanRows.length * rowH;
        ensureSpace(tableH + 14);

        const firstColW = Math.min(165, Math.max(115, contentW * 0.28));
        const otherColW = colCount > 1 ? (contentW - firstColW) / (colCount - 1) : contentW;

        const getColX = (cIdx: number) =>
          marginX + (cIdx === 0 ? 0 : firstColW + (cIdx - 1) * otherColW);
        const getColW = (cIdx: number) =>
          colCount === 1 ? contentW : cIdx === 0 ? firstColW : otherColW;

        const topY = y + 2;
        for (let rIdx = 0; rIdx < cleanRows.length; rIdx++) {
          const rowTop = topY - rIdx * rowH;
          const rowBot = rowTop - rowH;
          const row = cleanRows[rIdx] ?? [];

          for (let cIdx = 0; cIdx < colCount; cIdx++) {
            const cellX = getColX(cIdx);
            const cellW = getColW(cIdx);
            const cellText = row[cIdx] ?? "";
            const f = cIdx === 0 || rIdx === 0 ? fontBold : fontRegular;
            const fontSize = cellW < 45 ? 9.5 : 10;

            page.drawRectangle({
              x: cellX,
              y: rowBot,
              width: cellW,
              height: rowH,
              borderColor: rgb(0.2, 0.22, 0.28),
              borderWidth: 0.75,
            });

            if (cellText) {
              const tw = f.widthOfTextAtSize(cellText, fontSize);
              const tx = cellX + Math.max(4, (cellW - tw) / 2);
              const ty = rowBot + (rowH - fontSize) / 2 + 1.5;
              page.drawText(cellText, {
                x: tx,
                y: ty,
                size: fontSize,
                font: f,
                color: rgb(0.06, 0.06, 0.08),
              });
            }
          }
        }
        y = topY - tableH - 12;
      }
    }
    // Render cropped diagram / figure (AI figureBox OR pixel-exact canvas auto-detector fallback)
    const mentionsFigure =
      Boolean(q.hasFigure) ||
      (/\b(figure below|fig\.|shown below|diagram|circuit|sketch|graph)\b/i.test(qText) &&
        !/without\s+figure/i.test(qText));

    if ((q.figureBox || mentionsFigure) && Array.isArray(sourceFiles) && sourceFiles.length > 0) {
      const pageIdx = Math.max(
        0,
        Math.min(sourceFiles.length - 1, Math.round(q.figureBox?.pageIndex ?? 0)),
      );
      const srcFile = sourceFiles[pageIdx];
      if (srcFile) {
        const resolvedBox = q.figureBox ?? (await detectDiagramBoxFromFile(srcFile));
        if (resolvedBox) {
          const figBytes = await cropAndCleanFigurePng(srcFile, resolvedBox);
          if (figBytes) {
            const embeddedFig = await pdfDoc.embedPng(figBytes);
            const maxW = contentW - 36;
            const maxH = 260;
            const scale = Math.min(maxW / embeddedFig.width, maxH / embeddedFig.height, 1);
            const drawW = embeddedFig.width * scale;
            const drawH = embeddedFig.height * scale;
            ensureSpace(drawH + 16);
            y -= 4;
            const figX = marginX + (contentW - drawW) / 2;
            page.drawImage(embeddedFig, {
              x: figX,
              y: y - drawH,
              width: drawW,
              height: drawH,
            });
            y -= drawH + 10;
          }
        }
      }
    }
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