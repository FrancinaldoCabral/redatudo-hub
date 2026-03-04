import axios from 'axios'

export async function callN8nWebhook(
  n8nUrl: string,
  payload: any,
): Promise<any> {
  const url = `${n8nUrl}`
  
  const response = await axios.post(url, payload)
  return response.data
}