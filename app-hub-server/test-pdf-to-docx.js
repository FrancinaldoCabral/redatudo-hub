/**
 * Teste direto do endpoint Python de conversão PDF→DOCX
 * Uso: node test-pdf-to-docx.js
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const CONVERTER_URL = process.env.DOCX_CONVERTER_URL || 'http://localhost:8000';
const PDF_PATH = './controle-sua-ansiedade-em-15-minutos.pdf';
const OUTPUT_PATH = './controle-sua-ansiedade-em-15-minutos-convertido.docx';

async function testConversion() {
  console.log('🔍 Testando conversão PDF→DOCX...');
  console.log(`📁 PDF de entrada: ${PDF_PATH}`);
  console.log(`🌐 Servidor: ${CONVERTER_URL}`);
  
  try {
    // 1. Verificar health do serviço
    console.log('\n1️⃣ Verificando saúde do serviço...');
    const healthResponse = await axios.get(`${CONVERTER_URL}/health`, { timeout: 5000 });
    console.log(`✅ Health check OK: ${JSON.stringify(healthResponse.data)}`);
    
    // 2. Ler o PDF
    console.log('\n2️⃣ Lendo arquivo PDF...');
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error(`Arquivo não encontrado: ${PDF_PATH}`);
    }
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    console.log(`✅ PDF lido: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    // 3. Criar FormData e enviar
    console.log('\n3️⃣ Enviando para conversão...');
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: 'input.pdf',
      contentType: 'application/pdf'
    });
    
    const startTime = Date.now();
    const response = await axios.post(`${CONVERTER_URL}/convert`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      responseType: 'arraybuffer',
      timeout: 120000 // 2 minutos
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Conversão concluída em ${duration}s`);
    console.log(`📦 DOCX recebido: ${(response.data.length / 1024).toFixed(2)} KB`);
    
    // 4. Salvar resultado
    console.log('\n4️⃣ Salvando DOCX...');
    fs.writeFileSync(OUTPUT_PATH, Buffer.from(response.data));
    console.log(`✅ DOCX salvo: ${OUTPUT_PATH}`);
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - PDF entrada: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   - DOCX saída: ${(response.data.length / 1024).toFixed(2)} KB`);
    console.log(`   - Tempo: ${duration}s`);
    
  } catch (error) {
    console.error('\n❌ Erro no teste:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${error.response.data}`);
    } else if (error.request) {
      console.error(`   Sem resposta do servidor`);
      console.error(`   URL: ${CONVERTER_URL}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testConversion();
