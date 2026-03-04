const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Helpers
function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return acc;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function sanitizeFilename(value) {
  return value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function gatherTemplateFiles(baseDir) {
  const files = [];
  const stack = [baseDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    entries.forEach(entry => {
      const resolved = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(resolved);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(resolved);
      }
    });
  }

  return files;
}

function loadTemplateFromFile(filePath) {
  const exported = require(filePath);
  const template = Object.values(exported).find(value => {
    return value && typeof value === 'object' && 'genre' in value && 'tone' in value;
  });
  if (!template) {
    throw new Error(`Não foi possível encontrar template em ${filePath}`);
  }
  return template;
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const env = parseEnvFile(path.join(projectRoot, '.env'));
  const mongoUrl = process.env.MONGO_URL || env.MONGO_URL;

  if (!mongoUrl) {
    throw new Error('Variável MONGO_URL não encontrada no ambiente ou no .env');
  }

  const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db('redatudo-server');

  const projects = await db.collection('ebookProjects').find({}).limit(1).toArray();
  if (!projects.length) {
    throw new Error('Nenhum projeto encontrado no banco de dados');
  }

  const project = projects[0];
  const projectId = project._id.toString();
  const sections = await db
    .collection('ebookSections')
    .find({ projectId })
    .sort({ order: 1 })
    .toArray();

  if (!sections.length) {
    throw new Error(`Projeto ${projectId} não possui seções`);
  }

  const distTemplatesDir = path.join(projectRoot, 'dist', 'templates', 'ebook', 'templates');
  if (!fs.existsSync(distTemplatesDir)) {
    throw new Error('Diretório dist/templates/ebook/templates não encontrado. Execute npm run build primeiro.');
  }

  const templateFiles = gatherTemplateFiles(distTemplatesDir);
  const { applyVariablesToCSS, normalizeTemplateKey } = require(path.join(projectRoot, 'dist', 'templates', 'ebook', 'utils'));
  const { EbookContentWrapperService } = require(path.join(projectRoot, 'dist', 'services', 'ebook-content-wrapper.service'));

  const projectDirName = sanitizeFilename(project.title || 'projeto');
  const outputDir = path.join(projectRoot, 'tmp', 'template-previews', projectDirName);
  fs.mkdirSync(outputDir, { recursive: true });

  let generated = 0;

  for (const filePath of templateFiles) {
    const template = loadTemplateFromFile(filePath);
    const finalCSS = applyVariablesToCSS(template.baseCSS, template.defaultVars);

    const designConcept = {
      globalCSS: finalCSS,
      containerStructure: '<div class="book"><div class="chapter"><div class="content">{{CONTENT}}</div></div></div>',
      wrapperClasses: {
        book: 'book',
        chapter: 'chapter',
        content: 'content'
      },
      fonts: {
        primary: template.defaultVars.fontPrimary,
        headings: template.defaultVars.fontHeadings,
        code: template.defaultVars.fontCode
      },
      needsBackgroundImage: false,
      backgroundImagePrompt: null,
      designNotes: template.description
    };

    let html = EbookContentWrapperService.wrapContent(sections, designConcept, project.title);
    html = EbookContentWrapperService.addMetadata(html, {
      author: project.dna?.author,
      description: project.dna?.idea,
      keywords: project.dna?.keywords,
      language: project.metadata?.language || 'pt-BR'
    });
    html = EbookContentWrapperService.optimizeForPrint(html);

    const key = normalizeTemplateKey(template.genre, template.tone);
    const fileName = `${sanitizeFilename(project.title)}-${key}.html`;
    const destination = path.join(outputDir, fileName);
    fs.writeFileSync(destination, html, 'utf8');

    generated++;
  }

  console.log(`✅ ${generated} HTMLs gerados e armazenados em ${outputDir}`);
  await client.close();
}

main().catch(error => {
  console.error('❌ Erro na geração de HTMLs:', error);
  process.exit(1);
});
