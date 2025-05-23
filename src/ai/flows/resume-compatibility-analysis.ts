'use server';

/**
 * @fileOverview Analyzes the compatibility between a job description and a resume.
 *
 * - analyzeCompatibility - A function that takes a job description and a resume as input (either as text, URL for job desc, or PDF data URI for resume), and returns a compatibility score and explanation.
 * - CompatibilityInput - The input type for the analyzeCompatibility function.
 * - CompatibilityOutput - The return type for the analyzeCompatibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fetchTextFromUrlTool, extractTextFromPdfTool } from '@/ai/tools/content-extraction-tools';

const CompatibilityInputSchema = z.object({
  jobDescription: z
    .string()
    .optional()
    .describe('The job description as a string. If not provided, jobOfferUrl will be used.'),
  jobOfferUrl: z
    .string()
    .url()
    .optional()
    .describe('URL of the job offer. Used if jobDescription text is not provided.'),
  resume: z
    .string()
    .optional()
    .describe('The resume as a string. If not provided, resumePdfDataUri will be used.'),
  resumePdfDataUri: z
    .string()
    .optional()
    .describe("The resume as a PDF data URI. Used if resume text is not provided. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
}).refine(data => data.jobDescription || data.jobOfferUrl, {
  message: "Either jobDescription text or jobOfferUrl must be provided.",
  path: ["jobDescription"], 
}).refine(data => data.resume || data.resumePdfDataUri, {
  message: "Either resume text or resumePdfDataUri must be provided.",
  path: ["resume"],
});

export type CompatibilityInput = z.infer<typeof CompatibilityInputSchema>;

const CompatibilityOutputSchema = z.object({
  compatibilityScore: z
    .number()
    .describe(
      'A percentage (0-100) representing the compatibility between the resume and the job description.'
    ),
  explanation: z
    .string()
    .describe(
      'A brief explanation of the compatibility score, highlighting the strengths of the resume in relation to the job description.'
    ),
});
export type CompatibilityOutput = z.infer<typeof CompatibilityOutputSchema>;

export async function analyzeCompatibility(
  input: CompatibilityInput
): Promise<CompatibilityOutput> {
  return compatibilityAnalysisFlow(input);
}

// Internal schema for the prompt, after processing URL/PDF
const ProcessedCompatibilityInputSchema = z.object({
  jobDescriptionText: z.string().describe('The job description text.'),
  resumeText: z.string().describe('The resume text.'),
});


const prompt = ai.definePrompt({
  name: 'resumeCompatibilityPrompt',
  input: {schema: ProcessedCompatibilityInputSchema},
  output: {schema: CompatibilityOutputSchema},
  prompt: `You are an AI assistant that analyzes the compatibility between a job description and a resume.

  Given the following job description:
  {{jobDescriptionText}}

  And the following resume:
  {{resumeText}}

  Provide a compatibility score (0-100) and a brief explanation of the score, highlighting the strengths of the resume in relation to the job description.

  Consider skills, experience, and keywords mentioned in both the job description and the resume.
  The compatibility score must be realistic.

  Output in JSON format:
  {
    "compatibilityScore": number,
    "explanation": string
  }`,
});

const compatibilityAnalysisFlow = ai.defineFlow(
  {
    name: 'compatibilityAnalysisFlow',
    inputSchema: CompatibilityInputSchema,
    outputSchema: CompatibilityOutputSchema,
    tools: [fetchTextFromUrlTool, extractTextFromPdfTool],
  },
  async (input) => {
    let jobDescriptionText = input.jobDescription;
    let resumeText = input.resume;

    if (!jobDescriptionText && input.jobOfferUrl) {
      console.log(`Fetching job description from URL: ${input.jobOfferUrl}`);
      const { output } = await fetchTextFromUrlTool({url: input.jobOfferUrl});
      if (!output?.text) throw new Error('Could not extract text from job offer URL.');
      jobDescriptionText = output.text;
    }

    if (!resumeText && input.resumePdfDataUri) {
      console.log('Extracting resume text from PDF data URI.');
      const { output } = await extractTextFromPdfTool({pdfDataUri: input.resumePdfDataUri});
       if (!output?.text) throw new Error('Could not extract text from PDF resume.');
      resumeText = output.text;
    }
    
    if (!jobDescriptionText) {
        throw new Error("Job description text is missing after attempting to process inputs.");
    }
    if (!resumeText) {
        throw new Error("Resume text is missing after attempting to process inputs.");
    }

    const {output} = await prompt({ jobDescriptionText, resumeText });
    return output!;
  }
);
