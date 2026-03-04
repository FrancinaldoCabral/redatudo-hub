const fs = require('fs');
const path = require('path');
const { EbookFormatConverterService } = require(path.join(__dirname, '../dist/services/ebook-format-converter.service.js'));

async function main() {
  // Usar HTML debug já gerado na raiz (arquivo existente)
  const debugFiles = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.startsWith('ebook-debug-') && f.endsWith('.html'));
  if (!debugFiles.length) throw new Error('Nenhum arquivo ebook-debug-*.html encontrado na raiz. Gere via exportação primeiro.');

  const htmlFile = path.join(__dirname, '..', debugFiles[0]);
  const htmlContent = fs.readFileSync(htmlFile, 'utf8');

  // Título extraído do arquivo ou nome genérico
  const title = path.basename(htmlFile).replace(/^ebook-debug-/, '').replace(/\.html$/, '').replace(/-/g, ' ');

  // Converter para PDF
  console.log('Gerando PDF a partir de:', htmlFile);
  const pdfBuffer = await EbookFormatConverterService.toPDF(htmlContent, title);
  const pdfPath = path.join(__dirname, `../tmp/test-export-${title.replace(/\s+/g, '_')}.pdf`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('PDF gerado em:', pdfPath);
}

main().catch(err => {
  console.error('Erro no teste de exportação PDF:', err);
  process.exit(1);
});
