
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
    jobOfferTextLabel: 'Job Offer Text (Required)',
    jobOfferTextPlaceholder: 'Paste the full job description here...',
    jobOfferUrlLabel: 'Job Offer URL (Optional)',
    jobOfferUrlPlaceholder: 'https://example.com/job-posting',
    candidateInfoTitle: 'Candidate Information',
    candidateInfoDescription: 'Provide your resume details and a profile photo.',
    resumeTextLabel: 'Resume Text (Required)',
    resumeTextPlaceholder: 'Paste your full resume text here...',
    resumePdfHint: 'You can also upload a PDF, but please ensure its text content is pasted above for AI processing.',
    resumePdfLabel: 'Upload Resume PDF (Optional)',
    profilePhotoLabel: 'Profile Photo (Optional)',
    profilePhotoPreviewAlt: 'Profile Preview',
    profilePhotoUploaded: 'Uploaded Photo',
    profilePhotoPlaceholder: 'Preview',
    languageForResumeLabel: 'Language for Resume',
    selectLanguagePlaceholder: 'Select language',
    // Languages for select
    langEnglish: 'English',
    langSpanish: 'Spanish',
    langFrench: 'French',
    langGerman: 'German',
  },
  es: {
    // AppHeader
    appName: 'NailedJob', // Assuming name stays the same or user specifies translation
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
    jobOfferTextLabel: 'Texto de la Oferta de Empleo (Requerido)',
    jobOfferTextPlaceholder: 'Pegue la descripción completa del trabajo aquí...',
    jobOfferUrlLabel: 'URL de la Oferta de Empleo (Opcional)',
    jobOfferUrlPlaceholder: 'https://ejemplo.com/oferta-trabajo',
    candidateInfoTitle: 'Información del Candidato',
    candidateInfoDescription: 'Proporcione los detalles de su currículum y una foto de perfil.',
    resumeTextLabel: 'Texto del Currículum (Requerido)',
    resumeTextPlaceholder: 'Pegue el texto completo de su currículum aquí...',
    resumePdfHint: 'También puede cargar un PDF, pero asegúrese de que su contenido de texto esté pegado arriba para el procesamiento de la IA.',
    resumePdfLabel: 'Cargar Currículum PDF (Opcional)',
    profilePhotoLabel: 'Foto de Perfil (Opcional)',
    profilePhotoPreviewAlt: 'Vista Previa de Perfil',
    profilePhotoUploaded: 'Foto Subida',
    profilePhotoPlaceholder: 'Vista Previa',
    languageForResumeLabel: 'Idioma para el Currículum',
    selectLanguagePlaceholder: 'Seleccionar idioma',
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
