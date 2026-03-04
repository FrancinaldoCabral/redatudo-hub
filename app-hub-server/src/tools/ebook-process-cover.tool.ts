import sharp from "sharp";
import fs from "fs";
import path from "path";

function mmToPx(mm: number, dpi: number) {
  return Math.round((mm / 25.4) * dpi);
}

export interface ProcessCoverOptions {
  dpi?: number; // e.g., 300
  bleedMm?: number; // e.g., 5
  outputDir?: string;
  printFilename?: string;
  previewFilename?: string;
}

export async function processCover(inputPath: string, opts: ProcessCoverOptions = {}) {
  const dpi = opts.dpi ?? 300;
  const bleedMm = opts.bleedMm ?? 5; // 5mm default bleed
  const outputDir = opts.outputDir ?? path.join(process.cwd(), "tmp");
  const printFilename = opts.printFilename ?? `cover-print-${Date.now()}.jpg`;
  const previewFilename = opts.previewFilename ?? `cover-preview-${Date.now()}.jpg`;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const a4WidthPx = mmToPx(210, dpi);
  const a4HeightPx = mmToPx(297, dpi);
  const bleedPx = mmToPx(bleedMm, dpi);

  const targetWidth = a4WidthPx + bleedPx * 2;
  const targetHeight = a4HeightPx + bleedPx * 2;

  const printPath = path.join(outputDir, printFilename);
  const previewPath = path.join(outputDir, previewFilename);

  // Use sharp to resize with cover fit (object-fit: cover)
  await sharp(inputPath)
    .resize(targetWidth, targetHeight, { fit: "cover" })
    .jpeg({ quality: 92 })
    .toFile(printPath);

  // Create a smaller preview (web) version
  await sharp(inputPath)
    .resize(1000, 1500, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toFile(previewPath);

  return {
    printPath,
    previewPath,
    width: targetWidth,
    height: targetHeight,
    dpi,
    bleedPx,
  };
}

export default processCover;
