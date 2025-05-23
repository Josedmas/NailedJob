
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
import { fetchTextFromUrlTool, extractTextFromFileTool } from '@/ai/tools/content-extraction-tools';


const AIResumeBuilderInputSchema = z.object({
  jobDescription: z
    .string()
    .optional()
    .describe('The job description for which the resume is being tailored. If not provided, jobOfferUrl will be used.'),
  jobOfferUrl: z
    .string()
    .url()
    .optional()
    .describe('URL of the job offer. Used if jobDescription text is not provided.'),
  resume: z
    .string()
    .optional()
    .describe("The candidate's resume in text format. If not provided, resumeFileDataUri will be used."),
  resumeFileDataUri: 
    z.string()
    .optional()
    .describe("The resume PDF file as a data URI. Used if resume text is not provided. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
  resumeFileMimeType: 
    z.string()
    .optional()
    .refine(val => !val || val === 'application/pdf', { 
        message: "If resumeFileMimeType is provided, it must be 'application/pdf'."
    })
    .describe('The MIME type of the uploaded resume file (must be "application/pdf" if provided). Required if resumeFileDataUri is provided.'),
  profilePhotoDataUri: z
    .string()
    .optional()
    .describe(
      "A profile photo of the candidate, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z
    .string()
    .describe('The language for the resume and explanation, e.g., "English", "Spanish". Must be provided.'),
}).refine(data => data.jobDescription || data.jobOfferUrl, {
  message: "Either jobDescription text or jobOfferUrl must be provided.",
  path: ["jobDescription"], 
}).refine(data => data.resume || data.resumeFileDataUri, {
  message: "Either resume text or resumeFileDataUri must be provided.",
  path: ["resume"],
}).refine(data => data.resumeFileDataUri ? (!!data.resumeFileMimeType && data.resumeFileMimeType === 'application/pdf') : true, {
  message: "resumeFileMimeType ('application/pdf') is required if resumeFileDataUri is provided.",
  path: ["resumeFileMimeType"],
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

const ProcessedAIResumeBuilderInputSchema = z.object({
  jobDescriptionText: z.string().describe('The job description text.'),
  resumeText: z.string().describe('The resume text.'),
  profilePhotoDataUri: z.string().optional(),
  language: z.string().describe('The target language for the resume and explanation, e.g., "English", "Spanish".'),
});


const prompt = ai.definePrompt({
  name: 'aiResumeBuilderPrompt',
  input: {schema: ProcessedAIResumeBuilderInputSchema},
  output: {schema: AIResumeBuilderOutputSchema},
  prompt: `You are an expert resume writer, specializing in creating Harvard-style resumes tailored to specific job descriptions.

  Your primary task is to generate a new Harvard-style resume based on the provided job description and existing resume. This new resume must highlight the candidate's strengths and qualifications most relevant to the job.
  Additionally, you must include an explanation of the modifications made to the resume, focusing on why each change was made to better align the resume with the job description.

  The resume should include the following sections, using the exact section titles as specified below for the given language:
  1. Contact Information (English) / Detalles personales (Spanish): Full name, address, phone number, email address, and links to professional profiles on networks like LinkedIn. The full name should be the very first line of the resume.
  2. Profile (English) / Perfil (Spanish) (Optional): A brief summary of your experience, skills, and professional goals. It is useful to highlight your strengths and how they align with the position you are applying for.
  3. Work Experience (English) / Experiencia Laboral (Spanish): Reverse Chronological Order: Start with your most recent job and then list the previous ones, including the company name, position, start and end dates, and a brief description of your responsibilities and achievements. Relevant Details: Mention concrete achievements and measurable results, using action verbs to give dynamism to the descriptions.
  4. Academic Training (English) / Formación Académica (Spanish): Reverse Chronological Order: Start with the highest degree (e.g., Master's) and then the previous degrees (e.g., Bachelor's). Detailed Information: Include the name of the institution, graduation date, and specialty.
  5. Skills (English) / Habilidades (Spanish): List of Skills: List your technical and soft skills, such as language proficiency, software knowledge, communication skills, leadership, etc.
  6. Languages (English) / Idiomas (Spanish): Level of Proficiency: Indicate the languages you master and your level of proficiency (e.g., native, advanced, intermediate, basic).
  7. Projects (English) / Proyectos (Spanish) (Optional): Describe relevant projects you have worked on, highlighting your role and achievements.

  Job Description: {{{jobDescriptionText}}}
  Resume: {{{resumeText}}}
  {{#if profilePhotoDataUri}}Profile Photo: {{media url=profilePhotoDataUri}} {{!-- This is for AI context only, photo is handled separately for PDF --}}{{/if}}
  Language: {{{language}}}

  **Important Instruction for Language:** You MUST generate the new Harvard-style resume AND the explanation of modifications strictly in the language specified in the 'Language' field above. For example, if 'Language' is 'Spanish', all output related to the resume and its explanation must be in Spanish, using the Spanish section titles provided. Do not default to English if another language is specified. Ensure each section starts with its designated title.
  `,
});

const aiResumeBuilderFlow = ai.defineFlow(
  {
    name: 'aiResumeBuilderFlow',
    inputSchema: AIResumeBuilderInputSchema,
    outputSchema: AIResumeBuilderOutputSchema,
    tools: [fetchTextFromUrlTool, extractTextFromFileTool],
  },
  async (input) => {
    let jobDescriptionText = input.jobDescription;
    let resumeText = input.resume;

    if (!jobDescriptionText && input.jobOfferUrl) {
      console.log(`Fetching job description from URL: ${input.jobOfferUrl}`);
      const { output } = await fetchTextFromUrlTool({ url: input.jobOfferUrl });
      if (!output?.text) throw new Error('Could not extract text from job offer URL.');
      jobDescriptionText = output.text;
    }

    if (!resumeText && input.resumeFileDataUri && input.resumeFileMimeType) {
      if (input.resumeFileMimeType !== 'application/pdf') {
        throw new Error(`Unsupported resume file type: ${input.resumeFileMimeType}. Only PDF is supported.`);
      }
      console.log(`Extracting resume text from PDF Data URI.`);
      const { output: fileOutput } = await extractTextFromFileTool({ 
        fileDataUri: input.resumeFileDataUri, 
        mimeType: input.resumeFileMimeType 
      });

      if (!fileOutput) {
        throw new Error('PDF text extraction tool returned no output. This may indicate a severe internal error in the tool or that the PDF is unprocessable.');
      }
      if (typeof fileOutput.extractedText !== 'string') {
        throw new Error('PDF text extraction tool returned an invalid output format (extractedText is not a string).');
      }
      
      if (fileOutput.extractedText.startsWith('Error extracting text:')) {
        // This means the tool itself caught an error and reported it
        throw new Error(fileOutput.extractedText);
      } else if (fileOutput.extractedText.trim() === "") {
        // This means the tool ran successfully but found no text
        throw new Error('No text content found in the uploaded PDF. The PDF might be image-based or empty.');
      }
      
      resumeText = fileOutput.extractedText;
    } else if (!resumeText && input.resumeFileDataUri && !input.resumeFileMimeType) {
        throw new Error("Resume file MIME type ('application/pdf') is missing, cannot extract text from file.");
    }


    if (!jobDescriptionText) {
        throw new Error("Job description text is missing after attempting to process inputs.");
    }
    if (!resumeText) {
        throw new Error("Resume text is missing after attempting to process inputs.");
    }

    const processedInput: z.infer<typeof ProcessedAIResumeBuilderInputSchema> = {
        jobDescriptionText,
        resumeText,
        profilePhotoDataUri: input.profilePhotoDataUri,
        language: input.language 
    };

    const {output} = await prompt(processedInput);
    return output!;
  }
);
