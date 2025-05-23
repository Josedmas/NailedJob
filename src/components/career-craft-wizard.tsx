
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

export interface CareerCraftFormState {
  jobOfferText: string;
  jobOfferUrl: string;
  resumeText: string;
  resumePdfName: string;
  resumePdfDataUri: string;
  profilePhotoName: string;
  profilePhotoDataUri: string;
  language: string; // This is language for resume generation, distinct from app UI language
}

const initialFormState: CareerCraftFormState = {
  jobOfferText: '',
  jobOfferUrl: '',
  resumeText: '',
  resumePdfName: '',
  resumePdfDataUri: '',
  profilePhotoName: '',
  profilePhotoDataUri: '',
  language: 'English', // Default language for resume content
};

export default function CareerCraftWizard() {
  const { t, language: appLanguage } = useLanguage(); // appLanguage for UI, formState.language for resume
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<CareerCraftFormState>(initialFormState);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityOutput | null>(null);
  const [tailoredResumeResult, setTailoredResumeResult] = useState<AIResumeBuilderOutput | null>(null);
  const [jobListingsResult, setJobListingsResult] = useState<AutomatedJobSearchOutput | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (e.target.name === 'profilePhoto') {
          setFormState(prev => ({
            ...prev,
            profilePhotoDataUri: reader.result as string,
            profilePhotoName: file.name,
          }));
        } else if (e.target.name === 'resumePdf') {
           setFormState(prev => ({
            ...prev,
            resumePdfDataUri: reader.result as string,
            resumePdfName: file.name,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    // Reset form state while preserving the language derived from appLanguage
    const resumeLang = appLanguage === 'es' ? 'Spanish' : 'English';
    setFormState({...initialFormState, language: resumeLang});
    setCompatibilityResult(null);
    setTailoredResumeResult(null);
    setJobListingsResult(null);
    setLoading(false);
  };

  const callAI = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      console.error("AI call failed:", error);
      toast({
        variant: "destructive",
        title: t('aiErrorTitle') || "AI Error",
        description: (error instanceof Error ? error.message : t('aiUnexpectedErrorDescription') || "An unexpected error occurred with the AI service."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) { 
      if ((!formState.jobOfferText && !formState.jobOfferUrl) || (!formState.resumeText && !formState.resumePdfDataUri)) {
        toast({ 
            variant: "destructive", 
            title: t('missingInfoTitle') || "Missing Information", 
            description: t('missingInfoDescription') || "Please provide job offer (text or URL) and resume (text or PDF)." 
        });
        return;
      }
      await callAI(async () => {
        const input: CompatibilityInput = { 
            jobDescription: formState.jobOfferText || undefined, 
            jobOfferUrl: formState.jobOfferUrl || undefined,
            resume: formState.resumeText || undefined,
            resumePdfDataUri: formState.resumePdfDataUri || undefined,
            language: formState.language, // Pass language to compatibility analysis
        };
        const result = await analyzeCompatibility(input);
        setCompatibilityResult(result);
        setCurrentStep(2);
      });
    } else if (currentStep === 2) { 
      await callAI(async () => {
        const input: AIResumeBuilderInput = {
          jobDescription: formState.jobOfferText || undefined,
          jobOfferUrl: formState.jobOfferUrl || undefined,
          resume: formState.resumeText || undefined,
          resumePdfDataUri: formState.resumePdfDataUri || undefined,
          profilePhotoDataUri: formState.profilePhotoDataUri || undefined,
          language: formState.language,
        };
        const result = await aiResumeBuilder(input);
        setTailoredResumeResult(result);
        setCurrentStep(3);
      });
    } else if (currentStep === 3) { 
      if (!tailoredResumeResult?.tailoredResume) {
         toast({ 
            variant: "destructive", 
            title: t('missingResumeTitle') || "Missing Resume", 
            description: t('missingResumeDescription') || "No tailored resume available to search for jobs." 
        });
        return;
      }
      await callAI(async () => {
        const input: AutomatedJobSearchInput = { resume: tailoredResumeResult.tailoredResume };
        const result = await automatedJobSearch(input);
        setJobListingsResult(result);
        setCurrentStep(4);
      });
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
        return <InformationGatheringStep formState={formState} onInputChange={handleInputChange} onFileChange={handleFileChange} />;
      case 2:
        return <CompatibilityAnalysisStep result={compatibilityResult} loading={loading} />;
      case 3:
        return <ResumeBuilderStep result={tailoredResumeResult} loading={loading} profilePhotoDataUri={formState.profilePhotoDataUri} />;
      case 4:
        return <JobSearchStep result={jobListingsResult} loading={loading} />;
      default:
        return <InformationGatheringStep formState={formState} onInputChange={handleInputChange} onFileChange={handleFileChange} />;
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
        {currentStep === 1 && <div></div>} {/* Placeholder for alignment */}
        
        {currentStep < 4 ? (
          <Button onClick={handleNextStep} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 1 ? t('analyzeButton') : currentStep === 2 ? t('buildResumeButton') : t('findJobsButton')}
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
