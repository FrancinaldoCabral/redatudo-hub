import axios from "axios";

/**
 * Verifica se a API Key da OpenAI é válida.
 * @param apiKey - A chave de API da OpenAI
 * @returns Promise<boolean> - Retorna true se for válida, false caso contrário.
 */
export async function isValidOpenAIKey(apiKey: string): Promise<boolean> {
    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Say hello" }],
                max_tokens: 5,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.status === 200;
    } catch (error: any) {
        return false;
    }
}

/**
 * Verifica se a API Key da Replicate é válida.
 * @param apiKey - A chave de API da Replicate
 * @returns Promise<boolean> - Retorna true se for válida, false caso contrário.
 */
export async function isValidReplicateKey(apiKey: string): Promise<boolean> {
    try {
        const response = await axios.get("https://api.replicate.com/v1/models", {
            headers: {
                Authorization: `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
        });
        return response.status === 200;
    } catch (error: any) {
        return false;
    }
}
