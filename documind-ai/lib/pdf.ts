/**
 * PDF Utility - lib/pdf.ts
 * Handles PDF text extraction and text chunking for the BM25 search pipeline.
 *
 * This version uses pdf-parse@1.1.1 which is the stable, pure-JS version.
 * It avoids the browser dependencies (like DOMMatrix) found in 2.x.
 */

/**
 * Extract text content from a PDF buffer.
 *
 * @param buffer - The raw PDF file as a Node.js Buffer
 * @returns The extracted plain text content from the PDF
 * @throws Error if pdf-parse fails to extract text
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // We import the library. In 1.1.1, the main export is the parsing function.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdf = require('pdf-parse');

    // pdf() returns a Promise that resolves to an object with a 'text' property.
    // We pass the buffer directly.
    const data = await pdf(buffer);

    return data.text.replace(/\s+/g, ' ').trim();
  } catch (error: any) {
    console.error('[PDF Error] Failed to extract text:', error.message);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Split large text into smaller overlapping chunks for BM25 search.
 *
 * @param text - The full document text to split
 * @param chunkSize - Maximum number of characters per chunk (default: 800)
 * @param overlap - Number of characters to overlap between consecutive chunks (default: 150)
 * @returns Array of text chunk strings
 */
export function chunkText(
  text: string,
  chunkSize: number = 800,
  overlap: number = 150,
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.substring(startIndex, endIndex).trim();

    // Only add non-empty chunks
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex += chunkSize - overlap;
  }

  return chunks;
}
