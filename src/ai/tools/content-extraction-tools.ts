
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromFileTool - Extracts text from a PDF file data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Import from the ES Module legacy build of pdfjs-dist as it resolved previously.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// Configure pdfjs-dist: CRITICAL to do this before any getDocument call.
// Globally disable worker for pdfjs-dist as the most direct way to prevent worker-related issues in SSR.
(pdfjsLib.GlobalWorkerOptions as any).isWorkerDisabled = true;


export const fetchTextFromUrlTool = ai.defineTool(
  {
    name: 'fetchTextFromUrlTool',
    description: 'Fetches the main text content from a public URL. Best for job description pages.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL to fetch content from.'),
    }),
    outputSchema: z.object({
      text: z.string().describe('The extracted text content from the URL.'),
    }),
  },
  async ({url}) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText} (Status: ${response.status})`);
      }
      let html = await response.text();
      // Basic HTML to text conversion
      // Remove script and style elements
      let text = html.replace(/<style[^>]*>.*<\/style>/gs, '');
      text = text.replace(/<script[^>]*>.*<\/script>/gs, '');
      // Remove all HTML tags
      text = text.replace(/<[^>]+>/g, ' ');
      // Replace multiple spaces with a single space and trim
      text = text.replace(/\s\s+/g, ' ').trim();

      // Fallback: if text is empty, try to get content from body tag only
      if (!text) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            let bodyText = bodyMatch[1];
            // Repeat cleaning for body text
            bodyText = bodyText.replace(/<style[^>]*>.*<\/style>/gs, '');
            bodyText = bodyText.replace(/<script[^>]*>.*<\/script>/gs, '');
            bodyText = bodyText.replace(/<[^>]+>/g, ' ');
            text = bodyText.replace(/\s\s+/g, ' ').trim();
        }
      }
      if (!text) {
        console.warn(`No text could be extracted from URL: ${url}. HTML content might be minimal or heavily JavaScript-driven.`);
      }
      return {text};
    } catch (error) {
      console.error('Error fetching or parsing URL content:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to process URL for content extraction.'
      );
    }
  }
);


export const ExtractTextFromFileInputSchema = z.object({
  fileDataUri: z.string().describe("The PDF file content as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
  mimeType: z.literal('application/pdf').describe('The MIME type of the file (must be "application/pdf").'),
});
export type ExtractTextFromFileInput = z.infer<typeof ExtractTextFromFileInputSchema>;

export const ExtractTextFromFileOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text content from the PDF file. If an error occurs during extraction, this will contain an error message starting with "Error extracting text:".'),
});
export type ExtractTextFromFileOutput = z.infer<typeof ExtractTextFromFileOutputSchema>;

export const extractTextFromFileTool = ai.defineTool(
  {
    name: 'extractTextFromFileTool',
    description: 'Extracts text content from a PDF file provided as a data URI.',
    inputSchema: ExtractTextFromFileInputSchema,
    outputSchema: ExtractTextFromFileOutputSchema,
  },
  async ({ fileDataUri, mimeType }) => { // mimeType will always be 'application/pdf' here due to schema
    console.log('[extractTextFromFileTool] Tool invoked.');
    try {
      console.log('[extractTextFromFileTool] Attempting to parse Data URI for PDF.');
      if (!fileDataUri.startsWith('data:application/pdf;base64,')) {
        const errorMsg = 'Error extracting text: Invalid PDF data URI format. Must start with "data:application/pdf;base64,".';
        console.error(`[extractTextFromFileTool] ${errorMsg}`);
        return { extractedText: errorMsg };
      }
      const parts = fileDataUri.split(',');
      if (parts.length < 2 || !parts[1]) {
        const errorMsg = 'Error extracting text: Invalid data URI format for PDF - missing base64 data part.';
        console.error(`[extractTextFromFileTool] ${errorMsg}`);
        return { extractedText: errorMsg };
      }
      const base64Data = parts[1];
      console.log(`[extractTextFromFileTool] Base64 data length: ${base64Data.length}`);

      const buffer = Buffer.from(base64Data, 'base64');
      const bufferArray = new Uint8Array(buffer);
      console.log('[extractTextFromFileTool] PDF buffer created. Calling getDocument...');

      // Pass disableWorker: true to the getDocument call
      const pdf = await pdfjsLib.getDocument({ data: bufferArray, disableWorker: true }).promise as PDFDocumentProxy;

      if (!pdf || typeof pdf.numPages !== 'number') {
        const errorMsg = 'Error extracting text: Failed to load PDF document or invalid PDF structure. The PDF might be corrupted or not a valid PDF file.';
        console.error('[extractTextFromFileTool] Failed to load PDF document. PDF object:', pdf);
        return { extractedText: errorMsg };
      }
      if (pdf.numPages === 0) {
        console.warn('[extractTextFromFileTool] PDF has 0 pages.');
        return { extractedText: 'Error extracting text: PDF document has no pages.' };
      }
      console.log('[extractTextFromFileTool] PDF document loaded. Num pages:', pdf.numPages);

      let allText = "";
      // Iterate over all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`[extractTextFromFileTool] Getting page ${i}...`);
        const page = await pdf.getPage(i);
        if (!page) {
            console.warn(`[extractTextFromFileTool] Could not get page ${i} from PDF.`);
            allText += `\n[Error: Could not retrieve page ${i}]`;
            continue;
        }
        console.log(`[extractTextFromFileTool] Page ${i} retrieved. Getting textContent...`);
        const textContent = await page.getTextContent();

        if (!textContent || !Array.isArray(textContent.items) || textContent.items.length === 0) {
              console.warn(`[extractTextFromFileTool] No text items found for page ${i}. Possibly image-based PDF or empty page.`);
              allText += `\n[Warning: Page ${i} contains no extractable text items.]`;
              continue;
        }
        console.log(`[extractTextFromFileTool] TextContent for page ${i} retrieved with ${textContent.items.length} items. Joining items...`);
        const pageText = textContent.items
          .filter((item): item is TextItem => typeof (item as TextItem).str === 'string')
          .map((item: TextItem) => item.str)
          .join(" ");
        allText += pageText + "\n"; // Add newline between pages
      }

      const extractedText = allText.trim();
      if (extractedText === "" || extractedText.startsWith("[Warning: Page") || extractedText.startsWith("[Error: Could not retrieve page")) {
        console.warn('[extractTextFromFileTool] Successfully processed PDF, but no substantive text content was found (e.g., image-based PDF or empty content).');
        // Return a specific error message that can be caught by the flow
        return { extractedText: "Error extracting text: No text content found in the uploaded PDF. The PDF might be image-based or empty." };
      } else {
        console.log('[extractTextFromFileTool] Successfully extracted text from PDF.');
      }
      return { extractedText };

    } catch (error: unknown) {
      console.error('[extractTextFromFileTool] CRITICAL ERROR during PDF processing:', error);
      // Return a very simple, fixed error string that matches the schema, to maximize chances of it being returned.
      return { extractedText: "Error: PDF_PROCESSING_FAILED_INTERNAL_TOOL_ERROR" };
    }
  }
);

