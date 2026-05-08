import './polyfill';
import * as _pdf from 'pdf-parse';

// Handle CJS/ESM interop for pdf-parse
const pdf = (_pdf as any).default || _pdf;

/**
 * Extract text content from a PDF buffer.
 * @param buffer - The PDF file buffer.
 * @returns Cleaned text content from the PDF.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF document.");
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
