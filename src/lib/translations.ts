
// src/lib/translations.ts
export type Locale = 'en' | 'es';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // AppHeader
    appName: 'NailedJob',
    languageSelectorLabel: 'Language',
    // CareerCraftWizard steps
    stepCounter: 'Step {currentStep} of 4',
    step1Title: 'Provide Job and Candidate Information',
    step2Title: 'AI Compatibility Analysis',
    step3Title: 'AI Tailored Resume',
    step4Title: 'Automated Job Search Results',
    // CareerCraftWizard buttons
    analyzeButton: 'Analyze Compatibility',
    buildResumeButton: 'Build Resume',
    findJobsButton: 'Find Jobs',
    previousButton: 'Previous',
    startOverButton: 'Start Over',
    // InformationGatheringStep
    jobOfferDetailsTitle: 'Job Offer Details',
    jobOfferDescription: 'Provide the job offer information. Paste the full text for best results.',
    jobOfferDescriptionEnhanced: 'Provide the job offer: paste text directly OR enter a URL.',
    jobOfferTextLabel: 'Job Offer Text',
    jobOfferTextPlaceholder: 'Paste the full job description here...',
    jobOfferUrlLabel: 'Job Offer URL',
    jobOfferUrlPlaceholder: 'https://example.com/job-posting',
    jobOfferTextOrUrl: 'Tip: If you provide a URL, pasting text is optional.',
    candidateInfoTitle: 'Candidate Information',
    candidateInfoDescription: 'Provide your resume details and a profile photo.',
    candidateInfoDescriptionEnhanced: 'Provide your resume: paste text directly OR upload a PDF.',
    resumeTextLabel: 'Resume Text',
    resumeTextPlaceholder: 'Paste your full resume text here...',
    resumePdfHint: 'You can also upload a PDF, but please ensure its text content is pasted above for AI processing.',
    resumeTextOrPdf: 'Tip: If you upload a PDF, pasting text is optional.',
    resumePdfLabel: 'Upload Resume PDF',
    fileUploadedLabel: 'File uploaded',
    profilePhotoLabel: 'Profile Photo (Optional)',
    profilePhotoPreviewAlt: 'Profile Preview',
    profilePhotoUploaded: 'Uploaded Photo',
    profilePhotoPlaceholder: 'Preview',
    languageForResumeLabel: 'Language for Resume',
    selectLanguagePlaceholder: 'Select language',
    orSeparator: 'OR',
    // Toasts / Errors
    missingInfoTitle: 'Missing Information',
    missingInfoDescription: 'Please provide job offer (text or URL) and resume (text or PDF).',
    aiErrorTitle: 'AI Error',
    aiUnexpectedErrorDescription: 'An unexpected error occurred with the AI service.',
    missingResumeTitle: 'Missing Resume',
    missingResumeDescription: 'No tailored resume available to search for jobs.',
    // Languages for select
    langEnglish: 'English',
    langSpanish: 'Spanish',
    langFrench: 'French',
    langGerman: 'German',
  },
  es: {
    // AppHeader
    appName: 'NailedJob',
    languageSelectorLabel: 'Idioma',
    // CareerCraftWizard steps
    stepCounter: 'Paso {currentStep} de 4',
    step1Title: 'Proporcionar Información del Empleo y Candidato',
    step2Title: 'Análisis de Compatibilidad IA',
    step3Title: 'Currículum Personalizado IA',
    step4Title: 'Resultados de Búsqueda de Empleo Automatizada',
    // CareerCraftWizard buttons
    analyzeButton: 'Analizar Compatibilidad',
    buildResumeButton: 'Crear Currículum',
    findJobsButton: 'Buscar Empleos',
    previousButton: 'Anterior',
    startOverButton: 'Empezar de Nuevo',
    // InformationGatheringStep
    jobOfferDetailsTitle: 'Detalles de la Oferta de Empleo',
    jobOfferDescription: 'Proporcione la información de la oferta de empleo. Pegue el texto completo para obtener los mejores resultados.',
    jobOfferDescriptionEnhanced: 'Proporcione la oferta de empleo: pegue el texto directamente O ingrese una URL.',
    jobOfferTextLabel: 'Texto de la Oferta de Empleo',
    jobOfferTextPlaceholder: 'Pegue la descripción completa del trabajo aquí...',
    jobOfferUrlLabel: 'URL de la Oferta de Empleo',
    jobOfferUrlPlaceholder: 'https://ejemplo.com/oferta-trabajo',
    jobOfferTextOrUrl: 'Consejo: Si proporciona una URL, pegar el texto es opcional.',
    candidateInfoTitle: 'Información del Candidato',
    candidateInfoDescription: 'Proporcione los detalles de su currículum y una foto de perfil.',
    candidateInfoDescriptionEnhanced: 'Proporcione su currículum: pegue el texto directamente O cargue un PDF.',
    resumeTextLabel: 'Texto del Currículum',
    resumeTextPlaceholder: 'Pegue el texto completo de su currículum aquí...',
    resumePdfHint: 'También puede cargar un PDF, pero asegúrese de que su contenido de texto esté pegado arriba para el procesamiento de la IA.',
    resumeTextOrPdf: 'Consejo: Si carga un PDF, pegar el texto es opcional.',
    resumePdfLabel: 'Cargar Currículum PDF',
    fileUploadedLabel: 'Archivo cargado',
    profilePhotoLabel: 'Foto de Perfil (Opcional)',
    profilePhotoPreviewAlt: 'Vista Previa de Perfil',
    profilePhotoUploaded: 'Foto Subida',
    profilePhotoPlaceholder: 'Vista Previa',
    languageForResumeLabel: 'Idioma para el Currículum',
    selectLanguagePlaceholder: 'Seleccionar idioma',
    orSeparator: 'O',
    // Toasts / Errors
    missingInfoTitle: 'Información Faltante',
    missingInfoDescription: 'Por favor, proporcione la oferta de empleo (texto o URL) y el currículum (texto o PDF).',
    aiErrorTitle: 'Error de IA',
    aiUnexpectedErrorDescription: 'Ocurrió un error inesperado con el servicio de IA.',
    missingResumeTitle: 'Falta Currículum',
    missingResumeDescription: 'No hay currículum personalizado disponible para buscar empleos.',
    // Languages for select
    langEnglish: 'Inglés',
    langSpanish: 'Español',
    langFrench: 'Francés',
    langGerman: 'Alemán',
  },
};

export const getTranslation = (locale: Locale, key: string, params?: Record<string, string | number>): string => {
  let text = translations[locale]?.[key] || translations['en']?.[key] || key; // Fallback to English then key
  if (params) {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(`{${paramKey}}`, String(params[paramKey]));
    });
  }
  return text;
};
