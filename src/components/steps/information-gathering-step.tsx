
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
import { useLanguage } from '@/contexts/language-context';

interface InformationGatheringStepProps {
  formState: CareerCraftFormState;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function InformationGatheringStep({ formState, onInputChange, onFileChange }: InformationGatheringStepProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('jobOfferDetailsTitle')}</CardTitle>
          <CardDescription>{t('jobOfferDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobOfferText">{t('jobOfferTextLabel')}</Label>
            <Textarea
              id="jobOfferText"
              name="jobOfferText"
              value={formState.jobOfferText}
              onChange={onInputChange}
              placeholder={t('jobOfferTextPlaceholder')}
              rows={8}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="jobOfferUrl">{t('jobOfferUrlLabel')}</Label>
            <Input
              id="jobOfferUrl"
              name="jobOfferUrl"
              type="url"
              value={formState.jobOfferUrl}
              onChange={onInputChange}
              placeholder={t('jobOfferUrlPlaceholder')}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('candidateInfoTitle')}</CardTitle>
          <CardDescription>{t('candidateInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resumeText">{t('resumeTextLabel')}</Label>
            <Textarea
              id="resumeText"
              name="resumeText"
              value={formState.resumeText}
              onChange={onInputChange}
              placeholder={t('resumeTextPlaceholder')}
              rows={10}
              className="mt-1"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t('resumePdfHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="resumePdf">{t('resumePdfLabel')}</Label>
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
            <Label htmlFor="profilePhoto">{t('profilePhotoLabel')}</Label>
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
                <Image src={formState.profilePhotoDataUri} alt={t('profilePhotoPreviewAlt')} width={100} height={100} className="rounded" />
                <p className="text-xs text-muted-foreground mt-1 truncate w-24">{formState.profilePhotoName || t('profilePhotoUploaded')}</p>
              </div>
            )}
             {!formState.profilePhotoDataUri && (
              <div className="mt-2 p-4 border rounded-md border-dashed flex flex-col items-center justify-center text-muted-foreground" data-ai-hint="placeholder avatar">
                <UploadCloud className="h-8 w-8 mb-1" />
                <span>{t('profilePhotoPlaceholder')}</span>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="language">{t('languageForResumeLabel')}</Label>
            <Select name="language" value={formState.language} onValueChange={(value) => onInputChange({ target: { name: 'language', value } } as any)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t('selectLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">{t('langEnglish')}</SelectItem>
                <SelectItem value="Spanish">{t('langSpanish')}</SelectItem>
                <SelectItem value="French">{t('langFrench')}</SelectItem>
                <SelectItem value="German">{t('langGerman')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
