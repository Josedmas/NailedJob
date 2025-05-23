
'use server';
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromPdfTool - Extracts text content from a PDF data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// pdf-parse is dynamically imported below to potentially avoid import-time issues.

// Define a variable to hold the dynamically imported pdf-parse module.
// It's typed loosely here as type information from pdf-parse might not be directly available without @types/pdf-parse.
let pdfParser: ((dataBuffer: Buffer, options?: any) => Promise<{ text: string; [key: string]: any }>) | null = null;

/**
 * Lazily loads and returns the pdf-parse module.
 * This ensures the module is imported only once when needed.
 */
async function getPdfParser() {
  if (!pdfParser) {
    const pdfParseModule = await import('pdf-parse');
    pdfParser = pdfParseModule.default; // pdf-parse exports its main function as default
  }
  return pdfParser;
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
      
      const parser = await getPdfParser(); // Get the lazily-loaded parser

      const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      // Call parser without options
      const data = await parser(pdfBuffer); 
      
      return {text: data.text};
    } catch (error) {
      console.error('Error parsing PDF content:', error);
      throw new Error(
         error instanceof Error ? error.message : 'Failed to process PDF for text extraction.'
      );
    }
  }
);

