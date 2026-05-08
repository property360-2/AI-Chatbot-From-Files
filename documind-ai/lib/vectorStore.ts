/**
 * Vector Store Utility
 * Currently implemented using a simple JSON file (data/chunks.json) for persistence
 * and cosine similarity for retrieval.
 * 
 * TODO: Migrate to a real vector database like Pinecone or Chroma if scale increases.
 */
export const vectorStoreInfo = {
  type: 'Local JSON + Memory',
  status: 'Functional'
};
