const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

async function run() {
  const sharp = require('sharp');

  const src = process.argv[2] || path.join(__dirname, '..', 'tmp', 'test-cover-source.jpg');
  const debugHtmlPath = process.argv[3] || path.join(__dirname, '..', 'ebook-debug-controle-sua-ansiedade-em-15-minutos.html');
  const outHtmlPath = process.argv[4] || path.join(__dirname, '..', 'tmp', 'ebook-debug-test-cover.html');
  const outPdfPath = process.argv[5] || path.join(__dirname, '..', 'tmp', `render-test-cover-${Date.now()}.pdf`);

  if (!fs.existsSync(src)) {
    console.error('Source image not found:', src);
    console.error('Save the image you attached as:', src);
    process.exit(1);
  }

  if (!fs.existsSync(debugHtmlPath)) {
    console.error('Debug HTML not found:', debugHtmlPath);
    process.exit(1);
  }

  // Dimensions for 20.87cm x 29.70cm at 300 DPI
  const dpi = 300;
  const widthCm = 20.87; // from your LibreOffice test
  const heightCm = 29.70;
  const pxPerCm = dpi / 2.54; // dpi per inch / cm per inch
  const targetW = Math.round(widthCm * pxPerCm);
  const targetH = Math.round(heightCm * pxPerCm);

  console.log('Resizing/cropping to', targetW, 'x', targetH, 'px');

  const tmpOut = path.join(__dirname, '..', 'tmp', `cover-print-test-${Date.now()}.jpg`);
  await sharp(src)
    .resize(targetW, targetH, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 92 })
    .toFile(tmpOut);

  const imgBuf = fs.readFileSync(tmpOut);
  const dataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;

  // Load debug HTML and replace first cover image src
  let html = fs.readFileSync(debugHtmlPath, 'utf8');

  // Try to replace an <img> inside [data-section-type="cover"] first
  const replaced = html.replace(/(<div[^>]*data-section-type=["']cover["'][\s\S]*?<img[^>]*src=["'])([^"']+)(["'][^>]*>)/i, `$1${dataUri}$3`);
  if (replaced === html) {
    // fallback: replace any cover-print filename
    html = html.replace(/src=["'][^"']*cover-print[^"']*["']/i, `src="${dataUri}"`);
  } else {
    html = replaced;
  }

  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('Wrote test HTML with embedded cover to', outHtmlPath);

  // Call render script to produce PDF
  const nodeBin = process.execPath;
  const renderScript = path.join(__dirname, 'render-debug-html.js');
  const args = [renderScript, outHtmlPath, outPdfPath];
  console.log('Rendering PDF to', outPdfPath);
  const res = spawnSync(nodeBin, args, { stdio: 'inherit' });
  if (res.error) {
    console.error('Error running render script:', res.error);
    process.exit(1);
  }

  console.log('Done. PDF written to:', outPdfPath);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
