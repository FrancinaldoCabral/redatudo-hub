const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function render(htmlPath, outPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    // Do not inject overrides here to avoid corrupting existing <style> blocks.
    const payload = html;
    // Set viewport to approximate A4 at 96 DPI so CSS units like 100vh/100vw resolve correctly
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

    // Attempt simplified content: extract the main .book div and render a minimal HTML
    let payloadToUse = payload;
    try {
      const m = payload.match(/<div[^>]*class=["']book["'][^>]*>[\s\S]*?<\/div>/i);
      if (m) {
        const bookDiv = m[0];
        const minimalCss = `@page{size:A4;margin:15mm}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#222} .content{padding:0 16px;max-width:800px;margin:0 auto}`;
        payloadToUse = `<!doctype html><html><head><meta charset="utf-8"><style>${minimalCss}</style></head><body>${bookDiv}</body></html>`;
        console.log('DEBUG: using simplified .book payload for rendering');
      } else {
        console.log('DEBUG: .book div not found; using full HTML payload');
      }
    } catch (err) {
      console.warn('DEBUG: error extracting .book div', err && err.message);
    }

    await page.setContent(payloadToUse, { waitUntil: ['domcontentloaded','networkidle2'], timeout: 60000 });
    await page.emulateMediaType('print');
    await page.waitForTimeout(1500);
    // Wait for fonts to be ready (cross-browser safe)
    try {
      await page.evaluate(() => (document.fonts ? (document.fonts.ready) : Promise.resolve()));
    } catch (e) {
      // ignore
    }

    // Debug: collect some runtime metrics to help diagnose empty PDFs
    try {
      const bodyTextLength = await page.evaluate(() => document.body ? document.body.innerText.length : 0);
      const imagesCount = await page.evaluate(() => document.images ? document.images.length : 0);
      const bodyChildCount = await page.evaluate(() => document.body ? document.body.childElementCount : 0);
      const bodyInnerHTMLLength = await page.evaluate(() => document.body ? document.body.innerHTML.length : 0);
      const bodyStyle = await page.evaluate(() => {
        const s = window.getComputedStyle(document.body || document.documentElement);
        return { display: s.display, visibility: s.visibility, height: s.height };
      });
      const firstChildStyle = await page.evaluate(() => {
        const c = document.body && document.body.firstElementChild;
        if (!c) return null;
        const s = window.getComputedStyle(c);
        return { display: s.display, visibility: s.visibility, height: s.height };
      });
      const pageHtml = await page.content();
      const docOuter = await page.evaluate(() => document.documentElement ? document.documentElement.outerHTML.slice(0,200) : '');
      console.log('DEBUG page.body.innerText.length =', bodyTextLength, 'images=', imagesCount);
      console.log('DEBUG page.content() length =', pageHtml.length);
      console.log('DEBUG document.documentElement.outerHTML head slice =', docOuter);
      console.log('DEBUG page.content() head snippet:\n', pageHtml.slice(0, 400));
      const headIdx = pageHtml.indexOf('<head');
      const headCloseIdx = pageHtml.indexOf('</head>');
      const bodyIdx = pageHtml.indexOf('<body');
      console.log('DEBUG indexOf <head =', headIdx, 'indexOf </head> =', headCloseIdx, 'indexOf <body =', bodyIdx);
      if (bodyIdx !== -1) {
        console.log('DEBUG body head snippet:\n', pageHtml.slice(bodyIdx, Math.min(pageHtml.length, bodyIdx + 1200)));
      }
      console.log('DEBUG body.childElementCount =', bodyChildCount, 'body.innerHTML.length =', bodyInnerHTMLLength);
      console.log('DEBUG bodyStyle =', bodyStyle, 'firstChildStyle =', firstChildStyle);
    } catch (e) {
      console.warn('DEBUG: unable to collect page metrics', e && e.message);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    fs.writeFileSync(outPath, pdfBuffer);
    console.log('Saved PDF to', outPath, 'size:', pdfBuffer.length);
  } finally {
    await browser.close();
  }
}

const htmlFile = process.argv[2] || path.join(__dirname, '..', 'ebook-debug-controle-sua-ansiedade-em-15-minutos.html');
const outFile = process.argv[3] || path.join(__dirname, '..', 'tmp', `render-debug-${Date.now()}.pdf`);
try {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  render(htmlFile, outFile).catch(err => {
    console.error('Render error:', err);
    process.exit(1);
  });
} catch (err) {
  console.error(err);
  process.exit(1);
}
