# Sistema de Geração Assíncrona para Ebooks

## Visão Geral

O sistema de geração de conteúdo para ebooks utiliza a infraestrutura de jobs/socket já existente no app-hub-server. Todos os processos de geração são assíncronos e fornecem feedback em tempo real via WebSocket.

## Arquitetura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐         ┌──────────┐
│  Frontend   │────1───▶│   API REST   │────2───▶│    Redis    │────3───▶│  Worker  │
│  (Angular)  │◀───6────│  (Express)   │         │    Queue    │         │ (BullMQ) │
└─────────────┘         └──────────────┘         └─────────────┘         └──────────┘
       │                        │                                              │
       │                        │                                              │
       └────────5───────────────┴──────────────────4──────────────────────────┘
                          Socket.IO (Progresso em tempo real)
```

### Fluxo de Processamento

1. **Frontend** envia requisição HTTP para criar job
2. **API** cria job na fila Redis e retorna `jobId`
3. **Worker** processa job usando os tools existentes
4. **Worker** emite eventos de progresso via Socket.IO
5. **Frontend** recebe updates em tempo real
6. **API** pode ser consultada para status do job (opcional)

## Endpoints Implementados

### 1. Gerar Conteúdo de Seção
```http
POST /api/ebook/generate/section
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "507f1f77bcf86cd799439011",
  "sectionId": "507f1f77bcf86cd799439012"
}
```

**Resposta:**
```json
{
  "jobId": "12345",
  "status": "pending",
  "message": "Section generation started. Listen to socket for progress."
}
```

### 2. Expandir Texto
```http
POST /api/ebook/generate/expand
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Era uma vez...",
  "instruction": "Expanda este texto mantendo o estilo narrativo"
}
```

### 3. Reescrever Texto
```http
POST /api/ebook/generate/rewrite
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "O texto original aqui",
  "instruction": "Reescreva em tom mais formal"
}
```

### 4. Gerar Capa
```http
POST /api/ebook/generate/cover
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "507f1f77bcf86cd799439011",
  "bookInfo": {
    "title": "Meu Livro",
    "genre": "Romance",
    "tone": "Inspirational"
  },
  "style": "Minimalist",
  "aspectRatio": "9:16"
}
```

### 5. Gerar Imagem Genérica
```http
POST /api/ebook/generate/image
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "Uma paisagem montanhosa ao pôr do sol",
  "projectId": "507f1f77bcf86cd799439011",
  "sectionId": "507f1f77bcf86cd799439012",
  "aspectRatio": "16:9"
}
```

## Como Funciona o Worker

O worker já está configurado para processar esses jobs automaticamente:

```typescript
// src/worker.ts
async function processJob(job: Job) {
  if (metadata.app) {
    // Jobs com metadata.app usam ToolController
    const toolController = makeToolControllerFactory();
    const result = await toolController.execute(job.data.form, metadata);
    return {
      status: 'completed',
      result: {
        content: result.content,
        toolUsed: result.toolUsed,
        creditsCharged: result.creditsCharged
      }
    };
  }
}
```

### Mapeamento de Jobs para Tools

| metadata.app | Tool Executado |
|-------------|----------------|
| `ebook-generate-section` | `EbookGenerateSectionTool` |
| `ebook-expand-text` | `EbookExpandTextTool` |
| `ebook-rewrite-text` | `EbookRewriteTextTool` |
| `ebook-generate-cover` | `EbookGenerateCoverTool` |
| `ebook-generate-image` | `EbookGenerateImageTool` |

## Eventos do Socket.IO

O sistema emite os seguintes eventos:

### 1. Job Ativo
```javascript
socket.on(`job:${jobId}:active`, (data) => {
  // Job começou a processar
  console.log('Job ativo:', data);
});
```

### 2. Progresso (se disponível)
```javascript
socket.on(`job:${jobId}:progress`, (data) => {
  // Atualização de progresso
  console.log('Progresso:', data.progress, data.message);
});
```

### 3. Job Completado
```javascript
socket.on(`job:${jobId}:completed`, (result) => {
  // Job finalizado com sucesso
  console.log('Resultado:', result.content);
  console.log('Créditos cobrados:', result.creditsCharged);
});
```

### 4. Job Falhou
```javascript
socket.on(`job:${jobId}:failed`, (error) => {
  // Erro no processamento
  console.error('Erro:', error.msg);
});
```

## Integração no Frontend (Angular)

### 1. Serviço de Geração (book-project.service.ts)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SocketService } from './socket.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BookProjectService {
  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {}

  async generateSection(projectId: string, sectionId: string): Promise<Observable<any>> {
    // 1. Criar job
    const response = await this.http.post<{ jobId: string }>(
      '/api/ebook/generate/section',
      { projectId, sectionId }
    ).toPromise();

    const jobId = response.jobId;

    // 2. Retornar Observable que escuta eventos do socket
    return new Observable(subscriber => {
      // Escutar progresso
      this.socketService.on(`job:${jobId}:progress`, (data) => {
        subscriber.next({ 
          type: 'progress', 
          progress: data.progress, 
          message: data.message 
        });
      });

      // Escutar conclusão
      this.socketService.on(`job:${jobId}:completed`, (result) => {
        subscriber.next({ type: 'completed', result });
        subscriber.complete();
      });

      // Escutar erro
      this.socketService.on(`job:${jobId}:failed`, (error) => {
        subscriber.error(error);
      });
    });
  }
}
```

### 2. Component de UI

```typescript
export class SectionEditorComponent {
  isGenerating = false;
  progress = 0;
  progressMessage = '';

  async generateContent() {
    this.isGenerating = true;
    this.progress = 0;

    try {
      const observable = await this.bookProjectService.generateSection(
        this.projectId,
        this.sectionId
      );

      observable.subscribe({
        next: (event) => {
          if (event.type === 'progress') {
            this.progress = event.progress;
            this.progressMessage = event.message;
          } else if (event.type === 'completed') {
            this.content = event.result.content;
            this.isGenerating = false;
            this.showSuccess('Conteúdo gerado com sucesso!');
          }
        },
        error: (error) => {
          this.isGenerating = false;
          this.showError(error.msg);
        }
      });
    } catch (error) {
      this.isGenerating = false;
      this.showError('Erro ao iniciar geração');
    }
  }
}
```

### 3. Template HTML

```html
<div class="generation-controls">
  <button 
    (click)="generateContent()" 
    [disabled]="isGenerating"
    class="btn btn-primary">
    <i class="bi bi-magic"></i>
    Gerar Conteúdo com IA
  </button>

  <div *ngIf="isGenerating" class="progress-container">
    <div class="progress">
      <div 
        class="progress-bar" 
        [style.width.%]="progress">
        {{ progress }}%
      </div>
    </div>
    <p class="progress-message">{{ progressMessage }}</p>
  </div>
</div>
```

## Configuração Necessária

### 1. Redis
O sistema requer Redis rodando. Configure no `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. Workers
Inicie os workers com:

```bash
npm run worker
```

### 3. Socket.IO
O Socket.IO já está configurado no `src/server.ts` e `src/sockets/socketRoutes.ts`.

## Vantagens do Sistema Assíncrono

✅ **Não Bloqueia API** - Requisições HTTP retornam imediatamente  
✅ **Feedback em Tempo Real** - Usuário vê progresso da geração  
✅ **Escalável** - Múltiplos workers processam jobs em paralelo  
✅ **Tolerante a Falhas** - Jobs podem ser retentados automaticamente  
✅ **Persistente** - Jobs sobrevivem a reinicializações  
✅ **Reutiliza Infraestrutura** - Usa sistema já testado do app-hub  

## Monitoramento

### Logs do Worker
```bash
# Ver logs em tempo real
pm2 logs worker

# Ver status
pm2 status
```

### Redis Queue
```bash
# Conectar ao Redis
redis-cli

# Ver jobs na fila
KEYS *
LLEN bull:rFree11:wait
```

## Troubleshooting

### Job não processa
1. Verificar se worker está rodando: `pm2 status`
2. Verificar conexão Redis: `redis-cli ping`
3. Ver logs do worker: `pm2 logs worker`

### Socket não conecta
1. Verificar se frontend está conectado ao socket
2. Ver logs do servidor: `pm2 logs app-hub-server`
3. Verificar CORS no `src/config/corsOptions.ts`

### Créditos não são cobrados
1. Verificar se `creditsService` está configurado
2. Ver logs do worker para erros
3. Verificar saldo do usuário no banco

## Próximos Passos

1. ✅ Endpoints de geração implementados
2. ✅ Worker configurado para processar
3. ✅ Tools de ebook já existem
4. ⏳ Frontend precisa ser atualizado para usar sockets
5. ⏳ Adicionar UI de progresso
6. ⏳ Implementar cancelamento de jobs
7. ⏳ Adicionar retry automático

## Referências

- **Worker**: `src/worker.ts`
- **Jobs Service**: `src/services/jobs.service.ts`
- **Tool Controller**: `src/controllers/tools/tool.controller.ts`
- **Ebook Controller**: `src/controllers/api/ebook.controller.ts`
- **Socket Routes**: `src/sockets/socketRoutes.ts`
- **Tools de Ebook**: `src/tools/ebook-*.tool.ts`
