"use client";

import type { ChangeEvent } from 'react';
import type { CareerCraftFormState } from '@/components/career-craft-wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';

interface InformationGatheringStepProps {
  formState: CareerCraftFormState;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function InformationGatheringStep({ formState, onInputChange, onFileChange }: InformationGatheringStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Offer Details</CardTitle>
          <CardDescription>Provide the job offer information. Paste the full text for best results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobOfferText">Job Offer Text (Required)</Label>
            <Textarea
              id="jobOfferText"
              name="jobOfferText"
              value={formState.jobOfferText}
              onChange={onInputChange}
              placeholder="Paste the full job description here..."
              rows={8}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="jobOfferUrl">Job Offer URL (Optional)</Label>
            <Input
              id="jobOfferUrl"
              name="jobOfferUrl"
              type="url"
              value={formState.jobOfferUrl}
              onChange={onInputChange}
              placeholder="https://example.com/job-posting"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
          <CardDescription>Provide your resume details and a profile photo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resumeText">Resume Text (Required)</Label>
            <Textarea
              id="resumeText"
              name="resumeText"
              value={formState.resumeText}
              onChange={onInputChange}
              placeholder="Paste your full resume text here..."
              rows={10}
              className="mt-1"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              You can also upload a PDF, but please ensure its text content is pasted above for AI processing.
            </p>
          </div>
          <div>
            <Label htmlFor="resumePdf">Upload Resume PDF (Optional)</Label>
            <Input
              id="resumePdf"
              name="resumePdf"
              type="file"
              accept=".pdf"
              onChange={onFileChange} // Note: PDF content is not directly used by AI in this version
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="profilePhoto">Profile Photo (Optional)</Label>
            <Input
              id="profilePhoto"
              name="profilePhoto"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="mt-1"
            />
            {formState.profilePhotoDataUri && (
              <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
                <Image src={formState.profilePhotoDataUri} alt="Profile Preview" width={100} height={100} className="rounded" />
                <p className="text-xs text-muted-foreground mt-1 truncate w-24">{formState.profilePhotoName || "Uploaded Photo"}</p>
              </div>
            )}
             {!formState.profilePhotoDataUri && (
              <div className="mt-2 p-4 border rounded-md border-dashed flex flex-col items-center justify-center text-muted-foreground" data-ai-hint="placeholder avatar">
                <UploadCloud className="h-8 w-8 mb-1" />
                <span>Preview</span>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="language">Language for Resume</Label>
            <Select name="language" value={formState.language} onValueChange={(value) => onInputChange({ target: { name: 'language', value } } as any)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
