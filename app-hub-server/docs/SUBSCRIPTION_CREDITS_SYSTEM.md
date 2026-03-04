# Sistema de Créditos com Assinaturas WooCommerce

## Visão Geral

Este documento descreve o sistema de créditos baseado em assinaturas do WooCommerce, implementado com dois slots de crédito independentes.

## Arquitetura

### Componentes Principais

1. **CreditsService** (`src/services/credits.service.ts`)
   - Gerencia os dois slots de crédito
   - Métodos para manipular saldos de assinatura e recarga
   - Validação de variações de produtos

2. **Account Update Processor** (`src/services/account-update.processor.ts`)
   - Processa eventos da lista Redis `account_update`
   - Manipula 4 tipos de eventos de webhook do WooCommerce
   - Integra com CreditsService para atualizar saldos

3. **Subscription Email Service** (`src/services/subscription-email.service.ts`)
   - Envia emails de verificação após assinatura criada
   - Valida se email já foi confirmado antes de enviar

## Sistema de Dois Slots de Crédito

### Estrutura no MongoDB (Collection: `balance`)

```javascript
{
  userId: "1",
  subscription_balance: Decimal128("20000"),  // Slot substituível
  recharge_balance: Decimal128("5000"),        // Slot cumulativo
  current_subscription: {
    subscription_id: "35639",
    variation_id: "35615",
    product_id: "35612",
    credits: 20000,
    status: "active",
    start_date: "2025-10-26T07:06:00",
    next_payment: "2025-11-26T07:06:00",
    billing_period: "month",
    billing_interval: "1"
  },
  last_updated: ISODate("2025-10-26")
}
```

### Slot de Assinatura (subscription_balance)

- **Comportamento**: Substituível (não cumulativo)
- **Quando é atualizado**:
  - Criação de assinatura
  - Renovação de assinatura
  - Upgrade/Downgrade de plano
- **Regra**: O valor é SUBSTITUÍDO, não somado

### Slot de Recarga (recharge_balance)

- **Comportamento**: Cumulativo
- **Quando é atualizado**:
  - Compra de pacotes de recarga
  - Upgrade de assinatura (saldo antigo não-gratuito é movido aqui)
- **Regra**: O valor é SOMADO ao existente

### Prioridade de Consumo

Quando o usuário usa créditos:
1. **Primeiro**: Consome do `recharge_balance` (FIFO)
2. **Depois**: Consome do `subscription_balance`

**Razão**: Preservar créditos da assinatura renovável, usar primeiro os extras.

## Variações de Produtos

### Assinaturas (subscriptionCredits)

| Variation ID | Créditos | Preço    | Tipo      |
|--------------|----------|----------|-----------|
| 35613        | 50       | Gratuito | Free      |
| 35614        | 5,000    | R$ 19.90 | Básico    |
| 35615        | 20,000   | R$ 59.90 | Premium   |
| 35616        | 60,000   | R$ 149.90| Ultimate  |

### Recargas (additionalCredits)

| Variation ID | Créditos | Preço    |
|--------------|----------|----------|
| 35618        | 2,000    | R$ 9.90  |
| 35619        | 10,000   | R$ 39.90 |
| 35620        | 30,000   | R$ 99.90 |

## Webhooks do WooCommerce

### Webhooks Configurados

1. **subscription.created** - Assinatura criada
2. **subscription.updated** - Assinatura atualizada (renovações, mudanças de status)
3. **subscription.switched** - Upgrade/Downgrade de plano
4. **order.created** - Pedidos criados (captura recargas)

### Configuração no WooCommerce

```
WooCommerce → Configurações → Avançado → Webhooks

Para cada webhook:
- Status: Ativo
- URL de entrega: https://[seu-n8n]/webhook/[nome-do-evento]
- Secret: [sua-chave-secreta]
- API Version: WC API v3
```

## Workflow n8n

### Estrutura do Payload Enviado ao Redis

```json
{
  "event_type": "subscription.created",
  "data": {
    // Corpo completo do webhook do WooCommerce
  }
}
```

### Configuração Recomendada

```
Para cada webhook:
1. Webhook Trigger → Recebe dados do WooCommerce
2. Set Node → Adiciona campo event_type
3. Redis Node → RPUSH para lista 'account_update'
```

## Eventos e Lógica de Processamento

### 1. subscription.created

**Quando dispara**: Primeira assinatura do usuário ou nova assinatura após cancelamento

**Fluxo**:
```
1. Verificar se assinatura está ativa (status = 'active')
2. Extrair variation_id e buscar créditos
3. Buscar assinatura anterior (se existir)
4. Se tinha assinatura não-gratuita:
   - Mover subscription_balance → recharge_balance
5. Definir subscription_balance = créditos da nova assinatura
6. Salvar dados da assinatura em current_subscription
7. Registrar em historic e credit_history
8. Enviar email de verificação (se não verificado)
```

**Exemplo de log**:
```
Processando assinatura criada: 35639 para usuário 1
Assinatura criada processada: 20000 créditos adicionados ao slot de assinatura.
```

### 2. subscription.updated

**Quando dispara**: Renovação automática, mudança de status, ou atualização de metadados

**Subtipos detectados**:

#### 2.1 Renovação (last_payment_date mudou)
```
1. Extrair variation_id e buscar créditos
2. SUBSTITUIR subscription_balance = créditos
3. Atualizar current_subscription
4. Registrar como 'subscription.renewed'
```

#### 2.2 Mudança de Status
```
1. Atualizar current_subscription.status
2. Registrar mudança (ex: active → cancelled)
```

#### 2.3 Outros
```
1. Atualizar apenas metadados em current_subscription
```

### 3. subscription.switched

**Quando dispara**: Upgrade ou downgrade entre planos

**Fluxo**:
```
1. Buscar assinatura anterior
2. Comparar créditos (old vs new)
3. Determinar se é upgrade (new > old)
4. Se é UPGRADE e old não era gratuito:
   - Mover subscription_balance → recharge_balance
5. Definir subscription_balance = créditos do novo plano
6. Atualizar current_subscription
7. Registrar como upgrade ou downgrade
```

**Exemplo - Upgrade de Gratuito para Premium**:
```
Saldo antes: subscription=50, recharge=0
Após upgrade: subscription=20000, recharge=0
(Saldo gratuito não é movido para recarga)
```

**Exemplo - Upgrade de Básico para Premium**:
```
Saldo antes: subscription=3000 (restante), recharge=500
Após upgrade: subscription=20000, recharge=3500
(Saldo antigo movido para recarga)
```

### 4. order.created

**Quando dispara**: Qualquer pedido criado

**Filtro**: Ignora pedidos de assinatura (que têm billing_period)

**Fluxo**:
```
1. Verificar se pedido tem billing_period → ignorar
2. Para cada item do pedido:
   - Verificar se variation_id está em additionalCredits
   - Se sim: adicionar créditos ao recharge_balance
3. Registrar em historic e credit_history
```

## Collections MongoDB

### balance
```javascript
{
  userId: String,
  subscription_balance: Decimal128,
  recharge_balance: Decimal128,
  current_subscription: {
    subscription_id: String,
    variation_id: String,
    product_id: String,
    credits: Number,
    status: String,
    start_date: String,
    next_payment: String,
    billing_period: String,
    billing_interval: String
  },
  last_updated: Date
}
```

### credit_history (Nova - para auditoria)
```javascript
{
  userId: String,
  event_type: String, // 'subscription.created', 'subscription.renewed', etc.
  subscription_id: String,
  order_id: String,
  variation_id: String,
  credits_added: Number,
  slot_type: String, // 'subscription' ou 'recharge'
  previous_subscription: Object,
  new_subscription: Object,
  metadata: Object,
  created_at: Date
}
```

### historic (Existente - mantida para compatibilidade)
```javascript
{
  userId: String,
  operation: String, // 'subscription' ou 'credit'
  description: String,
  total: Number,
  createdAt: Date
}
```

## Métodos da CreditsService

### Novos Métodos

```typescript
// Retorna os três valores de saldo
getBalance(userId): Promise<{
  subscription: Decimal128,
  recharge: Decimal128,
  total: Decimal128
}>

// Define saldo de assinatura (substitui)
setSubscriptionBalance(userId, credits): Promise<void>

// Adiciona créditos ao slot de recarga (soma)
addRechargeBalance(userId, credits): Promise<void>

// Move saldo de assinatura para recarga
moveSubscriptionToRecharge(userId): Promise<void>

// Busca assinatura atual do usuário
getCurrentSubscription(userId): Promise<any>

// Atualiza dados da assinatura atual
updateCurrentSubscription(userId, subscriptionData): Promise<void>

// Retorna créditos para uma variation_id de assinatura
getCreditsForVariation(variationId): number | null

// Retorna créditos para uma variation_id de recarga
getCreditsForAdditional(variationId): number | null

// Verifica se é plano gratuito
isFreePlan(variationId): boolean
```

### Métodos Legados (mantidos para compatibilidade)

```typescript
// Retorna total_balance (soma dos dois slots)
checkBalance(userId): Promise<Decimal128>

// Adiciona ao recharge_balance
insertCredit(userId, credit): Promise<Decimal128>

// Consome créditos (primeiro recharge, depois subscription)
subtractCredit(userId, credit): Promise<Decimal128>

// Define recharge_balance e zera subscription_balance
setBalance(userId, credit): Promise<Decimal128>
```

## Testes

### Cenários de Teste

#### 1. Assinatura Gratuita (Primeira vez)
```bash
# Simular webhook subscription.created
# Variation ID: 35613 (50 créditos)

Esperado:
- subscription_balance = 50
- recharge_balance = 0
- total_balance = 50
```

#### 2. Upgrade: Gratuito → Premium
```bash
# Simular webhook subscription.switched
# Old: 35613, New: 35615

Esperado:
- subscription_balance = 20000
- recharge_balance = 0 (gratuito não move)
- total_balance = 20000
```

#### 3. Upgrade: Básico → Premium (com saldo restante)
```bash
# Estado inicial:
# subscription_balance = 3000 (restante do básico)
# recharge_balance = 500

# Simular webhook subscription.switched
# Old: 35614, New: 35615

Esperado:
- subscription_balance = 20000
- recharge_balance = 3500 (3000 movidos + 500 existente)
- total_balance = 23500
```

#### 4. Renovação de Assinatura
```bash
# Estado atual: subscription_balance = 5000 (restante)
# Simular webhook subscription.updated (com last_payment_date mudado)

Esperado:
- subscription_balance = 20000 (SUBSTITUÍDO, não somado)
- recharge_balance = mantém valor anterior
```

#### 5. Compra de Recarga
```bash
# Estado atual: subscription=20000, recharge=0
# Simular webhook order.created
# Variation ID: 35619 (10000 créditos)

Esperado:
- subscription_balance = 20000 (mantém)
- recharge_balance = 10000 (somado)
- total_balance = 30000
```

#### 6. Consumo de Créditos
```bash
# Estado: subscription=20000, recharge=5000
# Consumir 7000 créditos

Esperado:
- subscription_balance = 18000
- recharge_balance = 0 (consumido primeiro)
- total_balance = 18000
```

### Comandos para Teste Manual

```bash
# 1. Compilar
npm run build

# 2. Iniciar servidor
npm start

# 3. Verificar logs do processor
# Deve mostrar: "Iniciando processamento da lista Redis account_update..."

# 4. Simular push no Redis (via redis-cli ou código)
redis-cli RPUSH account_update '{"event_type":"subscription.created","data":{...}}'

# 5. Verificar MongoDB
db.balance.findOne({userId: "1"})
db.credit_history.find({userId: "1"}).sort({created_at: -1})
```

## Troubleshooting

### Erro: "Unexpected token 'b', \"body\" is not valid JSON"
**Causa**: Dados não estão em formato JSON
**Solução**: Verificar workflow n8n - deve enviar JSON.stringify(payload)

### Evento não reconhecido
**Causa**: Campo event_type ausente ou incorreto
**Solução**: Verificar workflow n8n - deve adicionar event_type correto

### Créditos não somados na renovação
**Causa**: Comportamento correto! Renovação SUBSTITUI, não soma
**Solução**: Não é um erro - é o comportamento esperado

### Email não enviado
**Causa**: Email já verificado ou usuário sem role válido
**Solução**: Verificar logs - deve mostrar o motivo

## Manutenção

### Adicionar Nova Variação de Assinatura

```typescript
// Em src/services/credits.service.ts
private subscriptionCredits: { [key: string]: number } = {
  '35613': 50,
  '35614': 5000,
  '35615': 20000,
  '35616': 60000,
  '35617': 100000  // Nova variação
}
```

### Adicionar Nova Variação de Recarga

```typescript
// Em src/services/credits.service.ts
private additionalCredits: { [key: string]: number } = {
  '35618': 2000,
  '35619': 10000,
  '35620': 30000,
  '35621': 50000  // Nova variação
}
```

## Segurança

1. **Validação de Webhooks**: Configure secret no WooCommerce
2. **Verificação de Email**: Usuário só usa sistema com email verificado
3. **Auditoria**: Todas as operações registradas em credit_history
4. **Isolamento**: Processador roda em processo separado

## Monitoramento

### Logs Importantes

```
"Iniciando processamento da lista Redis account_update..."
→ Processor iniciou corretamente

"Processando job: {...}"
→ Evento recebido da lista Redis

"Assinatura criada processada: X créditos adicionados..."
→ Processamento bem-sucedido

"Erro no processamento: ..."
→ Erro - verificar detalhes
```

### Métricas para Monitorar

- Taxa de processamento de eventos
- Erros de parsing JSON
- Falhas ao salvar no MongoDB
- Tempo de resposta do processor
- Crescimento da lista Redis (backlog)

## Sistema de Deduplicação e Validação de Pagamento

### Deduplicação de Eventos

Para evitar processar o mesmo evento duas vezes (por exemplo, quando subscription.created e order.created disparam para a mesma assinatura), o sistema implementa:

**Collection: `processed_events`**
```javascript
{
  event_type: "subscription.created",
  resource_id: "35639",
  user_id: "1",
  processed_at: ISODate("2025-10-26")
}
```

**Funcionamento**:
1. Antes de processar qualquer evento, verifica se já existe em `processed_events`
2. Se já processado, ignora o evento
3. Após processar com sucesso, marca como processado

**Eventos que usam deduplicação**:
- `subscription.created` (chave: subscription_id)
- `subscription.switched` (chave: subscription_id)
- `order.created` (chave: order_id)

### Validação de Status de Pagamento

O sistema verifica o status antes de processar créditos:

#### Assinaturas
- **Status aceitos**: `active`
- **Status ignorados**: `pending`, `on-hold`, `cancelled`, etc.
- **Verificação adicional**: Se há `parent_id`, verifica status do pedido pai

#### Pedidos (Recargas)
- **Status aceitos**: `processing`, `completed`
- **Status ignorados**: `pending`, `on-hold`, `failed`, `cancelled`, etc.

**Exemplo de log**:
```
Pedido 35640 com status pending, aguardando confirmação de pagamento.
```

### Envio de Email de Verificação

Integração real com o serviço de email existente:

**Serviço usado**: `sendUniqueCodeEmail` (email-verification.service.ts)
- Gera código único UUID
- Envia via TurboSMTP
- Registra tentativa em `email_verification_log`

**Quando é enviado**:
- Após assinatura criada com sucesso
- Apenas se email não foi verificado anteriormente
- Apenas se usuário tem role válido

**Collection: `email_verification_log`**
```javascript
{
  userId: "1",
  email: "usuario@email.com",
  success: true,
  error: null,
  created_at: ISODate("2025-10-26")
}
```

## Fluxo Completo com Webhooks Duplicados

### Cenário: Usuário assina plano Premium

1. **WooCommerce dispara 2 webhooks**:
   - `subscription.created` (subscription_id: 35639)
   - `order.created` (order_id: 35639) - pedido pai da assinatura

2. **Processamento**:
   ```
   a) subscription.created chega primeiro:
      - Verifica: não está em processed_events ✓
      - Verifica: status = 'active' ✓
      - Verifica: parent_id tem status 'processing' ✓
      - Processa: adiciona 20000 créditos ao subscription_balance
      - Marca: subscription.created-35639 em processed_events
      - Envia email de verificação
   
   b) order.created chega depois:
      - Verifica: tem billing_period (é pedido de assinatura)
      - Ignora: "já processado via subscription.created"
      - NÃO marca em processed_events (não foi processado)
   ```

3. **Resultado**: Sem duplicação, 20000 créditos adicionados uma única vez

### Cenário: Usuário faz upgrade Básico → Premium

1. **WooCommerce dispara 2 webhooks**:
   - `subscription.switched` (subscription_id: 35639)
   - `order.created` (order_id: 35640) - pedido de upgrade

2. **Processamento**:
   ```
   a) subscription.switched chega primeiro:
      - Verifica: não está em processed_events ✓
      - Verifica: parent_id (35640) tem status 'processing' ✓
      - Move: 3000 créditos restantes → recharge_balance
      - Define: subscription_balance = 20000
      - Marca: subscription.switched-35639 em processed_events
   
   b) order.created chega depois:
      - Verifica: tem billing_period (é pedido de assinatura)
      - Ignora: "já processado via subscription.switched"
   ```

3. **Resultado**: Upgrade processado corretamente uma única vez

### Cenário: Usuário compra recarga de 10000 créditos

1. **WooCommerce dispara 1 webhook**:
   - `order.created` (order_id: 35641)

2. **Processamento**:
   ```
   a) order.created:
      - Verifica: não está em processed_events ✓
      - Verifica: NÃO tem billing_period (não é assinatura) ✓
      - Verifica: status = 'processing' ✓
      - Verifica: variation_id (35619) está em additionalCredits ✓
      - Adiciona: 10000 créditos ao recharge_balance
      - Marca: order.created-35641 em processed_events
   ```

3. **Resultado**: Recarga processada corretamente

## Próximos Passos

1. ✅ ~~Implementar envio real de email de verificação~~ (CONCLUÍDO)
2. ✅ ~~Adicionar verificação de status de pagamento~~ (CONCLUÍDO)
3. ✅ ~~Implementar sistema de deduplicação~~ (CONCLUÍDO)
4. Implementar chamada à API do WooCommerce para verificar status de pedidos
5. Adicionar testes automatizados
6. Implementar dashboard para visualizar histórico de créditos
7. Adicionar alertas para situações críticas
8. Implementar retry automático para eventos falhados
