# Integração Convertio para Conversão DOCX (Opcional)

## Visão Geral

Para tornar o DOCX **idêntico ao PDF** em termos de layout e design, é recomendado usar a API do Convertio.io que oferece:

- ✅ Conversão PDF → DOCX com layout preservado
- ✅ Suporte a estilos CSS complexos
- ✅ Preservação de imagens e formatação
- ✅ API simples e confiável

---

## Por Que Convertio?

### Limitações do Gerador DOCX Nativo

O template DOCX nativo (biblioteca `docx`) tem limitações:
- Suporta apenas estilos básicos
- Dificuldade em replicar designs complexos de CSS
- Imagens requerem processamento especial
- Espaçamento e alinhamento podem divergir do PDF

### Vantagens do Convertio

```
Fluxo com Convertio:
1. Gerar HTML+CSS perfeito (base do PDF)
2. Exportar como PDF (funciona 100%)
3. Enviar PDF ao Convertio
4. Receber DOCX com layout preservado
5. Retornar ao usuário

Resultado: DOCX idêntico ao PDF ✅
```

---

## Custo

**Modelo Freemium do Convertio:**
- 25 conversões/dia grátis
- Cada conversão: $0.002 (pago)
- Taxa de sucesso: ~99.9%

**Estimativa para app-hub:**
- 100 usuários ativos
- ~5 exportações DOCX/usuário/mês
- = 500 conversões/mês
- = $1/mês de custos Convertio

**Opções de preço para cobrar ao usuário:**
- Método 1: **Incluído no crédito de exportação** (sem custo adicional)
- Método 2: **+0.50 créditos** por conversão DOCX via Convertio
- Método 3: **Integração opcional** (usuário escolhe qualidade)

---

## Implementação

### 1. Registrar em Convertio.io

1. Acessar https://convertio.co/api/
2. Criar conta
3. Obter API Key
4. Armazenar em variável de ambiente:

```bash
CONVERTIO_API_KEY=your_api_key_here
```

### 2. Criar Serviço Convertio

```typescript
// src/services/convertio.service.ts

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface ConvertioUploadResponse {
  id: string;
  status: string;
  url?: string;
  error?: string;
}

export interface ConvertioConversionResponse {
  id: string;
  status: string;
  file?: {
    url: string;
    size: number;
  };
  error?: string;
}

export class ConvertioService {
  private static apiKey = process.env.CONVERTIO_API_KEY;
  private static baseUrl = 'https://api.convertio.co/v2';

  /**
   * Converte PDF para DOCX usando Convertio API
   */
  static async convertPdfToDocx(pdfBuffer: Buffer, filename: string = 'document.pdf'): Promise<Buffer> {
    try {
      if (!this.apiKey) {
        throw new Error('CONVERTIO_API_KEY não configurada');
      }

      console.log('📤 Enviando PDF ao Convertio para conversão...');

      // 1. Fazer upload do PDF
      const uploadedFileId = await this.uploadFile(pdfBuffer, filename);
      console.log(`✅ Arquivo enviado: ${uploadedFileId}`);

      // 2. Iniciar conversão
      const conversionId = await this.startConversion(uploadedFileId, 'docx');
      console.log(`⏳ Conversão iniciada: ${conversionId}`);

      // 3. Aguardar conclusão
      const result = await this.waitForConversion(conversionId);
      
      if (!result.file?.url) {
        throw new Error('Conversão retornou URL vazia');
      }

      console.log(`✅ Conversão concluída: ${result.file.url}`);

      // 4. Baixar arquivo convertido
      const docxBuffer = await this.downloadFile(result.file.url);
      console.log(`✅ DOCX baixado: ${docxBuffer.length} bytes`);

      // 5. Limpar arquivo original após sucesso
      await this.deleteFile(uploadedFileId);

      return docxBuffer;

    } catch (error: any) {
      console.error('❌ Erro na conversão Convertio:', error.message);
      throw new Error(`Falha ao converter PDF para DOCX: ${error.message}`);
    }
  }

  /**
   * Upload de arquivo
   */
  private static async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('apikey', this.apiKey!);
    formData.append('file', buffer, filename);

    try {
      const response = await axios.post<ConvertioUploadResponse>(
        `${this.baseUrl}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      if (response.data.status !== 'ok' && !response.data.id) {
        throw new Error(response.data.error || 'Upload falhou');
      }

      return response.data.id;
    } catch (error: any) {
      throw new Error(`Falha no upload: ${error.message}`);
    }
  }

  /**
   * Iniciar conversão
   */
  private static async startConversion(fileId: string, outputFormat: string): Promise<string> {
    try {
      const response = await axios.post<any>(
        `${this.baseUrl}/convert`,
        {
          apikey: this.apiKey,
          input: 'upload',
          file: fileId,
          outputformat: outputFormat
        },
        { timeout: 10000 }
      );

      if (response.data.status !== 'ok') {
        throw new Error(response.data.error || 'Conversão não iniciou');
      }

      return response.data.data.conversion_id;
    } catch (error: any) {
      throw new Error(`Falha ao iniciar conversão: ${error.message}`);
    }
  }

  /**
   * Aguardar conclusão da conversão
   */
  private static async waitForConversion(
    conversionId: string,
    maxAttempts: number = 120,
    delayMs: number = 1000
  ): Promise<ConvertioConversionResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get<any>(
          `${this.baseUrl}/convert/${conversionId}/status`,
          {
            params: { apikey: this.apiKey },
            timeout: 10000
          }
        );

        const status = response.data.data?.status || response.data.status;

        if (status === 'completed') {
          return {
            id: conversionId,
            status: 'completed',
            file: {
              url: response.data.data?.output?.url || response.data.data?.download_url,
              size: response.data.data?.output?.size || 0
            }
          };
        } else if (status === 'failed' || status === 'error') {
          throw new Error(
            response.data.data?.error || 
            response.data.error || 
            'Conversão falhou'
          );
        }

        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;

      } catch (error: any) {
        if (attempts >= maxAttempts - 1) {
          throw new Error(`Timeout aguardando conversão: ${error.message}`);
        }
        // Continuar tentando em caso de erro transitório
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
    }

    throw new Error('Timeout ao aguardar conversão (2 minutos)');
  }

  /**
   * Baixar arquivo convertido
   */
  private static async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Falha ao baixar arquivo: ${error.message}`);
    }
  }

  /**
   * Deletar arquivo (cleanup)
   */
  private static async deleteFile(fileId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/file/${fileId}/delete`,
        { apikey: this.apiKey },
        { timeout: 5000 }
      );
    } catch (error) {
      // Non-fatal: não interromper fluxo se delete falhar
      console.warn('⚠️ Falha ao deletar arquivo no Convertio:', error?.message);
    }
  }

  /**
   * Estima custo de conversão
   */
  static estimateCost(fileSizeKb: number, format: string = 'docx'): number {
    // Convertio cobra por conversão + tamanho de arquivo
    // Base: $0.002 por conversão
    // Tamanho: +$0.0001 por 100KB
    const baseCost = 0.002;
    const sizeCost = (fileSizeKb / 100) * 0.0001;
    return baseCost + sizeCost;
  }
}
```

### 3. Integrar ao EbookFormatConverterService

```typescript
// src/services/ebook-format-converter.service.ts

import { ConvertioService } from './convertio.service';

export class EbookFormatConverterService {
  /**
   * Converte usando Convertio para melhor qualidade DOCX
   */
  static async convertPdfToDocxViaConvertio(pdfBuffer: Buffer, projectTitle: string): Promise<Buffer> {
    try {
      // Usar Convertio se disponível
      if (process.env.CONVERTIO_API_KEY) {
        console.log('🔄 Usando Convertio para conversão PDF→DOCX');
        return await ConvertioService.convertPdfToDocx(pdfBuffer, `${projectTitle}.pdf`);
      }
    } catch (error) {
      console.warn('⚠️ Falha no Convertio, usando template nativo:', error?.message);
    }

    // Fallback para template nativo
    return null;
  }

  /**
   * Atualizar lógica de conversão DOCX
   */
  static async convert(
    format: 'pdf' | 'epub' | 'docx' | 'html',
    html: string,
    project: EbookProject,
    sections: any[],
    options?: any
  ): Promise<ConversionResult> {
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'docx':
        try {
          // 1. Gerar PDF primeiro (melhor qualidade)
          const pdfBuffer = await this.toPDF(html, project.title, options || {});

          // 2. Tentar converter via Convertio (opcional)
          const docxViaConvertio = await this.convertPdfToDocxViaConvertio(
            pdfBuffer,
            project.title
          );

          if (docxViaConvertio) {
            buffer = docxViaConvertio;
            console.log('✅ DOCX gerado via Convertio (idêntico ao PDF)');
          } else {
            // Fallback para template nativo se Convertio indisponível
            if (project.design) {
              console.log('📄 Gerando DOCX com design personalizado...');
              buffer = await AdvancedDOCXTemplate.generate(project, sections, {
                design: { visualIdentity: project.design.visualIdentity },
                layout: options?.layout,
                content: options?.content,
                language: project.metadata?.language || 'pt-BR'
              });
            } else {
              buffer = await DOCXTemplate.generate(project, sections, {
                includeImages: options?.content?.includeImages !== false,
                includeToc: options?.content?.includeToc !== false,
                language: project.metadata?.language || 'pt-BR'
              });
            }
          }
        } catch (docxErr) {
          console.error('❌ Falha ao gerar DOCX:', docxErr.message);
          throw new Error(`Falha ao gerar DOCX: ${docxErr.message}`);
        }

        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
        break;

      // ... outros formatos ...
    }

    return { buffer, mimeType, extension };
  }
}
```

### 4. Adicionar Custo ao Sistema de Créditos

```typescript
// src/services/ebook-pricing.service.ts

export class EbookPricingService {
  static calculateExportCost(
    format: 'pdf' | 'docx' | 'epub' | 'markdown',
    sections: EbookSection[],
    options?: { useConvertio?: boolean }
  ): number {
    const sectionCount = sections.length;
    const pageEstimate = this.estimatePages(sections);

    let baseCost = 0;

    switch (format) {
      case 'pdf':
        baseCost = 2.50 + (pageEstimate * 0.02); // $2.50 + $0.02/página
        break;
      case 'docx':
        baseCost = 1.50 + (pageEstimate * 0.01);
        // Adicionar custo Convertio se usado
        if (options?.useConvertio) {
          baseCost += 0.50; // +50¢ por conversão via Convertio
        }
        break;
      case 'epub':
        baseCost = 1.75 + (pageEstimate * 0.01);
        break;
      case 'markdown':
        baseCost = 0.50;
        break;
    }

    return parseFloat(baseCost.toFixed(2));
  }

  private static estimatePages(sections: EbookSection[]): number {
    const totalChars = sections.reduce((sum, s) => sum + (s.content?.length || 0), 0);
    // Estimar ~250 palavras por página, ~4 caracteres por palavra
    return Math.ceil(totalChars / 1000);
  }
}
```

---

## Configuração para Produção

### 1. Environment Variables

```bash
# .env
CONVERTIO_API_KEY=your_api_key_here
CONVERTIO_ENABLED=true
CONVERTIO_TIMEOUT_SECONDS=120
```

### 2. Middleware para Validar Disponibilidade

```typescript
// src/middlewares/convertio-availability.ts

export const convertioAvailability = (req, res, next) => {
  const isAvailable = !!process.env.CONVERTIO_API_KEY;
  res.locals.convertioAvailable = isAvailable;
  next();
};

// Use em rotas de exportação
router.post('/ebook/projects/:id/export', convertioAvailability, exportHandler);
```

### 3. Response informando qual método foi usado

```json
{
  "success": true,
  "jobId": "job_123456",
  "format": "docx",
  "generatedWith": "convertio",
  "note": "DOCX gerado via Convertio - layout idêntico ao PDF",
  "estimatedCredits": 2.0,
  "status": "pending"
}
```

---

## Monitoramento e Logging

```typescript
// Log tudo para rastrear sucesso
import { logger } from '../services/logger';

const docxViaConvertio = await ConvertioService.convertPdfToDocx(pdfBuffer, filename);

logger.info('ebook_export', {
  projectId,
  format: 'docx',
  method: 'convertio',
  pdfSize: pdfBuffer.length,
  docxSize: docxViaConvertio.length,
  costEstimate: 0.50,
  duration: endTime - startTime
});
```

---

## Tratamento de Erros

| Erro | Solução |
|------|---------|
| `CONVERTIO_API_KEY não configurada` | Ativar apenas com API key válida |
| `Upload falhou` | Retry automático, fallback para template nativo |
| `Conversão timeout` | Aumentar timeout ou usar template nativo |
| `Arquivo corrompido` | Validar PDF antes de enviar |

---

## Testes

```typescript
// src/tests/convertio.test.ts

describe('ConvertioService', () => {
  it('deve converter PDF para DOCX com sucesso', async () => {
    const pdfBuffer = fs.readFileSync('test.pdf');
    const docxBuffer = await ConvertioService.convertPdfToDocx(pdfBuffer);
    
    expect(docxBuffer).toBeDefined();
    expect(docxBuffer.length).toBeGreaterThan(1000);
  });

  it('deve falhar gracefully sem API key', async () => {
    delete process.env.CONVERTIO_API_KEY;
    
    expect(() => ConvertioService.convertPdfToDocx(buffer))
      .rejects
      .toThrow('CONVERTIO_API_KEY não configurada');
  });

  it('deve fazer fallback para template nativo em caso de erro', async () => {
    // Mock Convertio como unavailable
    const result = await convertWithFallback();
    expect(result).toBeDefined();
  });
});
```

---

## Recomendação Final

### MVP (Sem Convertio)
- ✅ Usar AdvancedDOCXTemplate nativo
- ✅ Bom resultado para maioria dos casos
- ❌ Design complexo pode perder qualidade

### Produção com Convertio
- ✅ DOCX idêntico ao PDF
- ✅ Melhor UX
- ✅ Custo baixo (+$0.50 por conversão)
- ✅ Fallback automático

**Implementar Convertio quando:**
1. Tiver usuários reclamando de qualidade DOCX
2. Tiver volume de exportações > 100/mês
3. Quiser garantir consistência PDF ↔ DOCX

