import { Tool } from './protocols/tools.protocols';
import axios from 'axios';
import { errorToText } from '../services/axios-errors.service';

const imageEditorTool: Tool = {
  title: 'Image Editor',
  description: 'Cria ou edita imagens usando Ideogram AI',
  costPreview: 60, // Custo médio, será ajustado dinamicamente
  schema: {
    type: 'function',
    function: {
      name: 'image_editor',
      description: 'Cria ou edita imagens usando Ideogram AI',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt para geração da imagem' },
          quality: { type: 'string', description: 'Qualidade da geração (basic/balanced/advanced)' },
          aspect_ratio: { type: 'string', description: 'Proporção da imagem' },
          resolution: { type: 'string', description: 'Resolução da imagem' },
          magic_prompt_option: { type: 'string', description: 'Opção de magic prompt' },
          style_type: { type: 'string', description: 'Tipo de estilo' },
          style_preset: { type: 'string', description: 'Preset de estilo' },
          mode: { type: 'string', description: 'Modo (create/edit)' },
          image: { type: 'string', description: 'Base64 da imagem (modo edit)' },
          mask: { type: 'string', description: 'Base64 da máscara (modo edit)' }
        },
        required: ['prompt', 'quality', 'aspect_ratio', 'resolution', 'magic_prompt_option', 'style_type', 'style_preset', 'mode']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    try {
      /* console.log('🎨 [IMAGE-EDITOR] Iniciando geração de imagem:', {
        mode: args.mode,
        quality: args.quality,
        promptLength: args.prompt?.length
      }); */

      // Validações básicas
      if (!args.prompt || args.prompt.trim().length === 0) {
        throw new Error('Prompt é obrigatório');
      }

      if (!['basic', 'balanced', 'advanced'].includes(args.quality)) {
        throw new Error('Qualidade inválida');
      }

      if (!['create', 'edit'].includes(args.mode)) {
        throw new Error('Modo inválido');
      }

      // Verificar se modo edit tem imagem e máscara
      if (args.mode === 'edit' && (!args.image_url || !args.mask_url)) {
        throw new Error('Modo edit requer image e mask');
      }

      // Mapear qualidade para modelo Ideogram
      const modelMap = {
        basic: 'ideogram-ai/ideogram-v3-turbo',
        balanced: 'ideogram-ai/ideogram-v3-balanced',
        advanced: 'ideogram-ai/ideogram-v3-quality'
      };

      const model = modelMap[args.quality as keyof typeof modelMap];

      // Preparar input para Replicate
      const replicateInput: any = {
        prompt: args.prompt.trim(),
        aspect_ratio: args.aspect_ratio,
        resolution: args.resolution,
        magic_prompt_option: args.magic_prompt_option,
        style_type: args.style_type,
        style_preset: args.style_preset
      };

      // Adicionar parâmetros específicos do modo edit
      if (args.mode === 'edit') {
        // Converter base64 para URL ou file conforme necessário pela API
        replicateInput.image = args.image_url;
        replicateInput.mask = args.mask_url;
        // Para inpainting, pode ser necessário usar um modelo específico
        // replicateInput.mode = 'inpainting';
      }

      /* console.log('🎨 [IMAGE-EDITOR] Enviando para Replicate:', {
        model,
        inputKeys: Object.keys(replicateInput)
      }); */

      // Chamar API do Replicate
      const replicateApiKey = metadata.replicateApiKey ? metadata.replicateApiKey : process.env.REPLICATE_KEY;

      const response = await axios.post(`https://api.replicate.com/v1/models/${model}/predictions`, {
        input: replicateInput
      }, {
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait' // Aguardar conclusão
        },
        timeout: 300000 // 5 minutos timeout
      });

      const prediction = response.data;

      if (prediction.status !== 'succeeded' && prediction.status !== 'processing') {
        throw new Error(`Geração de imagem falhou: ${prediction.status}`);
      }

      // Se ainda está processando, aguardar conclusão
      let finalPrediction = prediction;
      if (prediction.status === 'processing') {
    //    console.log('🎨 [IMAGE-EDITOR] Aguardando processamento...');

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 5 minutos máximo

        while (finalPrediction.status === 'processing' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos

          const pollResponse = await axios.get(prediction.urls.get, {
            headers: {
              'Authorization': `Bearer ${replicateApiKey}`
            }
          });

          finalPrediction = pollResponse.data;
          attempts++;

      //    console.log(`🎨 [IMAGE-EDITOR] Status: ${finalPrediction.status} (tentativa ${attempts})`);
        }

        if (finalPrediction.status !== 'succeeded') {
          throw new Error(`Geração de imagem falhou após ${maxAttempts} tentativas: ${finalPrediction.status}`);
        }
      }

      // Extrair URL da imagem
      let imageUrl: string;

      if (Array.isArray(finalPrediction.output)) {
        imageUrl = finalPrediction.output[0];
      } else if (typeof finalPrediction.output === 'string') {
        imageUrl = finalPrediction.output;
      } else if (finalPrediction.output && typeof finalPrediction.output === 'object') {
        imageUrl = finalPrediction.output.url || finalPrediction.output.output || finalPrediction.output.image;
      } else {
        throw new Error('Formato de resposta inválido da API');
      }

      if (!imageUrl || imageUrl === 'undefined') {
        throw new Error('URL da imagem não encontrada na resposta');
      }

      // Calcular créditos baseado na qualidade
      const creditsMap = {
        basic: 30,
        balanced: 60,
        advanced: 90
      };

      const creditsCharged = creditsMap[args.quality as keyof typeof creditsMap];

      /* console.log('✅ [IMAGE-EDITOR] Imagem gerada com sucesso:', {
        url: imageUrl.substring(0, 50) + '...',
        credits: creditsCharged,
        quality: args.quality
      }); */

      return {
        role: 'tool',
        content: {
          url: imageUrl,
          prompt: args.prompt,
          quality: args.quality,
          timestamp: new Date().toISOString()
        },
        tool_call_id: tool_call_id,
        credits: creditsCharged
      };

    } catch (error: any) {
      console.error('❌ [IMAGE-EDITOR] Erro na geração:', error);

      // Tratamento específico de erros
      let errorMessage = 'Erro ao gerar imagem';

      if (error.message?.includes('no credit')) {
        // Preservar mensagem descritiva de créditos
        errorMessage = error.message;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Tente novamente.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Parâmetros inválidos';
      }

      throw new Error(errorMessage);
    }
  },
  icon: 'bi-palette-fill',
  provider: 'replicate'
};

export default imageEditorTool;
