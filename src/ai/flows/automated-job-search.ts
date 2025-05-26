
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
import { findJobsTool, type FindJobsToolInput, type JobPosting } from '@/ai/tools/find-jobs-tool';

const AutomatedJobSearchInputSchema = z.object({
  resume: z
    .string()
    .describe('The resume to use for searching job postings.'),
});
export type AutomatedJobSearchInput = z.infer<typeof AutomatedJobSearchInputSchema>;

const AutomatedJobSearchOutputSchema = z.object({
  jobPostings: z
    .array(z.string().describe('A direct, publicly accessible URL string to a job posting search results page. This must be a valid URL.'))
    .min(0) // Allow empty results
    .max(10, "No more than 10 job posting links should be returned.") 
    .describe('A list of direct links to relevant job posting search results pages in Spain.'),
});
export type AutomatedJobSearchOutput = z.infer<typeof AutomatedJobSearchOutputSchema>;

export async function automatedJobSearch(input: AutomatedJobSearchInput): Promise<AutomatedJobSearchOutput> {
  return automatedJobSearchFlow(input);
}

// Schema for the planner prompt's output
const JobSearchPlannerOutputSchema = z.object({
  keywords: z.array(z.string()).min(1).max(5).describe("A list of 1 to 5 primary keywords extracted from the resume, relevant for a job search (e.g., job titles, key skills)."),
  jobPortals: z.array(z.string()).min(1).max(3).describe("A list of 1 to 3 job portal names to search (e.g., ['InfoJobs', 'LinkedIn', 'Indeed']). Prioritize these if mentioned, otherwise use general ones."),
});

const jobSearchPlannerPrompt = ai.definePrompt({
  name: 'jobSearchPlannerPrompt',
  input: { schema: AutomatedJobSearchInputSchema }, // Takes the resume
  output: { schema: JobSearchPlannerOutputSchema },
  prompt: `
    You are an expert job search planner. Based on the following resume, your task is to:
    1. Extract the most relevant keywords (1-5) for a job search. These should be specific skills or job titles.
    2. Suggest 1-3 primary job portals in Spain where jobs matching these keywords are likely to be found. Default to "InfoJobs", "LinkedIn", and "Indeed" if no specific preference can be inferred.

    Resume:
    {{{resume}}}

    Provide your output in JSON format according to the defined schema.
  `,
});

const automatedJobSearchFlow = ai.defineFlow(
  {
    name: 'automatedJobSearchFlow',
    inputSchema: AutomatedJobSearchInputSchema,
    outputSchema: AutomatedJobSearchOutputSchema,
    tools: [findJobsTool] // Make the tool available to this flow
  },
  async (input) => {
    // 1. Call the planner prompt to get keywords and portals
    const { output: plannerOutput } = await jobSearchPlannerPrompt(input);

    if (!plannerOutput || !plannerOutput.keywords || plannerOutput.keywords.length === 0) {
      console.warn("[automatedJobSearchFlow] Planner prompt did not return valid keywords. Returning empty job postings.");
      return { jobPostings: [] };
    }
    
    const searchKeywords = plannerOutput.keywords;
    // Ensure jobPortals has a default value if planner doesn't provide it
    const searchPortals = (plannerOutput.jobPortals && plannerOutput.jobPortals.length > 0) 
                          ? plannerOutput.jobPortals 
                          : ["InfoJobs", "LinkedIn", "Indeed"];

    // 2. Prepare input for findJobsTool
    const findJobsInput: FindJobsToolInput = {
      keywords: searchKeywords,
      country: "Spain", // Hardcoded as per app requirements
      jobPortals: searchPortals,
      limit: 10,
    };

    // 3. Call findJobsTool
    const jobPostingsFromTool: JobPosting[] = await findJobsTool(findJobsInput);

    // 4. Map the results to the flow's output schema (extracting links)
    const links = jobPostingsFromTool.map(job => job.link).filter(link => !!link); // Filter out any undefined/null links

    return { jobPostings: links.slice(0, 10) }; // Ensure limit
  }
);
