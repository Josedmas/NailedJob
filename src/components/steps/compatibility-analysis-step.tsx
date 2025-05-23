"use client";

import type { CompatibilityOutput } from '@/ai/flows/resume-compatibility-analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';

interface CompatibilityAnalysisStepProps {
  result: CompatibilityOutput | null;
  loading: boolean;
}

export function CompatibilityAnalysisStep({ result, loading }: CompatibilityAnalysisStepProps) {
  if (loading) {
    return <LoadingIndicator message="Analyzing compatibility..." />;
  }

  if (!result) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-primary" />Waiting for Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Compatibility analysis will appear here once the previous step is completed.</p>
        </CardContent>
      </Card>
    );
  }

  const { compatibilityScore, explanation } = result;
  let adviceTitle = "";
  let adviceMessage = "";
  let adviceVariant: "default" | "destructive" | "warning" | "success" = "default";
  let AdviceIcon = Info;

  if (compatibilityScore < 60) {
    adviceTitle = "Very Low Compatibility";
    adviceMessage = "Your resume has a very low match with the job offer (less than 60%). It's highly recommended to significantly revise your resume, focusing on highlighting any existing skills and experiences that align with the job description. Consider if this role is a good fit or if your resume needs substantial tailoring.";
    adviceVariant = "destructive";
    AdviceIcon = AlertTriangle;
  } else if (compatibilityScore < 70) {
    adviceTitle = "Moderate Compatibility";
    adviceMessage = "Your resume shows moderate compatibility (60-70%). There's a risk it might be overlooked compared to more aligned candidates. Focus on rewriting sections where your skills and experience don't perfectly match the job requirements, emphasizing transferable skills and relevant achievements.";
    adviceVariant = "warning";
    AdviceIcon = Info;
  } else if (compatibilityScore < 80) {
    adviceTitle = "Good Compatibility";
    adviceMessage = "You have a good level of compatibility (70-80%)! Your resume is likely to be reviewed. Consider fine-tuning your resume to further enhance its alignment with the job description, ensuring your key strengths are prominent.";
    adviceVariant = "default";
    AdviceIcon = CheckCircle;
  } else {
    adviceTitle = "Excellent Compatibility";
    adviceMessage = "Excellent match (over 80%)! Your profile is highly aligned with the company's needs. Review for any minor improvements in wording or clarity to make your CV even more compelling. The AI will now help you craft an optimized resume.";
    adviceVariant = "success";
    AdviceIcon = Zap;
  }


  const getProgressColor = (score: number) => {
    if (score < 60) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><Zap className="mr-2 h-6 w-6 text-primary" />AI Compatibility Report</CardTitle>
        <CardDescription>Here's how your current resume matches the job offer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <Label htmlFor="compatibilityScore" className="text-lg font-medium">Compatibility Score</Label>
            <span className={`text-2xl font-bold text-${adviceVariant === 'destructive' ? 'red-600' : adviceVariant === 'warning' ? 'yellow-600' : adviceVariant === 'success' ? 'green-600' : 'primary'}`}>
              {compatibilityScore}%
            </span>
          </div>
          <Progress id="compatibilityScore" value={compatibilityScore} className="w-full h-4" indicatorClassName={getProgressColor(compatibilityScore)} aria-label={`Compatibility Score: ${compatibilityScore}%`} />
        </div>

        <div className="space-y-2">
            <h3 className="text-md font-semibold text-foreground">AI Explanation:</h3>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{explanation}</p>
        </div>
        
        <Alert variant={adviceVariant === "warning" ? "default" : adviceVariant} className={adviceVariant === "warning" ? "border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400" : ""}>
          <AdviceIcon className="h-5 w-5" />
          <AlertTitle>{adviceTitle}</AlertTitle>
          <AlertDescription>
            {adviceMessage}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-center text-muted-foreground">
          Ready to improve? Click "Build Resume" to let our AI tailor your CV for this specific job.
        </p>
      </CardContent>
    </Card>
  );
}
