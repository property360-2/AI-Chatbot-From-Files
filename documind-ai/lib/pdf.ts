/**
 * PDF Utility - lib/pdf.ts
 * Handles PDF text extraction and text chunking for the BM25 search pipeline.
 *
 * Uses the pdf-parse@2.4.5 class-based API (PDFParse). The buffer is passed
 * directly to the constructor as the `data` option, which avoids any file-system
 * access and is safe in Vercel's serverless environment.
 *
 * API reference (pdf-parse v2):
 *   const p = new PDFParse({ data: buffer, verbosity: VerbosityLevel.ERRORS });
 *   await p.load();
 *   const pages = await p.getText();  // returns Array<{ page, text }>
 */

/**
 * Extract text content from a PDF buffer.
 *
 * @param buffer - The raw PDF file as a Node.js Buffer
 * @returns The extracted plain text content from the PDF
 * @throws Error if pdf-parse fails to load or extract text
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse, VerbosityLevel } = require('pdf-parse');

    // NOTE: The `data` field is accepted in the constructor and auto-converts
    // a Node.js Buffer to Uint8Array internally. Do NOT pass a path or url.
    const parser = new PDFParse({
      data: buffer,
      verbosity: VerbosityLevel.ERRORS,
    });

    // load() parses the PDF bytes into the internal document representation
    await parser.load();

    // getText() returns an object: { pages: Array, text: string, total: number }
    const result = await parser.getText();

    // Use the combined text property directly and normalize whitespace
    const fullText = result.text
      .replace(/\s+/g, ' ')
      .trim();

    return fullText;
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
