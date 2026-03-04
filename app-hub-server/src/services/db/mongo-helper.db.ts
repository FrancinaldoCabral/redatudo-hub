import { MongoClient, Collection } from 'mongodb'

export const MongoHelper = {
  client: null as MongoClient | null,
  uri: null as string | null,

  async connect(uri: string) {
    this.uri = uri;
    if(!this.uri) throw new Error('Mongodb uri is null.');
    
    this.client = await MongoClient.connect(uri);
  },

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  },

  async getCollection<TSchema = any>(name: string): Promise<Collection<TSchema>> {
    if (!this.client || !this.client.topology.isConnected()) {
      await this.connect(this.uri!);
    }
    return this.client!.db('redatudo-server').collection(name);
  }
}
