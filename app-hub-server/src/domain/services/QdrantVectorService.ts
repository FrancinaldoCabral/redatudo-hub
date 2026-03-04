export interface QdrantVectorService {
    getFeedback(query: string, limit: number, metadata: any): Promise<any[]>;
}
  