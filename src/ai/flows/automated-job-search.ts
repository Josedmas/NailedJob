// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Automatically searches for relevant job postings in Spain based on a given resume.
 *
 * - automatedJobSearch - A function that searches for job postings.
 * - AutomatedJobSearchInput - The input type for the automatedJobSearch function.
 * - AutomatedJobSearchOutput - The return type for the automatedJobSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedJobSearchInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume to use for searching job postings.'),
});
export type AutomatedJobSearchInput = z.infer<typeof AutomatedJobSearchInputSchema>;

const AutomatedJobSearchOutputSchema = z.object({
  jobPostings: z
    .array(z.string())
    .describe('A list of links to relevant job postings in Spain.'),
});
export type AutomatedJobSearchOutput = z.infer<typeof AutomatedJobSearchOutputSchema>;

export async function automatedJobSearch(input: AutomatedJobSearchInput): Promise<AutomatedJobSearchOutput> {
  return automatedJobSearchFlow(input);
}

const searchJobsPrompt = ai.definePrompt({
  name: 'searchJobsPrompt',
  input: {schema: AutomatedJobSearchInputSchema},
  output: {schema: AutomatedJobSearchOutputSchema},
  prompt: `You are an expert job search assistant.

Given the following resume, find 10 relevant job postings in Spain from InfoJobs, LinkedIn, and Indeed.

Resume: {{{resume}}}

Return a list of links to the job postings.

Consider the job location to be Spain. ALWAYS return 10 links to job postings.

Ensure that the job postings are highly relevant to the resume provided.

Output should be a JSON array of strings.`, // Ensure output is valid JSON
});

const automatedJobSearchFlow = ai.defineFlow(
  {
    name: 'automatedJobSearchFlow',
    inputSchema: AutomatedJobSearchInputSchema,
    outputSchema: AutomatedJobSearchOutputSchema,
  },
  async input => {
    const {output} = await searchJobsPrompt(input);
    return output!;
  }
);
