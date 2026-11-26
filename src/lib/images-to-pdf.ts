import { PDFDocument, StandardFonts, rgb, type PDFFont, PDFPage } from "pdf-lib";

export type FigureAttachment = {
  file: File;
  questionNumber?: string;
};

export type ExtractedQuestionPaper = {
  headers?: string[];
  time?: string;
  marks?: string;
  instructions?: string[];
  footer?: string;
  questions?: Array<{
    sectionHeader?: string[];
    number?: string;
    text?: string;
    textAfterFigure?: string;
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
    .replace(/\$([^$\r\n]{1,100})\$/g, (_m, inner: string) => inner.trim())
    .replace(/\\times/g, "x")
    .replace(/\\cdot/g, ".")
    .replace(/\\pm/g, "\u00B1")
    .replace(/\\leq?/g, "<=")
    .replace(/\\geq?/g, ">=")
    .replace(/\\neq/g, "!=")
    .replace(/\\circ/g, "\u00B0")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "\\frac{$1}{$2}");
}

type RichSegment =
  | { text: string; kind: "normal" | "sub" | "sup" }
  | { kind: "frac"; num: string; den: string };

function parseInlineScripts(chunk: string): RichSegment[] {
  const segs: RichSegment[] = [];
  const regex = /([A-Za-z0-9)\]])(?:_\{([^}]+)\}|_([A-Za-z0-9+-])|\^\{([^}]+)\}|\^([A-Za-z0-9+-]))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(chunk)) !== null) {
    const baseChar = match[1] ?? "";
    if (match.index > lastIdx) {
      segs.push({ text: chunk.slice(lastIdx, match.index) + baseChar, kind: "normal" });
    } else if (baseChar) {
      segs.push({ text: baseChar, kind: "normal" });
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
  if (lastIdx < chunk.length) {
    segs.push({ text: chunk.slice(lastIdx), kind: "normal" });
  }
  return segs;
}

function parseRichSegments(line: string): RichSegment[] {
  const result: RichSegment[] = [];
  const fracRegex = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = fracRegex.exec(line)) !== null) {
    if (m.index > lastIdx) {
      result.push(...parseInlineScripts(line.slice(lastIdx, m.index)));
    }
    result.push({
      kind: "frac",
      num: (m[1] ?? "").trim(),
      den: (m[2] ?? "").trim(),
    });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < line.length) {
    result.push(...parseInlineScripts(line.slice(lastIdx)));
  }
  return result;
}

function measureRichTextWidth(line: string, font: PDFFont, size: number): number {
  const subSize = size * 0.72;
  const fracSize = size * 0.76;
  let total = 0;
  for (const seg of parseRichSegments(line)) {
    if (seg.kind === "frac") {
      const nw = font.widthOfTextAtSize(seg.num, fracSize);
      const dw = font.widthOfTextAtSize(seg.den, fracSize);
      total += Math.max(nw, dw) + 6;
    } else {
      total += font.widthOfTextAtSize(seg.text, seg.kind === "normal" ? size : subSize);
    }
  }
  return total;
}

function drawRichTextLine(
  page: PDFPage,
  line: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
): void {
  const subSize = opts.size * 0.72;
  const fracSize = opts.size * 0.76;
  let cursorX = opts.x;
  for (const seg of parseRichSegments(line)) {
    if (seg.kind === "frac") {
      const nw = opts.font.widthOfTextAtSize(seg.num, fracSize);
      const dw = opts.font.widthOfTextAtSize(seg.den, fracSize);
      const boxW = Math.max(nw, dw) + 4;
      const barY = opts.y + opts.size * 0.28;
      page.drawText(seg.num, {
        x: cursorX + (boxW - nw) / 2,
        y: barY + 2.0,
        size: fracSize,
        font: opts.font,
        color: opts.color,
      });
      page.drawLine({
        start: { x: cursorX + 1, y: barY },
        end: { x: cursorX + boxW - 1, y: barY },
        thickness: 0.65,
        color: opts.color,
      });
      page.drawText(seg.den, {
        x: cursorX + (boxW - dw) / 2,
        y: barY - fracSize - 1.0,
        size: fracSize,
        font: opts.font,
        color: opts.color,
      });
      cursorX += boxW + 2;
      continue;
    }
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
  const protectedText = text.replace(
    /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
    (_m, a: string, b: string) => `\\frac{${a.replace(/\s+/g, "\u00A0")}}{${b.replace(/\s+/g, "\u00A0")}}`,
  );
  const paragraphs = protectedText.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para
      .trim()
      .split(/[ \t]+/)
      .filter(Boolean)
      .map((w) => w.replace(/\u00A0/g, " "));
    if (words.length === 0) continue;

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

type FormattedQuestionLine = {
  text: string;
  indent: number;
  hasFrac: boolean;
};

function layoutQuestionParagraphs(
  qNum: string,
  qText: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  startIndented = false,
): FormattedQuestionLine[] {
  const normalized = qText
    .replace(/\s+(?=\([b-z]\)\s)/g, "\n")
    .replace(/\s+(?=\((?:ii|iii|iv|v)\)\s)/g, "\n");

  const rawParas = normalized
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const numPrefix = qNum ? `${qNum} ` : "";
  const baseNumW = font.widthOfTextAtSize("1. ", size);
  const numIndent = numPrefix ? font.widthOfTextAtSize(numPrefix, size) : startIndented ? baseNumW : 0;
  const subRomanIndent = numIndent + font.widthOfTextAtSize("(b) ", size);

  const output: FormattedQuestionLine[] = [];

  rawParas.forEach((para, pIdx) => {
    const isRoman = /^\((?:i|ii|iii|iv|v|vi)\)/i.test(para);
    const isAlpha = /^\([a-z]\)/i.test(para);
    const firstLinePrefix = pIdx === 0 && !startIndented ? numPrefix : "";
    const indent =
      pIdx === 0 && !startIndented
        ? 0
        : isRoman
          ? subRomanIndent
          : isAlpha
            ? numIndent
            : numIndent;

    const fullPara = `${firstLinePrefix}${para}`;
    const availW = Math.max(120, maxWidth - indent);
    const wrapped = wrapLines(fullPara, font, size, availW);

    wrapped.forEach((ln, wIdx) => {
      const lineIndent = pIdx === 0 && !startIndented && wIdx > 0 ? numIndent : indent;
      output.push({
        text: ln,
        indent: lineIndent,
        hasFrac: /\\frac\s*\{/.test(ln),
      });
    });
  });

  return output;
}

function cleanCanvasPaperBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): Uint8Array | null {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;

  const total = w * h;
  const lumBuf = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const r = src[o] ?? 255;
    const g = src[o + 1] ?? 255;
    const b = src[o + 2] ?? 255;
    lumBuf[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let brightSum = 0;
  let brightCount = 0;
  for (let i = 0; i < total; i++) {
    const v = lumBuf[i] ?? 255;
    if (v >= 150) {
      brightSum += v;
      brightCount++;
    }
  }
  const bgMean = brightCount > 0 ? brightSum / brightCount : 230;
  const whiteCut = Math.max(185, Math.min(236, bgMean - 10));
  const blackCut = Math.min(145, whiteCut - 45);

  const amount = 0.95;
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

      let out: number;
      if (sharp >= whiteCut) {
        out = 255;
      } else if (sharp <= blackCut) {
        out = 0;
      } else {
        const t = (sharp - blackCut) / (whiteCut - blackCut);
        out = Math.round(Math.pow(t, 2.2) * 255);
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

async function cleanFullFigureFilePng(file: File): Promise<Uint8Array | null> {
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

    const upScale = natW < 650 ? 2 : 1.25;
    const outW = Math.round(natW * upScale);
    const outH = Math.round(natH * upScale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    return cleanCanvasPaperBackground(ctx, outW, outH);
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
      box.height < 20
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

    const padX = 6;
    const padY = 0;
    const nx1 = Math.max(0, Math.min(1000, box.x - padX));
    const ny1 = Math.max(0, Math.min(1000, box.y - padY));
    const nx2 = Math.max(nx1 + 20, Math.min(1000, box.x + box.width + padX));
    const ny2 = Math.max(ny1 + 20, Math.min(1000, box.y + box.height + padY));

    const sx = Math.round((nx1 / 1000) * natW);
    const sy = Math.round((ny1 / 1000) * natH);
    const sw = Math.max(10, Math.round(((nx2 - nx1) / 1000) * natW));
    const sh = Math.max(10, Math.round(((ny2 - ny1) / 1000) * natH));

    const upScale = sw < 900 ? 3 : sw < 1400 ? 2 : 1.5;
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
  figureAttachments?: FigureAttachment[],
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const a4W = 595.28;
  const a4H = 841.89;

  const questions = extracted.questions ?? [];
  const hasTables = questions.some((q) => Array.isArray(q.table) && q.table.length > 0);
  const userFigList = (figureAttachments ?? []).filter((fa) => fa && fa.file);
  const figureCount = Math.max(
    questions.filter((q) => Boolean(q.figureBox)).length,
    userFigList.length,
  );
  const isSingleSheet = (sourceFiles?.length ?? 1) <= 1 && !hasTables && questions.length <= 10;

  const totalChars = questions.reduce(
    (sum, q) => sum + (q.text?.length ?? 0) + (q.textAfterFigure?.length ?? 0),
    0,
  );
  const effectiveLoad = totalChars + figureCount * 380;
  const scaleFactor = isSingleSheet
    ? effectiveLoad > 2700
      ? 0.85
      : effectiveLoad > 2200
        ? 0.90
        : 0.95
    : 1;

  const marginX = isSingleSheet ? 38 : 50;
  const marginTop = isSingleSheet ? 36 : 48;
  const marginBottom = isSingleSheet ? 26 : 44;
  const contentW = a4W - marginX * 2;
  const bodySize = isSingleSheet ? 9.5 * scaleFactor : 10.5;
  const lineStep = isSingleSheet ? 11.3 * scaleFactor : 14.5;
  const questionTextMaxW = contentW - 10;

  let page = pdfDoc.addPage([a4W, a4H]);
  let y = a4H - marginTop;

  const ensureSpace = (needed: number) => {
    if (y - needed < marginBottom) {
      page = pdfDoc.addPage([a4W, a4H]);
      y = a4H - marginTop;
    }
  };

  // 1. Centered University / College Headers
  const headers = (extracted.headers ?? []).map(sanitizeForWinAnsi).filter(Boolean);
  headers.forEach((line, idx) => {
    const size = idx === 0 ? (isSingleSheet ? 12.5 : 13.5) : isSingleSheet ? 9.7 : 11;
    const wrapped = wrapLines(line, fontBold, size, contentW);
    for (const wLine of wrapped) {
      ensureSpace(size + 3);
      const w = fontBold.widthOfTextAtSize(wLine, size);
      page.drawText(wLine, {
        x: Math.max(marginX, (a4W - w) / 2),
        y,
        size,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= size + 2.6;
    }
  });

  y -= 1.5;

  // 2. Time (left) & Full Marks (right)
  const timeStr = sanitizeForWinAnsi(extracted.time ?? "");
  const marksStr = sanitizeForWinAnsi(extracted.marks ?? "");
  if (timeStr || marksStr) {
    ensureSpace(14);
    const metaSize = isSingleSheet ? 9.5 : 10.5;
    if (timeStr) {
      page.drawText(timeStr, {
        x: marginX,
        y,
        size: metaSize,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.07),
      });
    }
    if (marksStr) {
      const mw = fontBold.widthOfTextAtSize(marksStr, metaSize);
      page.drawText(marksStr, {
        x: a4W - marginX - mw,
        y,
        size: metaSize,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.07),
      });
    }
    y -= metaSize + 3.2;
  }

  // 3. Centered Bold Exam Instructions
  const rawInstructions = (extracted.instructions ?? []).map(sanitizeForWinAnsi).filter(Boolean);
  for (const inst of rawInstructions) {
    if (/^part\s*:\s*[a-z]$/i.test(inst)) continue;
    const instSize = isSingleSheet ? 9.3 : 10.2;
    const lines = wrapLines(inst, fontBold, instSize, contentW);
    for (const ln of lines) {
      ensureSpace(instSize + 2.5);
      const lw = measureRichTextWidth(ln, fontBold, instSize);
      drawRichTextLine(page, ln, {
        x: Math.max(marginX, (a4W - lw) / 2),
        y,
        size: instSize,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.07),
      });
      y -= instSize + 2.4;
    }
  }
  if (rawInstructions.length > 0) y -= 1.5;

  const drawQuestionLineBlock = (lines: FormattedQuestionLine[], qNum: string) => {
    lines.forEach((fl, idx) => {
      if (fl.hasFrac && idx > 0) y -= 2.5;
      const isBoldNumberPrefix = idx === 0 && qNum.length > 0 && fl.text.startsWith(qNum);
      if (isBoldNumberPrefix) {
        const rest = fl.text.slice(qNum.length);
        page.drawText(qNum, {
          x: marginX + fl.indent,
          y,
          size: bodySize,
          font: fontBold,
          color: rgb(0.05, 0.05, 0.07),
        });
        const numW = fontBold.widthOfTextAtSize(qNum, bodySize);
        drawRichTextLine(page, rest, {
          x: marginX + fl.indent + numW,
          y,
          size: bodySize,
          font: fontRegular,
          color: rgb(0.05, 0.05, 0.07),
        });
      } else {
        drawRichTextLine(page, fl.text, {
          x: marginX + fl.indent,
          y,
          size: bodySize,
          font: fontRegular,
          color: rgb(0.05, 0.05, 0.07),
        });
      }
      y -= fl.hasFrac ? lineStep + 3.5 : lineStep;
    });
  };

  // Track which user-uploaded close-up figure snips have been placed
  const usedSnipIndices = new Set<number>();

  // 4. Questions with Centered Part Headers, Indented Sub-questions, Inline Diagrams, and Bottom-Right Marks
  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const q = questions[qIdx]!;
    const secHeaders: string[] = Array.isArray(q.sectionHeader)
      ? q.sectionHeader.map(sanitizeForWinAnsi).filter(Boolean)
      : [];

    let qText = sanitizeForWinAnsi(q.text ?? "");
    let qAfterText = sanitizeForWinAnsi(q.textAfterFigure ?? "");
    const qNum = sanitizeForWinAnsi(q.number ?? "");
    const qMarks = sanitizeForWinAnsi(q.marks ?? "");

    // Match user-provided close-up figure snip for this question (by Q# or auto order)
    const qDigits = qNum.replace(/[^0-9]/g, "");
    let matchedSnipIdx = -1;
    if (qDigits) {
      matchedSnipIdx = userFigList.findIndex((fa, idx) => {
        if (usedSnipIndices.has(idx)) return false;
        const tagDigits = (fa.questionNumber ?? "").replace(/[^0-9]/g, "");
        return tagDigits.length > 0 && tagDigits === qDigits;
      });
    }
    if (matchedSnipIdx === -1 && (q.figureBox || q.hasFigure)) {
      matchedSnipIdx = userFigList.findIndex(
        (fa, idx) => !usedSnipIndices.has(idx) && !(fa.questionNumber ?? "").replace(/[^0-9]/g, ""),
      );
    }
    const matchedSnip = matchedSnipIdx >= 0 ? userFigList[matchedSnipIdx] : undefined;
    if (matchedSnipIdx >= 0) usedSnipIndices.add(matchedSnipIdx);

    // Safety fallback: if a question has a figure (AI box OR user snip) and "(b) ..." was kept inside qText after "(a) ... figure:", split it below the figure
    if ((q.figureBox || matchedSnip) && !qAfterText && /\(a\)[\s\S]*?(?:figure|diagram|sketch)[\s\S]*?\n\s*\(b\)/i.test(qText)) {
      const splitMatch = qText.match(/^([\s\S]*?)\n\s*(\(b\)[\s\S]*)$/i);
      if (splitMatch) {
        qText = (splitMatch[1] ?? "").trim();
        qAfterText = (splitMatch[2] ?? "").trim();
      }
    }

    const embeddedPartMatch = qText.match(
      /^(Part\s*:\s*[A-Z])\s*(?:\r?\n|\s+)(\(Answer[^)\r\n]+\))\s*(?:\r?\n|\s+)?([\s\S]*)$/i,
    );
    if (embeddedPartMatch) {
      if (secHeaders.length === 0) {
        if (embeddedPartMatch[1]) secHeaders.push(embeddedPartMatch[1].trim());
        if (embeddedPartMatch[2]) secHeaders.push(embeddedPartMatch[2].trim());
      }
      qText = (embeddedPartMatch[3] ?? "").trim();
    }

    const trailingPartMatch = qText.match(
      /([\s\S]*?)\s*(Part\s*:\s*[A-Z])\s*(?:\r?\n|\s+)(\(Answer[^)\r\n]+\))\s*$/i,
    );
    const nextQuestionExtraHeader: string[] = [];
    if (trailingPartMatch) {
      qText = (trailingPartMatch[1] ?? "").trim();
      if (trailingPartMatch[2]) nextQuestionExtraHeader.push(trailingPartMatch[2].trim());
      if (trailingPartMatch[3]) nextQuestionExtraHeader.push(trailingPartMatch[3].trim());
    }
    if (nextQuestionExtraHeader.length > 0 && questions[qIdx + 1]) {
      const nextQ = questions[qIdx + 1]!;
      nextQ.sectionHeader = [...nextQuestionExtraHeader, ...(nextQ.sectionHeader ?? [])];
    }

    if (secHeaders.length > 0) {
      y -= 2.5;
      const partSize = isSingleSheet ? 9.4 : 10.5;
      for (const sh of secHeaders) {
        ensureSpace(partSize + 3);
        const sw = fontBold.widthOfTextAtSize(sh, partSize);
        page.drawText(sh, {
          x: Math.max(marginX, (a4W - sw) / 2),
          y,
          size: partSize,
          font: fontBold,
          color: rgb(0.05, 0.05, 0.07),
        });
        y -= partSize + 2.3;
      }
      y -= 1;
    }

    if (!qNum && !qText && !qAfterText && (!q.table || q.table.length === 0) && !q.figureBox && !matchedSnip) continue;

    const beforeLines = layoutQuestionParagraphs(
      qNum,
      qText,
      fontRegular,
      bodySize,
      questionTextMaxW,
      false,
    );

    const totalTextH = beforeLines.reduce(
      (acc, fl) => acc + (fl.hasFrac ? lineStep + 5 : lineStep),
      0,
    );
    ensureSpace(Math.max(15, totalTextH + (qMarks ? 10 : 2)));

    drawQuestionLineBlock(beforeLines, qNum);
    let lastRenderedLines = beforeLines;

    // Render diagram: prefer user's high-res close-up screenshot if attached, otherwise AI cropped figureBox
    let figBytes: Uint8Array | null = null;
    if (matchedSnip) {
      figBytes = await cleanFullFigureFilePng(matchedSnip.file);
    } else if (q.figureBox && Array.isArray(sourceFiles) && sourceFiles.length > 0) {
      const pageIdx = Math.max(
        0,
        Math.min(sourceFiles.length - 1, Math.round(q.figureBox.pageIndex ?? 0)),
      );
      const srcFile = sourceFiles[pageIdx];
      if (srcFile) {
        figBytes = await cropAndCleanFigurePng(srcFile, q.figureBox);
      }
    }

    if (figBytes) {
      const embeddedFig = await pdfDoc.embedPng(figBytes);
      const maxW = isSingleSheet ? Math.min(contentW - 45, 285) : contentW - 40;
      const maxH = isSingleSheet ? 96 : 240;
      const scale = Math.min(maxW / embeddedFig.width, maxH / embeddedFig.height, 1.35);
      const drawW = embeddedFig.width * scale;
      const drawH = embeddedFig.height * scale;
      ensureSpace(drawH + 10);
      y -= 2;
      const figX = marginX + (contentW - drawW) / 2;
      page.drawImage(embeddedFig, {
        x: figX,
        y: y - drawH,
        width: drawW,
        height: drawH,
      });
      y -= drawH + 5;
    }

    // Render sub-questions that appear BELOW the diagram
    if (qAfterText) {
      const afterLines = layoutQuestionParagraphs(
        "",
        qAfterText,
        fontRegular,
        bodySize,
        questionTextMaxW,
        true,
      );
      const afterH = afterLines.reduce(
        (acc, fl) => acc + (fl.hasFrac ? lineStep + 5 : lineStep),
        0,
      );
      ensureSpace(Math.max(14, afterH));
      drawQuestionLineBlock(afterLines, "");
      if (afterLines.length > 0) {
        lastRenderedLines = afterLines;
      }
    }

    // Bottom-right marks aligned to right margin
    if (qMarks) {
      const mw = fontRegular.widthOfTextAtSize(qMarks, bodySize);
      const lastLine = lastRenderedLines[lastRenderedLines.length - 1];
      const lastLineEndX = lastLine
        ? marginX + lastLine.indent + measureRichTextWidth(lastLine.text, fontRegular, bodySize)
        : 0;
      const fitsOnLastLine = lastLine && lastLineEndX + 14 < a4W - marginX - mw;
      const markY = fitsOnLastLine ? y + lineStep : y + 1.5;
      page.drawText(qMarks, {
        x: a4W - marginX - mw,
        y: markY,
        size: bodySize,
        font: fontRegular,
        color: rgb(0.05, 0.05, 0.07),
      });
      if (!fitsOnLastLine) {
        y -= lineStep * 0.55;
      }
    }

    y -= isSingleSheet ? 6.5 : 9;

    // Render bordered grid table if present
    if (Array.isArray(q.table) && q.table.length > 0) {
      const cleanRows = q.table
        .map((row) => row.map((cell) => sanitizeForWinAnsi(String(cell ?? ""))))
        .filter((row) => row.some((cell) => cell.length > 0));

      if (cleanRows.length > 0) {
        const colCount = Math.max(...cleanRows.map((r) => r.length));
        const rowH = 21;
        const tableH = cleanRows.length * rowH;
        ensureSpace(tableH + 12);

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
        y = topY - tableH - 10;
      }
    }
  }

  // Optional centered footer
  const footerStr = sanitizeForWinAnsi(extracted.footer ?? "");
  if (footerStr) {
    const fw = fontBold.widthOfTextAtSize(footerStr, 9.5);
    const footerY = Math.max(16, y - 2);
    page.drawText(footerStr, {
      x: Math.max(marginX, (a4W - fw) / 2),
      y: footerY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.07),
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