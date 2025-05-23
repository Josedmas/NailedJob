
'use server';

/**
 * @fileOverview Analyzes the compatibility between a job description and a resume.
 *
 * - analyzeCompatibility - A function that takes a job description, a resume, and a language as input, and returns a compatibility score and explanation in the specified language.
 * - CompatibilityInput - The input type for the analyzeCompatibility function.
 * - CompatibilityOutput - The return type for the analyzeCompatibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fetchTextFromUrlTool, extractTextFromFileTool } from '@/ai/tools/content-extraction-tools';
import { saveCandidateDataToMongoDB } from '@/lib/mongodb-candidate-storage';


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
    .describe('The resume as a string. If not provided, resumeFileDataUri will be used.'),
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
  resumeFileName: 
    z.string()
    .optional()
    .describe("The original name of the uploaded resume PDF file."),
  language: z
    .string()
    .describe('The language for the explanation, e.g., "English", "Spanish". Must be provided.'),
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
      'A brief explanation of the compatibility score, highlighting the strengths of the resume in relation to the job description, in the specified language.'
    ),
});
export type CompatibilityOutput = z.infer<typeof CompatibilityOutputSchema>;

export async function analyzeCompatibility(
  input: CompatibilityInput
): Promise<CompatibilityOutput> {
  return compatibilityAnalysisFlow(input);
}

const ProcessedCompatibilityInputSchema = z.object({
  jobDescriptionText: z.string().describe('The job description text.'),
  resumeText: z.string().describe('The resume text.'),
  language: z.string().describe('The target language for the explanation, e.g., "English", "Spanish".'),
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

  Language for the output: {{{language}}}

  Provide a compatibility score (0-100) and a brief explanation of the score, highlighting the strengths of the resume in relation to the job description.
  The explanation MUST be in the language specified in the 'Language for the output' field above.

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
    tools: [fetchTextFromUrlTool, extractTextFromFileTool],
  },
  async (input) => {
    let jobDescriptionText = input.jobDescription;
    let resumeText = input.resume;
    let jobDescriptionSource: 'text' | 'url' = 'text';
    let jobOfferIdentifier = input.jobDescription || '';
    let resumeSource: 'text' | 'file' = 'text'; 
    let resumeIdentifier = input.resume || '';


    if (!jobDescriptionText && input.jobOfferUrl) {
      console.log(`Fetching job description from URL: ${input.jobOfferUrl}`);
      const { output: urlOutput } = await fetchTextFromUrlTool({url: input.jobOfferUrl});
      if (!urlOutput?.text) throw new Error('Could not extract text from job offer URL.');
      jobDescriptionText = urlOutput.text;
      jobDescriptionSource = 'url';
      jobOfferIdentifier = input.jobOfferUrl;
    }

    if (!resumeText && input.resumeFileDataUri && input.resumeFileMimeType) {
      if (input.resumeFileMimeType !== 'application/pdf') {
        throw new Error(`Unsupported resume file type: ${input.resumeFileMimeType}. Only PDF is supported.`);
      }
      console.log(`Extracting resume text from PDF Data URI.`);
      const { output: fileOutput } = await extractTextFromFileTool({
        fileDataUri: input.resumeFileDataUri,
        mimeType: input.resumeFileMimeType,
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
      resumeSource = 'file';
      resumeIdentifier = input.resumeFileName || 'unknown_pdf_file';

    } else if (!resumeText && input.resumeFileDataUri && !input.resumeFileMimeType) {
        throw new Error("Resume file MIME type ('application/pdf') is missing, cannot extract text from file.");
    }
    
    if (!jobDescriptionText) {
        throw new Error("Job description text is missing after attempting to process inputs.");
    }
    if (!resumeText) {
        throw new Error("Resume text is missing after attempting to process inputs.");
    }

    const {output: promptOutput} = await prompt({ jobDescriptionText, resumeText, language: input.language });
    
    if (promptOutput) {
        saveCandidateDataToMongoDB({
            resumeLanguage: input.language,
            jobDescriptionSource,
            jobOfferIdentifier: jobOfferIdentifier.substring(0, 500),
            resumeSource,
            resumeIdentifier: resumeIdentifier.substring(0,500),
            compatibilityScore: promptOutput.compatibilityScore,
        }).catch(err => {
            console.error("Error saving candidate data to MongoDB in background:", err);
        });
    }
    return promptOutput!;
  }
);
