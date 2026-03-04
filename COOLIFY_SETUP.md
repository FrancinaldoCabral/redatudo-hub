# ⚙️ Configuração Coolify - Redatudo Hub

## 🎯 Como funciona

### Arquitetura
- **Frontend (Angular)**: Porta 80
- **Backend (API)**: Porta 5000 (interno)
- **Nginx**: Faz proxy de `/api` → Backend

### URLs no Coolify

**Opção 1: Um domínio único (Recomendado)**
```
https://app.seudominio.com          → Frontend
https://app.seudominio.com/api      → Backend (proxy)
```

**Opção 2: Domínios separados**
```
https://app.seudominio.com          → Frontend
https://api.seudominio.com          → Backend
```

---

## 📋 Setup no Coolify

### 1. Criar Projeto
- No Coolify, clique em **"New Resource" → "Docker Compose"**
- Nome: `redatudo-hub`
- Repositório: seu repo Git
- Branch: `main`

### 2. Configurar Variáveis de Ambiente

Adicione no Coolify (aba Environment):

```env
# === ESSENCIAIS ===
NODE_ENV=production
JWT_SECRET=gere-secret-aleatorio-seguro-aqui
MONGO_PASSWORD=senha-mongo-segura
REDIS_PASSWORD=senha-redis-segura
MINIO_ROOT_PASSWORD=senha-minio-segura

# === APIs OBRIGATÓRIAS ===
OPENAI_API_KEY=sk-...

# === APIs OPCIONAIS ===
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CONVERTIO_API_KEY=...
```

### 3. Configurar Domínios

#### Opção 1: Domínio Único (Mais Fácil)

No Coolify, configure apenas o serviço **frontend**:
- Domínio: `app.seudominio.com`
- Porta: `80`
- SSL: Ativado

✅ **Pronto!** O nginx fará proxy automático de `/api` para o backend.

#### Opção 2: Domínios Separados

Configure **dois domínios**:

**Frontend:**
- Serviço: `frontend`
- Domínio: `app.seudominio.com`
- Porta: `80`

**Backend:**
- Serviço: `api`
- Domínio: `api.seudominio.com`
- Porta: `5000`

⚠️ **Atenção:** Nesse caso, edite [env.ts](app-hub/src/app/services/env.ts):
```typescript
// Substituir essa linha:
if (window.location.hostname !== 'localhost') {
  return '' // trocar por: return 'https://api.seudominio.com'
}
```

### 4. Deploy

1. Clique em **"Deploy"**
2. Aguarde build (5-10 minutos)
3. Acesse sua aplicação!

---

## 🔍 Verificar Deploy

```bash
# Testar frontend
curl https://app.seudominio.com/health

# Testar backend (via proxy)
curl https://app.seudominio.com/api/health

# Ou domínio separado
curl https://api.seudominio.com/api/health
```

---

## ⚡ Diferenças entre as Opções

| Aspecto | Domínio Único | Domínios Separados |
|---------|---------------|-------------------|
| **Configuração** | ✅ Mais simples | ⚠️ Requer 2 domínios |
| **CORS** | ✅ Sem problemas | ⚠️ Pode ter issues |
| **SSL** | ✅ 1 certificado | ⚠️ 2 certificados |
| **Código** | ✅ Zero mudanças | ⚠️ Editar env.ts |
| **Recomendado** | ✅ Sim | Para casos específicos |

---

## 🐛 Troubleshooting

### Frontend não se conecta ao backend
1. Verifique logs do nginx: `docker logs redatudo-frontend`
2. Teste proxy manualmente: `curl http://localhost/api/health`
3. Confirme que serviço `api` está rodando

### Erro de CORS
- Se usando domínios separados, configure CORS no backend
- Verifique arquivo `corsOptions` no backend
- Adicione domínio do frontend nas origens permitidas

### Build falha
- Verifique se `package.json` tem todas as dependências
- Confirme que Node.js é versão 18
- Cheque logs de build no Coolify
