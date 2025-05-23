
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
// REMOVED: (pdfjsLib.GlobalWorkerOptions as any).workerSrc = null; // This line was causing "Invalid workerSrc type"


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
    try { // Moved try to wrap the entire function body
      console.log('[extractTextFromFileTool] Started processing PDF.');
      const base64Data = fileDataUri.split(',')[1];
      if (!base64Data) {
        console.error('[extractTextFromFileTool] Invalid data URI format for PDF - missing base64 data.');
        return { extractedText: 'Error extracting text: Invalid data URI format for PDF - missing base64 data.' };
      }
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Convert Buffer to Uint8Array
      const bufferArray = new Uint8Array(buffer);
      console.log('[extractTextFromFileTool] PDF buffer created. Calling getDocument...');
      
      // Pass disableWorker: true to prevent worker-related issues in SSR
      const loadingTask = pdfjsLib.getDocument({ data: bufferArray, disableWorker: true });
      const pdf = await loadingTask.promise as PDFDocumentProxy;
      
      if (!pdf || typeof pdf.numPages !== 'number' || pdf.numPages === 0) {
        console.error('[extractTextFromFileTool] Failed to load PDF or PDF has no pages. PDF object:', pdf);
        return { extractedText: 'Error extracting text: Failed to load PDF document, PDF structure is invalid, or PDF has no pages.' };
      }
      console.log('[extractTextFromFileTool] PDF document loaded. Num pages:', pdf.numPages);
      
      // Simplify: Process only the first page for stability testing.
      const pageNumber = 1;
      console.log(`[extractTextFromFileTool] Getting page ${pageNumber}...`);
      const page = await pdf.getPage(pageNumber);
      
      if (!page) { 
          console.warn(`[extractTextFromFileTool] Could not get page ${pageNumber} from PDF.`);
          return { extractedText: `Error extracting text: Could not retrieve page ${pageNumber} from PDF.`};
      }
      console.log(`[extractTextFromFileTool] Page ${pageNumber} retrieved. Getting textContent...`);
      const textContent = await page.getTextContent();

      if (!textContent || !Array.isArray(textContent.items)) { 
            console.warn(`[extractTextFromFileTool] Could not get textContent or items for page ${pageNumber}.`);
            return { extractedText: `Error extracting text: Could not get text content for page ${pageNumber}.`};
      }
      console.log(`[extractTextFromFileTool] TextContent for page ${pageNumber} retrieved. Joining items...`);
      const pageText = textContent.items
        .filter((item): item is TextItem => typeof (item as TextItem).str === 'string')
        .map((item: TextItem) => item.str)
        .join(" ");
      
      console.log('[extractTextFromFileTool] Successfully extracted text from first page.');
      return { extractedText: pageText.trim() };

    } catch (error: unknown) { // Catch unknown for broader error handling
      console.error('[extractTextFromFileTool] CRITICAL ERROR during PDF processing:', error);
      let errorMessage = "An unexpected error occurred during PDF processing.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        // Attempt to serialize non-Error objects if possible, for more debug info
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          // Fallback if serialization fails
          errorMessage = "An unidentifiable error occurred and could not be serialized.";
        }
      }
      // Log the full error object for more details if possible
      if (typeof error === 'object' && error !== null) {
        // Use Object.getOwnPropertyNames to get non-enumerable properties too
        const errorDetails = Object.getOwnPropertyNames(error).reduce((acc, key) => {
          acc[key] = (error as any)[key];
          return acc;
        }, {} as Record<string, any>);
        console.error('[extractTextFromFileTool] Full error details:', errorDetails);
      }
      return { extractedText: `Error extracting text: ${errorMessage}` };
    }
  }
);

