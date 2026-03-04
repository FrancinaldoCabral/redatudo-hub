const fs = require('fs');
const path = require('path');
const { EbookFormatConverterService } = require(path.join(__dirname, '../dist/services/ebook-format-converter.service.js'));

async function main() {
  const root = path.join(__dirname, '..');
  const debugFiles = fs.readdirSync(root).filter(f => f.startsWith('ebook-debug-') && f.endsWith('.html'));
  if (!debugFiles.length) throw new Error('Nenhum arquivo ebook-debug-*.html encontrado na raiz.');

  const src = path.join(root, debugFiles[0]);
  const html = fs.readFileSync(src, 'utf8');

  const override = `\n/* AUTO-INJECT: PDF print overrides to avoid lateral cut */\n.book, .content {\n  width: 100% !important;\n  max-width: calc(100% - 3cm) !important;\n  margin: 0 auto !important;\n  box-sizing: border-box !important;\n  overflow-wrap: break-word !important;\n  background: none !important;\n  padding: 0 !important;\n}\nbody {\n  overflow-x: hidden !important;\n  background: none !important;\n  margin: 0 !important;\n  padding: 0 !important;\n}\n@media print {\n  html, body { margin: 0 !important; padding: 0 !important; }\n  .book, .content { width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }\n  .content, .content * { box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important; }\n}\n`;

  const idx = html.indexOf('</style>');
  if (idx === -1) throw new Error('style tag not found');

  const patched = html.slice(0, idx) + '\n' + override + html.slice(idx);
  const outHtml = path.join(root, `ebook-debug-patched-${debugFiles[0]}`);
  fs.writeFileSync(outHtml, patched, 'utf8');
  console.log('Patched HTML saved to:', outHtml);

  // convert to PDF
  const pdfBuffer = await EbookFormatConverterService.toPDF(patched, 'patched-debug');
  const pdfPath = path.join(root, `tmp/test-export-patched.pdf`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('Patched PDF saved to:', pdfPath);
}

main().catch(e => { console.error(e); process.exit(1); });
