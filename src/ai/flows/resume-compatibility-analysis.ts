
'use server';

/**
 * @fileOverview Analyzes the compatibility between a job description and a resume,
 * and extracts structured candidate information.
 *
 * - analyzeCompatibility - A function that takes a job description, a resume, and a language as input,
 *   and returns a compatibility score, explanation, and structured candidate data.
 * - CompatibilityInput - The input type for the analyzeCompatibility function.
 * - CompatibilityOutput - The return type for the analyzeCompatibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fetchTextFromUrlTool, extractTextFromFileTool, type ExtractTextFromFileOutput, type ExtractTextFromFileInput } from '@/ai/tools/content-extraction-tools';
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
    .describe('The language for the explanation and structured data extraction, e.g., "English", "Spanish". Must be provided.'),
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

// Schemas for structured data extraction
const ExperienciaLaboralSchema = z.object({
  puesto: z.string().optional().describe("Job title/position."),
  empresa: z.string().optional().describe("Company name."),
  fechas: z.string().optional().describe("Employment dates (e.g., '2020-Present', 'Jan 2019 - Dec 2020')."),
  descripcion: z.string().optional().describe("Brief description of responsibilities and achievements.")
});

const EducacionSchema = z.object({
  titulo: z.string().optional().describe("Degree or title obtained."),
  institucion: z.string().optional().describe("Educational institution name."),
  fechas: z.string().optional().describe("Dates of attendance or graduation (e.g., '2018-2020', 'Graduated May 2018').")
});

const CompatibilityOutputSchema = z.object({
  compatibilityScore: z
    .number()
    .min(0).max(100)
    .describe(
      'A percentage (0-100) representing the compatibility between the resume and the job description.'
    ),
  explanation: z
    .string()
    .describe(
      'A brief explanation of the compatibility score, highlighting the strengths of the resume in relation to the job description, in the specified language.'
    ),
  nombre: z.string().optional().describe("The candidate's full name as extracted from the resume."),
  email: z.string().optional().describe("The candidate's email address as extracted from the resume."),
  experienciaLaboral: z.array(ExperienciaLaboralSchema).optional().describe("A list of work experiences extracted from the resume."),
  educacion: z.array(EducacionSchema).optional().describe("A list of educational qualifications extracted from the resume."),
  habilidades: z.array(z.string()).optional().describe("A list of skills extracted from the resume."),
  cvTextoCrudo: z.string().optional().describe("The full raw text of the resume used for extraction, if available.")
});
export type CompatibilityOutput = z.infer<typeof CompatibilityOutputSchema>;

export async function analyzeCompatibility(
  input: CompatibilityInput
): Promise<CompatibilityOutput> {
  return compatibilityAnalysisFlow(input);
}

const ProcessedCompatibilityInputSchema = z.object({
  jobDescriptionText: z.string().describe('The job description text.'),
  jobDescriptionOriginUrl: z.string().url().optional().describe('The URL from which the job description was fetched, if applicable.'),
  resumeText: z.string().describe('The resume text.'),
  language: z.string().describe('The target language for the explanation and data extraction, e.g., "English", "Spanish".'),
});


const prompt = ai.definePrompt({
  name: 'resumeCompatibilityPrompt',
  input: {schema: ProcessedCompatibilityInputSchema},
  output: {schema: CompatibilityOutputSchema},
  prompt: `You are an AI assistant that analyzes the compatibility between a job description and a resume, and extracts structured information from the resume.

  {{#if jobDescriptionOriginUrl}}
  The following job description was fetched from the URL: {{{jobDescriptionOriginUrl}}}
  {{/if}}
  Job Description:
  {{{jobDescriptionText}}}

  Candidate's Resume:
  {{{resumeText}}}

  Language for the output: {{{language}}}

  Tasks:
  1.  **Compatibility Analysis**: Provide a compatibility score (0-100) and a brief explanation of the score. The explanation should highlight the resume's strengths relative to the job description and MUST be in the specified 'Language for the output'.
  2.  **Structured Information Extraction from Resume**: From the 'Candidate's Resume' text, extract the following information. If a field is not explicitly found, omit it or leave it as an empty string/array where appropriate.
      *   'nombre': The candidate's full name.
      *   'email': The candidate's email address.
      *   'experienciaLaboral': An array of work experiences. Each item should be an object with 'puesto', 'empresa', 'fechas', and 'descripcion'.
      *   'educacion': An array of educational qualifications. Each item should be an object with 'titulo', 'institucion', and 'fechas'.
      *   'habilidades': An array of strings listing the candidate's skills.
      *   'cvTextoCrudo': Include the full 'Candidate's Resume' text here.

  The compatibility score must be realistic.
  All textual output, including the explanation and any extracted text within the structured fields (like descriptions in experienciaLaboral), MUST be in the language specified in the 'Language for the output' field.

  Output the entire response as a single JSON object adhering to the defined output schema.
  `,
});

const compatibilityAnalysisFlow = ai.defineFlow(
  {
    name: 'compatibilityAnalysisFlow',
    inputSchema: CompatibilityInputSchema,
    outputSchema: CompatibilityOutputSchema,
  },
  async (input) => {
    let jobDescriptionText = input.jobDescription;
    let resumeText = input.resume;
    let jobDescriptionSource: 'text' | 'url' = input.jobDescription ? 'text' : 'url';
    let jobOfferIdentifier = input.jobDescription || input.jobOfferUrl || 'unknown_job_offer';
    let resumeSource: 'text' | 'file' = input.resume ? 'text' : 'file';
    let resumeIdentifier = input.resume || input.resumeFileName || 'unknown_resume';
    let jobDescriptionOriginUrl: string | undefined = undefined;


    if (!jobDescriptionText && input.jobOfferUrl) {
      jobDescriptionOriginUrl = input.jobOfferUrl;
      console.log(`[CompatibilityAnalysisFlow] Fetching job description from URL: ${input.jobOfferUrl}`);
      const urlOutput  = await fetchTextFromUrlTool({url: input.jobOfferUrl});
      if (!urlOutput?.text) {
        console.error('[CompatibilityAnalysisFlow] fetchTextFromUrlTool returned no text.');
        throw new Error('Could not extract text from job offer URL.');
      }
      jobDescriptionText = urlOutput.text;
      jobOfferIdentifier = input.jobOfferUrl;
    }

    if (!resumeText && input.resumeFileDataUri && input.resumeFileMimeType) {
      if (input.resumeFileMimeType !== 'application/pdf') {
        throw new Error(`Unsupported resume file type: ${input.resumeFileMimeType}. Only PDF is supported.`);
      }
      console.log(`[CompatibilityAnalysisFlow] Extracting resume text from PDF Data URI. File: ${input.resumeFileName || 'unknown'}`);
      const fileOutput: ExtractTextFromFileOutput = await extractTextFromFileTool({
        fileDataUri: input.resumeFileDataUri,
        mimeType: input.resumeFileMimeType as 'application/pdf',
      });
      
      console.log('[CompatibilityAnalysisFlow] Output from extractTextFromFileTool:', JSON.stringify(fileOutput, null, 2));

      if (!fileOutput) {
        throw new Error('PDF Extraction Tool Error: The tool failed to return any output. This often indicates a severe issue with the PDF file itself (e.g., corruption, very complex structure) or a low-level crash in the PDF processing library. Please check server logs for detailed error messages from the PDF library, and try a different PDF file if possible.');
      }
      if (typeof fileOutput.extractedText !== 'string') {
        throw new Error('PDF text extraction tool returned an invalid output format (extractedText is not a string).');
      }

      if (fileOutput.extractedText === "Error: PDF_PROCESSING_FAILED_INTERNAL_TOOL_ERROR_SEE_SERVER_LOGS") {
        // This means the tool caught a critical internal error.
        throw new Error("An internal error occurred while processing the PDF. Please check server logs for details or try a different PDF file.");
      } else if (fileOutput.extractedText.startsWith('Error extracting text:')) { // Specific errors reported by the tool's logic
        throw new Error(fileOutput.extractedText);
      } else if (fileOutput.extractedText.trim() === "") {
        // This specific case ("No text content found...") should ideally be an "Error extracting text:" from the tool
        throw new Error('No text content found in the uploaded PDF. The PDF might be image-based or empty.');
      }
      resumeText = fileOutput.extractedText;
      resumeIdentifier = input.resumeFileName || 'uploaded_pdf_file';
    } else if (!resumeText && input.resumeFileDataUri && !input.resumeFileMimeType) {
        throw new Error("Resume file MIME type ('application/pdf') is missing, cannot extract text from file.");
    }

    if (!jobDescriptionText) {
        throw new Error("Job description text is missing after attempting to process inputs.");
    }
    if (!resumeText) {
        throw new Error("Resume text is missing after attempting to process inputs.");
    }

    const {output: promptOutput} = await prompt({
      jobDescriptionText,
      jobDescriptionOriginUrl,
      resumeText,
      language: input.language
    });

    if (promptOutput) {
        console.log('[CompatibilityAnalysisFlow] Attempting to save candidate data to MongoDB. Prompt output received:', JSON.stringify(promptOutput, null, 2).substring(0, 500) + "...");
        const candidateDataToSave = {
            jobDescriptionSource,
            jobOfferIdentifier: jobOfferIdentifier.substring(0, 500),
            resumeSource,
            resumeIdentifier: resumeIdentifier.substring(0,500),
            compatibilityScore: promptOutput.compatibilityScore,
            compatibilityExplanation: promptOutput.explanation,
            nombre: promptOutput.nombre,
            email: promptOutput.email,
            experienciaLaboral: promptOutput.experienciaLaboral,
            educacion: promptOutput.educacion,
            habilidades: promptOutput.habilidades,
            cvTextoCrudo: resumeText, 
            fullJobDescriptionText: jobDescriptionText, 
            // fullResumeText: resumeText, // Already captured in cvTextoCrudo if resumeSource is 'file'
            resumeLanguage: input.language,
        };
        saveCandidateDataToMongoDB(candidateDataToSave).catch(err => {
            console.error("[CompatibilityAnalysisFlow] Error saving candidate data to MongoDB in background:", err);
        });
    } else {
        console.warn('[CompatibilityAnalysisFlow] No promptOutput received from AI, skipping MongoDB save.');
        throw new Error("AI failed to produce an output for compatibility analysis and data extraction.");
    }
    return promptOutput!;
  }
);

