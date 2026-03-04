# Docker Compose para Coolify - Redatudo Hub

Este projeto contém a configuração Docker completa para rodar a aplicação Redatudo Hub no Coolify.

## 📦 Serviços

A aplicação é composta por 6 serviços:

1. **MongoDB** - Banco de dados principal
2. **Redis** - Cache e fila de jobs (BullMQ)
3. **MinIO** - Armazenamento de arquivos (S3-compatible)
4. **API** - Backend Node.js/TypeScript
5. **Worker** - Processador de jobs em background
6. **Frontend** - Aplicação Angular

## 🚀 Deploy no Coolify

### 1. Preparação

Clone o repositório e configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha com suas credenciais reais:
- Chaves de API (OpenAI, Anthropic, Replicate, Stripe, Convertio)
- Senhas seguras para MongoDB, Redis e MinIO
- JWT Secret
- Outros valores necessários

### 2. Deploy no Coolify

No Coolify:

1. Crie um novo projeto
2. Selecione "Docker Compose" como tipo de deploy
3. Aponte para este repositório
4. Configure as variáveis de ambiente no painel do Coolify (copie do .env)
5. Deploy!

### 3. Portas Expostas

- **80** - Frontend (Angular)
- **5000** - API Backend
- **27017** - MongoDB (opcional, para debug)
- **6379** - Redis (opcional, para debug)
- **9000** - MinIO API
- **9001** - MinIO Console

## 🔧 Desenvolvimento Local

Para rodar localmente com Docker:

```bash
# Build e start todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v
```

## 📝 Configurações Importantes

### MinIO
Após o primeiro deploy, acesse o MinIO Console em `http://localhost:9001` e crie os buckets necessários conforme sua aplicação requer.

### MongoDB
O banco de dados é criado automaticamente na primeira conexão.

### Puppeteer
O Dockerfile do backend já inclui todas as dependências necessárias para o Puppeteer funcionar corretamente.

## 🔐 Segurança

**IMPORTANTE**: Nunca commite o arquivo `.env` com credenciais reais! O `.gitignore` deve incluir:

```
.env
.env.local
.env.production
```

## 🐛 Troubleshooting

### Worker não processa jobs
Verifique se o Redis está acessível e se as credenciais estão corretas.

### Puppeteer erros
O container já inclui Chrome/Chromium. Se houver erros, verifique os logs do worker.

### MongoDB connection refused
Aguarde o healthcheck do MongoDB passar antes de iniciar API e Worker.

## 📚 Estrutura de Volumes

Os dados persistentes são armazenados em volumes Docker:
- `mongodb_data` - Dados do MongoDB
- `redis_data` - Dados do Redis
- `minio_data` - Arquivos do MinIO

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
# Pull nova versão
git pull

# Rebuild e restart
docker-compose up -d --build
```
