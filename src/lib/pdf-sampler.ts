import { PDFDocument } from "pdf-lib";

export type PreparedPdfResult = {
  file: File;
  sampled: boolean;
  totalPages?: number;
  sampledPages?: number;
};

function pickDistributedIndices(totalPages: number, targetCount: number): number[] {
  if (totalPages <= targetCount) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const indices = new Set<number>([0, totalPages - 1]);
  if (totalPages > 2 && targetCount >= 3) {
    indices.add(1);
  }
  const step = (totalPages - 1) / Math.max(1, targetCount - 1);
  for (let i = 1; i < targetCount - 1; i++) {
    indices.add(Math.min(totalPages - 1, Math.round(i * step)));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export async function preparePdfForAi(
  file: File,
  maxBytes = 3.5 * 1024 * 1024,
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

    for (const targetCount of [10, 7, 5, 3, 2, 1]) {
      if (targetCount > totalPages && targetCount !== 10) continue;
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