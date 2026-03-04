const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const previewsRoot = path.join(projectRoot, 'tmp', 'template-previews');
const distServicePath = path.join(projectRoot, 'dist', 'services', 'ebook-format-converter.service.js');
const distMarkdownPath = path.join(projectRoot, 'dist', 'templates', 'ebook', 'markdown-template.js');

if (!fs.existsSync(previewsRoot)) {
  throw new Error(`Diretório de previews não encontrado: ${previewsRoot}. Execute antes o script de geração de HTMLs.`);
}

if (!fs.existsSync(distServicePath) || !fs.existsSync(distMarkdownPath)) {
  throw new Error('Não foi possível encontrar os artefatos compilados em dist/. Execute `npm run build` antes de rodar este script.');
}

const { EbookFormatConverterService } = require(distServicePath);
const { EbookProject } = require(distMarkdownPath);

const maxPreviews = Number(process.env.MAX_PREVIEWS) || Number(process.env.MAX_TEMPLATE_PREVIEWS) || Infinity;
const formats = ['pdf', 'epub', 'docx'];

function gatherHtmlFiles(dir) {
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.html'))
    .map(name => path.join(dir, name));
}

function sanitizeProjectTitle(title) {
  if (!title) return 'Projeto';
  return title
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}

async function convertFile(filePath, outputDir) {
  const htmlContent = fs.readFileSync(filePath, 'utf8');
  const baseName = path.basename(filePath, '.html');
  const [projectSlug] = baseName.split('-');
  const projectTitle = sanitizeProjectTitle(projectSlug);

  const project = {
    _id: 'preview',
    title: projectTitle,
    dna: {
      author: 'Visualização Automática',
      genre: 'Preview',
      tone: 'Preview',
      idea: `Preview gerado a partir de ${baseName}`,
      keywords: ['preview']
    },
    metadata: {
      language: 'pt-BR'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sections = [
    {
      _id: `${baseName}-section`,
      type: 'chapter',
      title: 'Conteúdo completo',
      content: htmlContent,
      order: 1
    }
  ];

  for (const format of formats) {
    try {
      const conversion = await EbookFormatConverterService.convert(format, htmlContent, project, sections);
      const destination = path.join(outputDir, `${baseName}.${conversion.extension}`);
      fs.writeFileSync(destination, conversion.buffer);
      console.log(`✅ ${baseName}.${conversion.extension}`);
    } catch (error) {
      console.error(`⚠️ Falha ao converter ${baseName} para ${format}:`, error.message);
    }
  }
}

async function main() {
  const projectDirs = fs.readdirSync(previewsRoot, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (!projectDirs.length) {
    throw new Error('Não foram encontrados projetos em tmp/template-previews');
  }

  let processed = 0;

  outer: for (const projectDir of projectDirs) {
    const htmlDir = path.join(previewsRoot, projectDir);
    const htmlFiles = gatherHtmlFiles(htmlDir);
    if (!htmlFiles.length) continue;

    const artifactsDir = path.join(htmlDir, 'artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });

    for (const htmlFile of htmlFiles) {
      if (processed >= maxPreviews) {
        break outer;
      }

      await convertFile(htmlFile, artifactsDir);
      processed++;
    }
  }

  console.log(`
🎯 Processados ${processed} HTMLs (limite configurado: ${isFinite(maxPreviews) ? maxPreviews : 'ilimitado'}).`);
}

main().catch(error => {
  console.error('❌ Erro ao gerar conversões:', error);
  process.exit(1);
});
