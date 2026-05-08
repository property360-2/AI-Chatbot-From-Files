// Types for DocuMind AI
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    pageNumber?: number;
    [key: string]: any;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
