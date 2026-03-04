const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurações
const OUTPUT_FILE = 'code_summary.txt';
const INCLUDE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css', '.scss'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

// Interface para leitura de input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('=== Varredor de Diretórios NodeJS ===');
  console.log('Este script irá varrer recursivamente um diretório e criar um arquivo consolidado com todos os códigos.\n');
  
  const rootDir = await askQuestion('Digite o caminho do diretório raiz (ou pressione Enter para usar o diretório atual): ');
  const targetDir = path.resolve(rootDir.trim() || process.cwd());
  
  try {
    console.log(`\nVarrendo diretório: ${targetDir}`);
    
    if (!fs.existsSync(targetDir)) {
      throw new Error('Diretório não encontrado!');
    }
    
    // Criar o arquivo de saída de forma síncrona para evitar problemas
    const outputPath = path.join(process.cwd(), OUTPUT_FILE);
    const outputStream = fs.createWriteStream(outputPath);
    
    // Escrever cabeçalho
    const timestamp = new Date().toISOString();
    outputStream.write(`=== RESUMO DE CÓDIGO ===\n`);
    outputStream.write(`Diretório raiz: ${targetDir}\n`);
    outputStream.write(`Data da geração: ${timestamp}\n\n`);
    
    // Processar diretórios
    await processDirectory(targetDir, outputStream, 0);
    
    // Fechar o stream corretamente antes de verificar o tamanho
    outputStream.end();
    
    // Esperar o stream terminar de escrever
    await new Promise(resolve => outputStream.on('finish', resolve));
    
    console.log(`\nProcessamento concluído! Arquivo gerado: ${outputPath}`);
    
    // Verificar se o arquivo foi criado
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Tamanho total: ${stats.size} bytes`);
      console.log(`Número de arquivos processados: ${fileCount}`);
    } else {
      console.log('O arquivo de saída não foi criado corretamente.');
    }
    
  } catch (error) {
    console.error('\nErro:', error.message);
  } finally {
    rl.close();
  }
}

let fileCount = 0; // Contador de arquivos processados

async function processDirectory(dirPath, outputStream, depth) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.includes(file)) {
        continue;
      }
      await processDirectory(fullPath, outputStream, depth + 1);
    } else {
      await processFile(fullPath, outputStream, depth);
    }
  }
}

async function processFile(filePath, outputStream, depth) {
  const extension = path.extname(filePath).toLowerCase();
  
  if (!INCLUDE_EXTENSIONS.includes(extension)) {
    return;
  }
  
  console.log(`Processando: ${filePath}`);
  fileCount++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const separator = '='.repeat(80);
    
    outputStream.write(`\n${separator}\n`);
    outputStream.write(`// ARQUIVO: ${relativePath}\n`);
    outputStream.write(`${separator}\n\n`);
    outputStream.write(content);
    outputStream.write('\n\n');
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error.message);
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

main().catch(console.error);