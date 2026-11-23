import { PDFDocument } from "pdf-lib";

async function fileToJpegBytes(file: File): Promise<Uint8Array> {
  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    return new Uint8Array(await file.arrayBuffer());
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 1800;
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
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
  );
  if (!blob) throw new Error("Could not process image.");
  return new Uint8Array(await blob.arrayBuffer());
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