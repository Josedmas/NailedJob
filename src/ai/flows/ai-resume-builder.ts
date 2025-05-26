
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
import { fetchTextFromUrlTool, extractTextFromFileTool, type ExtractTextFromFileOutput, type ExtractTextFromFileInput } from '@/ai/tools/content-extraction-tools';


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
  tailoredResume: z.string().describe('The generated resume, structured according to the specified sections.'),
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
  prompt: `You are an expert resume writer, specializing in creating professional resumes tailored to specific job descriptions, following a clear two-column layout.

  Your primary task is to generate a new resume based on the provided job description and existing resume. This new resume must highlight the candidate's strengths and qualifications most relevant to the job.
  Crucially, ensure you create a concise and impactful "PROFESSIONAL PROFILE" (or "PERFIL PROFESIONAL" if in Spanish) section that summarizes the candidate's key value for the role. This section is vital and should be generated even if the original resume doesn't explicitly have one or if it's brief.

  Additionally, you must include an explanation of the modifications made to the resume, focusing on why each change was made to better align the resume with the job description.

  The resume MUST include the following sections, in the order presented, using the exact section titles as specified below for the given language.

  For English:
  1. Candidate's Full Name (The very first line of the entire resume output should *only* be the candidate's full name. Do NOT include any prefix like 'Candidate's Full Name:'.)
  2. CONTACT INFORMATION: (Include Email, Phone, Address, GitHub link, Date of Birth if available in the input resume)
  3. PROFESSIONAL PROFILE: (A brief summary of experience, skills, and professional goals. This section is mandatory and should be compelling.)
  4. WORK EXPERIENCE: (Reverse chronological order. For each job: Position, Company, Location on one line. Dates (e.g., YYYY-MM to YYYY-MM or YYYY to Present) on the next line. Then a brief description of responsibilities and achievements.)
  5. EDUCATION: (Reverse chronological order. For each entry: Degree/Title, Institution, Location on one line. Dates on the next line.)
  6. SKILLS: (Sub-categorize into "Technical:" and "Soft:" if appropriate. List skills.)
  7. LANGUAGES: (List languages and their proficiency level, e.g., "Spanish - Native", "English - Fluent".)
  8. INTERESTS: (List a few professional or relevant personal interests.)

  For Spanish:
  1. Nombre Completo del Candidato (La primera línea de toda la respuesta debe ser *únicamente* el nombre completo del candidato. No incluyas ningún prefijo como 'Nombre Completo del Candidato:'.)
  2. DETALLES PERSONALES: (Incluir Email, Teléfono, Dirección, Enlace de GitHub, Fecha de Nacimiento si está disponible en el currículum de entrada)
  3. PERFIL PROFESIONAL: (Un breve resumen de experiencia, habilidades y metas profesionales. Esta sección es obligatoria y debe ser convincente.)
  4. EXPERIENCIA LABORAL: (Orden cronológico inverso. Para cada trabajo: Puesto, Empresa, Localidad en una línea. Fechas (ej. AAAA-MM a AAAA-MM o AAAA a Actual) en la siguiente línea. Luego una breve descripción de responsabilidades y logros.)
  5. FORMACIÓN: (Orden cronológico inverso. Para cada entrada: Título/Certificación, Institución, Localidad en una línea. Fechas en la siguiente línea.)
  6. HABILIDADES: (Sub-categorizar en "Técnicas:" y "Blandas:" si es apropiado. Listar habilidades.)
  7. IDIOMAS: (Listar idiomas y su nivel de competencia, ej. "Español - Nativo", "Inglés - Fluido".)
  8. INTERESES: (Listar algunos intereses personales relevantes o profesionales.)


  Job Description: {{{jobDescriptionText}}}
  Original Resume: {{{resumeText}}}
  {{#if profilePhotoDataUri}}Profile Photo context: {{media url=profilePhotoDataUri}} {{!-- This is for AI context only, photo is handled separately for PDF --}}{{/if}}
  Language: {{{language}}}

  **Important Instruction for Language and Structure:** You MUST generate the new resume AND the explanation of modifications strictly in the language specified in the 'Language' field above. Adhere to the section titles and order specified for that language. The candidate's full name must be the very first line of the output, with no preceding text or labels on that line. Ensure each subsequent section starts with its designated title (e.g., "PROFESSIONAL PROFILE:" or "PERFIL PROFESIONAL:").
  `,
});

const aiResumeBuilderFlow = ai.defineFlow(
  {
    name: 'aiResumeBuilderFlow',
    inputSchema: AIResumeBuilderInputSchema,
    outputSchema: AIResumeBuilderOutputSchema,
  },
  async (input) => {
    let jobDescriptionText = input.jobDescription;
    let resumeText = input.resume;

    if (!jobDescriptionText && input.jobOfferUrl) {
      console.log(`[AIResumeBuilderFlow] Fetching job description from URL: ${input.jobOfferUrl}`);
      const urlOutput = await fetchTextFromUrlTool({ url: input.jobOfferUrl });
      if (!urlOutput?.text) throw new Error('Could not extract text from job offer URL.');
      jobDescriptionText = urlOutput.text;
    }

    if (!resumeText && input.resumeFileDataUri && input.resumeFileMimeType) {
      if (input.resumeFileMimeType !== 'application/pdf') {
        throw new Error(`Unsupported resume file type: ${input.resumeFileMimeType}. Only PDF is supported.`);
      }
      console.log(`[AIResumeBuilderFlow] Extracting resume text from PDF Data URI.`);
      const toolInput: ExtractTextFromFileInput = {
        fileDataUri: input.resumeFileDataUri,
        mimeType: input.resumeFileMimeType as 'application/pdf' // Cast as it's validated by schema
      };
      const fileOutput: ExtractTextFromFileOutput = await extractTextFromFileTool(toolInput);
      
      console.log('[AIResumeBuilderFlow] Output from extractTextFromFileTool:', JSON.stringify(fileOutput, null, 2));

      if (!fileOutput) {
        throw new Error('The tool responsible for reading the PDF failed to produce a result. The PDF might be unreadable, or an internal system error occurred during processing.');
      }
      if (typeof fileOutput.extractedText !== 'string') {
        throw new Error('PDF text extraction tool returned an invalid output format (extractedText is not a string).');
      }

      if (fileOutput.extractedText.startsWith('Error extracting text:') || fileOutput.extractedText === "Error: PDF_PROCESSING_FAILED_INTERNAL_TOOL_ERROR") {
        throw new Error(fileOutput.extractedText);
      } else if (fileOutput.extractedText.trim() === "") {
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

