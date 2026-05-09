import './polyfill';
const pdf = require('pdf-parse');

/**
 * Extract text content from a PDF buffer.
 * @param buffer - The PDF file buffer.
 * @returns Cleaned text content from the PDF.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // This modern fork (v2.4.5) uses a class-based API
    const { PDFParse } = require('pdf-parse');
    
    if (!PDFParse) {
      throw new Error("Could not find PDFParse class in pdf-parse module.");
    }

    // Initialize the parser with the buffer data
    // We disable worker fetch and reduce verbosity to avoid Node.js environment issues
    const parser = new PDFParse({ 
      data: buffer,
      verbosity: 0,
      useWorkerFetch: false
    });
    
    // Extract text using the getText() method
    const result = await parser.getText();
    
    return result.text.replace(/\s+/g, ' ').trim();
  } catch (error: any) {
    console.error("[PDF Error] Error parsing PDF:", error.message);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}

/**
 * Split large text into smaller chunks for better processing by LLMs.
 * @param text - The full text to split.
 * @param chunkSize - Maximum characters per chunk.
 * @param overlap - Number of characters to overlap between chunks.
 * @returns Array of text chunks.
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.substring(startIndex, endIndex));
    startIndex += (chunkSize - overlap);
  }

  return chunks;
}
