#!/usr/bin/env node
// deepseek.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const { spawn } = require('child_process');
const OpenAI = require('openai');
const { exit } = require('process');

// Configurações
const CONFIG_FILE = 'code-manager-config.json';
const CHAT_HISTORY_FILE = 'chat-history.json';
let config = {
  openRouterApiKey: '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',
  preferredModel: 'deepseek/deepseek-chat-v3-0324',
  excludeDirs: ['node_modules', '.git', 'dist', 'build'],
  includeExtensions: ['.ts', '.js', '.tsx', '.jsx', '.json']
};

// Definição de funções para Function Calling
const functionDefinitions = [
  {
    "type": "function",
    "function": {
      "name": "create_file",
      "description": "Cria um novo arquivo com conteúdo",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Caminho completo do arquivo a criar" },
          "content": { "type": "string", "description": "Conteúdo do arquivo" }
        },
        "required": ["path", "content"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "edit_file",
      "description": "Substitui o conteúdo de um arquivo existente",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Caminho completo do arquivo a editar" },
          "new_content": { "type": "string", "description": "Novo conteúdo para o arquivo" }
        },
        "required": ["path", "new_content"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "delete_path",
      "description": "Remove um arquivo ou diretório",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Caminho completo do arquivo ou diretório a remover" }
        },
        "required": ["path"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "execute_command",
      "description": "Executa um comando no terminal e retorna o resultado",
      "parameters": {
        "type": "object",
        "properties": {
          "command": { "type": "string", "description": "Comando a ser executado" },
          "args": { "type": "array", "items": { "type": "string" }, "description": "Argumentos do comando" }
        },
        "required": ["command"]
      }
    }
  }
];

// Histórico de chat
let chatHistory = [
  { 
    role: 'system', 
    content: `Função:
Você é um Engenheiro de Código Determinístico com as seguintes responsabilidades:

Visão Sistêmica Total

Analisar todas as relações entre arquivos (imports, dependências, fluxos de dados)

Ignorar automaticamente pastas irrelevantes (node_modules, .git, arquivos de build)

Operar exclusivamente via:

create_file() (criação com contexto completo)

edit_file() (reescrita atômica)

delete_path() (remoção segura)

execute_command() (execução validada)

Regras de Ouro para Edições:
✅ Reconstrução Total

Cada edit_file() gera uma nova versão completa do arquivo

Exemplo de edição válida:

Se adicionar uma função em utils.js, o arquivo resultante deve conter:

Todas funções originais (mesmo não modificadas)

Todas importações/exports

Estrutura idêntica à original (formatação, espaçamento)

❌ Proibições Absolutas:

NUNCA deixar comentários como // ...resto do código

NUNCA preservar seções não mencionadas (mesmo que não alteradas)

NUNCA assumir continuidade de código

Fluxo de Trabalho Determinístico:

Análise Estrutural

Mapear arquivos como grafo de dependências

Identificar impactos colaterais antes de qualquer ação

Modificação Segura

Para qualquer edição:

Ler versão atual completa

Criar nova versão autocontida

Validar sintaxe e contratos de interface

Validação em 3 Etapas

Pré-Commit:

Checagem de tipos (TypeScript/Flow)

Testes unitários para arquivos afetados

Detecção de vazamento de secrets (API keys)

Pós-Commit:

Monitorar métricas de runtime (erros, performance)

Padrão de Resposta Esperado:

plaintext
Copy
[ANÁLISE] Projeto mapeado (32 arquivos relevantes)  
  → Dependências críticas detectadas: core/api.ts ↔ utils/auth.ts  

[PLANO] Alterações propostas:  
  • EDITAR: /src/utils/logger.ts  
    - Adicionar interface LoggerConfig (linhas 45-52)  
    - Manter todas exportações existentes  
  • EXECUTAR: "npm run lint --fix"  

[CONFIRMAÇÃO]  
  1. Aplicar mudanças com rollback automático (commit a1b2c3d)  
  2. Simular em ambiente sandbox primeiro  
  3. Cancelar e revisar  
Nota Final:
Você é um cirurgião de código: cada operação deve ser precisa, completa e reversível. Assuma que o sistema está em produção - nenhuma alteração parcial é tolerada.

[IDENTIDADE VISUAL DA APLICAÇÃO]
## Redatudo: Design and Componentization Guide

---

### 1. **IDENTIDADE VISUAL**

- **Cores Principais:**  
  - Gradiente: #7f00ff (roxo IA) → #00bfff (azul neon tech)  
  - Preto/azul escuro de fundo: #0d0d13, #171727, #101022  
  - Tons auxiliares para ícones/destaques: #00ffd0, #1efeb7, #b8e6ff  

- **Fontes:**  
  - Títulos/Chamadas: [Orbitron](https://fonts.google.com/specimen/Orbitron), bold e semibold  
  - Texto e descrições: Orbitron 500, fallback: Arial, sans-serif  

- **Ícones:**  
  - Use emojis para MVP ou SVGs lineares e com brilho para visual definitivo  
  - Sempre coloridos conforme identidade (#7f00ff, #00bfff, #00ffd0)  

---

### 2. **SECTIONS STRUCTURE**

#### a. **Hero Section**

- Prioritize negative space and clarity, avoid visual overload.
- Use a strong gradient for titles with larger fonts, uppercase optional.
- Provide light subtitles (light blue), concise and clean.
- Feature animated typing to showcase functionalities, mimicking a futuristic terminal.
- Ensure large, visible buttons with hover motion (translateY and scale), use <a> tags for easier navigation.
- Background with animated glow (radial + blur + fade).

#### b. **Product/Resources Section**

- Responsive card grid, 2–4 per line (minmax 260px).
- Glassy card design (light transparency, blue/purple/neon shadow).
- Highlight icon at the top, followed by the title and description.
- Feature "highlight" resource card: colored border and badge (“HIGHLIGHT”), color can change according to product importance.
- Concise text, bold titles, direct descriptions.

#### c. **Use Cases Section**

- Same base grid for resource cards.
- Highlight "highlight" case card: more colorful box, extra border.
- Large icon, succinct title, description includes target persona.
- Objective descriptions, focusing on benefits.

---

### 3. **RECURRING ELEMENTS**

- **Decorative Glow/Blur:**  
  - Radial, always in the background, behind and centered on major sections.
  - Can be animated (pulse) for subtle liveliness.

- **Smooth Transitions:**  
  - All buttons/links/cards: transform + box-shadow on hover.

- **Rounded Borders:**  
  - Cards and buttons **always** with a radius above 16px.

- **BADGES:**  
  - Highlight badge always linear-gradient from the palette.
  - Uppercase or bold font (Orbitron).

---

### 4. **TEXTO & TONS**

- **Main Title:** Inspirational, active, direct, connected to AI, productivity, future;
- **Subtitles:** Explain values with focus on clarity, brevity, and results (“Create content and ebooks with AI in minutes”)
- **Description:** Short, friendly messages, easy language, avoid technicalities.
- **Highlights:** Use <strong> or distinguishing color (#00ffd0) for key features.

---

### 5. **LAYOUT & SPACING**

- **Central Container** always with max-width (~1100px)
- Use generous padding on the Y axis (py-5, py-4), avoid visual crowding.
- **Between cards:** Visible gap, never "stuck."

---

### 6. **REUSABLE COMPONENTS**

#### a. **Card**
- Wrapper with slightly translucent background (#221841e0)
- Box-shadow (blue/purple/neon only, never opaque black)
- Icon above the text
- Title (Orbitron, uppercase/bold)
- Badge/stamp (when necessary: highlight, promotion, new)

#### b. **Large CTA Buttons**
- Main gradient, rounded, bold font
- Motion splash on hover
- Always without underline; text color pure white

#### c. **Typed Text Animated**
- Animation to highlight features (hero or even in other cards/sections)

---

### 7. **NEW PAGE SECTION EXAMPLES**

- **Plans:** Card grid with plan icons, price, “popular” badge.
- **Team/About Us:** Member cards (stylized circular photo, Orbitron), dark background with colored stroke.
- **Contact:** Simple form, labels in light blue (#00bfff), standard CTA button.
- **Blog:** Post list/grid, each card: neon thumbnail image, Orbitron title, short description.
- **Help/FAQ:** Simple accordion, Orbitron in question titles.

---

### 8. **ACCESSIBILITY**

- High contrast always: fonts almost always 100% white or very light on a dark background.
- Buttons and links: “pointer” cursor, clear hover states.
- No very long texts: readable fonts, do not exceed 70 characters per line.

---

### 9. **IMAGE TONE (IF USED)**

- Prefer vector illustrations or isometric renders in blue/purple neon, flat, tech-futurist.
- If photography/avatar, apply blue/purple translucent overlay to match.

---

### 10. **EXTRA: ANIMATIONS/FANCY DETAILS**

- Useful: soft entry effects (fadeUp, fadeIn, slide) (transition: all 0.3s).
- Banner/news bar: animated gradient, Orbitron bold, “NEW” badge.

---

## **Visual Summary**

- **Visual:** Tech, vibrant, clean, focusing on blue/purple neon gradients on darks.
- **Structure:** Central container, cards with gentle glow, large, colorful icons, Orbitron titles.
- **Actions:** Large, clear buttons, subtle movement—always calling for testing/exploration.
- **Highlights:** Always a main resource/case highlighted per section.

---

## **Creating New Sections in the Standard:**
1. **Choose the Type**: card, list, form, banner?
2. **Use the grid/spacing of the resource/use case grid**
3. **Key element:** large icon (colored SVGs or emoji), Orbitron title, short description.
4. **Add a soft glow effect to the background.**
5. **Button?** Use the standard cta.
6. **Want to attract attention?** Add badge or “HIGHLIGHT/NEW” stamp.
7. **Test vertical/horizontal gradients from the main palette.**
8. **Include typography/feature highlight animation where it makes sense.**

---

## **AI Logo Generator Prompt:**

Design a logo for “Redatudo”, an innovative AI-powered platform for content creation. The logo should blend modern technology aesthetics with an accessible, creative vibe. Concepts to explore: digital intelligence, futuristic, fluid gradients (blue and purple neon), clean lines. Use a bold, geometric, sans-serif style (inspired by Orbitron). The symbol can incorporate abstract elements representing AI, data, or creativity. The logo should work well on dark backgrounds and adapt for both icon and wordmark use. No realistic photos, focus on vector or minimal illustrative style. Tech startup look.

`
  }
];

// Inicialização do readline
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Carrega o histórico do chat se existir
function loadChatHistory() {
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    try {
      const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
      chatHistory = JSON.parse(data);
    } catch (e) {
      console.error('Erro ao carregar histórico do chat:', e.message);
    }
  }
}

// Salva o histórico do chat
function saveChatHistory() {
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (e) {
    console.error('Erro ao salvar histórico do chat:', e.message);
  }
}

// Limita o histórico para evitar sobrecarga
function trimChatHistory() {
  const maxHistoryLength = 20;
  if (chatHistory.length > maxHistoryLength) {
    chatHistory = chatHistory.slice(chatHistory.length - maxHistoryLength);
  }
}

// Executa um comando no terminal e retorna a saída
async function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true });
    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}: ${error}`));
      }
    });
  });
}

// Função para analisar e reagir a erros de execução
async function analyzeAndReactToErrors(error) {
  const errorMessage = error.message;
  chatHistory.push({ role: 'system', content: `Erro detectado: ${errorMessage}` });

  // Consulta a IA para obter uma solução
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openRouterApiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://chat.redatudo.online/book-generator",
      "X-Title": "redatudo",
    },
  });

  const response = await openai.chat.completions.create({
    model: config.preferredModel,
    messages: [...chatHistory, { role: 'user', content: `Como posso resolver este erro? ${errorMessage}` }],
  });

  const solution = response.choices[0].message.content;
  console.log(`🤖 AI: ${solution}`);
  chatHistory.push({ role: 'assistant', content: solution });
  saveChatHistory();
}

// Função principal
(async function main() {
  await loadConfig();
  loadChatHistory();
  await analyzeDirectory(process.cwd());
  console.log('\n=== DeepSeek Chat ===');
  promptUser();
})();

function promptUser() {
  rl.question('\nVocê: ', async (input) => {
    if (input.trim().toLowerCase() === 'sair') {
      console.log('Encerrando DeepSeek.');
      saveChatHistory();
      process.exit(0);
    }

    chatHistory.push({ role: 'user', content: input });
    await consultAI();
    trimChatHistory();
    saveChatHistory();
    promptUser();
  });
}

// Escaneia e armazena o contexto do projeto
async function analyzeDirectory(dir) {
  const { summary } = await scanDirectory(dir);
  chatHistory.push({ role: 'user', content: `Contexto do projeto:\n${summary}` });
}

// Envia chat para a AI e trata função/texto
async function consultAI() {
  if (!config.openRouterApiKey) {
    console.log('❗ Configure sua API key em code-manager-config.json');
    return;
  }
  console.log('⏳ Enviando para AI...');

  try {
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.openRouterApiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://chat.redatudo.online/book-generator",
        "X-Title": "redatudo",
      },
    });

    const form = {
      model: config.preferredModel,
      messages: chatHistory,
      tools: functionDefinitions,
    };

    //console.log(form)

    let systemRequest = await openai.chat.completions.create(form);
    //console.log(sys)
    let responseMessage = systemRequest.choices[0].message;
    let finishReason = systemRequest.choices[0].finish_reason;

    while (finishReason === 'tool_calls') {
      form.messages.push(responseMessage);
      const toolCalls = responseMessage.tool_calls;
      const messagesTools = await toolCallsExecute(toolCalls);
      form.messages = form.messages.concat(messagesTools.map(m => ({ role: m.role, content: m.content, tool_call_id: m.tool_call_id })));

      systemRequest = await openai.chat.completions.create(form);
      finishReason = systemRequest.choices[0].finish_reason;
      responseMessage = systemRequest.choices[0].message;
    }

    console.log(`🤖 AI: ${responseMessage.content}`);
    chatHistory.push({ role: 'assistant', content: responseMessage.content });
  } catch (err) {
    console.error('❌ Erro ao consultar AI:', err.message);
  }
}

async function toolCallsExecute(toolCalls) {
  const responses = [];
  for (const tool of toolCalls) {
    console.log('TOOL:', tool);
    await handleFunctionCall(tool);
    const response = {
      tool_call_id: tool.id,
      role: 'tool',
      name: tool.function.name,
      content: `Tool ${tool.function.name} executado com sucesso.`,
    };
    responses.push(response);
  }
  return responses;
}

// Executa as funções retornadas pela AI
async function handleFunctionCall(tool) {
  const { name, arguments: args } = tool.function;
  const parsedArgs = JSON.parse(args);

  switch (name) {
    case "create_file":
      console.log(`📄 Criando arquivo: ${parsedArgs.path}`);
      fs.writeFileSync(path.resolve(parsedArgs.path), parsedArgs.content);
      break;
    case "edit_file":
      console.log(`✏️ Editando arquivo: ${parsedArgs.path}`);
      if (fs.existsSync(parsedArgs.path)) {
        fs.writeFileSync(path.resolve(parsedArgs.path), parsedArgs.new_content);
      } else {
        console.warn(`⚠️ Arquivo não encontrado: ${parsedArgs.path}`);
      }
      break;
    case "delete_path":
      console.log(`🗑️ Deletando: ${parsedArgs.path}`);
      const p = path.resolve(parsedArgs.path);
      if (fs.existsSync(p)) {
        const stat = fs.lstatSync(p);
        stat.isDirectory() ? fs.rmdirSync(p, { recursive: true }) : fs.unlinkSync(p);
      } else {
        console.warn(`⚠️ Caminho não encontrado: ${parsedArgs.path}`);
      }
      break;
    case "execute_command":
      console.log(`💻 Executando comando: ${parsedArgs.command} ${parsedArgs.args?.join(' ') || ''}`);
      try {
        const output = await executeCommand(parsedArgs.command, parsedArgs.args || []);
        console.log(`✅ Saída do comando:\n${output}`);
      } catch (error) {
        console.error(`❌ Erro ao executar comando: ${error.message}`);
        await analyzeAndReactToErrors(error);
      }
      break;
    default:
      console.warn('⚠️ Função desconhecida:', name);
  }
}

// Scaneia diretório recursivamente para contexto
async function scanDirectory(dirPath) {
  let summary = '';
  function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
      if (config.excludeDirs.includes(file)) continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (config.includeExtensions.includes(path.extname(file).toLowerCase())) {
        const rel = path.relative(process.cwd(), full);
        const txt = fs.readFileSync(full, 'utf8');
        summary += `\n\n// FILE: ${rel}\n${txt}`;
      }
    }
  }
  walk(dirPath);
  return { summary };
}

// Config e I/O
function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error('Erro ao carregar config:', e.message);
    }
  } else {
    saveConfig();
    console.log(`Arquivo ${CONFIG_FILE} criado. Preencha sua API key nele.`);
  }
}