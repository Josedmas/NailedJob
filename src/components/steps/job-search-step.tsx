
"use client";

import type { AutomatedJobSearchOutput } from '@/ai/flows/automated-job-search';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, Briefcase, ListChecks } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/language-context';

interface JobSearchStepProps {
  result: AutomatedJobSearchOutput | null;
  loading: boolean;
}

export function JobSearchStep({ result, loading }: JobSearchStepProps) {
  const { t } = useLanguage();

  if (loading) {
    return <LoadingIndicator message={t('searchingJobsMessage')} />;
  }

  if (!result || !result.jobPostings || result.jobPostings.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary" />{t('jobOpportunitiesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {result && result.jobPostings && result.jobPostings.length === 0 
             ? t('noJobPostingsFound')
             : t('jobListingsPlaceholder')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { jobPostings } = result;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />{t('curatedJobOpportunitiesTitle')}</CardTitle>
        <CardDescription>{t('curatedJobOpportunitiesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <ul className="space-y-3">
            {jobPostings.map((link, index) => (
              <li key={index} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-accent hover:text-accent-foreground"
                >
                  <span className="truncate pr-2">
                    <Briefcase className="inline h-4 w-4 mr-2 align-text-bottom" /> 
                    {t('jobPostingLinkText', { index: index + 1, link: link.length > 60 ? `${link.substring(0, 60)}...` : link })}
                  </span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </ScrollArea>
         <p className="text-sm text-center text-muted-foreground mt-6">
          {t('goodLuckPrompt')}
        </p>
      </CardContent>
    </Card>
  );
}
