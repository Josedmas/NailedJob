
"use client";

import { useState, type ChangeEvent, useEffect } from 'react';
import { InformationGatheringStep } from '@/components/steps/information-gathering-step';
import { CompatibilityAnalysisStep } from '@/components/steps/compatibility-analysis-step';
import { ResumeBuilderStep } from '@/components/steps/resume-builder-step';
import { JobSearchStep } from '@/components/steps/job-search-step';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

import type { CompatibilityInput, CompatibilityOutput } from '@/ai/flows/resume-compatibility-analysis';
import { analyzeCompatibility } from '@/ai/flows/resume-compatibility-analysis';
import type { AIResumeBuilderInput, AIResumeBuilderOutput } from '@/ai/flows/ai-resume-builder';
import { aiResumeBuilder } from '@/ai/flows/ai-resume-builder';
import type { AutomatedJobSearchInput, AutomatedJobSearchOutput } from '@/ai/flows/automated-job-search';
import { automatedJobSearch } from '@/ai/flows/automated-job-search';

import { useLanguage } from '@/contexts/language-context';

import * as pdfjsLib from 'pdfjs-dist';
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}


export interface CareerCraftFormState {
  jobOfferText: string;
  jobOfferUrl: string;
  resumeText: string;
  resumeFileName: string;
  resumeFileDataUri: string;
  resumeFileMimeType: string;
  profilePhotoName: string;
  profilePhotoDataUri: string;
  language: string;
}

const initialFormState: CareerCraftFormState = {
  jobOfferText: '',
  jobOfferUrl: '',
  resumeText: '',
  resumeFileName: '',
  resumeFileDataUri: '',
  resumeFileMimeType: '',
  profilePhotoName: '',
  profilePhotoDataUri: '',
  language: 'English',
};

export default function CareerCraftWizard() {
  const { t, language: appLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<CareerCraftFormState>(initialFormState);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityOutput | null>(null);
  const [tailoredResumeResult, setTailoredResumeResult] = useState<AIResumeBuilderOutput | null>(null);
  const [initialCompatibilityResultForStep3, setInitialCompatibilityResultForStep3] = useState<CompatibilityOutput | null>(null);
  const [newCompatibilityAnalysisResultForStep3, setNewCompatibilityAnalysisResultForStep3] = useState<CompatibilityOutput | null>(null);
  const [jobListingsResult, setJobListingsResult] = useState<AutomatedJobSearchOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(''); 
  const { toast } = useToast();

  useEffect(() => {
    const resumeLang = appLanguage === 'es' ? 'Spanish' : 'English';
    if (formState.language !== resumeLang) {
        setFormState(prev => ({ ...prev, language: resumeLang }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLanguage]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (e.target.name === 'profilePhoto') {
        setLoading(true); // For profile photo as well, to be consistent
        setLoadingMessage(t('processingFileMessage') || "Processing file...");
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormState(prev => ({
            ...prev,
            profilePhotoDataUri: reader.result as string,
            profilePhotoName: file.name,
          }));
          setLoading(false);
          setLoadingMessage('');
        };
        reader.onerror = () => {
            toast({ variant: "destructive", title: "File Read Error", description: "Could not read profile photo."});
            setLoading(false);
            setLoadingMessage('');
        }
        reader.readAsDataURL(file);
      } else if (e.target.name === 'resumeFile') {
        setLoading(true);
        setLoadingMessage(t('processingFileMessage') || "Processing file...");
        setFormState(prev => ({ ...prev, resumeFileName: file.name, resumeFileMimeType: file.type || 'application/pdf', resumeText: '' , resumeFileDataUri: ''})); // Clear previous text/URI

        if (file.type !== 'application/pdf') {
          toast({ variant: "destructive", title: t('fileErrorTitle'), description: "Please select a valid PDF file for the resume." });
          setLoading(false); setLoadingMessage('');
          e.target.value = ''; 
          return;
        }
        if (file.size > 10 * 1024 * 1024) { 
            toast({ variant: "destructive", title: t('fileErrorTitle'), description: "Resume PDF is too large. Maximum 10MB." });
            setLoading(false); setLoadingMessage('');
            e.target.value = ''; 
            return;
        }

        let dataUri = '';
        const dataUriReader = new FileReader();
        const dataUriPromise = new Promise<void>((resolve, reject) => {
            dataUriReader.onloadend = () => {
                dataUri = dataUriReader.result as string;
                resolve();
            };
            dataUriReader.onerror = () => {
                toast({ variant: "destructive", title: "File Read Error", description: "Could not read resume file as Data URI."});
                reject(new Error("Data URI read error"));
            }
            dataUriReader.readAsDataURL(file);
        });

        const arrayBufferReader = new FileReader();
        arrayBufferReader.onload = async (event) => {
          try {
            await dataUriPromise; // Ensure Data URI is read first
            setFormState(prev => ({...prev, resumeFileDataUri: dataUri}));

            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
                 toast({ variant: "destructive", title: "File Read Error", description: "Could not read PDF content for text extraction."});
                 setLoading(false); setLoadingMessage('');
                 return;
            }
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
            }
            setFormState(prev => ({
              ...prev,
              resumeText: fullText.trim(), 
            }));
            toast({ title: "Resume Processed", description: `Successfully extracted text from ${file.name}.` });
          } catch (pdfError: any) {
            console.error("Client-side PDF processing error:", pdfError);
            toast({
              variant: "destructive",
              title: "PDF Processing Error",
              description: `Could not extract text from PDF: ${pdfError.message}. Please try pasting the text manually or try a different PDF. The uploaded PDF is still available if server-side extraction is attempted.`,
            });
            setFormState(prev => ({ ...prev, resumeText: '' })); // Clear text if extraction fails
          } finally {
            setLoading(false);
            setLoadingMessage('');
          }
        };
        arrayBufferReader.onerror = () => {
            toast({ variant: "destructive", title: "File Read Error", description: "Could not read resume file for text extraction."});
            setLoading(false);
            setLoadingMessage('');
        }
        arrayBufferReader.readAsArrayBuffer(file);
      }
    }
  };


  const resetWizard = () => {
    setCurrentStep(1);
    const resumeLang = appLanguage === 'es' ? 'Spanish' : 'English';
    setFormState({...initialFormState, language: resumeLang});
    setCompatibilityResult(null);
    setTailoredResumeResult(null);
    setInitialCompatibilityResultForStep3(null);
    setNewCompatibilityAnalysisResultForStep3(null);
    setJobListingsResult(null);
    setLoading(false);
    setLoadingMessage('');
  };


  const handleNextStep = async () => {
    if (currentStep === 1) {
      if ((!formState.jobOfferText && !formState.jobOfferUrl) || (!formState.resumeText && !formState.resumeFileDataUri)) {
        toast({
            variant: "destructive",
            title: t('missingInfoTitle') || "Missing Information",
            description: t('missingInfoDescriptionEnhanced') || "Please provide job offer (text or URL) and resume (text or PDF)."
        });
        return;
      }
       if (formState.resumeFileDataUri && formState.resumeFileMimeType && formState.resumeFileMimeType !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: t('fileErrorTitle') || "File Error",
          description: t('mimeTypeMissingDescription') || "Resume file must be a PDF.",
        });
        return;
      }
      setLoading(true);
      setLoadingMessage(t('analyzingCompatibilityMessage'));
      try {
        const input: CompatibilityInput = {
            jobDescription: formState.jobOfferText || undefined,
            jobOfferUrl: formState.jobOfferUrl || undefined,
            resume: formState.resumeText || undefined,
            resumeFileDataUri: formState.resumeText ? undefined : (formState.resumeFileDataUri || undefined),
            resumeFileName: formState.resumeFileName || undefined,
            resumeFileMimeType: formState.resumeText ? undefined : (formState.resumeFileDataUri ? 'application/pdf' : undefined),
            language: formState.language,
        };
        const result = await analyzeCompatibility(input);
        setCompatibilityResult(result);
        setCurrentStep(2);
      } catch (error) {
        console.error("AI call failed (Step 1 to 2):", error);
        toast({
            variant: "destructive",
            title: t('aiErrorTitle') || "AI Error",
            description: (error instanceof Error ? error.message : t('aiUnexpectedErrorDescription') || "An unexpected error occurred with the AI service."),
        });
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    } else if (currentStep === 2) {
      if (formState.resumeFileDataUri && formState.resumeFileMimeType && formState.resumeFileMimeType !== 'application/pdf' && !formState.resumeText) {
         toast({
          variant: "destructive",
          title: t('fileErrorTitle') || "File Error",
          description: t('mimeTypeMissingDescriptionBuild') || "Resume file type is missing or not PDF. Cannot build resume.",
        });
        return;
      }
      setLoading(true); 
      setLoadingMessage(t('buildingResumeMessage'));
      try {
        const builderInput: AIResumeBuilderInput = {
          jobDescription: formState.jobOfferText || undefined,
          jobOfferUrl: formState.jobOfferUrl || undefined,
          resume: formState.resumeText || undefined,
          resumeFileDataUri: formState.resumeText ? undefined : (formState.resumeFileDataUri || undefined),
          resumeFileMimeType: formState.resumeText ? undefined : (formState.resumeFileDataUri ? 'application/pdf' : undefined),
          profilePhotoDataUri: formState.profilePhotoDataUri || undefined,
          language: formState.language,
        };
        const builderResult = await aiResumeBuilder(builderInput);
        setTailoredResumeResult(builderResult);

        if (builderResult?.tailoredResume) {
          setLoadingMessage(t('analyzingNewResumeCompatibility')); 
          const newAnalysisInput: CompatibilityInput = {
            jobDescription: formState.jobOfferText || undefined,
            jobOfferUrl: formState.jobOfferUrl || undefined,
            resume: builderResult.tailoredResume, 
            language: formState.language,
          };
          const newAnalysis = await analyzeCompatibility(newAnalysisInput);
          setNewCompatibilityAnalysisResultForStep3(newAnalysis);
        } else {
          setNewCompatibilityAnalysisResultForStep3(null);
          toast({ variant: "warning", title: "Resume Building Issue", description: "AI could not generate a tailored resume. New compatibility cannot be assessed."});
        }
        setInitialCompatibilityResultForStep3(compatibilityResult); 
        setCurrentStep(3);
      } catch (error) {
        console.error("AI call failed (Step 2 to 3):", error);
        toast({
            variant: "destructive",
            title: t('aiErrorTitle') || "AI Error",
            description: (error instanceof Error ? error.message : t('aiUnexpectedErrorDescription') || "An unexpected error occurred with the AI service."),
        });
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    } else if (currentStep === 3) {
      if (!tailoredResumeResult?.tailoredResume) {
         toast({
            variant: "destructive",
            title: t('missingResumeTitle') || "Missing Resume",
            description: t('missingResumeDescription') || "No tailored resume available to search for jobs."
        });
        return;
      }
      setLoading(true);
      setLoadingMessage(t('searchingJobsMessage'));
      try {
        const input: AutomatedJobSearchInput = { resume: tailoredResumeResult.tailoredResume };
        const result = await automatedJobSearch(input);
        setJobListingsResult(result);
        setCurrentStep(4);
      } catch (error) {
         console.error("AI call failed (Step 3 to 4):", error);
        toast({
            variant: "destructive",
            title: t('aiErrorTitle') || "AI Error",
            description: (error instanceof Error ? error.message : t('aiUnexpectedErrorDescription') || "An unexpected error occurred with the AI service."),
        });
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <InformationGatheringStep formState={formState} onInputChange={handleInputChange} onFileChange={handleFileChange} isLoadingFile={loading && !!loadingMessage}/>;
      case 2:
        return <CompatibilityAnalysisStep result={compatibilityResult} loading={loading} />;
      case 3:
        return <ResumeBuilderStep 
                  result={tailoredResumeResult} 
                  loading={loading}
                  loadingMessageFromWizard={loadingMessage} 
                  profilePhotoDataUri={formState.profilePhotoDataUri} 
                  resumeLanguage={formState.language}
                  initialCompatibilityResult={initialCompatibilityResultForStep3}
                  newCompatibilityAnalysisResult={newCompatibilityAnalysisResultForStep3}
                />;
      case 4:
        return <JobSearchStep result={jobListingsResult} loading={loading} />;
      default:
        return <InformationGatheringStep formState={formState} onInputChange={handleInputChange} onFileChange={handleFileChange} isLoadingFile={loading && !!loadingMessage}/>;
    }
  };

  const stepTitles: Record<number, string> = {
    1: t('step1Title'),
    2: t('step2Title'),
    3: t('step3Title'),
    4: t('step4Title'),
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-foreground">{t('stepCounter', { currentStep })}</h2>
        <p className="text-muted-foreground">
          {stepTitles[currentStep]}
        </p>
      </div>

      {renderStep()}

      <div className="flex justify-between items-center pt-6 border-t">
        {currentStep > 1 && (
          <Button variant="outline" onClick={handlePreviousStep} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('previousButton')}
          </Button>
        )}
        {currentStep === 1 && <div></div>} 

        {currentStep < 4 ? (
          <Button onClick={handleNextStep} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? loadingMessage : (currentStep === 1 ? t('analyzeButton') : currentStep === 2 ? t('buildResumeButton') : t('findJobsButton'))}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : (
          <Button onClick={resetWizard} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('startOverButton')}
            {!loading && <RotateCcw className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
