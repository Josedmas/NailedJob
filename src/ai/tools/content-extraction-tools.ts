
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
    try {
      console.log('[extractTextFromFileTool] Started processing PDF.');
      const parts = fileDataUri.split(',');
      if (parts.length < 2 || !parts[1]) {
        console.error('[extractTextFromFileTool] Invalid data URI format for PDF - missing base64 data part.');
        return { extractedText: 'Error extracting text: Invalid data URI format for PDF - missing base64 data.' };
      }
      const base64Data = parts[1];
      
      const buffer = Buffer.from(base64Data, 'base64');
      const bufferArray = new Uint8Array(buffer);
      console.log('[extractTextFromFileTool] PDF buffer created. Calling getDocument...');
      
      const loadingTask = pdfjsLib.getDocument({ data: bufferArray, disableWorker: true });
      const pdf = await loadingTask.promise as PDFDocumentProxy;
      
      if (!pdf || typeof pdf.numPages !== 'number') {
        console.error('[extractTextFromFileTool] Failed to load PDF document or invalid PDF structure. PDF object:', pdf);
        return { extractedText: 'Error extracting text: Failed to load PDF document or PDF structure is invalid.' };
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
            // Optionally, continue to next page or return partial result/error
            allText += `\n[Error: Could not retrieve page ${i}]`; 
            continue;
        }
        console.log(`[extractTextFromFileTool] Page ${i} retrieved. Getting textContent...`);
        const textContent = await page.getTextContent();

        if (!textContent || !Array.isArray(textContent.items)) { 
              console.warn(`[extractTextFromFileTool] Could not get textContent or items for page ${i}.`);
              allText += `\n[Error: Could not get text content for page ${i}]`;
              continue;
        }
        console.log(`[extractTextFromFileTool] TextContent for page ${i} retrieved. Joining items...`);
        const pageText = textContent.items
          .filter((item): item is TextItem => typeof (item as TextItem).str === 'string')
          .map((item: TextItem) => item.str)
          .join(" ");
        allText += pageText + "\n"; // Add newline between pages
      }
      
      const extractedText = allText.trim();
      if (extractedText === "") {
        console.warn('[extractTextFromFileTool] Successfully processed PDF, but no text content was found (e.g., image-based PDF).');
        // This case will be handled by the flow that checks for empty extractedText
      } else {
        console.log('[extractTextFromFileTool] Successfully extracted text from PDF.');
      }
      return { extractedText };

    } catch (error: unknown) {
      console.error('[extractTextFromFileTool] CRITICAL ERROR during PDF processing:', error);
      let errorMessage = "An unexpected error occurred during PDF processing.";
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more details from common pdfjs-dist errors if possible
        if ('name' in error) errorMessage += ` (Name: ${error.name})`;
        if ('code' in error) errorMessage += ` (Code: ${error.code})`;

      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = "An unidentifiable error occurred and could not be serialized.";
        }
      }
      
      // Log the full error structure for better debugging
      if (typeof error === 'object' && error !== null) {
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

