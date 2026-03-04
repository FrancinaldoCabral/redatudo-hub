import { QdrantVectorService } from '../../domain/services/QdrantVectorService';
import { QdrantVectorService as QdrantLib } from '../../services/qdrant-vector.service'; // seu atual

export class QdrantVectorServiceImp implements QdrantVectorService {
  private readonly service = new QdrantLib();

  async getFeedback(query: string, limit: number, metadata: any): Promise<any[]> {
    return this.service.getFeedback(query, limit, metadata);
  }
}
