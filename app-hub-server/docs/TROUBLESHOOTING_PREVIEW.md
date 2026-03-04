# Troubleshooting - Sistema de Preview

## Problemas Comuns e Soluções

### 1. Erro 404: Endpoint Not Found

#### Sintomas
```
POST http://localhost:5000/api/ebook/projects/.../preview
Status: 404 Not Found
```

#### Causas Possíveis
1. Servidor não foi reiniciado após as mudanças
2. Rota não está registrada corretamente
3. Prefixo `/api` faltando

#### Solução
```bash
# 1. Parar o servidor (Ctrl+C)
# 2. Reinstalar dependências se necessário
cd C:\Users\naldo\app-hub-server
npm install

# 3. Reiniciar o servidor
npm run dev

# 4. Verificar se a rota foi registrada
# Deve aparecer no console: "Server started on PORT: 5000"
```

#### Verificação
```bash
# Testar se o servidor está respondendo
curl http://localhost:5000/test-cors
```

---

### 2. Erro 400: Projeto Não Possui Design

#### Sintomas
```json
{
  "error": "Projeto não possui design",
  "suggestion": "Gere o design primeiro usando POST /api/ebook/projects/:id/design/generate"
}
```

#### Causa
O projeto foi criado mas o design ainda não foi gerado via LLM

#### Solução
```bash
# Gerar design para o projeto
curl -X POST http://localhost:5000/api/ebook/projects/{projectId}/design/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customInstruction": "Design moderno e profissional"
  }'
```

#### No Frontend
1. Abrir o projeto
2. Clicar no botão "Gerar Design" no modal de design
3. Aguardar a geração (pode levar 10-30 segundos)
4. Tentar visualizar o preview novamente

---

### 3. Erro 400: Projeto Não Possui Seções

#### Sintomas
```json
{
  "error": "Projeto não possui seções",
  "suggestion": "Adicione seções ao projeto antes de gerar preview"
}
```

#### Causa
O projeto foi criado mas não possui conteúdo (seções vazias)

#### Solução
1. Adicionar seções ao projeto via frontend
2. Garantir que cada seção tenha conteúdo (campo `content` não vazio)

```typescript
// Exemplo de criação de seção via API
POST /api/ebook/projects/{projectId}/sections
{
  "title": "Capítulo 1",
  "content": "<p>Conteúdo do capítulo...</p>",
  "type": "chapter",
  "order": 0
}
```

---

### 4. Preview Não Carrega no Frontend (Tela Branca)

#### Sintomas
- Loading infinito
- Tela branca no iframe
- Erro no console do navegador

#### Causa 1: Erro de CORS
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solução:**
```typescript
// Verificar se o frontend está na lista de origens permitidas
// Backend: src/config/corsOptions.ts
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4201',
  // Adicionar sua porta aqui
];
```

#### Causa 2: Token de Autenticação Inválido
```
401 Unauthorized
```

**Solução:**
1. Fazer logout e login novamente
2. Verificar se o token não expirou
3. Verificar localStorage: `localStorage.getItem('token')`

#### Causa 3: Blob URL Inválida
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
blob:http://localhost:4200/...
```

**Solução:**
```typescript
// Verificar se a conversão HTML → Blob está correta
// Deve ser assim:
const blob = new Blob([html], { type: 'text/html' });
const objectUrl = URL.createObjectURL(blob);
```

---

### 5. Preview Não Mostra o Design Aplicado

#### Sintomas
- Preview carrega mas aparece sem estilo
- Texto simples sem formatação
- Cores e fontes padrão do navegador

#### Causa 1: CSS Não Está Sendo Injetado
**Solução:**
```typescript
// Verificar se o design tem CSS
const design = await getDesign(projectId);
console.log('CSS:', design.finalCSS);

// Se vazio, regenerar design
POST /api/ebook/projects/:id/design/regenerate
```

#### Causa 2: ContentWrapper Não Está Aplicando o Design
**Solução:**
```typescript
// Backend: Verificar chamada ao ContentWrapper
const html = EbookContentWrapperService.wrapContent(
  sections,
  {
    globalCSS: project.design.finalCSS,  // ✅ Deve ter CSS
    wrapperClasses: { ... },
    fonts: { ... }
  },
  project.title
);
```

---

### 6. Export Modal: Preview Não Atualiza com as Mudanças

#### Sintomas
- Alterar margens/padding não reflete no preview
- Preview mostra sempre a mesma coisa

#### Causa: Cache Agressivo
**Solução:**
```typescript
// Frontend: Desabilitar cache ao passar opções
this.designService.generatePreview(
  this.projectId,
  options,
  false  // ✅ useCache = false
);
```

#### Causa 2: Debounce Muito Longo
**Solução:**
```typescript
// Reduzir debounce de 500ms para 200ms
onConfigChange(immediate = false): void {
  clearTimeout(this.debounceHandle);
  this.debounceHandle = setTimeout(
    () => this.refreshPreviewAndCost(),
    immediate ? 0 : 200  // ✅ Reduzir delay
  );
}
```

---

### 7. Erro 500: Internal Server Error

#### Sintomas
```json
{
  "error": "Erro ao gerar preview",
  "message": "..."
}
```

#### Diagnóstico
1. Verificar logs do backend
2. Procurar por stack trace no console

#### Causas Comuns

**A. Seção com Conteúdo Inválido**
```
TypeError: Cannot read property 'trim' of undefined
```
**Solução:** Garantir que `section.content` não é null

**B. Design Malformado**
```
TypeError: Cannot read property 'finalCSS' of undefined
```
**Solução:** Regenerar design do projeto

**C. MongoDB Connection Error**
```
MongoError: connection timed out
```
**Solução:** Verificar conexão com MongoDB

---

### 8. Performance: Preview Muito Lento

#### Sintomas
- Preview demora mais de 5 segundos para carregar
- Frontend trava durante carregamento

#### Otimizações

**A. Usar Cache para Preview Simples**
```typescript
// Sempre usar cache em preview simples
this.designService.generatePreview(
  this.projectId,
  undefined,  // sem opções
  true        // ✅ usar cache
);
```

**B. Limitar Número de Seções no Preview**
```typescript
// Export Modal: Limitar preview a primeiras 10 seções
const options = {
  content: {
    maxSections: 10  // ✅ Preview mais rápido
  }
};
```

**C. Comprimir HTML**
```typescript
// Backend: Minificar HTML antes de enviar
html = EbookContentWrapperService.minifyHTML(html);
```

---

### 9. Imagens Não Aparecem no Preview

#### Sintomas
- Preview carrega mas imagens quebradas
- Ícone de imagem quebrada no navegador

#### Causa 1: URLs Relativas
**Solução:** Usar URLs absolutas para imagens
```typescript
// Garantir que image.url é absoluto
const imageUrl = image.url.startsWith('http') 
  ? image.url 
  : `${baseUrl}${image.url}`;
```

#### Causa 2: Imagens Não Salvas no Banco
**Solução:**
```typescript
// Sincronizar imagens da seção
POST /api/ebook/sections/{sectionId}/sync-images
```

---

### 10. WebSocket: Preview Não Atualiza em Tempo Real

#### Sintomas
- Gera design mas preview não atualiza automaticamente
- Precisa recarregar manualmente

#### Causa: WebSocket Não Está Emitindo Evento
**Solução:**
```typescript
// Backend: Emitir evento após gerar design
io.to(userId).emit('design:updated', {
  projectId,
  design: newDesign
});

// Frontend: Escutar evento
this.socketService.on('design:updated', (data) => {
  if (data.projectId === this.projectId) {
    this.loadPreview();
  }
});
```

---

## Ferramentas de Debug

### 1. Verificar Estado do Sistema

```bash
# Backend
curl http://localhost:5000/test-cors

# Banco de Dados
mongo
> use ebookGenerator
> db.ebookProjects.findOne({ _id: ObjectId("...") })
> db.ebookSections.find({ projectId: ObjectId("...") }).count()
```

### 2. Console do Navegador

```javascript
// Frontend: Verificar estado do serviço
const designService = inject(EbookDesignService);
console.log('Current State:', designService.currentState$.value);
console.log('Current Design:', designService.currentDesign$.value);

// Testar preview manualmente
designService.generatePreview('projectId').subscribe(
  url => console.log('Preview URL:', url),
  error => console.error('Error:', error)
);
```

### 3. Logs do Backend

```typescript
// Adicionar logs temporários para debug
console.log('🔍 [DEBUG] Preview Request:', {
  projectId,
  hasOptions: Object.keys(options).length > 0,
  userId
});

console.log('🔍 [DEBUG] Project Design:', {
  hasDesign: !!project.design,
  hasFinalCSS: !!project.design?.finalCSS,
  cssLength: project.design?.finalCSS?.length
});
```

---

## Checklist de Validação

Antes de abrir um ticket de bug, verificar:

- [ ] Servidor está rodando (porta 5000)
- [ ] Frontend conectado (porta 4200)
- [ ] Token de autenticação válido
- [ ] Projeto possui design gerado
- [ ] Projeto possui seções com conteúdo
- [ ] CORS configurado corretamente
- [ ] MongoDB conectado
- [ ] Logs do backend não mostram erros

---

## Quando Pedir Ajuda

Se após seguir este guia o problema persistir, coletar as seguintes informações:

1. **Versão do Sistema**
   - Node.js: `node --version`
   - npm: `npm --version`
   - Angular: `ng version`

2. **Logs Completos**
   - Backend: Últimas 50 linhas
   - Frontend: Console do navegador (F12)

3. **Request/Response**
   - URL completa
   - Headers
   - Body (se POST)
   - Status code
   - Resposta

4. **Passos para Reproduzir**
   - Ação 1
   - Ação 2
   - Resultado esperado
   - Resultado obtido

5. **Contexto**
   - ID do projeto
   - ID do usuário
   - Timestamp do erro

---

**Última Atualização:** 14/12/2025  
**Versão:** 1.0.0
