export interface CompressionResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
  savedPercent: number;
}

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
const MIN_IMAGE_SIZE_BYTES = 350 * 1024; // 350 KB
const MAX_IMAGE_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image."));
    };
    img.src = url;
  });
}

export async function compressFileForUpload(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    compressed: false,
    originalSize: file.size,
    finalSize: file.size,
    savedPercent: 0,
  };

  if (typeof window === "undefined") return unchanged;
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type.toLowerCase())) return unchanged;
  if (file.size < MIN_IMAGE_SIZE_BYTES) return unchanged;

  try {
    const img = await loadImage(file);
    const { naturalWidth: width, naturalHeight: height } = img;
    if (!width || !height) return unchanged;

    let targetW = width;
    let targetH = height;
    const longest = Math.max(width, height);

    if (longest > MAX_IMAGE_DIMENSION) {
      const ratio = MAX_IMAGE_DIMENSION / longest;
      targetW = Math.round(width * ratio);
      targetH = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    // White background so transparent PNGs stay clean when saved as JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || blob.size >= file.size * 0.92) {
      return unchanged;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const compressedFile = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const savedPercent = Math.max(
      1,
      Math.round(((file.size - compressedFile.size) / file.size) * 100),
    );

    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      finalSize: compressedFile.size,
      savedPercent,
    };
  } catch {
    return unchanged;
  }
}