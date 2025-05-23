"use client";

import { useState, type ChangeEvent } from 'react';
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

export interface CareerCraftFormState {
  jobOfferText: string;
  jobOfferUrl: string;
  resumeText: string;
  profilePhotoName: string;
  profilePhotoDataUri: string;
  language: string;
}

const initialFormState: CareerCraftFormState = {
  jobOfferText: '',
  jobOfferUrl: '',
  resumeText: '',
  profilePhotoName: '',
  profilePhotoDataUri: '',
  language: 'English',
};

export default function CareerCraftWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<CareerCraftFormState>(initialFormState);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityOutput | null>(null);
  const [tailoredResumeResult, setTailoredResumeResult] = useState<AIResumeBuilderOutput | null>(null);
  const [jobListingsResult, setJobListingsResult] = useState<AutomatedJobSearchOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (e.target.name === 'profilePhoto') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormState(prev => ({
            ...prev,
            profilePhotoDataUri: reader.result as string,
            profilePhotoName: file.name,
          }));
        };
        reader.readAsDataURL(file);
      }
      // PDF resume handling is simplified to text input for now
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFormState(initialFormState);
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
        title: "AI Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred with the AI service.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) { // From Info Gathering to Compatibility Analysis
      if (!formState.jobOfferText || !formState.resumeText) {
        toast({ variant: "destructive", title: "Missing Information", description: "Please provide both job offer and resume text." });
        return;
      }
      await callAI(async () => {
        const input: CompatibilityInput = { jobDescription: formState.jobOfferText, resume: formState.resumeText };
        const result = await analyzeCompatibility(input);
        setCompatibilityResult(result);
        setCurrentStep(2);
      });
    } else if (currentStep === 2) { // From Compatibility Analysis to Resume Builder
      await callAI(async () => {
        const input: AIResumeBuilderInput = {
          jobDescription: formState.jobOfferText,
          resume: formState.resumeText,
          profilePhotoDataUri: formState.profilePhotoDataUri || undefined,
          language: formState.language,
        };
        const result = await aiResumeBuilder(input);
        setTailoredResumeResult(result);
        setCurrentStep(3);
      });
    } else if (currentStep === 3) { // From Resume Builder to Job Search
      if (!tailoredResumeResult?.tailoredResume) {
         toast({ variant: "destructive", title: "Missing Resume", description: "No tailored resume available to search for jobs." });
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
        return <ResumeBuilderStep result={tailoredResumeResult} loading={loading} />;
      case 4:
        return <JobSearchStep result={jobListingsResult} loading={loading} />;
      default:
        return <InformationGatheringStep formState={formState} onInputChange={handleInputChange} onFileChange={handleFileChange} />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-foreground">Step {currentStep} of 4</h2>
        <p className="text-muted-foreground">
          {currentStep === 1 && "Provide Job and Candidate Information"}
          {currentStep === 2 && "AI Compatibility Analysis"}
          {currentStep === 3 && "AI Tailored Resume"}
          {currentStep === 4 && "Automated Job Search Results"}
        </p>
      </div>

      {renderStep()}

      <div className="flex justify-between items-center pt-6 border-t">
        {currentStep > 1 && (
          <Button variant="outline" onClick={handlePreviousStep} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
        )}
        {currentStep === 1 && <div></div>} {/* Placeholder for alignment */}
        
        {currentStep < 4 ? (
          <Button onClick={handleNextStep} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 1 ? "Analyze Compatibility" : currentStep === 2 ? "Build Resume" : "Find Jobs"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : (
          <Button onClick={resetWizard} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Over
            {!loading && <RotateCcw className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
