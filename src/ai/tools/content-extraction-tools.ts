
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromFileTool - Extracts text from a PDF file data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// Set the worker source for pdfjs-dist.
// For server-side Node.js, point to the worker file in node_modules directly.
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
} catch (e) {
  console.warn("Could not set pdfjs workerSrc using require.resolve. This might cause issues if pdf.js worker is needed.", e);
  // Fallback or further error handling if needed
}


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
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
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
      // No need to check mimeType === 'application/pdf' again, Zod literal schema handles it.

      const base64Data = fileDataUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URI format for PDF.');
      }
      const buffer = Buffer.from(base64Data, 'base64');
      
      const bufferArray = new Uint8Array(buffer);
      // Pass disableWorker: true to prevent worker-related issues in SSR
      const loadingTask = pdfjsLib.getDocument({ data: bufferArray, disableWorker: true });
      const pdf = await loadingTask.promise as PDFDocumentProxy;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is TextItem => typeof (item as TextItem).str === 'string')
          .map((item: TextItem) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }
      return { extractedText: fullText.trim() };
    } catch (error: any) {
      console.error('Error extracting text from PDF file tool:', error);
      return { extractedText: `Error extracting text: ${error.message}` };
    }
  }
);

