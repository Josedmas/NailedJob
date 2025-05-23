
'use server';
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromPdfTool - Extracts text content from a PDF data URI using pdfjs-dist.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Import from pdfjs-dist CJS legacy build
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type TextItem } from 'pdfjs-dist/legacy/build/pdf.js';

// Globally disable worker for pdfjs-dist.
// This is crucial for server-side environments like Next.js where workers might not be available or correctly configured.
// The `as any` is used because the type definitions might not perfectly align with all properties in all contexts.
if (GlobalWorkerOptions) {
  (GlobalWorkerOptions as any).isWorkerDisabled = true;
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
      // Simple text extraction, might need improvement for complex sites
      let html = await response.text();
      // This is a very basic way to get text.
      // A more robust solution might involve libraries like Cheerio to parse HTML.
      // For now, we'll try to strip HTML tags naively.
      let text = html.replace(/<style[^>]*>.*<\/style>/gs, ''); // remove style blocks
      text = text.replace(/<script[^>]*>.*<\/script>/gs, ''); // remove script blocks
      text = text.replace(/<[^>]+>/g, ' '); // remove all other tags
      text = text.replace(/\s\s+/g, ' ').trim(); // clean up whitespace

      if (!text) {
        // Fallback or more specific extraction if the above is too naive
        // For example, if we know job descriptions are often in <article> or specific divs
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            let bodyText = bodyMatch[1];
            bodyText = bodyText.replace(/<style[^>]*>.*<\/style>/gs, '');
            bodyText = bodyText.replace(/<script[^>]*>.*<\/script>/gs, '');
            bodyText = bodyText.replace(/<[^>]+>/g, ' ');
            text = bodyText.replace(/\s\s+/g, ' ').trim();
        }
      }

      if (!text) {
        console.warn(`Could not extract meaningful text from ${url}. Returning raw HTML body attempt.`);
        // If still no text, it might be a SPA or require JS.
        // The LLM might be able to handle some HTML, or this tool needs to be smarter.
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

export const extractTextFromPdfTool = ai.defineTool(
  {
    name: 'extractTextFromPdfTool',
    description: 'Extracts text content from a PDF provided as a data URI using pdfjs-dist.',
    inputSchema: z.object({
      pdfDataUri: z
        .string()
        .describe(
          "The PDF file content as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
        ),
    }),
    outputSchema: z.object({
      text: z.string().describe('The extracted text content from the PDF.'),
    }),
  },
  async ({pdfDataUri}) => {
    try {
      if (!pdfDataUri.startsWith('data:application/pdf;base64,')) {
        throw new Error('Invalid PDF data URI format. Must start with "data:application/pdf;base64,".');
      }
      const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      // Load the PDF document using pdfjs-dist
      // Pass disableWorker: true to reinforce that no worker should be used for this specific document.
      const loadingTask = getDocument({ data: pdfBuffer, disableWorker: true });
      const pdf: PDFDocumentProxy = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Ensure items are actually TextItems before trying to access .str
        const pageText = textContent.items
            .filter((item): item is TextItem => 'str' in item)
            .map((item: TextItem) => item.str)
            .join(' ');
        fullText += pageText + (i < pdf.numPages ? '\n\n' : ''); // Add double newline between pages
      }

      if (!fullText.trim()) {
        console.warn('pdfjs-dist extracted no text from the PDF.');
      }

      return {text: fullText.trim()};
    } catch (error) {
      console.error('Error parsing PDF content with pdfjs-dist:', error);
      // Check if the error is related to worker setup to provide a more specific message
      if (error instanceof Error && (error.message.includes('worker') || error.message.includes('Worker'))) {
           throw new Error('Failed to process PDF: pdfjs-dist worker setup issue. Ensure GlobalWorkerOptions.isWorkerDisabled is true and workers are not expected. Original error: ' + error.message);
      }
      throw new Error(
         error instanceof Error ? error.message : 'Failed to process PDF for text extraction using pdfjs-dist.'
      );
    }
  }
);
