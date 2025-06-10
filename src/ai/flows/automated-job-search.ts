
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Flow for searching job postings using the generated CV content and an optional job title.
 *
 * - automatedJobSearch - A function that takes CV text and an optional job title, and searches for relevant jobs.
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
  jobTitle: z
    .string()
    .optional()
    .describe('A specific job title provided by the user to refine the search.'),
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
  input: {schema: AutomatedJobSearchInputSchema}, // Takes the resume and optional jobTitle
  output: {schema: SearchToolOutputSchema}, // Expects the tool's output structure
  prompt: `You are an expert job search assistant.
{{#if jobTitle}}
The user has provided a specific job title: "{{jobTitle}}". This job title should be the primary focus for your search.
You may also consider keywords from the resume to complement the job title if it helps refine the search.
{{else}}
Based on the following CV text provided, extract key skills, relevant experiences, and potential job titles to use as search keywords.
{{/if}}

CV Text:
{{{resume}}}

Use the 'findJobsTool' to find relevant job postings.
{{#if jobTitle}}
You MUST pass the provided "{{jobTitle}}" as the 'jobTitle' parameter to the 'findJobsTool'. You can also pass extracted keywords from the resume to the 'keywords' parameter of the tool if you deem them relevant for refining the search alongside the job title.
{{else}}
You MUST pass the extracted keywords from the resume to the 'keywords' parameter of the 'findJobsTool'.
{{/if}}

The search should be conducted for jobs in "Spain".
The tool will automatically search InfoJobs, LinkedIn, and Indeed.
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
      // Pass the entire input (which now includes optional jobTitle) to the prompt
      const llmResponse = await searchJobsPrompt(input);

      if (llmResponse.output?.jobSearchResults && llmResponse.output.jobSearchResults.length > 0) {
        const allLinks = llmResponse.output.jobSearchResults.map(job => job.link).filter(link => !!link);
        const uniqueLinks = Array.from(new Set(allLinks));
        const validatedLinks: string[] = [];

        console.log(`[searchJobsFlow] Found ${uniqueLinks.length} unique links to validate.`);

        for (const link of uniqueLinks) {
          if (validatedLinks.length >= 10) break; // Stop if we already have 10 valid links

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000); // 7-second timeout

          try {
            console.log(`[searchJobsFlow] Validating link: ${link}`);
            const response = await fetch(link, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
              signal: controller.signal,
              redirect: 'follow', // Follow redirects
            });
            clearTimeout(timeoutId);

            if (response.ok) { // response.ok is true if status is 200-299
              validatedLinks.push(link);
              console.log(`[searchJobsFlow] Link OK: ${link} (Status: ${response.status})`);
            } else {
              console.warn(`[searchJobsFlow] Link NOT OK (Status ${response.status}): ${link}`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error(`[searchJobsFlow] Timeout fetching link ${link}`);
            } else {
              console.error(`[searchJobsFlow] Error fetching link ${link}:`, fetchError.message);
            }
          }
        }
        
        console.log(`[searchJobsFlow] Returning ${validatedLinks.length} validated links.`);
        return { jobPostings: validatedLinks.slice(0, 10) }; // Ensure limit after validation
      }
      
      console.warn('[searchJobsFlow] LLM response output was missing jobSearchResults or it was empty:', JSON.stringify(llmResponse.output, null, 2).substring(0,300));
      return { jobPostings: [] }; 

    } catch (error: any) {
      console.error('[searchJobsFlow] Critical error during AI prompt execution or tool usage:', error.message, error.stack);
      return { jobPostings: [] };
    }
  }
);
