# Limpeza de Imagens Órfãs

## Problema Resolvido

Anteriormente, o sistema estava removendo imagens automaticamente durante sincronizações, causando perda de imagens que ainda eram necessárias. Este problema ocorria porque:

1. **`syncSectionImages()`** - Removia imagens não referenciadas na seção atual
2. **`cleanupOrphanedImages()`** - Removia imagens órfãs de projetos inteiros

## Solução Implementada

### 1. Remoção de Lógica Automática
- **`syncSectionImages()`**: Agora apenas identifica imagens órfãs, mas não as remove
- **`cleanupOrphanedImages()`**: Renomeado para `identifyOrphanedImages()` - apenas identifica, não remove
- **`removeImage()`**: Mantém a remoção manual por usuário

### 2. Script de Limpeza Manual
Criado o script `cleanup-orphaned-images.js` para limpeza controlada de imagens órfãs.

## Como Usar o Script de Limpeza

### Pré-requisitos
- Node.js instalado
- Arquivo `.env` com variáveis de ambiente configuradas
- Conexão com MongoDB funcionando

### Uso Básico

```bash
# Limpar imagens órfãs de um projeto específico
node cleanup-orphaned-images.js PROJECT_ID_AQUI

# Limpar imagens órfãs de TODOS os projetos
node cleanup-orphaned-images.js
```

### Exemplo de Execução

```bash
$ node cleanup-orphaned-images.js 507f1f77bcf86cd799439011

🏗️  Processando projeto: 507f1f77bcf86cd799439011
📋 Projeto encontrado: Meu Projeto de E-book
🔍 Analisando projeto: 507f1f77bcf86cd799439011
📄 Encontradas 5 seções no projeto
🖼️  Encontradas 12 imagens no projeto
✅ Imagem 507f1f77bcf86cd799439012 ENCONTRADA na seção 507f1f77bcf86cd799439013
❌ Imagem 507f1f77bcf86cd799439014 NÃO encontrada - É ÓRFÃ (criada em 2025-11-09T20:00:00.000Z)

⚠️  Encontradas 1 imagens órfãs no projeto 507f1f77bcf86cd799439011
As seguintes imagens serão removidas:
  1. https://minio.example.com/storage/ebook-images/507f1f77bcf86cd799439011/image.png (criada em 2025-11-09T20:00:00.000Z)

❓ Deseja remover estas imagens órfãs? (s/N): s

🗑️  Iniciando remoção de 1 imagens órfãs...
🗑️  Removendo imagem órfã: 507f1f77bcf86cd799439014 - https://minio.example.com/storage/ebook-images/507f1f77bcf86cd799439011/image.png
  ✅ Removida do MinIO: ebook-images/507f1f77bcf86cd799439011/image.png
  ✅ Removida do banco: 507f1f77bcf86cd799439014

✅ Projeto 507f1f77bcf86cd799439011 processado:
   - Imagens órfãs encontradas: 1
   - Imagens removidas: 1
   - Erros: 0

✅ Limpeza concluída com sucesso!
```

## Funcionalidades do Script

### ✅ Confirmação Interativa
- Mostra todas as imagens que serão removidas
- Pede confirmação antes de remover
- Pode cancelar a operação

### ✅ Proteção de Segurança
- Só remove imagens criadas há mais de 5 minutos
- Preserva imagens recentes para evitar remoção acidental

### ✅ Logs Detalhados
- Mostra progresso da análise
- Indica quais imagens foram encontradas/usadas
- Reporta erros durante remoção

### ✅ Processamento Flexível
- Pode processar um projeto específico
- Pode processar todos os projetos
- Relatório final com estatísticas

## API Atualizada

As rotas da API foram atualizadas para usar o novo método:

```typescript
// Antes
router.post('/projects/:projectId/cleanup-orphaned-images', controller.cleanupOrphanedImages);

// Agora
router.post('/projects/:projectId/identify-orphaned-images', controller.identifyOrphanedImages);
```

## Benefícios da Nova Abordagem

1. **Segurança**: Não há remoção automática acidental
2. **Controle**: Usuário decide quando e o que remover
3. **Transparência**: Logs mostram exatamente o que está acontecendo
4. **Flexibilidade**: Pode limpar projetos específicos ou todos
5. **Recuperação**: Fácil cancelar operação se mudar de ideia

## Manutenção

- Execute o script periodicamente (ex: semanalmente) para limpar imagens órfãs
- Sempre faça backup antes de executar
- Monitore os logs para identificar padrões de imagens órfãs
- Considere automatizar a execução em horários de baixa atividade
