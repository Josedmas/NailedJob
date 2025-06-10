
/**
 * @fileOverview A tool for finding job postings by simulating searches.
 *
 * - findJobsTool - A Genkit tool that simulates searching for jobs.
 * - JobPostingSchema - The Zod schema for a job posting.
 * - JobPosting - The type for a job posting.
 * - FindJobsToolInputSchema - The Zod schema for the input of findJobsTool.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const JobPostingSchema = z.object({
  title: z.string().describe('The job title.'),
  company: z.string().optional().describe('The name of the company offering the job.'),
  location: z.string().describe('The location of the job.'),
  descriptionSnippet: z.string().optional().describe('A short snippet of the job description.'),
  link: z.string().url().describe( // Re-added .url() for stronger semantic hint
    'The COMPLETE and EXACT search results page URL from the job portal. ' +
    'This URL will include paths and query parameters (e.g., "https://www.example.com/jobs/search?q=keyword"). ' +
    'It MUST NOT be just a base domain (e.g., "https://www.example.com"). ' +
    'Use the URL provided by the search simulation as-is.'
  ),
  portal: z.string().describe('The job portal where the listing was conceptually found or that the link points to (e.g., InfoJobs, LinkedIn, Indeed).'),
  postedDate: z.string().optional().describe('The approximate date the job was posted (e.g., "5 days ago", "2024-07-15").')
});
export type JobPosting = z.infer<typeof JobPostingSchema>;

export const FindJobsToolInputSchema = z.object({
  jobTitle: z.string().optional().describe('The specific job title to search for, if provided by the user.'),
  keywords: z.array(z.string()).min(1).describe('An array of keywords to search for (e.g., skills, job titles from a CV).'),
  country: z.string().describe('The country to search for jobs in (e.g., "Spain").'),
  limit: z.number().optional().default(10).describe('Maximum number of job postings to return.'),
});
export type FindJobsToolInput = z.infer<typeof FindJobsToolInputSchema>;

export const findJobsTool = ai.defineTool(
  {
    name: 'findJobsTool',
    description: 'Simulates searching for job postings on InfoJobs, LinkedIn, and Indeed based on a primary job title (if provided) and/or keywords, and location. Returns a list of mock job postings with links to real search pages on those portals. For the purpose of this simulation, assume jobs are recent (less than 30 days old).',
    inputSchema: FindJobsToolInputSchema,
    outputSchema: z.array(JobPostingSchema),
  },
  async ({ jobTitle, keywords, country, limit }) => {
    const jobPortals = ["InfoJobs", "LinkedIn", "Indeed"];
    const mockJobs: JobPosting[] = [];
    const companies = ["Tech Solutions Inc.", "Global Innovations Ltd.", "Future Enterprises", "Creative Minds Co.", "Innovatech Corp", "Synergy Systems"];
    const baseJobTitles = ["Software Engineer", "Product Manager", "Data Analyst", "UX Designer", "Marketing Specialist", "Project Manager", "Business Analyst"];
    const locationsSpain = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Malaga", "Bilbao"];

    let mainQuery = "";
    if (jobTitle) {
      mainQuery = jobTitle;
      if (keywords && keywords.length > 0) {
        // Optionally combine jobTitle with other keywords.
        // For now, we'll keep it simple and let jobTitle take precedence if provided,
        // or you could append: mainQuery += " " + keywords.join(" ");
        // The LLM prompt might already handle the combination logic by how it passes keywords.
      }
    } else if (keywords && keywords.length > 0) {
      mainQuery = keywords.join(" ");
    } else {
      // Fallback if neither jobTitle nor keywords are provided (should be handled by input schema)
      mainQuery = "trabajo"; // Generic term for "job"
    }
    
    const encodedQuery = encodeURIComponent(mainQuery);
    const encodedCountry = encodeURIComponent(country);

    const getPortalSearchLink = (portal: string): string => {
      const lowerPortal = portal.toLowerCase();
      if (lowerPortal.includes("infojobs")) {
        return `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${encodedQuery}`;
      }
      if (lowerPortal.includes("linkedin")) {
        return `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&location=${encodedCountry}`;
      }
      if (lowerPortal.includes("indeed")) {
        let indeedDomain = "indeed.com";
        if (country.toLowerCase() === "spain") {
            indeedDomain = "es.indeed.com";
        }
        return `https://${indeedDomain}/jobs?q=${encodedQuery}&l=${encodedCountry}`;
      }
      return `https://www.google.com/search?q=${encodedQuery}+jobs+in+${encodedCountry}+site%3A${encodeURIComponent(portal)}`;
    };

    const actualLimit = limit || 10;

    for (let i = 0; i < actualLimit; i++) {
      const portal = jobPortals[i % jobPortals.length];
      const company = companies[i % companies.length];
      const baseTitle = jobTitle || baseJobTitles[i % baseJobTitles.length];
      const location = locationsSpain[i % locationsSpain.length]; 
      const daysAgo = Math.floor(Math.random() * 28) + 1; // 1 to 28 days
      
      const displayJobTitle = `Mock: ${baseTitle}${keywords && keywords.length > 0 && !jobTitle ? ` (Related to: ${keywords[0]})` : ''}`;

      mockJobs.push({
        title: displayJobTitle,
        company: company,
        location: `${location}, ${country}`,
        descriptionSnippet: `Simulated opportunity for a ${baseTitle} at ${company}. Seeking skills in ${mainQuery}. This is a mock job listing.`,
        link: getPortalSearchLink(portal),
        portal: portal,
        postedDate: `${daysAgo} days ago`
      });
    }
    return mockJobs.slice(0, actualLimit);
  }
);
