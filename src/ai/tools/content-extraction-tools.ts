
'use server';
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromPdfTool - Extracts text content from a PDF data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Attempt to import the .mjs version for better ESM compatibility
import { getDocument, type TextItem } from 'pdfjs-dist/legacy/build/pdf.mjs';


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
      const html = await response.text();
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
    description: 'Extracts text content from a PDF provided as a data URI.',
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
        throw new Error('Invalid PDF data URI format.');
      }
      
      const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const typedArray = new Uint8Array(pdfBuffer); // pdfjs-dist expects Uint8Array

      // Using pdfjs-dist directly
      // Explicitly disable worker using disableWorker: true
      const pdfDoc = await getDocument({ data: typedArray, disableWorker: true }).promise;
      let fullText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        // textContent.items can contain TextItem or TextMarkedContent.
        // We are interested in TextItem which has 'str' property.
        const pageText = textContent.items
          .map(item => ('str' in item ? (item as TextItem).str : ''))
          .join(' ');
        fullText += pageText + (i < pdfDoc.numPages ? '\n' : ''); // Add newline between pages
      }
      
      return {text: fullText.trim()};
    } catch (error) {
      console.error('Error parsing PDF content with pdfjs-dist:', error);
      throw new Error(
         error instanceof Error ? error.message : 'Failed to process PDF for text extraction using pdfjs-dist.'
      );
    }
  }
);

