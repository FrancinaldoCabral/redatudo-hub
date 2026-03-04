# Guia de Integração Frontend - Previsão de Custo antes da Geração

## 🎯 Objetivo

Permitir que o frontend mostre ao usuário **quanto custará** uma geração ANTES de executá-la, dando transparência e controle total sobre o consumo de créditos.

---

## 📡 Endpoints Disponíveis

### 1. **Previsão de Custo de Geração de Texto**

#### Endpoint
```
POST /api/ebook/generation/estimate
```

#### Request Body
```typescript
{
  words: number;              // Quantidade de palavras a gerar (100-5000)
  tier: 'basic' | 'medium' | 'advanced';  // Tier do modelo
  contextDepth?: 'minimal' | 'moderate' | 'full';  // Opcional, padrão: 'moderate'
  action?: string;            // Opcional: tipo de ação (generate, rewrite, etc)
}
```

#### Response (200 OK)
```typescript
{
  success: true,
  estimate: {
    inputTokens: number;      // Tokens de entrada (contexto + sistema)
    outputTokens: number;     // Tokens de saída (palavras × 4)
    inputCostUSD: number;     // Custo USD da entrada
    outputCostUSD: number;    // Custo USD da saída
    totalCostUSD: number;     // Custo total em USD
    credits: number;          // Créditos necessários (mínimo: 2)
    tier: string;             // Tier usado
    modelId: string;          // ID do modelo
    modelName: string;        // Nome do modelo
    words: number             // Palavras solicitadas
  }
}
```

#### Exemplo
```typescript
// Frontend
const response = await fetch('/api/ebook/generation/estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    words: 1000,
    tier: 'medium',
    contextDepth: 'moderate'
  })
});

const { estimate } = await response.json();
console.log(`Custo estimado: ${estimate.credits} créditos`);
// Custo estimado: 11 créditos
```

---

### 2. **Previsão de Custo de Imagem**

#### Endpoint
```
POST /api/ebook/image/estimate
```

#### Request Body
```typescript
{
  imageCount: number;         // Quantidade de imagens (1-5)
  quality: 'basico' | 'medio' | 'avancado';  // Qualidade
  imageType?: 'cover' | 'internal';  // Opcional, padrão: 'internal'
}
```

#### Response (200 OK)
```typescript
{
  success: true,
  estimate: {
    imageCount: number;       // Quantidade de imagens
    quality: string;          // Qualidade usada
    imageType: string;        // Tipo de imagem
    costPerImage: number;     // Créditos por imagem
    totalCredits: number;     // Total de créditos
    description: string       // Descrição da qualidade
  }
}
```

#### Exemplo
```typescript
const response = await fetch('/api/ebook/image/estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageCount: 3,
    quality: 'medio',
    imageType: 'internal'
  })
});

const { estimate } = await response.json();
console.log(`${estimate.imageCount} imagens: ${estimate.totalCredits} créditos`);
// 3 imagens: 24 créditos
```

---

### 3. **Previsão de Custo de Geração Completa (Texto + Imagens)**

#### Endpoint
```
POST /api/ebook/section/estimate
```

#### Request Body
```typescript
{
  words: number;              // Palavras de texto
  tier: 'basic' | 'medium' | 'advanced';
  contextDepth?: 'minimal' | 'moderate' | 'full';
  generateImages?: boolean;   // Se vai gerar imagens
  imageCount?: number;        // Quantidade de imagens (se generateImages = true)
  imageQuality?: 'basico' | 'medio' | 'avancado';
}
```

#### Response (200 OK)
```typescript
{
  success: true,
  estimate: {
    textGeneration: {
      credits: number;
      words: number;
      tier: string;
    },
    imageGeneration: {
      credits: number;
      imageCount: number;
      quality: string;
    } | null,
    total: {
      credits: number;
      breakdown: string;      // "11 créditos (texto) + 24 créditos (3 imagens)"
    }
  }
}
```

#### Exemplo
```typescript
const response = await fetch('/api/ebook/section/estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    words: 1000,
    tier: 'medium',
    generateImages: true,
    imageCount: 2,
    imageQuality: 'medio'
  })
});

const { estimate } = await response.json();
console.log(`Total: ${estimate.total.credits} créditos`);
console.log(estimate.total.breakdown);
// Total: 27 créditos
// 11 créditos (texto) + 16 créditos (2 imagens)
```

---

## 🎨 Componente UI Recomendado

### Exemplo de Modal de Confirmação

```tsx
import React, { useState, useEffect } from 'react';

interface GenerationEstimate {
  credits: number;
  breakdown?: string;
}

const GenerationConfirmModal: React.FC<{
  words: number;
  tier: 'basic' | 'medium' | 'advanced';
  generateImages: boolean;
  imageCount?: number;
  imageQuality?: 'basico' | 'medio' | 'avancado';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ words, tier, generateImages, imageCount, imageQuality, onConfirm, onCancel }) => {
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimate();
    fetchBalance();
  }, [words, tier, generateImages, imageCount, imageQuality]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ebook/section/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words,
          tier,
          generateImages,
          imageCount,
          imageQuality
        })
      });
      const { estimate } = await response.json();
      setEstimate(estimate.total);
    } catch (error) {
      console.error('Erro ao estimar custo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/balance');
      const { balance } = await response.json();
      setUserBalance(balance.total);
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
    }
  };

  const hasEnoughCredits = estimate && userBalance >= estimate.credits;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Confirmar Geração</h2>
        
        {loading ? (
          <p>Calculando custo...</p>
        ) : (
          <>
            <div className="estimate-info">
              <p><strong>Custo estimado:</strong> {estimate?.credits} créditos</p>
              {estimate?.breakdown && (
                <p className="breakdown">{estimate.breakdown}</p>
              )}
              <p><strong>Seu saldo:</strong> {userBalance.toFixed(2)} créditos</p>
              <p>
                <strong>Saldo após geração:</strong> 
                <span className={hasEnoughCredits ? 'text-success' : 'text-danger'}>
                  {(userBalance - (estimate?.credits || 0)).toFixed(2)} créditos
                </span>
              </p>
            </div>

            {!hasEnoughCredits && (
              <div className="alert alert-warning">
                ⚠️ Saldo insuficiente. Necessário: {estimate?.credits} créditos
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={onConfirm}
                disabled={!hasEnoughCredits}
              >
                Confirmar e Gerar
              </button>
              <button className="btn btn-secondary" onClick={onCancel}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GenerationConfirmModal;
```

---

## 🔄 Fluxo Completo de UX

### Passo 1: Usuário Preenche Formulário

```tsx
const [words, setWords] = useState(1000);
const [tier, setTier] = useState<'basic' | 'medium' | 'advanced'>('medium');
const [generateImages, setGenerateImages] = useState(false);
const [showConfirmModal, setShowConfirmModal] = useState(false);

return (
  <form>
    <label>
      Palavras:
      <input 
        type="number" 
        value={words} 
        onChange={e => setWords(Number(e.target.value))}
        min={100}
        max={5000}
      />
    </label>

    <label>
      Qualidade:
      <select value={tier} onChange={e => setTier(e.target.value)}>
        <option value="basic">Básico (mais rápido, menor custo)</option>
        <option value="medium">Médio (balanceado)</option>
        <option value="advanced">Avançado (maior qualidade)</option>
      </select>
    </label>

    <label>
      <input 
        type="checkbox" 
        checked={generateImages}
        onChange={e => setGenerateImages(e.target.checked)}
      />
      Gerar imagens
    </label>

    <button 
      type="button" 
      onClick={() => setShowConfirmModal(true)}
    >
      Gerar Seção
    </button>
  </form>
);
```

### Passo 2: Modal de Confirmação com Previsão

```tsx
{showConfirmModal && (
  <GenerationConfirmModal
    words={words}
    tier={tier}
    generateImages={generateImages}
    imageCount={imageCount}
    imageQuality={imageQuality}
    onConfirm={handleGenerate}
    onCancel={() => setShowConfirmModal(false)}
  />
)}
```

### Passo 3: Executar Geração

```tsx
const handleGenerate = async () => {
  setShowConfirmModal(false);
  setLoading(true);

  try {
    // Socket ou HTTP normal
    socket.emit('tool_call', {
      tool: 'ebook_advanced_generation',
      parameters: {
        words,
        tier,
        generateImages,
        imageCount,
        imageQuality,
        // ... outros parâmetros
      }
    });

    socket.once('results', (data) => {
      if (data.status === 'completed') {
        // Sucesso
        showNotification('Geração concluída!');
        updateBalance(); // Atualizar saldo
      } else if (data.result?.msg?.includes('no credit')) {
        // Erro de crédito (não deveria acontecer se modal funcionou)
        showError(data.result.msg);
      }
    });
  } catch (error) {
    console.error('Erro na geração:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## 📊 Indicador Visual de Custo em Tempo Real

### Preview Dinâmico

```tsx
const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

// Debounce para evitar muitas requisições
const debouncedEstimate = useCallback(
  debounce(async (words, tier, generateImages) => {
    const response = await fetch('/api/ebook/section/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, tier, generateImages })
    });
    const { estimate } = await response.json();
    setEstimatedCost(estimate.total.credits);
  }, 500),
  []
);

useEffect(() => {
  debouncedEstimate(words, tier, generateImages);
}, [words, tier, generateImages]);

return (
  <div className="cost-indicator">
    <span className="label">Custo estimado:</span>
    <span className="value">
      {estimatedCost !== null ? `${estimatedCost} créditos` : 'Calculando...'}
    </span>
    <span className="info">
      (Seu saldo: {userBalance.toFixed(2)} créditos)
    </span>
  </div>
);
```

---

## ⚠️ Tratamento de Erros - Mensagem "no credit"

### IMPORTANTE: Sempre começa com "no credit"

Quando o backend retorna erro de saldo insuficiente, a mensagem **sempre começa com "no credit"** para compatibilidade com o frontend existente:

```
no credit - Saldo insuficiente. Necessário: 15.00 créditos, Disponível: 8.50 créditos
```

### Parsing no Frontend

```typescript
const handleError = (error: any) => {
  const message = error.msg || error.message || String(error);
  
  if (message.startsWith('no credit')) {
    // Extrair detalhes se houver
    const match = message.match(/Necessário: ([\d.]+) créditos, Disponível: ([\d.]+) créditos/);
    
    if (match) {
      const required = parseFloat(match[1]);
      const available = parseFloat(match[2]);
      
      showErrorModal({
        title: 'Saldo Insuficiente',
        message: `Você precisa de ${required} créditos, mas tem apenas ${available} créditos disponíveis.`,
        action: 'Recarregar Créditos',
        onAction: () => navigate('/pricing')
      });
    } else {
      // Fallback: mensagem genérica
      showErrorModal({
        title: 'Saldo Insuficiente',
        message: 'Você não tem créditos suficientes para esta operação.',
        action: 'Recarregar Créditos',
        onAction: () => navigate('/pricing')
      });
    }
  } else {
    // Outro tipo de erro
    showError(message);
  }
};

// Uso em socket
socket.on('results', (data) => {
  if (data.status === 'failed' && data.result?.msg) {
    handleError(data.result);
  }
});
```

---

## 📋 Checklist de Implementação Frontend

### Pré-Geração
- [ ] Chamar endpoint `/api/ebook/section/estimate` com parâmetros da geração
- [ ] Exibir custo estimado para o usuário
- [ ] Buscar saldo atual do usuário via `/api/balance`
- [ ] Comparar saldo disponível vs custo estimado
- [ ] Mostrar modal de confirmação com breakdown de custos
- [ ] Desabilitar botão "Gerar" se saldo insuficiente

### Durante Geração
- [ ] Mostrar loading/spinner
- [ ] Opcional: Mostrar "Débito estimado: X créditos" durante processamento

### Pós-Geração
- [ ] Atualizar saldo do usuário (buscar `/api/balance` novamente)
- [ ] Mostrar notificação de sucesso com créditos debitados
- [ ] Atualizar UI para refletir novo saldo

### Tratamento de Erros
- [ ] Detectar mensagens que começam com "no credit"
- [ ] Parsear detalhes de créditos necessários/disponíveis (se presentes)
- [ ] Exibir modal de erro amigável
- [ ] Oferecer ação para recarregar créditos

---

## 🎯 Exemplo Completo: Geração de Seção

```typescript
import React, { useState, useCallback } from 'react';
import { debounce } from 'lodash';

const SectionGenerator = () => {
  const [words, setWords] = useState(1000);
  const [tier, setTier] = useState('medium');
  const [generateImages, setGenerateImages] = useState(false);
  const [imageCount, setImageCount] = useState(2);
  const [imageQuality, setImageQuality] = useState('medio');
  
  const [estimate, setEstimate] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Buscar saldo do usuário
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const res = await fetch('/api/balance');
    const data = await res.json();
    setUserBalance(parseFloat(data.balance.total));
  };

  // Estimar custo em tempo real (debounced)
  const estimateCost = useCallback(
    debounce(async () => {
      const res = await fetch('/api/ebook/section/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words,
          tier,
          generateImages,
          imageCount: generateImages ? imageCount : 0,
          imageQuality
        })
      });
      const data = await res.json();
      setEstimate(data.estimate.total);
    }, 500),
    [words, tier, generateImages, imageCount, imageQuality]
  );

  useEffect(() => {
    estimateCost();
  }, [words, tier, generateImages, imageCount, imageQuality]);

  const handleGenerate = () => {
    if (!estimate || userBalance < estimate.credits) {
      alert('Saldo insuficiente!');
      return;
    }
    setShowConfirm(true);
  };

  const confirmGenerate = () => {
    setShowConfirm(false);
    setLoading(true);

    socket.emit('tool_call', {
      tool: 'ebook_advanced_generation',
      parameters: { words, tier, generateImages, imageCount, imageQuality }
    });

    socket.once('results', (data) => {
      setLoading(false);
      if (data.status === 'completed') {
        fetchBalance(); // Atualizar saldo
        showSuccess('Geração concluída!');
      } else if (data.result?.msg?.startsWith('no credit')) {
        showError(data.result.msg);
      }
    });
  };

  const hasEnoughCredits = estimate && userBalance >= estimate.credits;

  return (
    <div>
      <h2>Gerar Seção</h2>
      
      {/* Formulário */}
      <input type="number" value={words} onChange={e => setWords(+e.target.value)} />
      <select value={tier} onChange={e => setTier(e.target.value)}>
        <option value="basic">Básico</option>
        <option value="medium">Médio</option>
        <option value="advanced">Avançado</option>
      </select>
      
      {/* Indicador de custo */}
      <div className="cost-indicator">
        Custo estimado: {estimate ? `${estimate.credits} créditos` : '...'}
        <br />
        Seu saldo: {userBalance.toFixed(2)} créditos
      </div>

      {/* Botão gerar */}
      <button onClick={handleGenerate} disabled={!hasEnoughCredits || loading}>
        {loading ? 'Gerando...' : 'Gerar Seção'}
      </button>

      {/* Modal de confirmação */}
      {showConfirm && (
        <ConfirmModal
          estimate={estimate}
          balance={userBalance}
          onConfirm={confirmGenerate}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};
```

---

## 🚀 Implementação Backend (a fazer)

Para que o frontend funcione, você precisa criar estes endpoints no backend:

### Controller: `pricing.controller.ts`

```typescript
// Adicionar novos endpoints:

export const estimateGenerationCost = async (req: Request, res: Response) => {
  try {
    const { words, tier, contextDepth } = req.body;
    
    const estimate = ebookPricingService.calculateGenerationCost({
      words,
      tier: tier || 'medium',
      contextDepth: contextDepth || 'moderate'
    });
    
    res.json({ success: true, estimate });
  } catch (error) {
    res.status(500).json({ error: errorToText(error) });
  }
};

export const estimateImageCost = async (req: Request, res: Response) => {
  try {
    const { imageCount, quality, imageType } = req.body;
    
    const costPerImage = ebookPricingService.calculateImageCost(
      quality || 'medio',
      imageType || 'internal'
    );
    
    const totalCredits = costPerImage * (imageCount || 1);
    
    res.json({
      success: true,
      estimate: {
        imageCount,
        quality,
        imageType,
        costPerImage,
        totalCredits,
        description: IMAGE_PRICING[quality || 'medio'].description
      }
    });
  } catch (error) {
    res.status(500).json({ error: errorToText(error) });
  }
};

export const estimateSectionCost = async (req: Request, res: Response) => {
  try {
    const { words, tier, contextDepth, generateImages, imageCount, imageQuality } = req.body;
    
    // Custo de texto
    const textEstimate = ebookPricingService.calculateGenerationCost({
      words,
      tier: tier || 'medium',
      contextDepth: contextDepth || 'moderate'
    });
    
    // Custo de imagens (se solicitado)
    let imageEstimate = null;
    if (generateImages && imageCount > 0) {
      const imageCredits = ebookPricingService.calculateMultipleImagesCost(
        imageCount,
        imageQuality || 'medio',
        'internal'
      );
      imageEstimate = {
        credits: imageCredits,
        imageCount,
        quality: imageQuality || 'medio'
      };
    }
    
    const totalCredits = textEstimate.credits + (imageEstimate?.credits || 0);
    const breakdown = imageEstimate
      ? `${textEstimate.credits} créditos (texto) + ${imageEstimate.credits} créditos (${imageCount} imagens)`
      : `${textEstimate.credits} créditos (texto)`;
    
    res.json({
      success: true,
      estimate: {
        textGeneration: {
          credits: textEstimate.credits,
          words: textEstimate.words,
          tier: textEstimate.tier
        },
        imageGeneration: imageEstimate,
        total: {
          credits: totalCredits,
          breakdown
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: errorToText(error) });
  }
};
```

### Rotas: `apiRoutes.ts`

```typescript
// Adicionar rotas:
router.post('/ebook/generation/estimate', estimateGenerationCost);
router.post('/ebook/image/estimate', estimateImageCost);
router.post('/ebook/section/estimate', estimateSectionCost);
```

---

**Data**: 9 de dezembro de 2025  
**Versão**: 1.0.0
