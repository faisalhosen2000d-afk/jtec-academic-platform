import { PDFDocument } from "pdf-lib";

export type PreparedPdfResult = {
  file: File;
  sampled: boolean;
  totalPages?: number;
  sampledPages?: number;
};

export type PdfAnalysisResult =
  | {
      mode: "text";
      extractedText: string;
      totalPages: number;
      scannedPages: number;
    }
  | {
      mode: "images";
      images: File[];
      totalPages: number;
      scannedPages: number;
    }
  | {
      mode: "fallback";
      prepared: PreparedPdfResult;
    };

function pickDistributedIndices(totalPages: number, targetCount: number): number[] {
  if (totalPages <= targetCount) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const indices = new Set<number>([0, totalPages - 1]);
  const step = (totalPages - 1) / Math.max(1, targetCount - 1);
  for (let i = 1; i < targetCount - 1; i++) {
    indices.add(Math.min(totalPages - 1, Math.round(i * step)));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

function pickTextScanPages(totalPages: number): number[] {
  if (totalPages <= 80) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  for (let p = 1; p <= Math.min(6, totalPages); p++) pages.add(p);
  pages.add(Math.max(1, totalPages - 1));
  pages.add(totalPages);

  const distributed = pickDistributedIndices(totalPages, 70);
  for (const idx of distributed) {
    pages.add(idx + 1);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

type PdfOutlineNode = {
  title?: string;
  items?: PdfOutlineNode[];
};

function flattenOutline(nodes: PdfOutlineNode[] | null | undefined, out: string[], limit = 80): void {
  if (!nodes || out.length >= limit) return;
  for (const node of nodes) {
    if (out.length >= limit) break;
    const title = (node.title ?? "").replace(/\s+/g, " ").trim();
    if (title.length >= 2) {
      out.push(title);
    }
    if (node.items && node.items.length > 0) {
      flattenOutline(node.items, out, limit);
    }
  }
}

export async function analyzePdfForAi(file: File): Promise<PdfAnalysisResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { mode: "fallback", prepared: { file, sampled: false } };
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    try {
      const totalPages = pdf.numPages;
      if (totalPages === 0) {
        return { mode: "fallback", prepared: { file, sampled: false } };
      }

      const outlineTitles: string[] = [];
      try {
        const outline = (await pdf.getOutline()) as PdfOutlineNode[] | null;
        flattenOutline(outline, outlineTitles, 80);
      } catch {
        // Ignore missing or malformed outline
      }

      const pagesToScan = pickTextScanPages(totalPages);
      const chunks: string[] = [];
      let totalChars = 0;

      if (outlineTitles.length > 0) {
        const tocBlock = `Bookmarks/Outline: ${outlineTitles.join(" | ")}`;
        chunks.push(tocBlock);
        totalChars += tocBlock.length;
      }

      for (const pageNum of pagesToScan) {
        if (totalChars >= 15800) break;
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const rawText = textContent.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (rawText.length > 0) {
          const perPageCap = pageNum <= 5 ? 550 : 210;
          const snippet = `[P${pageNum}] ${rawText.slice(0, perPageCap)}`;
          chunks.push(snippet);
          totalChars += snippet.length + 1;
        }
      }

      const extractedText = chunks.join("\n").slice(0, 16000).trim();
      if (extractedText.length >= 250) {
        return {
          mode: "text",
          extractedText,
          totalPages,
          scannedPages: pagesToScan.length,
        };
      }

      // Layer 2: Scanned / handwritten PDF fallback -> render up to 4 key pages as lightweight JPEGs
      const visualIndices = pickDistributedIndices(totalPages, Math.min(4, totalPages));
      const images: File[] = [];
      let totalImageBytes = 0;

      for (const idx of visualIndices) {
        const pageNum = idx + 1;
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetScale = Math.min(1.5, 1024 / Math.max(1, baseViewport.width));
        const viewport = page.getViewport({ scale: targetScale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72);
        });

        if (blob && blob.size > 0 && totalImageBytes + blob.size <= 1.8 * 1024 * 1024) {
          images.push(new File([blob], `page-${pageNum}.jpg`, { type: "image/jpeg" }));
          totalImageBytes += blob.size;
        }
      }

      if (images.length > 0) {
        return {
          mode: "images",
          images,
          totalPages,
          scannedPages: images.length,
        };
      }
    } finally {
      await loadingTask.destroy();
    }
  } catch {
    // Fall through to pdf-lib sampler fallback
  }

  return {
    mode: "fallback",
    prepared: await preparePdfForAi(file, 1.8 * 1024 * 1024),
  };
}

export async function preparePdfForAi(
  file: File,
  maxBytes = 1.8 * 1024 * 1024,
): Promise<PreparedPdfResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf || file.size <= maxBytes) {
    return { file, sampled: false };
  }

  try {
    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    if (totalPages === 0) {
      return { file, sampled: false };
    }

    for (const targetCount of [5, 4, 3, 2, 1]) {
      if (targetCount > totalPages && targetCount !== 5) continue;
      const chosen = pickDistributedIndices(totalPages, targetCount);
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(srcDoc, chosen);
      for (const page of copied) {
        outDoc.addPage(page);
      }
      const bytes = await outDoc.save();
      if (bytes.byteLength <= maxBytes) {
        const sampledFile = new File([new Uint8Array(bytes)], file.name, {
          type: "application/pdf",
        });
        return {
          file: sampledFile,
          sampled: true,
          totalPages,
          sampledPages: chosen.length,
        };
      }
    }

    return { file, sampled: false, totalPages };
  } catch {
    return { file, sampled: false };
  }
}

