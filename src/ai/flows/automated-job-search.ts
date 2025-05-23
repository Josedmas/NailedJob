
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
    .array(z.string().url().describe('A direct, publicly accessible URL to an individual job posting.'))
    .min(1, "At least one job posting link must be returned.") // Ensure at least one link is returned
    .max(10, "No more than 10 job posting links should be returned.") // Limit to 10 links
    .describe('A list of direct links to relevant job postings in Spain.'),
});
export type AutomatedJobSearchOutput = z.infer<typeof AutomatedJobSearchOutputSchema>;

export async function automatedJobSearch(input: AutomatedJobSearchInput): Promise<AutomatedJobSearchOutput> {
  return automatedJobSearchFlow(input);
}

const searchJobsPrompt = ai.definePrompt({
  name: 'searchJobsPrompt',
  input: {schema: AutomatedJobSearchInputSchema},
  output: {schema: AutomatedJobSearchOutputSchema},
  prompt: `You are an expert job search assistant specialized in finding active job opportunities in Spain.

Based on the following resume:
{{{resume}}}

Your task is to:
1. Identify up to 10 highly relevant job postings. The job location MUST be in Spain.
2. Prioritize job boards like InfoJobs (infojobs.net) and LinkedIn Jobs (linkedin.com/jobs).
3. Provide ONLY direct, publicly accessible URLs to the INDIVIDUAL job posting pages.
4. Ensure the links are active and lead to a specific job description, NOT a general search results page, a company's main career portal, or a login page.
5. You MUST return between 1 and 10 valid URLs.

Output the results as a JSON object strictly adhering to the following format:
{
  "jobPostings": [
    "https://www.infojobs.net/barcelona/oferta-de-trabajo-ejemplo/...", // Example of a valid InfoJobs link
    "https://es.linkedin.com/jobs/view/ejemplo-de-oferta-de-trabajo-aqui-123456789" // Example of a valid LinkedIn Jobs link
    // ... more links if found, up to 10
  ]
}

If you cannot find any suitable, direct job posting links, return an empty array for "jobPostings" but still adhere to the JSON structure.
Example of no results:
{
  "jobPostings": []
}

Focus on quality and validity of the links. It's better to return fewer valid links than many invalid ones.
`,
});

const automatedJobSearchFlow = ai.defineFlow(
  {
    name: 'automatedJobSearchFlow',
    inputSchema: AutomatedJobSearchInputSchema,
    outputSchema: AutomatedJobSearchOutputSchema,
  },
  async input => {
    const {output} = await searchJobsPrompt(input);
    // Ensure that if the output is null or jobPostings is null, we return an empty array
    // to match the schema expectation, especially if the model provides an empty list.
    if (!output || !output.jobPostings) {
      return { jobPostings: [] };
    }
    return output;
  }
);

