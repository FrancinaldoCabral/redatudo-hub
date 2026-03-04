#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const puppeteer = require('puppeteer');

async function mmToPx(mm, dpi) {
  return Math.round((mm / 25.4) * dpi);
}

async function processCover(inputPath, outDir) {
  const dpi = 300;
  const bleedMm = 5;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const a4W = await mmToPx(210, dpi);
  const a4H = await mmToPx(297, dpi);
  const bleedPx = await mmToPx(bleedMm, dpi);
  const targetW = a4W + bleedPx * 2;
  const targetH = a4H + bleedPx * 2;
  const printPath = path.join(outDir, `cover-print-${Date.now()}.jpg`);
  const previewPath = path.join(outDir, `cover-preview-${Date.now()}.jpg`);

  await sharp(inputPath)
    .resize(targetW, targetH, { fit: 'cover' })
    .jpeg({ quality: 92 })
    .toFile(printPath);

  await sharp(inputPath)
    .resize(1000, 1500, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toFile(previewPath);

  return { printPath, previewPath, targetW, targetH, bleedPx };
}

async function makePdf(coverPrintPath, inputHtmlPath, outputPdfPath) {
  const html = fs.readFileSync(inputHtmlPath, 'utf8');
  const coverAbs = 'file:///' + path.resolve(coverPrintPath).replace(/\\/g, '/');

  const coverHtml = `\n<div class="cover-page" style="page-break-after: always; width:210mm; height:297mm; overflow:hidden;">\n  <img src="${coverAbs}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;"/>\n</div>\n`;

  // Inject cover at the top of body if possible, otherwise prepend
  let patched = html;
  if (/<body[\s\S]*?>/i.test(html)) {
    patched = html.replace(/<body([\s\S]*?)>/i, (m) => m + '\n' + coverHtml);
  } else {
    patched = coverHtml + html;
  }

  // Add print-safe CSS for A4 + cover
  const extraCss = `\n<style>\n@page { size: A4; margin: 6mm 6mm 6mm 6mm; }\n@media print { .cover-page { width:210mm; height:297mm; } .cover-page img { width:100%; height:100%; object-fit:cover; } }\n</style>\n`;
  if (/<head[\s\S]*?>/i.test(patched)) {
    patched = patched.replace(/<head([\s\S]*?)>/i, (m) => m + '\n' + extraCss);
  } else {
    patched = extraCss + patched;
  }

  const tmpHtml = path.join(process.cwd(), 'tmp', `patched-html-${Date.now()}.html`);
  if (!fs.existsSync(path.dirname(tmpHtml))) fs.mkdirSync(path.dirname(tmpHtml), { recursive: true });
  fs.writeFileSync(tmpHtml, patched, 'utf8');

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(patched, { waitUntil: 'networkidle2' });
  await page.emulateMediaType('print');
  await page.pdf({ path: outputPdfPath, format: 'A4', printBackground: true, margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' } });
  await browser.close();

  return { tmpHtml };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 3) {
    console.log('Usage: node scripts/process-cover-and-export.js <cover-image-path> <input-html-path> <output-pdf-path>');
    process.exit(1);
  }
  const [coverPath, inputHtml, outputPdf] = argv;
  console.log('Processing cover:', coverPath);
  const outDir = path.join(process.cwd(), 'tmp');
  const { printPath } = await processCover(coverPath, outDir);
  console.log('Print-ready cover saved to:', printPath);
  console.log('Generating PDF...');
  const res = await makePdf(printPath, inputHtml, outputPdf);
  console.log('PDF generated at:', outputPdf, 'patched html at', res.tmpHtml);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
