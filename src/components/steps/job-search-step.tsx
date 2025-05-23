"use client";

import type { AutomatedJobSearchOutput } from '@/ai/flows/automated-job-search';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExternalLink, Briefcase, ListChecks } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JobSearchStepProps {
  result: AutomatedJobSearchOutput | null;
  loading: boolean;
}

export function JobSearchStep({ result, loading }: JobSearchStepProps) {
  if (loading) {
    return <LoadingIndicator message="Searching for relevant job opportunities..." />;
  }

  if (!result || !result.jobPostings || result.jobPostings.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary" />Job Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {result && result.jobPostings && result.jobPostings.length === 0 
             ? "No job postings found based on your new resume. You might want to refine your resume or try again later." 
             : "Job listings based on your new resume will appear here."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { jobPostings } = result;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Curated Job Opportunities</CardTitle>
        <CardDescription>Here are 10 job postings in Spain that match your AI-tailored resume.</CardDescription>
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
                    Job Posting {index + 1}: {link.length > 60 ? `${link.substring(0, 60)}...` : link}
                  </span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </ScrollArea>
         <p className="text-sm text-center text-muted-foreground mt-6">
          Good luck with your applications! Click "Start Over" to process another job offer.
        </p>
      </CardContent>
    </Card>
  );
}
