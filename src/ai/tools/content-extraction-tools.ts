
/**
 * @fileOverview Tools for extracting text content from URLs and PDF files.
 *
 * - fetchTextFromUrlTool - Fetches and extracts text content from a given URL.
 * - extractTextFromFileTool - Extracts text from a PDF file data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// pdf-parse is imported dynamically within the tool function

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
      console.log(`[fetchTextFromUrlTool] Fetching URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      console.log(`[fetchTextFromUrlTool] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not retrieve error text from response.");
        console.error(`[fetchTextFromUrlTool] Failed to fetch URL: ${response.status} ${response.statusText}. Response body: ${errorText.substring(0, 500)}`);
        // Return a structured error
        return { text: `Error fetching URL: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 200)}` };
      }
      let html = await response.text();
      let text = html.replace(/<style[^>]*>.*<\/style>/gs, '');
      text = text.replace(/<script[^>]*>.*<\/script>/gs, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/\s\s+/g, ' ').trim();

      if (!text) {
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
        console.warn(`[fetchTextFromUrlTool] No text could be extracted from URL: ${url}. HTML content might be minimal or heavily JavaScript-driven.`);
         return { text: "Error extracting text: No text content could be extracted from the URL." };
      }
      console.log(`[fetchTextFromUrlTool] Successfully extracted text. Length: ${text.length}`);
      return {text};
    } catch (error: any) {
      console.error('[fetchTextFromUrlTool] CRITICAL error fetching or parsing URL content:', error.message, error.stack);
      // Return a structured error that matches the output schema
      return { text: `Error processing URL for content extraction. Detail: ${error.message}` };
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
    description: 'Extracts text content from a PDF file provided as a data URI using pdf-parse.',
    inputSchema: ExtractTextFromFileInputSchema,
    outputSchema: ExtractTextFromFileOutputSchema,
  },
  async ({ fileDataUri, mimeType }) => {
    console.log('[extractTextFromFileTool] Tool invoked with pdf-parse.');
    try {
      console.log(`[extractTextFromFileTool] Received fileDataUri length: ${fileDataUri?.length}`);
      // console.log(`[extractTextFromFileTool] Data URI start: ${fileDataUri?.substring(0, 100)}`); // Be careful with PII
      console.log(`[extractTextFromFileTool] Received mimeType: ${mimeType}`);

      if (!fileDataUri || !fileDataUri.startsWith('data:application/pdf;base64,')) {
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
      if (base64Data.length === 0) {
        const errorMsg = 'Error extracting text: Base64 data part of PDF Data URI is empty.';
        console.error(`[extractTextFromFileTool] ${errorMsg}`);
        return { extractedText: errorMsg };
      }

      const buffer = Buffer.from(base64Data, 'base64');
      console.log(`[extractTextFromFileTool] PDF buffer created. Length: ${buffer.length}`);
      
      if (buffer.length < 20) { // Heuristic: very small buffer likely means invalid PDF data
        const errorMsg = `Error extracting text: PDF buffer is too small (length: ${buffer.length} bytes) after base64 decoding, likely malformed or invalid PDF.`;
        console.error(`[extractTextFromFileTool] ${errorMsg}`);
        return { extractedText: errorMsg };
      }
      
      // Dynamically import pdf-parse
      console.log('[extractTextFromFileTool] Attempting to dynamically import pdf-parse...');
      const pdfParser = (await import('pdf-parse')).default;
      console.log('[extractTextFromFileTool] pdf-parse imported successfully.');
      
      console.log('[extractTextFromFileTool] Calling pdfParser with buffer...');
      const data = await pdfParser(buffer);
      console.log('[extractTextFromFileTool] pdfParser processing finished.');


      if (!data || typeof data.text !== 'string') {
        const errorMsg = 'Error extracting text: pdf-parse failed to return valid data or text structure.';
        console.error(`[extractTextFromFileTool] ${errorMsg} Data received from pdf-parse:`, JSON.stringify(data, null, 2).substring(0, 300));
        return { extractedText: errorMsg };
      }

      const extractedText = data.text.trim();
      if (extractedText === "") {
        console.warn('[extractTextFromFileTool] Successfully processed PDF with pdf-parse, but no text content was found. PDF might be image-based or empty.');
        return { extractedText: "Error extracting text: No text content found in the uploaded PDF. The PDF might be image-based or empty." };
      }
      
      console.log('[extractTextFromFileTool] Successfully extracted text from PDF using pdf-parse.');
      return { extractedText };

    } catch (error: unknown) {
      let errorMessage = "PDF_PROCESSING_FAILED_INTERNAL_TOOL_ERROR_PDF_PARSE"; 
      let errorStack = "Stack not available";

      if (error instanceof Error) {
        errorMessage = error.message; // This should capture the "ENOENT..." message
        errorStack = error.stack || "Stack not available";
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      // Log the specific error message and part of the stack.
      console.error('[extractTextFromFileTool] CRITICAL ERROR during PDF processing with pdf-parse:', errorMessage, 'Stack:', errorStack.substring(0,500));
      // Ensure the returned error message starts with "Error extracting text:"
      return { extractedText: `Error extracting text: ${errorMessage}.` };
    }
  }
);

