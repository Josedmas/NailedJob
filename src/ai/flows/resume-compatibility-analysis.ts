'use server';

/**
 * @fileOverview Analyzes the compatibility between a job description and a resume.
 *
 * - analyzeCompatibility - A function that takes a job description and a resume as input, and returns a compatibility score and explanation.
 * - CompatibilityInput - The input type for the analyzeCompatibility function.
 * - CompatibilityOutput - The return type for the analyzeCompatibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompatibilityInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description as a string.'),
  resume: z.string().describe('The resume as a string.'),
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

const prompt = ai.definePrompt({
  name: 'resumeCompatibilityPrompt',
  input: {schema: CompatibilityInputSchema},
  output: {schema: CompatibilityOutputSchema},
  prompt: `You are an AI assistant that analyzes the compatibility between a job description and a resume.

  Given the following job description:
  {{jobDescription}}

  And the following resume:
  {{resume}}

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
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
