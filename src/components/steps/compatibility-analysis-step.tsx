
"use client";

import type { CompatibilityOutput } from '@/ai/flows/resume-compatibility-analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { useLanguage } from '@/contexts/language-context';

interface CompatibilityAnalysisStepProps {
  result: CompatibilityOutput | null;
  loading: boolean;
}

export function CompatibilityAnalysisStep({ result, loading }: CompatibilityAnalysisStepProps) {
  const { t } = useLanguage();

  if (loading) {
    return <LoadingIndicator message={t('analyzingCompatibilityMessage')} />;
  }

  if (!result) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-primary" />{t('waitingForAnalysisTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('waitingForAnalysisDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  const { compatibilityScore, explanation } = result;
  let adviceTitleKey = "";
  let adviceMessageKey = "";
  let adviceVariant: "default" | "destructive" | "warning" | "success" = "default";
  let AdviceIcon = Info;

  if (compatibilityScore < 60) {
    adviceTitleKey = "adviceVeryLowTitle";
    adviceMessageKey = "adviceVeryLowMessage";
    adviceVariant = "destructive";
    AdviceIcon = AlertTriangle;
  } else if (compatibilityScore < 70) {
    adviceTitleKey = "adviceModerateTitle";
    adviceMessageKey = "adviceModerateMessage";
    adviceVariant = "warning";
    AdviceIcon = Info;
  } else if (compatibilityScore < 80) {
    adviceTitleKey = "adviceGoodTitle";
    adviceMessageKey = "adviceGoodMessage";
    adviceVariant = "default";
    AdviceIcon = CheckCircle;
  } else {
    adviceTitleKey = "adviceExcellentTitle";
    adviceMessageKey = "adviceExcellentMessage";
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
        <CardTitle className="flex items-center"><Zap className="mr-2 h-6 w-6 text-primary" />{t('aiCompatibilityReportTitle')}</CardTitle>
        <CardDescription>{t('aiCompatibilityReportDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1 items-center">
            <Label htmlFor="compatibilityScore" className="text-lg font-medium">{t('compatibilityScoreLabel')}</Label>
            <span className={`text-2xl font-bold text-${adviceVariant === 'destructive' ? 'red-600' : adviceVariant === 'warning' ? 'yellow-600' : adviceVariant === 'success' ? 'green-600' : 'primary'}`}>
              {compatibilityScore}%
            </span>
          </div>
          <Progress id="compatibilityScore" value={compatibilityScore} className="w-full h-4" indicatorClassName={getProgressColor(compatibilityScore)} aria-label={`${t('compatibilityScoreLabel')}: ${compatibilityScore}%`} />
        </div>

        <div className="space-y-2">
            <h3 className="text-md font-semibold text-foreground">{t('aiExplanationLabel')}</h3>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{explanation}</p>
        </div>
        
        <Alert variant={adviceVariant === "warning" ? "default" : adviceVariant} className={adviceVariant === "warning" ? "border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400" : ""}>
          <AdviceIcon className="h-5 w-5" />
          <AlertTitle>{t(adviceTitleKey)}</AlertTitle>
          <AlertDescription>
            {t(adviceMessageKey)}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-center text-muted-foreground">
          {t('readyToImprovePrompt')}
        </p>
      </CardContent>
    </Card>
  );
}
