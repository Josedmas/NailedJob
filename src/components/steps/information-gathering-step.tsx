
"use client";

import type { ChangeEvent } from 'react';
import type { CareerCraftFormState } from '@/components/career-craft-wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { UploadCloud, FileText, Link2 } from 'lucide-react';
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
          <CardDescription>{t('jobOfferDescriptionEnhanced')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobOfferText">
                <FileText className="inline-block mr-1 h-4 w-4 align-text-bottom" /> 
                {t('jobOfferTextLabel')}
            </Label>
            <Textarea
              id="jobOfferText"
              name="jobOfferText"
              value={formState.jobOfferText}
              onChange={onInputChange}
              placeholder={t('jobOfferTextPlaceholder')}
              rows={6}
              className="mt-1"
            />
             <p className="text-sm text-muted-foreground mt-1">{t('jobOfferTextOrUrl')}</p>
          </div>
          <div className="text-center my-2 text-sm text-muted-foreground">{t('orSeparator')}</div>
          <div>
            <Label htmlFor="jobOfferUrl">
                <Link2 className="inline-block mr-1 h-4 w-4 align-text-bottom" /> 
                {t('jobOfferUrlLabel')}
            </Label>
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
          <CardDescription>{t('candidateInfoDescriptionEnhanced')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resumeText">
                <FileText className="inline-block mr-1 h-4 w-4 align-text-bottom" /> 
                {t('resumeTextLabel')}
            </Label>
            <Textarea
              id="resumeText"
              name="resumeText"
              value={formState.resumeText}
              onChange={onInputChange}
              placeholder={t('resumeTextPlaceholder')}
              rows={8}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">{t('resumeTextOrPdf')}</p>
          </div>
          <div className="text-center my-2 text-sm text-muted-foreground">{t('orSeparator')}</div>
          <div>
            <Label htmlFor="resumePdf">
                <UploadCloud className="inline-block mr-1 h-4 w-4 align-text-bottom" />
                {t('resumePdfLabel')}
            </Label>
            <Input
              id="resumePdf"
              name="resumePdf"
              type="file"
              accept=".pdf"
              onChange={onFileChange}
              className="mt-1"
            />
            {formState.resumePdfName && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {t('fileUploadedLabel')}: {formState.resumePdfName}
                </p>
            )}
          </div>
          <hr className="my-4"/>
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
