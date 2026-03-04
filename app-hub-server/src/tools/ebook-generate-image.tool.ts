import { Tool } from './protocols/tools.protocols';
import { PromptService } from '../services/prompt.service';
import axios from 'axios';
import { errorToText } from '../services/axios-errors.service';
import EbookImageService from '../services/ebook-image.service';
import { EbookMetadata } from './protocols/ebook-tools.protocols';

const promptService = new PromptService();

const ebookGenerateImageTool: Tool = {
  title: 'Ebook Generate Image',
  description: 'Gera uma imagem para um ebook com base em uma descrição.',
  costPreview: 30, // Custo inicial de placeholder, será ajustado com base no Replicate
  schema: {
    type: 'function',
    function: {
      name: 'ebook_generate_image',
      description: 'Gera uma imagem para um ebook com base em uma descrição.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Prompt/descrição detalhada da imagem a ser gerada.',
          },
          bodyOptions: {
            type: 'object',
            description: 'Opções adicionais para geração da imagem.',
            properties: {
              seed: { type: 'number', description: 'Seed para reprodutibilidade' },
              style_type: { type: 'string', description: 'Tipo de estilo (Auto, Minimalist, etc.)' },
              aspect_ratio: { type: 'string', description: 'Proporção da imagem (16:9, 1:1, etc.)' }
            }
          },
          type: {
            type: 'string',
            description: 'Tipo de imagem (section-image, cover, etc.)'
          },
          projectId: {
            type: 'string',
            description: 'ID do projeto'
          },
          sectionId: {
            type: 'string',
            description: 'ID da seção'
          }
        },
        required: ['prompt'],
      },
    },
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    try {
      // Validação dos parâmetros
      if (!args.prompt || typeof args.prompt !== 'string' || args.prompt.trim() === '') {
        throw new Error('Prompt is required for image generation');
      }

  //    console.log('ARGS IMAGENS: ', args)

      // Lista de valores válidos de style_type (tipos básicos)
      const STYLE_TYPES = ['None', 'Auto', 'General', 'Realistic', 'Design'];
      
      // Receber o valor enviado pelo frontend (pode ser style_type ou style_preset)
      const userStyleChoice = args.styleType || 'Auto';
      
      let styleType: string | undefined;
      let stylePreset: string | undefined;
      
      // Verificar se é um style_type básico ou um style_preset
      if (STYLE_TYPES.includes(userStyleChoice)) {
        // É um style_type básico
        if (userStyleChoice === 'None') {
          // Não enviar nenhum campo de style
          styleType = undefined;
        } else {
          // Enviar apenas style_type
          styleType = userStyleChoice;
        }
      } else {
        // É um style_preset (80s Illustration, 90s Nostalgia, etc)
        stylePreset = userStyleChoice;
        styleType = 'General'; // Quando há preset, style_type deve ser 'General'
      }

      // Aceita aspectRatio ou resolution (não ambos). Para capas, preferir resolution em retrato.
      const aspectRatio = args.aspectRatio;
      const resolution = args.bodyOptions?.resolution || args.resolution;

      // Não há keywords no payload atual, então usar array vazio
      const validKeywords: string[] = [];

      const projectContext = args.context || ''
      // 1. Gerar o prompt para a imagem
      const imagePrompt = promptService.generatePromptForEbookImage(args.prompt.trim(), validKeywords, projectContext);

      // 2. Chamar diretamente a API REST do Replicate para gerar a imagem
      const replicateApiKey = metadata.replicateApiKey ? metadata.replicateApiKey : process.env.REPLICATE_KEY;
      const replicateInput: any = {
        prompt: imagePrompt,
        magic_prompt_option: 'On'  // Ativado conforme solicitado pelo usuário
      };

      // Se for uma capa, forçar resolução em retrato para garantir formato de livro A4
      if (args.type === 'cover') {
        const defaultCoverResolution = '640x1536'; // retrato alto, compatível com a lista
        replicateInput.resolution = defaultCoverResolution;
        // sempre usar resolution para capa (ignorar aspect_ratio do frontend)
      } else {
        // Não é capa: usar resolution se fornecido, caso contrário usar aspect_ratio (fallback 1:1)
        if (resolution && resolution !== 'None') {
          replicateInput.resolution = resolution;
        } else {
          replicateInput.aspect_ratio = aspectRatio || '1:1';
        }
      }
      
      // Adicionar style_type apenas se definido
      if (styleType) {
        replicateInput.style_type = styleType;
      }
      
      // Adicionar style_preset apenas se definido
      if (stylePreset) {
        replicateInput.style_preset = stylePreset;
      }

      // Adicionar seed se fornecido
      if (args?.seed) {
        replicateInput.seed = args?.seed;
      }

      const response = await axios.post('https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3-turbo/predictions', {
        input: replicateInput
      }, {
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        }
      });

      const prediction = response.data;

      if (prediction.status !== 'succeeded' && prediction.status !== 'processing') {
        throw new Error(`Image generation failed: ${prediction.status}`);
      }

      let result = prediction.output;

      // Normalize result to array of URLs
      let resultArray: string[] = [];
      if (Array.isArray(result)) {
        resultArray = result.map(item => String(item));
      } else if (typeof result === 'string') {
        resultArray = [result];
      } else if (result && typeof result === 'object') {
        resultArray = [String(result.url || result.output || result.image || result)];
      } else {
        resultArray = [String(result)];
      }

      const imageUrl = resultArray.filter(url => url && url !== 'undefined' && url !== '[object Object]');

      if (!imageUrl || imageUrl.length === 0) {
        throw new Error('Image generation failed: No URL returned from Replicate.');
      }

      // 3. Upload da imagem para MinIO e salvar referência no banco
      const imageService = new EbookImageService();
      const replicateImageUrl = imageUrl[0];

      // Extrair informações do metadata
      const userId = metadata.userId;
      const projectId = metadata.projectId;
      const sectionId = metadata.sectionId;

      if (!userId || !projectId) {
        throw new Error('User ID and Project ID are required for image storage.');
      }

      const savedImage = await imageService.uploadAndSaveImage(
        replicateImageUrl,
        userId,
        projectId,
        sectionId,
        args.type === 'cover' ? 'cover' : 'section-image',
        imagePrompt,
        { generateCoverVariants: args.type === 'cover' }
      );

      // TODO: Implementar cálculo de créditos dinâmico baseado no uso real do Replicate
      // Para simplificação, um custo fixo básico.
      const creditsCharged = ebookGenerateImageTool.costPreview; // Placeholder

      return {
        role: 'tool',
        content: {
          imageUrl: savedImage.url,
          imageId: savedImage._id?.toString(),
          prompt: imagePrompt,
          printUrl: savedImage.metadata?.printUrl,
          previewUrl: savedImage.metadata?.previewUrl
        },
        tool_call_id: tool_call_id,
        credits: creditsCharged,
      };
    } catch (error) {
  //    console.log(error);
      throw new Error(`Image generation failed: ${errorToText(error)}`);
    }
  },
  icon: 'bi-image-fill',
  provider: 'replicate',
};

export default ebookGenerateImageTool
