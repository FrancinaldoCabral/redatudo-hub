import axios from 'axios'
import crypto from 'crypto';

export class OpenrouterModels {
    
    public models: any[] = []
    
    constructor(){}
    
    async fetchProviderName(modelId: string) {
        const [author, slug] = modelId.split('/');
        const { data } = await axios.get(
          `https://openrouter.ai/api/v1/models/${author}/${slug}/endpoints`,
          { headers: { Authorization: `Bearer ${process.env.OPENROUTER_KEY}` } }
        );
        // pega o primeiro provider registrado
        return data.endpoints?.[0]?.provider_name || author;
    }

    async update(query:any): Promise<boolean> {
        const { tools, structured, vision } = query;
        const qs = [];
      
        if (tools === 'true') qs.push('supported_parameters=tools');
        if (structured === 'true') qs.push('supported_parameters=structured_outputs');
        const url = 'https://openrouter.ai/api/v1/models' + (qs.length ? `?${qs.join('&')}` : '');
      
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${process.env.OPENROUTER_KEY}` }
        });
      
        let models = data.models || data.data; // dependendo da versão da API
      
        // Filtro adicional de contexto
        models = models.filter(m => m.context_length >= 128000);
      
        // Filtro manual de visão
        if (vision === 'true') {
          models = models.filter(m =>
            m.architecture.input_modalities?.includes('image')
          );
        }

        const m = []
        for (let index = 0; index < models.length; index++) {
            const { id, name, description, pricing } = models[index];
            const platform = await this.fetchProviderName(id)
            m.push({id, name, description, pricing, platform})
        }

        if(m && m.length > 0) {
            this.models = m
            return true
        }
        else return false
    }
}

const SECRET = process.env.WC_HASH_SECRET || 'default-super-secret';

export function generateOrderHash(orderId: number, createdAt: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${orderId}:${createdAt}`)
    .digest('hex');
}

export function verifyOrderHash(orderId: number, createdAt: string, incomingHash: string): boolean {
  const expected = generateOrderHash(orderId, createdAt);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(incomingHash));
}
