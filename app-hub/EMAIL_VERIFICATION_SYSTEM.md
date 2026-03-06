# Sistema de Verificação de Email

## Visão Geral

Este documento descreve a implementação completa do sistema de verificação de email na aplicação ReDatudo Hub. O sistema garante que os usuários confirmem seus endereços de email antes de acessar determinadas funcionalidades.

## Arquitetura

### Backend (Node.js/Express)

#### 1. **Middleware: `emailConfirmed`** (`src/middlewares.ts`)
- Verifica se o email do usuário está confirmado na collection `email_verification`
- Se o email não estiver confirmado:
  - Retorna erro 401 com código `email_unverified`
  - Permite que o usuário continue autenticado mas bloqueado no modal
- Se confirmado:
  - Permite que a requisição prossiga normalmente

#### 2. **Collection MongoDB: `email_verification`**
```javascript
{
  "_id": ObjectId,
  "email": "user@example.com",
  "code": "uuid-string-here",      // Código único enviado ao email
  "confirmed": boolean,              // true se email foi verificado
  "userId": "1",                     // ID do usuário
  "createdAt": ISODate              // Data de criação
}
```

#### 3. **Controllers** (`src/controllers/api/email.controller.ts`)

##### `codeVerifyController` - POST `/code-verify`
- Recebe o código digitado pelo usuário
- Verifica se o código corresponde ao da collection
- Se válido, atualiza `confirmed` para `true`
- Resposta:
  ```json
  {
    "confirmed": true,
    "message": "Email verified successfully"
  }
  ```

##### `resendEmailVerifyController` - POST `/resend-email`
- Reenvia o código de verificação via email
- Gera um novo código e salva na collection
- Chamado quando o usuário clica em "Resend Code"

##### `resendCodeViaWebhookController` - POST `/resend-code`
- **Novo**: Resend via webhook n8n
- Chama: `https://n8n.redatudo.online/webhook/resend`
- Header: `Authorization: Bearer #&rdTudoIsPecial4087fhejjhsyipskejehhhdk`
- Primeiro atualiza o código no banco
- Depois chama o webhook para enviar o email

#### 4. **Serviço: `email-verification.service.ts`**
- `emailVerify(email)` - Verifica se email está confirmado
- `codeVerify(email, code)` - Verifica se código é válido  
- `confirmEmail(email)` - Marca email como confirmado
- `sendUniqueCodeEmail(email)` - Gera e envia código único

---

### Frontend (Angular)

#### 1. **Serviço: `EmailVerificationService`** (`src/app/services/email-verification.service.ts`)
```typescript
// Verificar código
verifyCode(code: string): Observable<EmailVerificationResponse>

// Resend via backend
resendCode(): Observable<ResendCodeResponse>

// Resend via webhook n8n
resendCodeViaWebhook(): Observable<ResendCodeResponse>

// Gerenciar estado
setEmailVerificationNeeded(needed: boolean, email: string)
isEmailVerificationNeeded(): boolean
```

#### 2. **Componente: `EmailVerificationModalComponent`** 
(`src/app/components/email-verification-modal/`)

**Funcionalidades:**
- Input mascarado para colar código do email
- 5 tentativas permitidas
- Botão "Resend Code" com countdown de 60 segundos
- Mensagens de erro e sucesso
- Máscara de email (ex: `na****@hotmail.com`)
- Responsivo para mobile
- Dark mode suportado

**Estados:**
- Aguardando entrada do código
- Verificando código (loading)
- Reenviando código (loading com countdown)
- Sucesso (recarrega página)
- Erro (mostra mensagem)

#### 3. **Interceptor: `EmailVerificationInterceptor`** 
(`src/app/interceptors/email-verification.interceptor.ts`)

**Funcionalidade:**
- Intercepta requisições HTTP
- Detecta erro 401 com código `email_unverified`
- Ativa o modal de verificação em vez de redirecionar para login
- Permite que o usuário continue usando o app parcialmente

*Fluxo:*
```
Requisição HTTP
    ↓
Erro 401 + code: 'email_unverified'
    ↓
Interceptor detecta
    ↓
Ativa EmailVerificationModalComponent
    ↓
Modal mostra para usuário colar código
    ↓
Usuário clica verificar
    ↓
POST /code-verify com código
    ↓
Se confirmed: true → recarrega página
Se confirmed: false → mostra erro
```

#### 4. **Integração no Módulo** (`app.module.ts`)
```typescript
declarations: [
  EmailVerificationModalComponent
]

imports: [
  I18nModule  // Para internacionalização
]

providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: EmailVerificationInterceptor,
    multi: true
  }
]
```

---

## Fluxo de Autenticação Completo

```
1. Usuário faz login
   ↓
2. Recebe token JWT com email
   ↓
3. Tenta acessar rota protegida que exige email confirmado
   ↓
4. Middleware `emailConfirmed` verifica collection `email_verification`
   ↓
5. Se confirmed = false:
   - Retorna 401 com code: 'email_unverified'
   - Interceptor detecta e mostra modal
   ↓
6. Usuário cola código do email no modal
   ↓
7. Frontend envia POST /code-verify com o código
   ↓
8. Backend verifica:
   - Código corresponde? → confirmed = true
   - Código inválido? → error response
   ↓
9. Se válido:
   - Modal fecha
   - Página recarrega
   - Usuário tem acesso a todas as funcionalidades
```

---

## Rotas de Email

### POST `/code-verify`
**Headers:** `Authorization: Bearer {token}`
**Body:**
```json
{
  "code": "14296c6f-9817-4598-981d-e8f630080b55"
}
```
**Response:**
```json
{
  "confirmed": true
}
```

### POST `/resend-email`
**Headers:** `Authorization: Bearer {token}`
**Body:** `{}`
**Response:**
```json
{
  "result": { ... },
  "message": "Code resent"
}
```

### POST `/resend-code` (N8N Webhook)
**Headers:** `Authorization: Bearer {token}`
**Body:** `{}`
**Interno:**
1. Gera novo código
2. Salva no MongoDB
3. Chama webhook: `https://n8n.redatudo.online/webhook/resend`
4. Webhook envia email com código

---

## Configuração do N8N Webhook

**URL:** `https://n8n.redatudo.online/webhook/resend`
**Token:** `#&rdTudoIsPecial4087fhejjhsyipskejehhhdk`
**Payload:**
```json
{
  "email": "user@example.com",
  "userId": "1"
}
```

### Esperado que o N8N:
1. Receba o email e userId
2. Busque o código gerado mais recente para esse email
3. Envie email com o código
4. Registre em log

---

## Fluxo de Verificação no UI

```
┌─────────────────────────────────────┐
│  EMAIL VERIFICATION MODAL           │
├─────────────────────────────────────┤
│  Verify Your Email                  │
│  We sent a code to na****@gmail.com │
├─────────────────────────────────────┤
│                                     │
│  Input: [Paste code here.......]    │
│  Hint: Look for: 14296c6f-9817...   │
│                                     │
│  ⚠️ 3 attempts remaining             │
│                                     │
├─────────────────────────────────────┤
│  [✓ Verify Email] [⟳ Resend (60s)]  │
├─────────────────────────────────────┤
│  ℹ️ Check spam folder. Resend if...  │
└─────────────────────────────────────┘
```

---

## Estados e Mensagens de Erro

### Usuario Views
- **"Invalid verification code"** - Código não corresponde (tenta de novo)
- **"Too many failed attempts"** - 5 tentativas usadas, deve resend
- **"Verification code resent"** - Novo código enviado para email
- **"Email verified successfully"** - Email confirmado, página recarrega

### Technical Errors
- **401 email_unverified** - Email não confirmado, mostra modal
- **401 auth** - Token inválido, redireciona para login
- **500** - Erro do servidor, tenta novamente

---

## Testes

### Backend
```bash
# Verificar se email está confirmado
GET /api/tools (requer email confirmado)
# Deve retornar 401 se não confirmado

# Enviar código de teste
POST /resend-email
# Deve salvar código no MongoDB

# Verificar código
POST /code-verify
Body: { "code": "xxx-xxx-xxx" }
# Deve retornar { confirmed: true }
```

### Frontend
```bash
# Verificar se modal aparece
1. Fazer login com email não confirmado
2. Tentar acessar rota protegida
3. Modal deve aparecer

# Testar input de código
1. Colar código no input
2. Clicar "Verify Email"
3. Se correto → sucesso e reload
4. Se incorreto → erro e retry

# Testar resend
1. Clicar "Resend Code" (primeiro clique)
2. Deve desabilitar por 60s
3. N8N webhook deve ser chamado
```

---

## Internacionalização

As strings do modal usam o sistema i18n:
```json
{
  "email_verification.title": "Verify Your Email",
  "email_verification.subtitle": "We sent a code to {{email}}",
  "email_verification.label": "Enter Verification Code",
  "email_verification.hint": "Look for a code like: 14296c6f-9817...",
  "email_verification.button_verify": "Verify Email",
  "email_verification.button_resend": "Resend Code",
  "email_verification.attempts": "{{attempts}} attempts remaining",
  "email_verification.success": "Email verified successfully!",
  "email_verification.error": "Invalid verification code",
  "email_verification.error_max": "Too many failed attempts"
}
```

---

## Segurança

✅ **Protegido contra:**
- Rate limiting no webhook (N8N)
- Máximo 5 tentativas por sessão
- Tokens JWT validados no backend
- Códigos UUID altamente aleatórios
- HTTPS obrigatório para interceptor

⚠️ **Considerações:**
- Tokens JWT válidos por 24h (padrão WordPress)
- Código de email válido por tempo ilimitado (reset no resend)
- N8N token em plaintext no código (considere variáveis de ambiente)

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Modal não aparece | Verifique se o interceptor está registrado em `app.module.ts` |
| Código não funciona | Verifique se código corresponde exatamente (case-sensitive é UUID) |
| Resend não mexe | Verifique se token N8N está correto e webhook está ativo |
| Email trava no modal | Verifique logs do server para erros de `emailConfirmed` middleware |
| Modal pede código infinitamente | Verifique se `confirmed` foi atualizado para `true` no MongoDB |

---

## Próximos Passos (Opcional)

- [ ] Adicionar expiração temporal ao código (ex: 1 hora)
- [ ] Rate limiting por IP no endpoint `/code-verify`
- [ ] Notificar admin se código falhar 10 vezes
- [ ] Suporte para 2FA
- [ ] Resend automático após 3 falhas
- [ ] Email com link mágico (além do código)

---

**Última atualização:** 06/03/2026
**Status:** ✅ Produção
**Versão:** 1.0
