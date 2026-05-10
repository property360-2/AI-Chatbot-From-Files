/**
 * BM25 Ranking Algorithm
 * 
 * A pure TypeScript implementation of the Okapi BM25 ranking function.
 * Used for relevant document chunk retrieval without requiring ML embeddings.
 */

interface Chunk {
  content: string;
  [key: string]: any;
}

/**
 * Basic tokenizer: lowercase, remove punctuation, split by whitespace.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 0);
}

/**
 * Calculates Inverse Document Frequency (IDF) for all unique terms in the collection.
 */
function buildIDF(chunks: Chunk[]): Map<string, number> {
  const idfMap = new Map<string, number>();
  const N = chunks.length;

  chunks.forEach(chunk => {
    const terms = new Set(tokenize(chunk.content));
    terms.forEach(term => {
      idfMap.set(term, (idfMap.get(term) || 0) + 1);
    });
  });

  const finalIDF = new Map<string, number>();
  idfMap.forEach((count, term) => {
    // Standard BM25 IDF: log((N - n + 0.5) / (n + 0.5) + 1)
    const idf = Math.log((N - count + 0.5) / (count + 0.5) + 1);
    finalIDF.set(term, idf);
  });

  return finalIDF;
}

/**
 * Ranks chunks based on the BM25 score relative to the query.
 * 
 * @param query - The user's search query
 * @param chunks - Array of document chunks to rank
 * @param k1 - Term frequency saturation parameter (default 1.5)
 * @param b - Length normalization parameter (default 0.75)
 */
export function rankChunksBM25(
  query: string, 
  chunks: Chunk[], 
  limit: number = 5,
  k1: number = 1.5, 
  b: number = 0.75
): Chunk[] {
  if (!chunks.length || !query.trim()) return [];

  const queryTerms = tokenize(query);
  const idfMap = buildIDF(chunks);
  
  // Calculate average document length
  const totalLength = chunks.reduce((sum, chunk) => sum + tokenize(chunk.content).length, 0);
  const avgDL = totalLength / chunks.length;

  const scoredChunks = chunks.map(chunk => {
    const chunkTerms = tokenize(chunk.content);
    const chunkLen = chunkTerms.length;
    
    // Count term frequencies in this chunk
    const tfMap = new Map<string, number>();
    chunkTerms.forEach(term => {
      tfMap.set(term, (tfMap.get(term) || 0) + 1);
    });

    let score = 0;
    queryTerms.forEach(term => {
      const idf = idfMap.get(term) || 0;
      const tf = tfMap.get(term) || 0;
      
      // BM25 formula
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (chunkLen / avgDL));
      score += idf * (numerator / denominator);
    });

    return { ...chunk, score };
  });

  // Sort by score descending and return top N
  return scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
