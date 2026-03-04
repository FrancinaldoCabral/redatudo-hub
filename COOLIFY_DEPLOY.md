# Redatudo Hub - Coolify Deployment Guide

## 🎯 Guia Rápido de Deploy no Coolify

### Passo 1: Preparar Repositório

Certifique-se de que todos os arquivos Docker estão commitados:
- ✅ `docker-compose.yml`
- ✅ `app-hub/Dockerfile`
- ✅ `app-hub/nginx.conf`
- ✅ `app-hub-server/Dockerfile`
- ✅ `.env.example`

### Passo 2: Configurar no Coolify

1. **Criar novo projeto**
   - Entre no Coolify
   - Clique em "New Resource" → "Docker Compose"
   - Nome: `redatudo-hub`

2. **Conectar repositório**
   - URL do Git: seu repositório
   - Branch: `main` (ou sua branch principal)
   - Auto Deploy: Ativado (opcional)

3. **Configurar variáveis de ambiente**

   No painel do Coolify, adicione estas variáveis (copie do `.env.example` e preencha com valores reais):

   **Essenciais:**
   ```env
   NODE_ENV=production
   JWT_SECRET=gere-um-secret-seguro-aqui
   MONGO_PASSWORD=senha-segura-mongo
   REDIS_PASSWORD=senha-segura-redis
   MINIO_ROOT_PASSWORD=senha-segura-minio
   ```

   **APIs (obrigatórias conforme funcionalidades):**
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   REPLICATE_API_TOKEN=r8_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   CONVERTIO_API_KEY=...
   ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build completar (pode levar 5-10 minutos na primeira vez)

### Passo 3: Verificar Deploy

1. **Checar logs**
   ```bash
   # No Coolify, vá em "Logs" para cada serviço
   # Verifique se todos os healthchecks passaram
   ```

2. **Testar serviços**
   - Frontend: `https://seu-dominio.com`
   - API: `https://seu-dominio.com/api` (ou porta 5000)
   - MinIO Console: porta 9001

### Passo 4: Configuração Pós-Deploy

#### Configurar MinIO
1. Acesse MinIO Console (porta 9001)
2. Login: use `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD`
3. Crie os buckets necessários:
   - `ebooks`
   - `covers`
   - `documents`
   - (outros conforme sua aplicação)

#### Configurar Webhooks (se aplicável)
- **Stripe**: Configure webhook URL em `https://seu-dominio.com/api/webhook/stripe`
- **WooCommerce**: Configure webhook conforme necessário

## 🔧 Configuração de Domínios no Coolify

### Frontend
- Domínio: `app.seudominio.com`
- Porta: 80
- SSL: Auto (Let's Encrypt)

### API
- Domínio: `api.seudominio.com`
- Porta: 5000
- SSL: Auto (Let's Encrypt)

### MinIO (opcional, para acesso externo)
- Domínio: `minio.seudominio.com`
- Porta: 9001
- SSL: Auto (Let's Encrypt)

## 📊 Monitoramento

### Healthchecks
Todos os serviços têm healthchecks configurados:
- MongoDB: ping database
- Redis: ping
- MinIO: /minio/health/live
- API: implemente endpoint `/health`

### Logs
```bash
# Ver logs em tempo real no Coolify
# Ou use Docker diretamente:
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

## 🔄 Backups

### MongoDB
```bash
# Backup manual
docker exec redatudo-mongodb mongodump \
  --username admin \
  --password your_password \
  --authenticationDatabase admin \
  --out /backup

# Restaurar
docker exec redatudo-mongodb mongorestore \
  --username admin \
  --password your_password \
  --authenticationDatabase admin \
  /backup
```

### MinIO
Configure backup automático no MinIO Console ou use `mc` (MinIO Client).

## 🚨 Troubleshooting

### Serviço não inicia
1. Verifique logs: `docker-compose logs nome-do-serviço`
2. Verifique variáveis de ambiente
3. Verifique se healthchecks estão passando

### "Connection refused" errors
1. Aguarde todos os healthchecks passarem
2. Verifique se os nomes dos serviços estão corretos
3. Certifique-se de que todos os serviços estão na mesma rede

### Worker não processa jobs
1. Verifique conexão com Redis
2. Verifique logs do worker
3. Verifique se REDIS_PASSWORD está correto

### Puppeteer errors
1. Imagem já inclui todas as dependências
2. Se necessário, verifique variável `PUPPETEER_EXECUTABLE_PATH`
3. Cheque logs para erros específicos

## 📈 Escalabilidade

Para escalar workers:
```yaml
# No docker-compose.yml, adicione:
worker:
  # ... outras configurações
  deploy:
    replicas: 3  # Rode 3 workers em paralelo
```

## 🔐 Segurança

1. **Sempre use senhas fortes** para MongoDB, Redis e MinIO
2. **Nunca commite** arquivos `.env`
3. **Use HTTPS** em produção (Coolify configura automaticamente)
4. **Limite acesso** às portas de MongoDB e Redis (apenas interno)
5. **Configure firewall** se necessário

## 📞 Suporte

Se encontrar problemas:
1. Verifique `DOCKER_README.md` para documentação completa
2. Cheque logs de cada serviço
3. Verifique variáveis de ambiente
4. Consulte documentação do Coolify
