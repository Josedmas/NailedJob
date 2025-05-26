
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Flow for searching job postings using the generated CV content.
 *
 * - automatedJobSearch - A function that takes CV text and searches for relevant jobs.
 * - AutomatedJobSearchInput - The input type for the automatedJobSearch function.
 * - AutomatedJobSearchOutput - The return type for the automatedJobSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {findJobsTool, type JobPosting, JobPostingSchema} from '@/ai/tools/find-jobs-tool';

const AutomatedJobSearchInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume to use for searching job postings.'),
});
export type AutomatedJobSearchInput = z.infer<typeof AutomatedJobSearchInputSchema>;

// Output schema for the LLM's interaction with the tool
const SearchToolOutputSchema = z.object({
  jobSearchResults: z.array(JobPostingSchema).describe('A list of relevant job postings found by the tool, up to 10. Jobs should be less than 30 days old.')
});

// Final output schema for the flow (array of unique links)
const AutomatedJobSearchOutputSchema = z.object({
  jobPostings: z
    .array(z.string().describe('A direct, publicly accessible URL string to a job posting search results page. This must be a valid URL.'))
    .min(0) 
    .max(10, "No more than 10 unique job posting links should be returned.") 
    .describe('A list of unique, direct links to relevant job posting search results pages in Spain.'),
});
export type AutomatedJobSearchOutput = z.infer<typeof AutomatedJobSearchOutputSchema>;


export async function automatedJobSearch(input: AutomatedJobSearchInput): Promise<AutomatedJobSearchOutput> {
  return searchJobsFlow(input);
}

const searchJobsPrompt = ai.definePrompt({
  name: 'searchJobsPrompt',
  tools: [findJobsTool],
  input: {schema: AutomatedJobSearchInputSchema}, // Takes the resume
  output: {schema: SearchToolOutputSchema}, // Expects the tool's output structure
  prompt: `You are an expert job search assistant.
Based on the following CV text provided, extract key skills, relevant experiences, and potential job titles.
CV Text:
{{{resume}}}

Use these extracted keywords to search for jobs.
You MUST use the 'findJobsTool' to find relevant job postings.
The search should be conducted for jobs in "Spain".
The target job portals for the search are "InfoJobs", "LinkedIn", and "Indeed".
Aim to find up to 10 job postings that appear to be distinct based on their (simulated) details.
The job postings should ideally be less than 30 days old (the tool will simulate this).

Return the list of found job postings. IMPORTANT: For each job posting in the result, the 'link' field MUST be the exact search results page URL that the 'findJobsTool' provides. Do NOT attempt to create or modify this link.
`,
});

const searchJobsFlow = ai.defineFlow(
  {
    name: 'searchJobsFlow',
    inputSchema: AutomatedJobSearchInputSchema,
    outputSchema: AutomatedJobSearchOutputSchema, // Final output is array of strings
  },
  async (input) => {
    try {
      const llmResponse = await searchJobsPrompt(input);

      if (llmResponse.output?.jobSearchResults && llmResponse.output.jobSearchResults.length > 0) {
        const allLinks = llmResponse.output.jobSearchResults.map(job => job.link).filter(link => !!link);
        
        // De-duplicate links
        const uniqueLinks = Array.from(new Set(allLinks));
        
        return { jobPostings: uniqueLinks.slice(0, 10) }; // Ensure limit after de-duplication
      }
      
      console.warn('[searchJobsFlow] LLM response output was missing jobSearchResults or it was empty:', llmResponse);
      return { jobPostings: [] }; 

    } catch (error: any) {
      console.error('[searchJobsFlow] Critical error during AI prompt execution or tool usage:', error.message, error.stack);
      return { jobPostings: [] };
    }
  }
);

