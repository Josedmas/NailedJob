// use server'
'use server';
/**
 * @fileOverview Generates a Harvard-style resume tailored to a job description.
 *
 * - aiResumeBuilder - A function that generates a tailored resume.
 * - AIResumeBuilderInput - The input type for the aiResumeBuilder function.
 * - AIResumeBuilderOutput - The return type for the aiResumeBuilder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIResumeBuilderInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description for which the resume is being tailored.'),
  resume: z.string().describe('The candidate\'s resume in text format.'),
  profilePhotoDataUri: z
    .string()
    .optional()
    .describe(
      "A profile photo of the candidate, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z
    .string()
    .optional()
    .describe('The language of the job description and resume.'),
});
export type AIResumeBuilderInput = z.infer<typeof AIResumeBuilderInputSchema>;

const AIResumeBuilderOutputSchema = z.object({
  tailoredResume: z.string().describe('The generated Harvard-style resume.'),
  explanation: z
    .string()
    .describe('Explanation of the modifications made to the resume.'),
});
export type AIResumeBuilderOutput = z.infer<typeof AIResumeBuilderOutputSchema>;

export async function aiResumeBuilder(input: AIResumeBuilderInput): Promise<AIResumeBuilderOutput> {
  return aiResumeBuilderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiResumeBuilderPrompt',
  input: {schema: AIResumeBuilderInputSchema},
  output: {schema: AIResumeBuilderOutputSchema},
  prompt: `You are an expert resume writer, specializing in creating Harvard-style resumes tailored to specific job descriptions.

  Given the following job description and resume, generate a new Harvard-style resume that is tailored to the job description. The resume should highlight the candidate's strengths and qualifications that are most relevant to the job.

  Include an explanation of the modifications made to the resume, focusing on why each change was made to better align the resume with the job description.

  The resume should include the following sections:

  1. Contact Information:
  Full name, address, phone number, email address, and links to professional profiles on networks like LinkedIn.
  2. Profile (Optional):
  A brief summary of your experience, skills, and professional goals. It is useful to highlight your strengths and how they align with the position you are applying for.
  3. Work Experience:
  Reverse Chronological Order: Start with your most recent job and then list the previous ones, including the company name, position, start and end dates, and a brief description of your responsibilities and achievements.
  Relevant Details: Mention concrete achievements and measurable results, using action verbs to give dynamism to the descriptions.
  4. Academic Training:
  Reverse Chronological Order: Start with the highest degree (e.g., Master's) and then the previous degrees (e.g., Bachelor's).
  Detailed Information: Include the name of the institution, graduation date, and specialty.
  5. Skills:
  List of Skills: List your technical and soft skills, such as language proficiency, software knowledge, communication skills, leadership, etc.
  6. Languages:
  Level of Proficiency: Indicate the languages you master and your level of proficiency (e.g., native, advanced, intermediate, basic).

  Job Description: {{{jobDescription}}}
  Resume: {{{resume}}}
  Profile Photo: {{#if profilePhotoDataUri}}{{media url=profilePhotoDataUri}}{{/if}}
  Language: {{{language}}}
  `,
});

const aiResumeBuilderFlow = ai.defineFlow(
  {
    name: 'aiResumeBuilderFlow',
    inputSchema: AIResumeBuilderInputSchema,
    outputSchema: AIResumeBuilderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
