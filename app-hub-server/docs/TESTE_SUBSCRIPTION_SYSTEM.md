# Teste do Sistema de Assinaturas - Guia Postman

## 🎯 Visão Geral

Este guia mostra como testar o sistema de créditos com assinaturas WooCommerce usando Postman para simular eventos.

## 📋 Pré-requisitos

1. **Servidor rodando**: Backend compilado e rodando
2. **Postman**: Para fazer as requisições de teste
3. **Autenticação**: Token JWT válido
4. **Logs**: Monitore o console do backend para ver o processamento

## 🔧 Endpoints de Teste

### 1. Verificar Saldo Atual
```http
GET http://localhost:5000/api/balance/detailed
Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. Simular Evento de Assinatura
```http
POST http://localhost:5000/api/test/account-update-event
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

## 📝 Cenários de Teste

### Cenário 1: Assinatura Grátis (50 créditos)

**Dados para enviar:**
```json
{
  "event_type": "subscription.created",
  "data": {
    "id": 35650,
    "parent_id": 35649,
    "status": "active",
    "customer_id": 1,
    "billing": {
      "email": "test@example.com"
    },
    "line_items": [
      {
        "variation_id": 35613,
        "product_id": 35612,
        "meta_data": [
          {
            "key": "credito",
            "value": "50"
          }
        ]
      }
    ],
    "billing_period": "month",
    "billing_interval": "1",
    "start_date_gmt": "2025-10-27T02:00:00",
    "next_payment_date_gmt": "2025-11-27T02:00:00",
    "last_payment_date_gmt": "2025-10-27T02:00:00"
  }
}
```

**Resultado esperado:**
- ✅ 50 créditos adicionados ao `subscription_balance`
- ✅ Email de verificação enviado (se não verificado)
- ✅ Registro em `credit_history`

### Cenário 2: Renovação de Assinatura

**Dados para enviar:**
```json
{
  "event_type": "subscription.updated",
  "data": {
    "id": 35650,
    "customer_id": 1,
    "status": "active",
    "line_items": [
      {
        "variation_id": 35613,
        "product_id": 35612
      }
    ],
    "last_payment_date_gmt": "2025-11-27T02:00:00",
    "billing_period": "month",
    "billing_interval": "1"
  }
}
```

**Resultado esperado:**
- ✅ `subscription_balance` SUBSTITUÍDO por 50 créditos
- ✅ `recharge_balance` preservado
- ✅ Registro como renovação

### Cenário 3: Upgrade Básico → Premium

**Dados para enviar:**
```json
{
  "event_type": "subscription.switched",
  "data": {
    "id": 35650,
    "parent_id": 35651,
    "status": "active",
    "customer_id": 1,
    "line_items": [
      {
        "variation_id": 35615,
        "product_id": 35612
      }
    ],
    "billing_period": "month",
    "billing_interval": "1"
  }
}
```

**Resultado esperado:**
- ✅ Saldo anterior movido para `recharge_balance`
- ✅ `subscription_balance` definido como 20000
- ✅ Registro como upgrade

### Cenário 4: Compra de Recarga

**Dados para enviar:**
```json
{
  "event_type": "order.created",
  "data": {
    "id": 35652,
    "status": "processing",
    "customer_id": 1,
    "line_items": [
      {
        "variation_id": 35619,
        "product_id": 35612
      }
    ]
  }
}
```

**Resultado esperado:**
- ✅ 10000 créditos adicionados ao `recharge_balance`
- ✅ `subscription_balance` preservado
- ✅ Registro como recarga

## 🔍 Monitoramento

### Console do Backend
Monitore os logs para ver:
```
=== TESTE: Enviando evento para Redis ===
✅ Evento enviado para Redis com sucesso!
Processando job: {...}
Processando assinatura criada: 35650 para usuário 1
Assinatura criada processada: 50 créditos adicionados ao slot de assinatura.
```

### MongoDB
Verifique as collections:
```javascript
// Saldo do usuário
db.balance.findOne({userId: "1"})

// Histórico de créditos
db.credit_history.find({userId: 1}).sort({created_at: -1})

// Eventos processados
db.processed_events.find({user_id: "1"})
```

## 🚨 Troubleshooting

### Erro: "Payload inválido: falta event_type ou data"
**Causa**: Formato incorreto no Postman
**Solução**: Use exatamente o formato JSON acima

### Erro: "Assinatura já foi processada"
**Causa**: Evento duplicado
**Solução**: Use IDs diferentes (35650, 35651, etc.)

### Créditos não aparecem no balance
**Causa**: Problema no processamento
**Solução**: Verifique logs detalhados no console

## 📊 Fluxo de Teste Recomendado

1. **Limpar dados** (se necessário):
   ```http
   POST http://localhost:5000/api/remove-customer
   {
     "id": "1"
   }
   ```

2. **Verificar saldo inicial**:
   ```http
   GET http://localhost:5000/api/balance/detailed
   ```

3. **Testar assinatura grátis** (Cenário 1)

4. **Verificar saldo** (deve ter 50 créditos)

5. **Testar compra de recarga** (Cenário 4)

6. **Verificar saldo** (deve ter 50 + 10000 = 10050 créditos)

7. **Testar upgrade** (Cenário 3)

8. **Verificar saldo final**

## 🎉 Sucesso

Se tudo funcionar corretamente, você verá:
- ✅ Créditos sendo adicionados corretamente
- ✅ Logs detalhados no console
- ✅ Registros no MongoDB
- ✅ Sistema de dois slots funcionando
- ✅ Deduplicação de eventos
- ✅ Email de verificação (se aplicável)

**O sistema está pronto para produção!** 🚀
