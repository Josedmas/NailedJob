"use client";

import type { AIResumeBuilderOutput } from '@/ai/flows/ai-resume-builder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Wand2 } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResumeBuilderStepProps {
  result: AIResumeBuilderOutput | null;
  loading: boolean;
}

export function ResumeBuilderStep({ result, loading }: ResumeBuilderStepProps) {
  if (loading) {
    return <LoadingIndicator message="Building your tailored resume..." />;
  }

  if (!result) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />Tailored Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Your AI-generated resume will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const { tailoredResume, explanation } = result;

  const handleDownloadText = () => {
    const blob = new Blob([tailoredResume], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tailored_resume.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" />Your AI-Crafted Resume</CardTitle>
        <CardDescription>This resume has been tailored for the job offer using the Harvard style.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Tailored Resume Content:</h3>
          <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/50">
            <pre className="text-sm whitespace-pre-wrap break-words font-sans">{tailoredResume}</pre>
          </ScrollArea>
          <Button onClick={handleDownloadText} className="mt-4">
            <Download className="mr-2 h-4 w-4" /> Download as Text
          </Button>
           <p className="text-xs text-muted-foreground mt-2">For PDF, copy the text and use a text editor or "Print to PDF" in your browser.</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Explanation of Modifications:</h3>
          <ScrollArea className="h-48 w-full rounded-md border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{explanation}</p>
          </ScrollArea>
        </div>
         <p className="text-sm text-center text-muted-foreground">
          Happy with your new resume? Click "Find Jobs" to discover opportunities matching this CV.
        </p>
      </CardContent>
    </Card>
  );
}
