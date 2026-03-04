function extractValidJson(input: string): any {
    try {
      if (typeof input !== "string") {
        throw new Error("O input precisa ser uma string");
      }
  
      // Tentar primeiro JSON.parse direto
      try {
        return JSON.parse(input);
      } catch {}
  
      // Se falhar, remover ```json e ```
      const jsonMatch = input.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
  
      throw new Error("Formato inválido");
    } catch (error) {
      return null;
    }
}
  

export { extractValidJson }