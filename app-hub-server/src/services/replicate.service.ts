
import { errorToText } from '../services/axios-errors.service'
import axios from 'axios'

const send = async (input: any, version:any='ideogram-ai/ideogram-v3-turbo', metadata:any): Promise<any> => {
    try {
      const replicateApiKey = metadata.replicateApiKey? metadata.replicateApiKey: process.env.REPLICATE_KEY

      // Se version for um caminho de modelo (ex: "ideogram-ai/ideogram-v3-turbo"), use endpoint /models/{model}/predictions.
      // Se for um hash de versão, use /predictions com campo version.
      const isModelPath = typeof version === 'string' && version.includes('/');

      const url = isModelPath
        ? `https://api.replicate.com/v1/models/${version}/predictions`
        : 'https://api.replicate.com/v1/predictions';

      const body = isModelPath
        ? { input }
        : { version, input };

      const createResponse = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      let prediction: any = createResponse.data

      // Poll for completion
      while (prediction.status !== 'failed'
        && prediction.status !== 'canceled'
        && prediction.status !== 'succeeded') {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        const pollResponse = await axios.get(prediction.urls.get, {
          headers: {
            'Authorization': `Bearer ${replicateApiKey}`
          }
        })
        prediction = pollResponse.data
      }

      let result = prediction.output

      // Normalize result to array of URLs like original ImageGenerationService
      let resultArray: string[] = [];

      if (Array.isArray(result)) {
        resultArray = result.map(item => String(item));
      } else if (typeof result === 'string') {
        resultArray = [result];
      } else if (result && typeof result === 'object') {
        const urlValue = (result as any).url;
        if (typeof urlValue === 'function') {
          const url = await urlValue();
          resultArray = [String(url)];
        } else {
          resultArray = [String((result as any).url || (result as any).output || (result as any).image || result)];
        }
      } else {
        resultArray = [String(result)];
      }

      return { result: resultArray.filter(url => url && url !== 'undefined' && url !== '[object Object]'), metrics: prediction.metrics?.predict_time }
    } catch (error) {
    //    console.log(error)
        return errorToText(error)
    }
}

export { send }
