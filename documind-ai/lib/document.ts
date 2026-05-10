/**
 * Document Utility - lib/document.ts
 * Handles text extraction from various file types (.pdf, .docx, .xlsx, .txt, etc.)
 * and handles text chunking for the BM25 search pipeline.
 */

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Extract text content from a file buffer based on its extension.
 *
 * @param buffer - The raw file bytes as a Node.js Buffer
 * @param fileName - The original filename to determine the extension
 * @returns The extracted plain text content
 * @throws Error if extraction fails or file type is unsupported
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();
  console.log(`[Document Utils] Extracting text from: ${fileName} (Ext: ${extension})`);

  try {
    let text = '';
    switch (extension) {
      case 'pdf':
        text = await extractPDF(buffer);
        break;

      case 'docx':
        text = await extractDOCX(buffer);
        break;

      case 'xlsx':
      case 'xls':
        text = await extractXLSX(buffer);
        break;

      case 'csv':
      case 'txt':
      case 'md':
        text = buffer.toString('utf-8');
        break;

      default:
        // Try fallback to text if extension is unknown but size is reasonable
        if (buffer.length < 1024 * 1024) {
          text = buffer.toString('utf-8');
        } else {
          throw new Error(`Unsupported file type: .${extension}`);
        }
    }

    if (!text || text.trim().length === 0) {
      console.warn(`[Document Utils] Warning: Extracted text from ${fileName} is empty.`);
      return `Document: ${fileName}\n(This document appears to have no readable text content.)`;
    }

    // Prepend filename to the content so it's searchable by BM25
    return `Document: ${fileName}\n\n${text}`;
  } catch (error: any) {
    console.error(`[Document Utils] Error extracting ${fileName}:`, error.message);
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF using pdf-parse@1.1.1
 */
async function extractPDF(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdf = require('pdf-parse');
    
    // We try to extract text. If it's a scanned PDF, pdf-parse will return empty text.
    const data = await pdf(buffer);
    
    if (!data || !data.text) {
      console.error('[PDF Extract] pdf-parse returned null or undefined text.');
      return '';
    }

    const extractedText = data.text.replace(/\s+/g, ' ').trim();
    console.log(`[PDF Extract] Successfully extracted ${extractedText.length} characters.`);
    
    return extractedText;
  } catch (error: any) {
    console.error('[PDF Extract] Fatal error during PDF parsing:', error.message);
    // If it's a password-protected PDF or corrupted, it falls through here
    return '';
  }
}

/**
 * Extract text from Word Document using mammoth
 */
async function extractDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.replace(/\s+/g, ' ').trim();
}

/**
 * Extract data from Spreadsheet using xlsx
 */
async function extractXLSX(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
  let fullText = '';

  console.log(`[XLSX] Sheets found: ${workbook.SheetNames.join(', ')}`);

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON first to handle empty rows better
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (rows.length > 0) {
      console.log(`[XLSX] Sheet "${sheetName}" has ${rows.length} rows.`);
      
      // Format as a simple text table
      const sheetContent = rows
        .map((row: any) => row.join(' | '))
        .filter((row: string) => row.replace(/[| ]/g, '').length > 0)
        .join('\n');

      if (sheetContent.trim()) {
        fullText += `--- Sheet: ${sheetName} ---\n${sheetContent}\n\n`;
      }
    }
  });

  return fullText.trim();
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

  if (!text) return [];

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
