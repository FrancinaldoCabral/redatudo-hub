# AutoBlog AI - Documento de Projeto
## Especificações Técnicas e Plano de Execução

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Propósito
AutoBlog AI é uma plataforma SaaS que automatiza completamente a criação e publicação de conteúdo para blogs WordPress. O usuário configura preferências uma única vez e o sistema opera autonomamente, gerando artigos originais baseados em notícias relevantes e publicando-os automaticamente.

### 1.2 Proposta de Valor
- **Para o usuário**: Conteúdo constante sem esforço manual
- **Diferencial**: Blog sempre atualizado com notícias relevantes transformadas em artigos únicos
- **Simplicidade**: Funciona com qualquer WordPress básico recém-instalado
- **Custo-benefício**: Sistema de créditos transparente e previsível

### 1.3 Público-Alvo
- Proprietários de blogs WordPress que desejam conteúdo frequente
- Criadores de conteúdo que precisam manter múltiplos blogs ativos
- Agências digitais gerenciando blogs de clientes
- Empreendedores digitais focados em SEO e tráfego orgânico

### 1.4 Restrições Técnicas
- **Compatibilidade**: Apenas WordPress com REST API habilitada (padrão desde WP 4.7)
- **Sem dependências externas**: Não requer plugins específicos (Yoast, Analytics, etc)
- **Recursos existentes**: Utilizar apenas infraestrutura já disponível (LLM via OpenRouter, Replicate, MongoDB, n8n)

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Componentes Principais

#### 2.1.1 Frontend (Angular Dashboard)
**Responsabilidade**: Interface de configuração e monitoramento para usuários

**Funcionalidades Core**:
- Wizard de onboarding (3 etapas)
- Dashboard principal com calendário de publicações
- Biblioteca de posts gerados
- Tela de configurações
- Sistema de notificações em tempo real

#### 2.1.2 Backend (Node.js + Express)
**Responsabilidade**: Gestão de usuários, autenticação, créditos e intermediação com n8n

**Funcionalidades Core**:
- Autenticação e autorização JWT
- CRUD de configurações de usuário
- Sistema de créditos e assinaturas
- APIs de consulta de posts e agendamentos
- Webhooks para receber status do n8n
- WebSocket para notificações real-time

#### 2.1.3 Workflow Engine (n8n)
**Responsabilidade**: Automação completa do processo de geração e publicação

**Funcionalidades Core**:
- Scheduler (execução a cada hora)
- Busca e filtragem de conteúdo em RSS feeds
- Scraping de notícias
- Geração de artigos via LLM
- Geração de imagens via Replicate
- Publicação no WordPress via REST API
- Registro de operações e consumo de créditos

#### 2.1.4 Banco de Dados (MongoDB)
**Responsabilidade**: Persistência de dados

**Coleções Principais**:
- users (configurações, créditos, dados WordPress)
- posts (histórico de publicações)
- schedules (agendamento de posts)

---

## 3. FLUXO DE OPERAÇÃO

### 3.1 Jornada do Usuário

#### Etapa 1: Cadastro e Onboarding
1. Usuário cria conta (email + senha)
2. Recebe créditos de teste (plano free)
3. Inicia wizard de configuração

#### Etapa 2: Configuração (Wizard 3 Passos)
**Passo 1 - Conectar WordPress**:
- Usuário informa URL do blog
- Usuário informa credenciais (username + application password)
- Sistema testa conexão via WordPress REST API
- Sistema busca e armazena categorias existentes do WordPress
- Validação: conexão estabelecida ou erro explicativo

**Passo 2 - Agendar Publicações**:
- Usuário define quantidade de posts por dia (slider 1-6)
- Usuário seleciona dias da semana ativos (checkboxes)
- Usuário escolhe horários preferenciais (time pickers)
- Usuário define tamanho dos artigos (select: curto 500 palavras, médio 1000, longo 1500)
- Usuário decide se publica automaticamente ou deixa em rascunho

**Passo 3 - Escolher Temas de Conteúdo**:
- Usuário seleciona tópicos de interesse de lista pré-definida (ex: Inteligência Artificial, Tecnologia, Negócios, etc)
- Usuário pode adicionar tópicos personalizados
- Usuário mapeia cada tópico para categorias específicas do seu WordPress
- Exemplo: "Inteligência Artificial" → Categorias WP: [Tecnologia, IA]

#### Etapa 3: Operação Autônoma
- Sistema agenda próximas publicações automaticamente
- n8n executa workflow nos horários programados
- Dashboard atualiza status em tempo real
- Usuário recebe notificações sobre publicações realizadas

### 3.2 Fluxo de Geração de Conteúdo (n8n)

#### Módulo 1: Scheduler e Controle
**Frequência**: A cada 1 hora
**Processo**:
- Consulta MongoDB buscando todos usuários ativos
- Filtra usuários que têm publicação agendada para o momento atual (±30 minutos)
- Para cada usuário encontrado, inicia pipeline de geração
- Registra tentativa no MongoDB

#### Módulo 2: Busca de Conteúdo
**Processo**:
- Identifica tópicos configurados pelo usuário
- Consulta RSS feeds pré-mapeados para cada tópico (curadoria interna)
- Filtra notícias publicadas nas últimas 6 horas
- Consulta MongoDB para evitar notícias já processadas
- Seleciona 1 notícia mais relevante
- Executa scraping completo da notícia (título, conteúdo, autor, URL)

**RSS Feeds por Tópico** (curadoria da plataforma):
- Inteligência Artificial: 2-3 feeds especializados
- Tecnologia: 2-3 feeds especializados
- Negócios & Startups: 2-3 feeds especializados
- Ciência: 2-3 feeds especializados
- Marketing Digital: 2-3 feeds especializados

#### Módulo 3: Análise Rápida (Quality Gate)
**Processo**:
- Envia notícia para LLM com prompt específico
- Pergunta: "Esta notícia é relevante para blog sobre {tópico}? É notícia (não propaganda/review)?"
- LLM responde JSON estruturado: `{relevant: boolean, angle: string}`
- Se não relevante: retorna ao Módulo 2 (busca outra notícia)
- Se relevante: avança para geração

**Custo**: 0.05 créditos (chamada LLM pequena)

#### Módulo 4: Geração de Artigo Completo
**Processo**:
- Prepara prompt master com todas instruções
- Inclui: notícia fonte, tópico, tamanho desejado, idioma, tom
- 1 única chamada ao LLM (modelo robusto via OpenRouter)
- LLM retorna JSON estruturado contendo:
  - title (título SEO-friendly, máximo 60 caracteres)
  - content (artigo completo em HTML semântico)
  - metaDescription (120-156 caracteres)
  - tags (array com 3 tags relevantes)
  - imagePrompt (descrição em inglês para geração de imagem)

**Requisitos do Prompt**:
- Artigo original (não cópia da fonte)
- Estrutura: introdução + 3 seções com subtítulos + conclusão
- HTML limpo: uso de tags semânticas (h2, p, strong, ul, li)
- Menção à fonte original com link
- Contexto adicional além da notícia básica
- Tom adequado ao tópico

**Custo**: 0.25 créditos (chamada LLM grande)

#### Módulo 5: Geração de Imagem
**Processo**:
- Recebe imagePrompt do módulo anterior
- Envia para Replicate (ou serviço configurado)
- Modelo sugerido: FLUX ou Stable Diffusion
- Baixa imagem gerada
- Converte para formato otimizado (WebP)
- Prepara para upload

**Custo**: 0.15 créditos

#### Módulo 6: Quality Checks Automatizados
**Processo** (validações sem LLM):
- Verifica título existe e tem mais de 10 caracteres
- Verifica conteúdo existe e tem mínimo 300 palavras
- Verifica HTML válido (presença de tags p, h2)
- Verifica meta description existe e tem 100-160 caracteres
- Verifica presença de pelo menos 2 tags
- Verifica imagePrompt válido

**Ações em caso de falha**:
- Registra erro no MongoDB
- Marca post como "failed" com descrição do problema
- Notifica dashboard via webhook
- Não desconta créditos
- Permite retry manual

#### Módulo 7: Publicação no WordPress
**Processo**:
1. Upload de imagem via WordPress REST API
   - POST `/wp-json/wp/v2/media`
   - Headers: Content-Disposition com filename
   - Body: binary da imagem
   - Response: ID da mídia criada

2. Criação/atualização de tags
   - Para cada tag do artigo
   - Busca tag existente por nome
   - Se não existe: cria nova tag
   - Coleta IDs das tags

3. Criação do post
   - POST `/wp-json/wp/v2/posts`
   - Body JSON:
     - title: título do artigo
     - content: HTML completo
     - status: "publish" ou "draft" (conforme config usuário)
     - categories: array de IDs (do mapeamento do usuário)
     - tags: array de IDs (criadas/buscadas)
     - featured_media: ID da imagem
     - meta: {description: metaDescription}

**Tratamento de Erros**:
- Retry automático (até 3 tentativas com intervalo)
- Se falhar: salva como draft e notifica
- Registra erro específico (autenticação, conexão, etc)

#### Módulo 8: Registro e Finalização
**Processo**:
- Salva post completo no MongoDB (coleção posts)
- Atualiza schedule como "completed"
- Calcula e desconta créditos do usuário
- Envia webhook para backend com status
- Backend notifica dashboard via WebSocket
- Usuário vê atualização instantânea

**Dados registrados**:
- userId, wpPostId, title, url, topic, sourceUrl
- status (published/draft/failed)
- creditsUsed, createdAt, publishedAt

---

## 4. ESPECIFICAÇÕES POR EQUIPE

### 4.1 EQUIPE FRONTEND (Angular)

#### 4.1.1 Responsabilidades Gerais
- Desenvolver interface responsiva e intuitiva
- Implementar wizard de onboarding guiado
- Criar dashboard de monitoramento com atualizações em tempo real
- Gerenciar estado da aplicação (usuário, créditos, posts)
- Consumir APIs REST do backend
- Estabelecer conexão WebSocket para notificações

#### 4.1.2 Telas e Componentes

**TELA 1: Wizard de Onboarding (3 Steps)**

*Step 1: Conectar WordPress*
- Componente: WordPressConnectionForm
- Inputs: URL (validação de formato), Username, Application Password
- Botão: "Testar Conexão"
- Feedback visual: loading spinner durante teste
- Exibir categorias WordPress encontradas em lista
- Tratamento de erros: mensagens claras (URL inválido, credenciais incorretas, REST API desabilitada)
- Validação: não permite avançar sem conexão bem-sucedida

*Step 2: Configurar Publicações*
- Componente: ScheduleConfigForm
- Input: Slider para posts por dia (1-6)
- Input: Checkboxes para dias da semana (Domingo a Sábado)
- Input: Time pickers para horários (múltipla seleção)
- Input: Select para tamanho (Curto/Médio/Longo) com explicação de palavras
- Input: Toggle "Publicar automaticamente" vs "Deixar em rascunho"
- Preview: "Você terá X posts por semana"

*Step 3: Escolher Temas*
- Componente: TopicsSelector
- Lista de chips/tags com tópicos pré-definidos
- Opção "Adicionar tópico personalizado" (input text)
- Para cada tópico selecionado: interface de mapeamento
  - "Inteligência Artificial" → Selecionar categorias WP (multi-select)
- Validação: pelo menos 1 tópico selecionado
- Cada tópico deve ter pelo menos 1 categoria WP mapeada

**TELA 2: Dashboard Principal**

*Seção: Próximas Publicações*
- Componente: UpcomingPostsCalendar
- Visualização: calendário semanal ou lista cronológica
- Cada item mostra:
  - Data e hora
  - Status: "Agendado", "Gerando...", "Publicado", "Falhou"
  - Título (se já gerado)
  - Ícone de status com cores distintas
- Atualização em tempo real via WebSocket

*Seção: Últimos Posts*
- Componente: RecentPostsList
- Lista dos últimos 10 posts
- Card para cada post contendo:
  - Thumbnail da imagem (se houver)
  - Título
  - Data de publicação
  - Status
  - Botões: "Ver no Site" (link externo), "Ver Detalhes" (modal)
- Modal de detalhes:
  - Preview do conteúdo
  - Meta description
  - Tags
  - Estatísticas básicas (se disponíveis)

*Seção: Informações da Conta*
- Componente: AccountInfoWidget
- Exibir: Créditos restantes (destaque visual)
- Exibir: Posts do mês (X/Y usado)
- Exibir: Plano atual
- Botão: "Adicionar Créditos" (redireciona para billing)

**TELA 3: Configurações**

*Aba: Geral*
- Formulário editável com dados do Step 2 e 3 do wizard
- Permite alterar: tópicos, mapeamento de categorias, horários, tamanho de posts
- Botão "Salvar Alterações"
- Confirmação de salvamento

*Aba: WordPress*
- Exibir URL atual
- Botão "Reconectar" (abre modal com formulário de credenciais)
- Botão "Atualizar Categorias" (re-fetch do WordPress)
- Status da conexão: ícone verde/vermelho com última verificação

*Aba: Plano e Créditos*
- Informações do plano atual
- Histórico de uso de créditos (tabela ou gráfico)
- Botão "Gerenciar Assinatura"
- Botão "Comprar Créditos"

**TELA 4: Biblioteca de Posts**
- Componente: PostLibrary
- Tabela/grid com todos posts gerados
- Filtros: data, status, tópico
- Search: busca por título
- Paginação
- Ações por post: visualizar, editar (se draft), deletar

#### 4.1.3 Serviços Angular

**AuthService**
- Métodos: login, register, logout, checkAuth
- Gerenciamento de token JWT (localStorage)
- Interceptor HTTP para adicionar token

**ConfigService**
- Métodos: getConfig, updateWordPress, updateSchedule, updateContent
- Comunicação com endpoints de configuração do backend

**PostsService**
- Métodos: getPosts (com filtros), getPostById, deletePost
- Comunicação com endpoints de posts do backend

**WebSocketService**
- Estabelecer conexão socket.io com backend
- Listeners para eventos: 'post:update', 'credits:update'
- Emitir atualizações para componentes via Subject/Observable

**CreditsService**
- Métodos: getCurrentCredits, getUsageHistory
- Sincronização com backend

#### 4.1.4 Estado da Aplicação
- Utilizar NgRx ou serviço singleton para estado global
- Estados gerenciados:
  - currentUser (dados + créditos + config)
  - posts (lista + cache)
  - schedules (próximos agendamentos)
  - notifications (fila de notificações toast)

#### 4.1.5 Requisitos Não-Funcionais Frontend
- Responsividade: mobile-first, tablet, desktop
- Acessibilidade: WCAG 2.1 AA
- Performance: lazy loading de rotas, virtual scrolling em listas longas
- UX: loading states, skeleton screens, mensagens de erro amigáveis
- Internacionalização: preparar para i18n (inicialmente apenas PT-BR)

---

### 4.2 EQUIPE BACKEND (Node.js)

#### 4.2.1 Responsabilidades Gerais
- Implementar autenticação e autorização
- Gerenciar sistema de créditos e assinaturas
- Fornecer APIs RESTful para frontend
- Intermediar comunicação com n8n via webhooks
- Estabelecer servidor WebSocket para notificações
- Validar e sanitizar todas entradas
- Logging e monitoramento

#### 4.2.2 Estrutura de Pastas Sugerida
```
src/
├── config/
│   ├── database.js (conexão MongoDB)
│   ├── auth.js (estratégia JWT)
│   └── constants.js (valores fixos, custos)
├── models/
│   ├── User.js
│   ├── Post.js
│   └── Schedule.js
├── routes/
│   ├── auth.routes.js
│   ├── config.routes.js
│   ├── posts.routes.js
│   ├── credits.routes.js
│   └── webhook.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── config.controller.js
│   ├── posts.controller.js
│   └── webhook.controller.js
├── middleware/
│   ├── auth.middleware.js
│   ├── validation.middleware.js
│   └── errorHandler.middleware.js
├── services/
│   ├── wordpress.service.js (cliente API WordPress)
│   ├── credits.service.js
│   ├── n8n.service.js (comunicação com n8n)
│   └── websocket.service.js
└── utils/
    ├── encryption.js
    └── validators.js
```

#### 4.2.3 Modelos de Dados (MongoDB)

**Model: User**
- Schema:
  - email: String, required, unique, lowercase
  - password: String, required (hashed bcrypt)
  - credits: Number, default 2 (plano free)
  - subscription:
    - plan: String enum ['free', 'starter', 'pro']
    - postsPerMonth: Number
    - renewsAt: Date
    - stripeCustomerId: String (opcional)
  - wordpress:
    - url: String, required
    - username: String, required
    - password: String, required (encrypted)
    - categories: Array of {id: Number, name: String}
    - lastSync: Date
  - schedule:
    - postsPerDay: Number, min 1, max 6
    - activeDays: Array of Boolean (length 7)
    - times: Array of String (formato HH:mm)
  - content:
    - topics: Array of String
    - categoryMapping: Object (Map de topic → array de category IDs)
    - language: String, default 'pt-BR'
    - postLength: String enum ['short', 'medium', 'long']
    - autoPublish: Boolean, default true
  - createdAt: Date
  - updatedAt: Date
  - isActive: Boolean, default true

**Model: Post**
- Schema:
  - userId: ObjectId, ref 'User', required, indexed
  - wpPostId: Number (ID no WordPress)
  - title: String, required
  - url: String
  - topic: String, required
  - sourceUrl: String (notícia original)
  - sourceTitle: String
  - status: String enum ['pending', 'generating', 'draft', 'published', 'failed']
  - errorMessage: String (se failed)
  - creditsUsed: Number
  - content: String (armazenado como backup)
  - metaDescription: String
  - tags: Array of String
  - imageUrl: String
  - createdAt: Date
  - publishedAt: Date

**Model: Schedule**
- Schema:
  - userId: ObjectId, ref 'User', required, indexed
  - scheduledFor: Date, required, indexed
  - status: String enum ['pending', 'processing', 'completed', 'failed']
  - postId: ObjectId, ref 'Post'
  - attempts: Number, default 0
  - lastAttempt: Date
  - createdAt: Date

#### 4.2.4 Endpoints da API

**Autenticação**
- POST /api/auth/register
  - Body: {email, password}
  - Retorna: {token, user}
  - Validações: email válido, senha mínimo 8 caracteres
  - Cria usuário com créditos free

- POST /api/auth/login
  - Body: {email, password}
  - Retorna: {token, user}
  - Valida credenciais bcrypt

- GET /api/auth/me (autenticado)
  - Headers: Authorization Bearer token
  - Retorna: dados completos do usuário

**Configuração**
- GET /api/config (autenticado)
  - Retorna: {wordpress, schedule, content}

- POST /api/config/wordpress (autenticado)
  - Body: {url, username, password}
  - Testa conexão com WordPress REST API
  - Busca categorias disponíveis
  - Encrypta password antes de salvar
  - Retorna: {success, categories}

- PUT /api/config/schedule (autenticado)
  - Body: {postsPerDay, activeDays, times}
  - Valida: postsPerDay entre 1-6, times formato válido
  - Retorna: {success}

- PUT /api/config/content (autenticado)
  - Body: {topics, categoryMapping, language, postLength, autoPublish}
  - Valida: categoryMapping tem IDs válidos
  - Retorna: {success}

**Posts**
- GET /api/posts (autenticado)
  - Query params: ?page=1&limit=20&status=published&topic=AI
  - Retorna: {posts: [], total, page, pages}

- GET /api/posts/:id (autenticado)
  - Retorna: post completo
  - Valida: post pertence ao usuário

- DELETE /api/posts/:id (autenticado)
  - Soft delete (marca como deleted)
  - Opcional: deleta também no WordPress

**Agendamentos**
- GET /api/schedules (autenticado)
  - Query: ?upcoming=true (apenas futuros)
  - Retorna: array de schedules ordenados por data

**Créditos**
- GET /api/credits (autenticado)
  - Retorna: {current, history: [{date, operation, amount, balance}]}

- POST /api/credits/purchase (autenticado)
  - Body: {plan} ou {credits}
  - Integração com gateway de pagamento (Stripe)
  - Retorna: {paymentUrl} ou {success}

**Webhooks (chamados pelo n8n)**
- POST /api/webhook/post-status
  - Body: {userId, postId, status, url, error}
  - Autentica via secret token
  - Atualiza post no MongoDB
  - Notifica via WebSocket
  - Retorna: {received: true}

- POST /api/webhook/credits-usage
  - Body: {userId, operation, creditsUsed}
  - Desconta créditos do usuário
  - Registra no histórico
  - Retorna: {received: true, newBalance}

#### 4.2.5 Serviços Backend

**WordPressService**
- testConnection(url, username, password): Promise<{success, categories}>
  - Testa GET /wp-json/wp/v2/categories
  - Valida resposta
  - Retorna categorias ou erro

- getCategories(config): Promise<Array>
  - Busca todas categorias do site

- createPost(config, postData): Promise<{id, url}>
  - Executa upload de imagem
  - Cria/busca tags
  - Cria post
  - Retorna ID e URL

**CreditsService**
- deductCredits(userId, amount, operation): Promise<number>
  - Valida saldo suficiente
  - Decrementa créditos
  - Registra histórico
  - Retorna novo saldo

- addCredits(userId, amount, source): Promise<number>
  - Incrementa créditos
  - Registra origem (purchase, bonus)

- checkSufficient(userId, required): Promise<boolean>

**N8NService**
- triggerWorkflow(userId): Promise
  - Chama webhook do n8n para iniciar geração manual
  - Opcional: para feature de "gerar agora"

**WebSocketService**
- initialize(server): void
  - Configura socket.io
  - Gerencia rooms por userId

- notifyUser(userId, event, data): void
  - Emite evento para sala específica do usuário
  - Eventos: 'post:update', 'credits:update', 'schedule:created'

#### 4.2.6 Middlewares

**authMiddleware**
- Verifica presença de token JWT
- Valida token
- Adiciona userId ao req
- Retorna 401 se inválido

**validationMiddleware**
- Valida body, query, params usando Joi ou express-validator
- Retorna 400 com erros específicos

**errorHandler**
- Captura erros não tratados
- Logging adequado
- Retorna JSON estruturado
- Esconde detalhes internos em produção

#### 4.2.7 Segurança
- Helmet.js para headers HTTP seguros
- Rate limiting (express-rate-limit)
- CORS configurado corretamente
- Validação e sanitização de todas entradas
- Passwords hashed com bcrypt (salt rounds: 10)
- Dados sensíveis (WordPress password) encryptados com crypto
- Variáveis de ambiente para secrets

#### 4.2.8 Logging e Monitoramento
- Winston para logging estruturado
- Níveis: error, warn, info, debug
- Logs de: autenticação, operações de créditos, erros de integração
- Opcional: integração com Sentry para error tracking

---

### 4.3 EQUIPE N8N (Workflow Specialist)

#### 4.3.1 Responsabilidades Gerais
- Desenvolver workflow automatizado de geração de conteúdo
- Integrar com APIs externas (RSS, Scraping, LLM, Replicate, WordPress)
- Implementar tratamento de erros e retries
- Otimizar custos de operação (minimizar chamadas LLM)
- Garantir idempotência (não duplicar posts)
- Documentar cada node do workflow

#### 4.3.2 Visão Geral do Workflow

**Nome**: AutoBlog Content Generator
**Trigger**: Schedule (cron: a cada 1 hora)
**Duração média estimada**: 2-4 minutos por post
**Custo médio**: 0.47 créditos por post

#### 4.3.3 Detalhamento dos Nodes

**NODE 1: Schedule Trigger**
- Tipo: n8n-nodes-base.scheduleTrigger
- Configuração: Interval - Every 1 hour
- Output: timestamp da execução

**NODE 2: Query Active Users**
- Tipo: n8n-nodes-base.mongoDb
- Operação: Find
- Collection: users
- Query: 
  - isActive: true
  - credits > 0.5 (mínimo para 1 post)
- Output: array de usuários

**NODE 3: Filter Scheduled Users**
- Tipo: n8n-nodes-base.code (JavaScript)
- Lógica:
  - Para cada usuário, verificar se horário atual está em schedule.times
  - Verificar se dia da semana está em activeDays
  - Consultar collection schedules: não ter "pending" ou "processing" para usuário
  - Filtrar apenas usuários que devem ter post gerado agora
- Output: usuários filtrados (pode ser 0 se nenhum agendado)

**NODE 4: Loop Over Users**
- Tipo: n8n-nodes-base.splitInBatches
- Configuração: Batch size 1 (processa 1 usuário por vez)
- Output: dados de 1 usuário

**NODE 5: Create Schedule Entry**
- Tipo: n8n-nodes-base.mongoDb
- Operação: Insert
- Collection: schedules
- Data: {userId, scheduledFor: now, status: 'processing'}
- Finalidade: prevenir execuções duplicadas
- Output: scheduleId criado

**NODE 6: Get User Topics**
- Tipo: n8n-nodes-base.code
- Lógica: extrai topics do usuário atual
- Randomiza ordem (para variedade)
- Seleciona 1 topic para este post
- Output: {userId, topic, config}

**NODE 7: Fetch RSS Feeds**
- Tipo: n8n-nodes-base.rssFeedRead
- Configuração: 
  - URL dinâmica baseada no topic (mapeamento interno)
  - Fetch últimos 20 items
- Output: array de notícias do RSS

**NODE 8: Filter Recent News**
- Tipo: n8n-nodes-base.code
- Lógica:
  - Filtra notícias publicadas nas últimas 6 horas
  - Remove notícias já processadas (consulta collection posts por sourceUrl)
  - Ordena por data de publicação (mais recente primeiro)
- Output: notícias filtradas

**NODE 9: Select News Item**
- Tipo: n8n-nodes-base.code
- Lógica: seleciona primeira notícia do array filtrado
- Se array vazio: retorna erro (será tratado)
- Output: {title, link, contentSnippet}

**NODE 10: Scrape Full Article**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: webhook interno de scraping (pode usar Jina AI ou similar)
- Body: {url: link da notícia}
- Retry: 3 tentativas
- Output: {text_content, html_content}

**NODE 11: Relevance Check (LLM)**
- Tipo: @n8n/n8n-nodes-langchain.agent
- Model: OpenRouter (modelo econômico, ex: gpt-4o-mini)
- Prompt:
  ```
  Analise se esta notícia é relevante para um blog sobre {topic}.
  
  Critérios:
  - É uma notícia real (não propaganda ou review de produto)?
  - Está relacionada ao tema {topic}?
  - Tem conteúdo suficiente para artigo?
  
  Notícia:
  Título: {title}
  Conteúdo: {text_content}
  
  Retorne APENAS JSON:
  {
    "relevant": true/false,
    "reason": "breve explicação",
    "angle": "ângulo único para o artigo"
  }
  ```
- Output Parser: Structured JSON
- Output: {relevant, reason, angle}

**NODE 12: Check Relevance**
- Tipo: n8n-nodes-base.if
- Condição: relevant === true
- True: continua para geração
- False: retorna ao NODE 8 (tenta próxima notícia)
- Limite: após 3 tentativas sem sucesso, falha o schedule

**NODE 13: Generate Article (LLM Master)**
- Tipo: @n8n/n8n-nodes-langchain.agent
- Model: OpenRouter (modelo robusto, ex: gpt-4o)
- Temperatura: 0.7 (criatividade balanceada)
- Max tokens: 3000
- Prompt Master:
  ```
  Você é redator especializado em {topic}.
  
  NOTÍCIA FONTE:
  Título: {sourceTitle}
  URL: {sourceUrl}
  Conteúdo: {text_content}
  
  CONTEXTO:
  Blog do usuário sobre: {topic}
  Público: {language}
  Tamanho: {postLength} palavras
  
  TAREFA:
  Escreva artigo COMPLETO e ORIGINAL baseado nesta notícia.
  
  ESTRUTURA OBRIGATÓRIA:
  1. Título SEO-friendly (máximo 60 caracteres, inclua palavra-chave)
  2. Introdução (2 parágrafos contextualizando)
  3. Seção Principal 1 com <h2> (desenvolva o tema central)
  4. Seção Principal 2 com <h2> (análise ou impactos)
  5. Seção Principal 3 com <h2> (perspectivas futuras ou aplicações)
  6. Conclusão (1 parágrafo sintetizando)
  
  REQUISITOS CRÍTICOS:
  - Use HTML semântico: <h2>, <p>, <strong>, <em>, <ul>, <li>
  - NÃO copie frases literais da fonte
  - Adicione contexto e análise própria
  - Mencione fonte: "Segundo {sourceUrl}, ..."
  - Tom profissional mas acessível
  - Evite jargões excessivos
  - Use exemplos práticos quando possível
  
  RETORNE APENAS JSON:
  {
    "title": "título completo do artigo",
    "content": "<html>artigo completo formatado</html>",
    "metaDescription": "descrição 120-156 caracteres",
    "tags": ["tag1", "tag2", "tag3"],
    "imagePrompt": "detailed english prompt for AI image generation"
  }
  ```
- Output Parser: Structured JSON
- Output: objeto com artigo completo

**NODE 14: Validate Article Output**
- Tipo: n8n-nodes-base.code
- Lógica:
  - Verifica campos obrigatórios presentes
  - Conta palavras do content (mínimo 300)
  - Valida HTML básico (presença de tags)
  - Verifica meta description (100-160 chars)
  - Verifica tags (mínimo 2, máximo 5)
  - Conta caracteres do título (máximo 60)
- Se inválido: registra erro e finaliza
- Se válido: continua
- Output: {valid: boolean, issues: []}

**NODE 15: Generate Featured Image**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: Replicate API ou webhook interno
- Body: {prompt: imagePrompt}
- Configuração Replicate:
  - Model: stability-ai/sdxl ou flux-schnell
  - Parâmetros: width 1024, height 768, quality high
- Retry: 2 tentativas
- Timeout: 60 segundos
- Output: {imageUrl} ou {imageBase64}

**NODE 16: Download Image**
- Tipo: n8n-nodes-base.httpRequest
- URL: imageUrl do node anterior
- Response format: Binary
- Output: binary data da imagem

**NODE 17: Convert to WebP**
- Tipo: n8n-nodes-base.code
- Lógica: utiliza biblioteca sharp (se disponível) ou mantém formato original
- Otimiza qualidade/tamanho
- Output: binary otimizado

**NODE 18: Upload Image to WordPress**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: {wordpress.url}/wp-json/wp/v2/media
- Authentication: Basic Auth (username + application password)
- Headers:
  - Content-Disposition: attachment; filename="{sanitizedTitle}.webp"
  - Content-Type: image/webp
- Body: binary da imagem
- Retry: 3 tentativas
- Output: {id: mediaId, source_url}

**NODE 19: Process Tags**
- Tipo: n8n-nodes-base.code
- Lógica:
  - Para cada tag do artigo
  - Faz busca no WordPress: GET /wp-json/wp/v2/tags?search={tag}
  - Se encontrada: usa ID existente
  - Se não encontrada: cria nova: POST /wp-json/wp/v2/tags {name: tag}
  - Coleta array de IDs
- Output: {tagIds: [1, 5, 9]}

**NODE 20: Get Category IDs**
- Tipo: n8n-nodes-base.code
- Lógica:
  - Busca no config do usuário: categoryMapping[topic]
  - Retorna array de IDs de categorias WordPress
- Output: {categoryIds: [3, 7]}

**NODE 21: Create WordPress Post**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: {wordpress.url}/wp-json/wp/v2/posts
- Authentication: Basic Auth
- Headers: Content-Type: application/json
- Body JSON:
  ```
  {
    "title": "{title}",
    "content": "{content}",
    "status": "{autoPublish ? 'publish' : 'draft'}",
    "categories": [categoryIds],
    "tags": [tagIds],
    "featured_media": mediaId,
    "meta": {
      "description": "{metaDescription}"
    }
  }
  ```
- Retry: 3 tentativas com intervalo exponencial
- Output: {id: wpPostId, link: postUrl, status}

**NODE 22: Save to MongoDB**
- Tipo: n8n-nodes-base.mongoDb
- Operação: Insert
- Collection: posts
- Document:
  ```
  {
    userId: ObjectId,
    wpPostId: number,
    title: string,
    url: string,
    topic: string,
    sourceUrl: string,
    sourceTitle: string,
    status: 'published' or 'draft',
    content: string (backup),
    metaDescription: string,
    tags: array,
    imageUrl: string,
    creditsUsed: 0.47,
    createdAt: new Date(),
    publishedAt: new Date()
  }
  ```
- Output: {postId: insertedId}

**NODE 23: Update Schedule Status**
- Tipo: n8n-nodes-base.mongoDb
- Operação: Update
- Collection: schedules
- Filter: {_id: scheduleId}
- Update: {status: 'completed', postId: postId}

**NODE 24: Deduct Credits (Webhook)**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: {backend_url}/api/webhook/credits-usage
- Headers: 
  - X-Webhook-Secret: {secret}
- Body:
  ```
  {
    userId: string,
    operation: 'post_generation',
    creditsUsed: 0.47,
    postId: string
  }
  ```
- Output: {success, newBalance}

**NODE 25: Notify Dashboard (Webhook)**
- Tipo: n8n-nodes-base.httpRequest
- Método: POST
- URL: {backend_url}/api/webhook/post-status
- Headers: X-Webhook-Secret: {secret}
- Body:
  ```
  {
    userId: string,
    postId: string,
    status: 'published',
    url: postUrl,
    title: title
  }
  ```
- Output: {received: true}

**NODE 26: Error Handler (On Error Path)**
- Tipo: n8n-nodes-base.code
- Trigger: conectado a todos nodes críticos via error output
- Lógica:
  - Captura erro específico
  - Atualiza schedule: {status: 'failed', errorMessage}
  - Salva post com status 'failed'
  - NÃO desconta créditos
  - Chama webhook de notificação com erro
- Output: log estruturado

**NODE 27: Loop Continue**
- Tipo: conectado de volta ao NODE 4
- Processa próximo usuário se existir

#### 4.3.4 Mapeamento de RSS Feeds (Curadoria Interna)

Esta tabela deve ser mantida como configuração interna do workflow n8n:

**Inteligência Artificial**:
- https://rss.app/feeds/lEeeCZC0uYKTdWDN.xml (Google News IA)
- https://news.google.com/rss/search?q=artificial+intelligence&hl=pt-BR&gl=BR&ceid=BR:pt-419

**Tecnologia & Inovação**:
- https://rss.app/feeds/o4osESwXkMShHpq8.xml (Google News Tecnologia)
- https://techcrunch.com/feed/

**Negócios & Startups**:
- https://rss.app/feeds/h3TwN1YavdNBycDE.xml (Google News Negócios)
- https://startupi.com.br/feed/

**Ciência**:
- https://rss.app/feeds/av44dLPUZGfJfT4C.xml (Google News Ciência)

**Marketing Digital**:
- https://rss.app/feeds/yFeCQrUyJceC05QN.xml (Google News Marketing)
- https://neilpatel.com/br/feed/

#### 4.3.5 Tratamento de Erros por Tipo

**Erro: RSS Feed Indisponível**
- Retry: 2 tentativas com 30s intervalo
- Fallback: tenta próximo RSS do topic
- Se todos falham: registra erro, não desconta créditos, agenda retry para próxima hora

**Erro: Scraping Falhou**
- Retry: 3 tentativas
- Se falha: tenta próxima notícia do RSS
- Limite: 5 notícias tentadas

**Erro: LLM Timeout ou Rate Limit**
- Retry: após 60 segundos
- Se persiste: agenda para próxima hora, não desconta créditos

**Erro: LLM Retorna JSON Inválido**
- Retry: 1 tentativa com prompt ajustado ("CRITICAL: return ONLY valid JSON")
- Se falha: registra erro de qualidade, não desconta créditos

**Erro: Geração de Imagem Falha**
- Retry: 1 tentativa
- Fallback: usa imagem placeholder (URL padrão)
- Continua workflow normalmente

**Erro: WordPress API Não Responde**
- Retry: 3 tentativas exponenciais (5s, 15s, 45s)
- Se falha: salva post localmente no MongoDB com status 'failed'
- Notifica usuário: "Erro ao publicar, verifique conexão WordPress"
- Desconta créditos (conteúdo foi gerado)

**Erro: WordPress Autenticação Inválida**
- Não retry
- Atualiza status do usuário: wordpress.connectionError = true
- Notifica usuário via dashboard: "Reconecte seu WordPress"
- Não desconta créditos

**Erro: Créditos Insuficientes (detectado antes)**
- Para workflow imediatamente
- Não processa
- Notifica usuário: "Créditos insuficientes"

#### 4.3.6 Otimizações de Performance

**Cache de Categorias WordPress**:
- Armazenar categorias no MongoDB (user.wordpress.categories)
- Atualizar apenas quando usuário solicita
- Evita chamadas desnecessárias ao WordPress

**Batch Processing**:
- Processar usuários em paralelo (configurável, padrão: 3 simultâneos)
- Limitar para evitar sobrecarga de APIs externas

**Rate Limiting Interno**:
- LLM: máximo 10 chamadas/minuto
- Replicate: máximo 5 chamadas/minuto
- WordPress API: máximo 20 chamadas/minuto por site

**Idempotência**:
- Verificar sourceUrl antes de processar (evita duplicatas)
- Usar scheduleId como identificador único de execução
- Permitir retry seguro de qualquer node

#### 4.3.7 Monitoramento e Logs

**Logs Estruturados** (cada node importante):
- Timestamp
- ScheduleId
- UserId
- Node name
- Status (success/error)
- Duration
- Credits consumed
- Error details (se aplicável)

**Métricas a Capturar**:
- Total de posts gerados/hora
- Taxa de sucesso por etapa
- Tempo médio de execução
- Custo médio em créditos
- Taxa de erro por tipo
- Usuários ativos processados

**Alertas**:
- Taxa de erro acima de 20%
- LLM retornando JSON inválido frequentemente
- WordPress APIs com alta latência
- Créditos de usuários esgotando

---

## 5. INTEGRAÇÃO ENTRE COMPONENTES

### 5.1 Fluxo de Dados: Frontend → Backend

**Exemplo: Usuário Salva Configuração de Schedule**

1. Usuário ajusta slider "Posts por dia" para 3
2. Angular: ScheduleConfigForm emite evento
3. Angular: ConfigService.updateSchedule() chamado
4. HTTP PUT /api/config/schedule com body: {postsPerDay: 3, ...}
5. Backend: auth middleware valida token
6. Backend: validation middleware valida dados
7. Backend: ConfigController.updateSchedule() executa
8. Backend: MongoDB User.findByIdAndUpdate()
9. Backend: Retorna {success: true}
10. Angular: Exibe toast "Configuração salva"
11. Angular: Atualiza estado local

### 5.2 Fluxo de Dados: n8n → Backend → Frontend

**Exemplo: Post Publicado com Sucesso**

1. n8n: NODE 21 cria post no WordPress
2. n8n: NODE 22 salva no MongoDB (collection posts)
3. n8n: NODE 24 chama webhook /api/webhook/credits-usage
4. Backend: Desconta créditos do usuário
5. n8n: NODE 25 chama webhook /api/webhook/post-status
6. Backend: WebhookController recebe dados
7. Backend: Valida secret token
8. Backend: WebSocketService.notifyUser(userId, 'post:update', data)
9. Frontend: WebSocketService listener recebe evento
10. Frontend: PostsService adiciona novo post ao estado
11. Frontend: Dashboard atualiza lista automaticamente
12. Frontend: Exibe notificação toast: "Novo post publicado!"

### 5.3 Fluxo de Dados: Backend → n8n

**Exemplo: Trigger Manual de Geração (Feature Opcional)**

1. Usuário clica botão "Gerar Post Agora" no dashboard
2. Angular: POST /api/posts/generate
3. Backend: Verifica créditos suficientes
4. Backend: Cria schedule com scheduledFor = now
5. Backend: N8NService.triggerWorkflow(userId)
6. Backend: Chama webhook do n8n: POST {n8n_webhook_url}
7. n8n: Workflow inicia a partir do NODE 4 (com userId específico)
8. [Fluxo normal de geração continua...]

---

## 6. SISTEMA DE CRÉDITOS

### 6.1 Estrutura de Custos

**Operações e Custos**:
- Busca e scraping de conteúdo: 0.02 créditos
- Análise de relevância (LLM pequeno): 0.05 créditos
- Geração de artigo (LLM grande): 0.25 créditos
- Geração de imagem (Replicate): 0.15 créditos
- **Total por post**: 0.47 créditos

**Arredondamento**: 0.50 créditos para simplificar

### 6.2 Planos de Assinatura

**Plano Free**:
- Preço: R$ 0
- Créditos mensais: 2.5 (5 posts)
- Posts por mês: 5
- Recursos: todos básicos
- Suporte: comunidade

**Plano Starter**:
- Preço: R$ 29/mês
- Créditos mensais: 15 (30 posts)
- Posts por mês: 30
- Recursos: todos + preview antes de publicar
- Suporte: email (48h)

**Plano Pro**:
- Preço: R$ 79/mês
- Créditos mensais: 50 (100 posts)
- Posts por mês: 100
- Recursos: todos + múltiplos tópicos + prioridade
- Suporte: email (24h) + chat

**Plano Enterprise** (futuro):
- Preço: R$ 199/mês
- Créditos: ilimitados
- Posts: ilimitados
- Recursos: white-label + API + webhooks personalizados
- Suporte: dedicado

### 6.3 Compra Avulsa de Créditos

**Pacotes**:
- 5 créditos (10 posts): R$ 15
- 15 créditos (30 posts): R$ 39
- 30 créditos (60 posts): R$ 69
- 50 créditos (100 posts): R$ 99

**Características**:
- Créditos avulsos não expiram
- Acumulam com créditos da assinatura
- Uso prioritário: primeiro avulsos, depois mensais

### 6.4 Regras de Uso

**Desconto de Créditos**:
- Momento: após geração bem-sucedida do artigo (antes de publicar no WordPress)
- Se publicação no WordPress falha: créditos NÃO são devolvidos (conteúdo foi gerado)
- Se geração falha (erro de LLM, etc): créditos NÃO são descontados

**Renovação Mensal**:
- Dia da renovação: mesmo dia da contratação
- Créditos mensais NÃO acumulam (use ou perca)
- Créditos avulsos são preservados

**Proteções**:
- Não permitir agendamento se créditos < 1
- Pausar workflow se créditos acabam durante execução
- Notificar usuário quando créditos < 10% do plano

---

## 7. REQUISITOS TÉCNICOS GERAIS

### 7.1 Tecnologias Obrigatórias

**Frontend**:
- Angular 17+
- TypeScript 5+
- Angular Material ou Tailwind CSS
- Socket.io-client
- RxJS

**Backend**:
- Node.js 20+
- Express.js 4+
- MongoDB 7+ (via Mongoose)
- Socket.io
- JWT (jsonwebtoken)
- bcrypt
- Joi ou express-validator

**n8n**:
- n8n versão 1.40+
- Nodes: MongoDB, HTTP Request, Code, LangChain, Schedule Trigger
- OpenRouter integration
- Replicate integration

**Infraestrutura**:
- MongoDB Atlas ou self-hosted
- n8n cloud ou self-hosted
- Backend em servidor Node (VPS, AWS, etc)
- Frontend: Vercel, Netlify ou similar

### 7.2 Variáveis de Ambiente

**Backend (.env)**:
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=random_secret_key
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=32_byte_key_for_passwords
N8N_WEBHOOK_SECRET=shared_secret_with_n8n
N8N_TRIGGER_URL=https://n8n.url/webhook/trigger
FRONTEND_URL=https://app.autoblog.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**n8n (Environment Variables)**:
```
OPENROUTER_API_KEY=sk-or-...
REPLICATE_API_TOKEN=r8_...
BACKEND_WEBHOOK_URL=https://api.autoblog.com/api/webhook
BACKEND_WEBHOOK_SECRET=shared_secret
MONGODB_URI=mongodb+srv://...
```

### 7.3 Segurança

**Autenticação WordPress**:
- Usar Application Passwords (WordPress 5.6+)
- Não aceitar senha principal
- Validar permissões: publicar posts, upload de mídia

**Secrets**:
- Nunca commitar .env
- Usar gerenciador de secrets em produção (AWS Secrets Manager, etc)
- Rotacionar secrets regularmente

**Rate Limiting**:
- API pública: 100 req/15min por IP
- API autenticada: 1000 req/15min por usuário
- Webhooks n8n: autenticação via secret token

**HTTPS**:
- Obrigatório em produção (frontend e backend)
- Certificados SSL válidos

### 7.4 Performance

**Frontend**:
- Lazy loading de rotas
- Virtual scrolling em listas longas (>50 items)
- Debounce em inputs de busca (300ms)
- Cache de configurações no localStorage
- Otimizar bundle size (<500KB initial)

**Backend**:
- Indexes MongoDB:
  - users: email (unique)
  - posts: userId + createdAt
  - schedules: userId + scheduledFor
- Connection pooling MongoDB
- Caching de dados WordPress (categorias) por 1 hora
- Compressão gzip de responses

**n8n**:
- Limitar processamento paralelo (3-5 usuários simultâneos)
- Timeout adequado por node (LLM: 120s, Imagem: 60s)
- Cleanup de dados antigos (schedules >7 dias)

### 7.5 Escalabilidade

**Limites Iniciais** (MVP):
- 100 usuários ativos simultâneos
- 1000 posts gerados/dia
- 50 requisições/segundo (backend)

**Plano de Escala** (futuro):
- Adicionar mais workers n8n
- Load balancer para backend
- Sharding MongoDB se necessário
- CDN para assets frontend

---

## 8. ENTREGÁVEIS E CRONOGRAMA

### 8.1 Fase 1: MVP Core (4 semanas)

**Semana 1-2: Backend + Infraestrutura**
- Setup do projeto Node.js
- Modelos MongoDB (User, Post, Schedule)
- APIs de autenticação (register, login)
- APIs de configuração (WordPress, schedule, content)
- Sistema de créditos básico
- WebSocket server setup
- Testes unitários de serviços críticos

**Semana 2-3: Frontend Base**
- Setup projeto Angular
- Wizard de onboarding (3 steps)
- Dashboard principal (layout)
- Integração com APIs backend
- WebSocket client
- Autenticação e guards
- Responsividade básica

**Semana 3-4: n8n Workflow**
- Criação do workflow completo
- Integração com MongoDB
- Integração OpenRouter (LLM)
- Integração Replicate (imagem)
- Integração WordPress REST API
- Tratamento de erros básico
- Webhooks para backend

**Semana 4: Integração e Testes**
- Testes end-to-end completos
- Ajustes de prompts LLM
- Otimização de custos
- Correções de bugs
- Documentação básica

### 8.2 Fase 2: Polimento e Features (2 semanas)

**Semana 5: UX e Validações**
- Preview de posts antes de publicar
- Edição de posts em draft
- Validações avançadas frontend
- Mensagens de erro amigáveis
- Loading states e skeletons
- Notificações toast

**Semana 6: Otimizações**
- Quality checks automatizados n8n
- Retry inteligente de operações
- Caching estratégico
- Monitoramento de performance
- Ajustes de segurança
- Testes de carga

### 8.3 Fase 3: Beta e Lançamento (2 semanas)

**Semana 7: Beta Testing**
- Recrutar 10 beta testers
- Onboarding assistido
- Coleta de feedback
- Correções prioritárias
- Ajustes de prompts baseados em output real
- Otimização de custos operacionais

**Semana 8: Lançamento**
- Deploy produção (backend + frontend)
- Configuração DNS e SSL
- Setup monitoring (logs, errors, uptime)
- Integração gateway de pagamento
- Landing page de marketing
- Documentação de usuário
- Launch soft (early adopters)

### 8.4 Pós-Lançamento (Ongoing)

**Mês 2+**:
- Suporte a usuários
- Correções de bugs reportados
- Otimizações de custo (ajuste de prompts)
- Novos tópicos e RSS feeds
- Features adicionais (baseado em feedback)
- Melhorias de SEO dos artigos gerados

---

## 9. CRITÉRIOS DE SUCESSO

### 9.1 Métricas Técnicas

**Performance**:
- Tempo médio de geração de post: < 3 minutos
- Uptime do sistema: > 99%
- Taxa de sucesso de geração: > 90%
- Latência API backend: < 200ms (p95)

**Qualidade**:
- Posts sem erros HTML: > 95%
- Posts com imagem adequada: > 90%
- Taxa de aprovação em preview (usuários): > 80%
- Reclamações sobre qualidade: < 5%

**Custo**:
- Custo por post gerado: < R$ 0.30
- Margem de lucro por plano: > 60%

### 9.2 Métricas de Produto

**Adoção**:
- 100 usuários cadastrados no primeiro mês
- 30 usuários ativos (gerando posts) no primeiro mês
- Taxa de conversão free → pago: > 10%

**Retenção**:
- Taxa de churn mensal: < 15%
- Usuários ativos após 3 meses: > 50%

**Satisfação**:
- NPS (Net Promoter Score): > 40
- Rating na landing page: > 4.0/5.0

### 9.3 Funcionalidades Obrigatórias para Launch

**MVP Must-Have**:
- [x] Wizard de onboarding funcional
- [x] Conexão com WordPress testada e estável
- [x] Geração automática de posts em horários programados
- [x] Artigos com qualidade mínima (300+ palavras, HTML válido)
- [x] Imagens geradas e aplicadas corretamente
- [x] Sistema de créditos funcionando
- [x] Dashboard mostrando posts gerados
- [x] Notificações de status em tempo real
- [x] Tratamento de erros com fallbacks

**Nice-to-Have** (pode ser pós-launch):
- [ ] Preview editável antes de publicar
- [ ] Estatísticas de performance dos posts
- [ ] Sugestões de melhoria de SEO
- [ ] Integração com Google Analytics
- [ ] Múltiplos blogs por usuário
- [ ] Agendamento customizado por post
- [ ] Templates de artigo personalizáveis

---

## 10. RISCOS E MITIGAÇÕES

### 10.1 Riscos Técnicos

**Risco 1: LLM gera conteúdo de baixa qualidade**
- Probabilidade: Média
- Impacto: Alto
- Mitigação:
  - Iterar constantemente nos prompts
  - Implementar quality checks automatizados
  - Permitir preview e edição
  - Coletar feedback de usuários beta
  - Ter fallback para modo "assisted" (usuário valida antes)

**Risco 2: APIs externas (OpenRouter, Replicate) instáveis**
- Probabilidade: Média
- Impacto: Alto
- Mitigação:
  - Implementar retries exponenciais
  - Ter múltiplos providers como fallback
  - Cache de resultados quando possível
  - Monitoramento proativo com alertas

**Risco 3: WordPress REST API incompatibilidades**
- Probabilidade: Alta (diversos setups de usuários)
- Impacto: Alto
- Mitigação:
  - Testar em múltiplas versões WP (5.6 a 6.4+)
  - Testar com diversos hosts (WP Engine, SiteGround, etc)
  - Documentação clara de requisitos mínimos
  - Diagnóstico automatizado na conexão
  - Suporte dedicado para troubleshooting

**Risco 4: Custos operacionais maiores que o esperado**
- Probabilidade: Média
- Impacto: Alto (viabilidade do negócio)
- Mitigação:
  - Monitorar custos por post rigorosamente
  - Otimizar prompts para reduzir tokens
  - Negociar volume com providers
  - Ajustar precificação se necessário
  - Implementar limites e quotas

**Risco 5: Escalabilidade do n8n**
- Probabilidade: Média (se crescimento rápido)
- Impacto: Médio
- Mitigação:
  - Arquitetar para horizontal scaling desde início
  - Usar n8n workers múltiplos
  - Queue system para processamento
  - Load testing antes de marketing agressivo

### 10.2 Riscos de Produto

**Risco 6: Usuários insatisfeitos com qualidade do conteúdo**
- Probabilidade: Alta (expectativas variadas)
- Impacto: Alto (churn)
- Mitigação:
  - Gerenciar expectativas no onboarding
  - Mostrar exemplos reais antes de contratar
  - Permitir customização de tom e estilo
  - Oferecer modo "aprovação manual"
  - Suporte ativo para ajustes

**Risco 7: Baixa adoção (produto muito nichado)**
- Probabilidade: Média
- Impacto: Alto
- Mitigação:
  - Validar com beta testers antes de launch
  - Freemium generoso para testar
  - Marketing educacional (mostrar valor)
  - Parcerias com comunidades WordPress
  - Casos de uso específicos (blogs de nicho, afiliados)

**Risco 8: Concorrência de ferramentas similares**
- Probabilidade: Alta
- Impacto: Médio
- Mitigação:
  - Foco na simplicidade (diferencial)
  - Preço competitivo
  - Qualidade superior de output
  - Suporte humanizado
  - Integrações exclusivas

### 10.3 Riscos Legais/Éticos

**Risco 9: Conteúdo gerado viola direitos autorais**
- Probabilidade: Baixa (LLM gera original)
- Impacto: Alto
- Mitigação:
  - Prompt explícito: "não copie texto literal"
  - Quality check: detectar similaridade alta com fonte
  - Sempre citar fonte original
  - Termos de uso claros (responsabilidade do usuário)
  - Seguro de responsabilidade civil

**Risco 10: Uso indevido para spam ou desinformação**
- Probabilidade: Média
- Impacto: Alto (reputação)
- Mitigação:
  - Moderação de tópicos (aprovar personalizados)
  - Detectar padrões de abuso (volume suspeito)
  - Banir usuários infratores
  - Não permitir tópicos sensíveis (política, saúde sem disclaimers)
  - Compliance com plataformas (WordPress.org terms)

---

## 11. DOCUMENTAÇÃO REQUERIDA

### 11.1 Documentação Técnica (Para Equipes)

**Backend**:
- README.md com setup local
- Documentação de APIs (Swagger/OpenAPI)
- Diagramas de arquitetura
- Schema do banco de dados (ER diagram)
- Guia de deployment
- Troubleshooting guide

**Frontend**:
- README.md com setup local
- Guia de componentes (Storybook opcional)
- Convenções de código
- Fluxos de usuário (diagramas)
- Guia de contribuição

**n8n**:
- JSON exportado do workflow (versionado)
- Documentação de cada node
- Mapeamento de RSS feeds
- Guia de troubleshooting por tipo de erro
- Métricas e logs explicados
- Guia de otimização de custos

### 11.2 Documentação de Usuário

**Guia de Início Rápido**:
- Como criar conta
- Como conectar WordPress (com screenshots)
- Como configurar primeiro post
- FAQ básico

**Base de Conhecimento**:
- Como funcionam os créditos
- Como escolher tópicos efetivos
- Como mapear categorias
- Troubleshooting de conexão WordPress
- Como adicionar application password no WP
- Melhores práticas para qualidade de posts

**Vídeos Tutoriais** (nice-to-have):
- Onboarding completo (3-5 min)
- Configurando categorias (2 min)
- Entendendo o dashboard (3 min)

### 11.3 Documentação de Processos

**Onboarding de Novos Desenvolvedores**:
- Setup completo do ambiente local
- Arquitetura geral do sistema
- Como rodar testes
- Como fazer deploy
- Convenções de commit e PR

**Runbooks Operacionais**:
- Como investigar post que falhou
- Como adicionar novo RSS feed
- Como ajustar prompt do LLM
- Como fazer rollback de deploy
- Como escalar n8n workers
- Como responder a incidentes (downtime)

---

## 12. DEFINIÇÃO DE PRONTO (DEFINITION OF DONE)

### 12.1 Para Features de Backend

Uma feature está pronta quando:
- [ ] Código implementado e revisado (code review)
- [ ] Testes unitários escritos (cobertura >80%)
- [ ] Testes de integração passando
- [ ] Documentação da API atualizada
- [ ] Validações de entrada implementadas
- [ ] Tratamento de erros adequado
- [ ] Logs estruturados adicionados
- [ ] Deploy em staging realizado e testado
- [ ] QA aprovado

### 12.2 Para Features de Frontend

Uma feature está pronta quando:
- [ ] Componente implementado e funcional
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessibilidade básica (teclado, screen readers)
- [ ] Integração com backend testada
- [ ] Loading states e error states implementados
- [ ] Code review aprovado
- [ ] Testes E2E críticos passando
- [ ] Deploy em staging realizado
- [ ] QA aprovado (UX e funcionalidade)

### 12.3 Para Workflows n8n

Um workflow está pronto quando:
- [ ] Todos nodes configurados corretamente
- [ ] Tratamento de erros em todos caminhos críticos
- [ ] Testes manuais com dados reais passando
- [ ] Custos de operação medidos e dentro do esperado
- [ ] Documentação de cada node completa
- [ ] Logs e métricas configurados
- [ ] JSON exportado e versionado
- [ ] Testado com múltiplos usuários (mínimo 3)
- [ ] Performance adequada (tempo <5min por post)
- [ ] Aprovado por tech lead

---

## 13. COMUNICAÇÃO E COLABORAÇÃO

### 13.1 Estrutura da Equipe

**Equipe Mínima (MVP)**:
- 1 Product Owner / Project Manager
- 1 Backend Developer (Node.js)
- 1 Frontend Developer (Angular)
- 1 n8n Specialist / Automation Engineer
- 1 QA / Tester (part-time)
- 1 Designer UI/UX (part-time ou freelancer)

**Responsabilidades Compartilhadas**:
- Todos participam de planning e retrospectives
- Backend e n8n colaboram em APIs e webhooks
- Frontend e Designer colaboram em UX
- QA testa todas as camadas

### 13.2 Rituais Ágeis

**Daily Standup** (15 min, todos os dias):
- O que fiz ontem
- O que farei hoje
- Bloqueios / preciso de ajuda

**Sprint Planning** (2h, a cada 2 semanas):
- Revisar backlog
- Estimar tarefas
- Comprometer com sprint
- Definir critérios de aceitação

**Sprint Review** (1h, fim de cada sprint):
- Demo de features completas
- Feedback do PO
- Ajustes no backlog

**Retrospective** (1h, fim de cada sprint):
- O que foi bem
- O que melhorar
- Ações concretas

**Refinamento de Backlog** (1h, meio da sprint):
- Detalhar próximas histórias
- Esclarecer dúvidas técnicas
- Estimar complexidade

### 13.3 Ferramentas de Colaboração

**Gerenciamento de Projeto**:
- Jira, Linear, ou Trello
- Board com colunas: Backlog, To Do, In Progress, Review, Done
- Histórias com critérios de aceitação claros

**Comunicação**:
- Slack ou Discord (canais: #geral, #backend, #frontend, #n8n, #bugs)
- Reuniões via Google Meet ou Zoom
- Assíncrono preferido, síncrono quando necessário

**Código**:
- GitHub ou GitLab
- Branching strategy: Git Flow
  - main: produção
  - develop: desenvolvimento
  - feature/*: features individuais
  - hotfix/*: correções urgentes
- Pull Requests obrigatórios com review
- CI/CD pipeline automático

**Documentação**:
- Notion, Confluence, ou GitBook
- Centralizada e linkada no README
- Atualizada a cada feature

**Design**:
- Figma para wireframes e protótipos
- Compartilhado com frontend e PO

---

## 14. TESTES E QUALIDADE

### 14.1 Estratégia de Testes Backend

**Testes Unitários** (Jest):
- Serviços isolados (CreditsService, WordPressService)
- Controllers (com mocks de DB)
- Utils e helpers
- Cobertura alvo: >80%

**Testes de Integração**:
- Endpoints de API completos
- Conexão real com MongoDB de teste
- Validação de schemas
- Autenticação e autorização

**Testes E2E** (Supertest):
- Fluxos críticos: register → login → config → webhook
- Simulação de webhooks do n8n
- Validação de websockets

### 14.2 Estratégia de Testes Frontend

**Testes Unitários** (Jasmine/Karma):
- Serviços (AuthService, ConfigService)
- Pipes e utils
- Componentes isolados (com mocks)

**Testes de Integração**:
- Componentes com serviços reais
- Fluxos de formulários
- Navegação entre rotas

**Testes E2E** (Cypress ou Playwright):
- Wizard de onboarding completo
- Login e logout
- Criar e visualizar posts
- Atualizar configurações

### 14.3 Estratégia de Testes n8n

**Testes Manuais** (estruturados):
- Checklist por node
- Cenários de sucesso e falha
- Validação de outputs
- Teste com dados reais de produção (em staging)

**Testes de Carga**:
- Simular 10 usuários simultâneos
- Validar rate limiting de APIs externas
- Medir tempo de execução sob carga
- Verificar consumo de recursos

**Testes de Resiliência**:
- Simular falhas de APIs externas
- Validar retries e fallbacks
- Testar idempotência (executar 2x mesmo schedule)
- Recovery de erros parciais

### 14.4 QA Manual

**Checklist de Funcionalidades**:
- [ ] Cadastro e login funcionam
- [ ] Wizard completa e salva dados
- [ ] Conexão WordPress testada com site real
- [ ] Agendamento cria schedules no MongoDB
- [ ] n8n gera post automaticamente no horário
- [ ] Post aparece no WordPress
- [ ] Dashboard mostra post criado
- [ ] Notificação em tempo real funciona
- [ ] Créditos são descontados corretamente
- [ ] Edição de configurações persiste
- [ ] Erros são tratados graciosamente

**Checklist de UX**:
- [ ] Navegação intuitiva
- [ ] Mensagens de erro claras
- [ ] Loading states apropriados
- [ ] Responsivo em mobile
- [ ] Sem bugs visuais (CSS, layout)
- [ ] Performance adequada (sem lentidão)

**Testes de Compatibilidade**:
- Navegadores: Chrome, Firefox, Safari, Edge
- Dispositivos: Desktop, tablet, mobile
- WordPress: versões 5.6, 6.0, 6.4
- Hosts: SiteGround, Hostinger, WordPress.com

---

## 15. DEPLOYMENT E INFRAESTRUTURA

### 15.1 Ambientes

**Desenvolvimento** (local):
- Cada desenvolvedor roda localmente
- MongoDB local ou shared dev instance
- n8n local ou shared dev instance
- Variáveis de ambiente .env.local

**Staging**:
- Réplica de produção
- Dados de teste
- Usado para QA e demos
- Deploy automático de branch develop

**Produção**:
- Ambiente final de usuários
- Deploy manual ou automático (de main)
- Monitoramento ativo
- Backups automáticos

### 15.2 Stack de Infraestrutura Sugerida

**Frontend**:
- Hosting: Vercel ou Netlify
- Domínio: app.autoblog.ai
- CDN: automático (Vercel/Netlify)
- SSL: automático

**Backend**:
- Servidor: DigitalOcean Droplet / AWS EC2 / Railway
- OS: Ubuntu 22.04 LTS
- Runtime: Node.js 20 LTS via NVM
- Process Manager: PM2
- Proxy: Nginx
- Domínio: api.autoblog.ai
- SSL: Let's Encrypt (certbot)

**Banco de Dados**:
- MongoDB Atlas (cluster M10 para início)
- Backup automático diário
- Replica set para alta disponibilidade

**n8n**:
- n8n Cloud (plano Starter) ou
- Self-hosted em VPS separado
- Domínio: n8n.autoblog.ai
- Persistência: PostgreSQL ou MongoDB

**Monitoramento**:
- Logs: Winston → CloudWatch ou Papertrail
- Uptime: UptimeRobot ou Pingdom
- Errors: Sentry
- Analytics: PostHog ou Mixpanel (produto)

### 15.3 Processo de Deploy

**Backend (CI/CD)**:
1. Push para branch develop ou main
2. GitHub Actions trigger
3. Run tests (unit + integration)
4. Build (transpile TypeScript)
5. Se main: deploy para produção via SSH
6. Se develop: deploy para staging
7. PM2 restart
8. Health check (GET /health)
9. Notificação Slack de sucesso/falha

**Frontend**:
1. Push para branch
2. Vercel/Netlify detecta automaticamente
3. Build (ng build --configuration production)
4. Deploy automático
5. Preview URL para develop
6. Produção para main

**n8n**:
1. Exportar workflow como JSON
2. Commit no repositório (version control)
3. Importar manualmente no n8n staging
4. Testar
5. Importar no n8n produção
6. Ativar workflow

### 15.4 Rollback Plan

**Backend**:
- Manter últimas 3 versões em servidor
- PM2 permite rollback rápido: `pm2 start <prev-version>`
- Backup de .env em vault
- Tempo de rollback alvo: <5 minutos

**Frontend**:
- Vercel/Netlify mantém histórico de deploys
- Rollback com 1 clique
- Tempo de rollback: <2 minutos

**Banco de Dados**:
- Migrations versionadas (não rodar para trás sem plano)
- Backup diário restaurável
- Plano de rollback de schema documentado

**n8n**:
- Versões anteriores de workflows no Git
- Re-importar versão anterior se necessário
- Tempo de rollback: ~10 minutos

---

## 16. MONITORAMENTO E ALERTAS

### 16.1 Métricas de Sistema

**Backend**:
- Requisições/segundo
- Latência (p50, p95, p99)
- Taxa de erro (5xx)
- Uso de CPU e memória
- Conexões ativas MongoDB

**Frontend**:
- Page load time
- Time to interactive
- Erros JavaScript (Sentry)
- Taxa de bounce

**n8n**:
- Workflows executados/hora
- Taxa de sucesso
- Tempo médio de execução
- Custos de LLM e Replicate
- Filas de processamento

### 16.2 Alertas Críticos

**Alerta 1: API Down**
- Trigger: 5xx errors >10% por 2 minutos
- Ação: notificar DevOps via PagerDuty/SMS
- SLA de resposta: 15 minutos

**Alerta 2: n8n Workflow Falhando**
- Trigger: taxa de falha >30% em 1 hora
- Ação: notificar n8n specialist + DevOps
- Investigar: logs, APIs externas, créditos

**Alerta 3: MongoDB Lento**
- Trigger: queries >1s (p95)
- Ação: revisar indexes, considerar scaling

**Alerta 4: Custos Operacionais Alto**
- Trigger: custo por post >R$ 0.50
- Ação: revisar prompts LLM, otimizar tokens

**Alerta 5: Usuário Sem Créditos**
- Trigger: créditos <1 e schedule ativo
- Ação: enviar email notificação automática

### 16.3 Dashboard de Monitoramento

**Grafana Dashboard** (ou similar):
- Painel 1: Saúde Geral (uptime, latência, erros)
- Painel 2: Métricas de Negócio (posts gerados, usuários ativos, conversões)
- Painel 3: n8n Operations (workflows, custos, performance)
- Painel 4: Finanças (receita, MRR, churn, CAC)

---

## 17. SUPORTE E MANUTENÇÃO

### 17.1 Canais de Suporte

**Plano Free**:
- Base de conhecimento (self-service)
- FAQ
- Comunidade Discord (usuários ajudam usuários)

**Plano Starter**:
- Tudo do Free +
- Email support (resposta em 48h)
- Tickets via sistema

**Plano Pro**:
- Tudo do Starter +
- Email prioritário (resposta em 24h)
- Chat ao vivo (horário comercial)

**Plano Enterprise** (futuro):
- Suporte dedicado
- Slack connect
- SLA customizado

### 17.2 SLA de Resposta

**Incidentes Críticos** (sistema down):
- Detecção: <5 minutos (monitoring)
- Resposta inicial: <15 minutos
- Resolução alvo: <2 horas
- Comunicação: status page atualizado a cada 30min

**Bugs Não-Críticos**:
- Resposta: <48h
- Fix: conforme severidade (próximo sprint ou hotfix)

**Solicitações de Feature**:
- Resposta: "obrigado, vamos avaliar"
- Avaliação: em refinamento de backlog
- Timeline: sem garantia

### 17.3 Manutenção Regular

**Semanal**:
- Review de logs de erro
- Análise de custos operacionais
- Verificação de qualidade de posts gerados
- Resposta a tickets de suporte

**Mensal**:
- Atualização de dependências (security patches)
- Revisão de métricas de produto
- Ajustes de prompts LLM baseado em feedback
- Limpeza de dados antigos (schedules >30 dias)

**Trimestral**:
- Review de infraestrutura (scaling needs)
- Análise de churn e satisfação
- Planning de features maiores
- Auditoria de segurança

---

## 18. PRÓXIMOS PASSOS IMEDIATOS

### 18.1 Pré-Desenvolvimento (Semana 0)

**Decisões de Produto**:
- [ ] Validar planos e precificação com pesquisa de mercado
- [ ] Definir tópicos iniciais (5-10 principais)
- [ ] Escrever 3 exemplos de artigos "ideais" (referência para LLM)
- [ ] Decidir nome final e domínio

**Setup Técnico**:
- [ ] Provisionar MongoDB Atlas (cluster desenvolvimento)
- [ ] Setup n8n (cloud ou VPS)
- [ ] Criar repositórios Git (monorepo ou multi-repo)
- [ ] Configurar ambientes (dev, staging, prod)
- [ ] Setup CI/CD básico

**Design**:
- [ ] Wireframes de todas as telas principais
- [ ] Design system (cores, tipografia, componentes)
- [ ] Protótipo clicável do wizard de onboarding
- [ ] Aprovação de UX pelo time

### 18.2 Kickoff (Dia 1)

**Reunião de Kickoff** (2h, todo o time):
- Apresentação completa deste documento
- Q&A e esclarecimentos
- Divisão de responsabilidades
- Setup de ferramentas de comunicação
- Primeira sprint planning

**Tarefas Imediatas**:
- Backend: setup projeto + models + auth básico
- Frontend: setup projeto + wizard layout
- n8n: importar workflows base + testar integrações básicas
- Todos: environment setup local funcionando

### 18.3 Validação Contínua

**Checkpoints Semanais**:
- Sprint review: demo de progresso
- Integração entre componentes funcionando?
- Bloqueios técnicos identificados e resolvidos
- Ajustes de escopo se necessário

**Beta Launch Checklist**:
- [ ] Todos funcionalidades MVP completos
- [ ] Testes E2E passando
- [ ] 3 posts gerados com sucesso em ambiente staging
- [ ] WordPress de teste conectado e publicando
- [ ] Créditos sendo descontados corretamente
- [ ] Dashboard mostrando dados em tempo real
- [ ] Documentação de usuário básica pronta

---

## 19. CONTATOS E RESPONSÁVEIS

### 19.1 Pontos Focais por Área

**Product Owner / Project Manager**:
- Nome: [A definir]
- Responsabilidades: visão de produto, priorização, comunicação com stakeholders
- Contato: email / Slack

**Backend Lead**:
- Nome: [A definir]
- Responsabilidades: arquitetura backend, APIs, integrações, banco de dados
- Contato: email / Slack / GitHub: @username

**Frontend Lead**:
- Nome: [A definir]
- Responsabilidades: arquitetura frontend, UX implementation, integração APIs
- Contato: email / Slack / GitHub: @username

**n8n Specialist**:
- Nome: [A definir]
- Responsabilidades: workflows, automações, otimização de custos, integrações LLM
- Contato: email / Slack

**QA / Tester**:
- Nome: [A definir]
- Responsabilidades: testes manuais, E2E, reporte de bugs, validação de releases
- Contato: email / Slack

### 19.2 Escalação de Problemas

**Nível 1**: Desenvolvedor responsável pela área
**Nível 2**: Tech Lead da área
**Nível 3**: Product Owner / CTO
**Nível 4**: CEO / Founder (apenas incidentes críticos)

### 19.3 Horários de Disponibilidade

**Desenvolvimento**: Segunda a Sexta, 9h-18h (timezone: UTC-3)
**Plantão de Incidentes**: Rotativo entre tech leads
**Suporte a Usuários**: Segunda a Sexta, 9h-18h

---

## 20. GLOSSÁRIO

**Application Password**: Senha gerada pelo WordPress especificamente para acesso via API, sem expor a senha principal da conta.

**Credits**: Unidade de cobrança interna da plataforma. Cada operação consome uma quantidade específica de créditos.

**Draft**: Post criado no WordPress mas não publicado, permanece privado até aprovação manual.

**Featured Image**: Imagem principal de um post WordPress, exibida em destaque no blog.

**LLM**: Large Language Model - modelo de inteligência artificial para geração de texto (ex: GPT-4, Claude).

**MRR**: Monthly Recurring Revenue - receita recorrente mensal de assinaturas.

**Prompt**: Instruções em linguagem natural enviadas a um LLM para gerar conteúdo específico.

**REST API**: Interface de programação que permite comunicação entre sistemas via HTTP.

**RSS Feed**: Formato de distribuição de conteúdo que permite agregação automática de notícias.

**Schedule**: Agendamento de uma publicação futura no sistema.

**Scraping**: Processo de extração automatizada de conteúdo de páginas web.

**Webhook**: Endpoint HTTP que recebe notificações de eventos de sistemas externos.

**WordPress**: Sistema de gerenciamento de conteúdo (CMS) open-source mais popular do mundo.

**Workflow**: Sequência automatizada de tarefas no n8n para executar um processo completo.

---

## CONCLUSÃO

Este documento define a visão completa do produto AutoBlog AI, um sistema automatizado de geração e publicação de conteúdo para WordPress. A proposta prioriza simplicidade, qualidade e custo-benefício, utilizando tecnologias modernas e infraestrutura já existente.

**Diferenciais Chave**:
- Setup em minutos (wizard guiado)
- Funciona com WordPress básico (sem plugins específicos)
- Conteúdo original e relevante (não cópia de notícias)
- Publicação 100% automática
- Sistema de créditos transparente

**Próximos Passos Críticos**:
1. Kickoff com todas as equipes
2. Setup de ambientes de desenvolvimento
3. Início do Sprint 1 (Semana 1)
4. Validação contínua com stakeholders

**Sucesso será medido por**:
- Qualidade dos artigos gerados (feedback de beta testers)
- Estabilidade do sistema (uptime >99%)
- Adoção de usuários (100+ no mês 1)
- Viabilidade econômica (margem >60%)

Este é um documento vivo que deve ser atualizado conforme aprendizados e mudanças no projeto.

---

**Versão**: 1.0  
**Data**: Outubro 2025  
**Última Atualização**: [Data da última modificação]  
**Próxima Revisão**: Após Sprint 2 (Semana 4)

---

**Aprovações Necessárias**:
- [ ] Product Owner
- [ ] Backend Lead
- [ ] Frontend Lead
- [ ] n8n Specialist
- [ ] CTO / Founder

**Perguntas ou Dúvidas**: Abrir issue no repositório do projeto ou contatar Project Manager.

---

*FIM DO DOCUMENTO*