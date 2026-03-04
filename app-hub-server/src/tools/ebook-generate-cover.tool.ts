import { Tool } from './protocols/tools.protocols';
import { PromptService } from '../services/prompt.service';
import axios from 'axios';
import { errorToText } from '../services/axios-errors.service';
import EbookImageService from '../services/ebook-image.service';
import { EbookMetadata } from './protocols/ebook-tools.protocols';

const promptService = new PromptService();

const ebookGenerateCoverTool: Tool = {
  title: 'Ebook Generate Cover',
  description: 'Gera uma imagem de capa para um ebook com base em seus metadados.',
  costPreview: 30, // Fixed cost per function as per app-hub-server model
  schema: {
    type: 'function',
    function: {
      name: 'ebook_generate_cover',
      description: 'Gera uma imagem de capa para um ebook com base em seus metadados.',
      parameters: {
        type: 'object',
        properties: {
          bookMetadata: {
            type: 'object',
            description: 'Metadados completos do ebook (título, descrição, nicho, keywords).',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              niche: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'description', 'niche', 'keywords'],
          },
        },
        required: ['bookMetadata'],
      },
    },
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    try {
      const { bookInfo, style, aspectRatio, additionalInstructions, seed } = args;
      
      // 1. Gerar o prompt para a imagem da capa
      const imagePrompt = promptService.generatePromptForEbookCover(
        bookInfo,
        style || 'Design',
        additionalInstructions || ''
      );

      // 2. Chamar diretamente a API REST do Replicate para gerar a imagem
      const replicateApiKey = metadata.replicateApiKey ? metadata.replicateApiKey : process.env.REPLICATE_KEY;
      const replicateInput = {
        prompt: imagePrompt,
        style_type: 'Design',
        aspect_ratio: aspectRatio || '2:3',
        magic_prompt_option: 'On'
      };

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

      if (prediction.status !== 'processing' && prediction.status !== 'succeeded') {
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

      if (!userId || !projectId) {
        throw new Error('User ID and Project ID are required for cover storage.');
      }

      const savedImage = await imageService.uploadAndSaveImage(
        replicateImageUrl,
        userId,
        projectId,
        null, // Covers don't belong to specific sections
        'cover',
        imagePrompt,
        { generateCoverVariants: true }
      );

      // TODO: Implementar cálculo de créditos dinâmico baseado no uso real do Replicate
      // Para simplificação, um custo fixo básico.
      const creditsCharged = ebookGenerateCoverTool.costPreview; // Must match costPreview

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
  icon: 'bi-image',
  provider: 'replicate',
};

export default ebookGenerateCoverTool;
