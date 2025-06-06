
"use client";

import type { AIResumeBuilderOutput } from '@/ai/flows/ai-resume-builder';
import type { CompatibilityOutput } from '@/ai/flows/resume-compatibility-analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Wand2, FileType, TrendingUp, CheckCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/contexts/language-context';
import type { Locale } from '@/lib/translations';

interface ResumeBuilderStepProps {
  result: AIResumeBuilderOutput | null;
  loading: boolean;
  loadingMessageFromWizard?: string;
  profilePhotoDataUri?: string;
  resumeLanguage: string;
  initialCompatibilityResult: CompatibilityOutput | null;
  newCompatibilityAnalysisResult: CompatibilityOutput | null;
}

const getSectionTitle = (t: Function, key: string, lang: Locale, fallback: string): string => {
  const title = t(key, undefined, { lng: lang });
  return title === key ? fallback : title;
};

export function ResumeBuilderStep({ 
  result, 
  loading, 
  loadingMessageFromWizard,
  profilePhotoDataUri, 
  resumeLanguage,
  initialCompatibilityResult,
  newCompatibilityAnalysisResult 
}: ResumeBuilderStepProps) {
  const { t } = useLanguage();

  if (loading) {
    return <LoadingIndicator message={loadingMessageFromWizard || t('buildingResumeMessage')} />;
  }

  if (!result) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />{t('tailoredResumeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('aiGeneratedResumePlaceholder')}</p>
        </CardContent>
      </Card>
    );
  }

  const { tailoredResume, explanation } = result;
  const initialScore = initialCompatibilityResult?.compatibilityScore;
  const newScore = newCompatibilityAnalysisResult?.compatibilityScore;
  const improvement = (initialScore != null && newScore != null) ? newScore - initialScore : null;

  const getProgressColor = (score: number | undefined) => {
    if (score == null) return 'bg-muted';
    if (score < 60) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleDownloadText = () => {
    const blob = new Blob([tailoredResume], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tailored_resume.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    if (!tailoredResume) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const margin = 15;
    const leftColWidthRatio = 0.33; 
    const leftColWidth = pageWidth * leftColWidthRatio;
    const rightColX = leftColWidth + 5; 
    const rightColWidth = pageWidth - rightColX - margin;

    const leftColContentWidth = leftColWidth - margin; 

    const leftColBGColor = [240, 243, 244]; 
    const sectionTitleTextLeftCol = [52, 73, 94]; 
    const bodyTextLeftCol = [86, 101, 115]; 

    const nameColor = [44, 62, 80]; 
    const sectionTitleRightCol = [44, 62, 80]; 
    const bodyTextRightCol = [52, 73, 94]; 


    let yLeft = margin;
    let yRight = margin;
    let currentPage = 1;

    const addPageIfNeeded = (currentY: number, neededHeight: number = 10) => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        currentPage++;
        yLeft = margin;
        yRight = margin;
        doc.setFillColor(leftColBGColor[0], leftColBGColor[1], leftColBGColor[2]);
        doc.rect(0, 0, leftColWidth, pageHeight, 'F');
        return margin; 
      }
      return currentY;
    };
    
    const drawLeftColumnBackground = () => {
      doc.setFillColor(leftColBGColor[0], leftColBGColor[1], leftColBGColor[2]);
      doc.rect(0, 0, leftColWidth, pageHeight, 'F');
    };
    
    drawLeftColumnBackground();

    const resumeLines = tailoredResume.split('\n').map(line => line.trim()).filter(line => line);
    const candidateFullName = resumeLines.length > 0 ? resumeLines.shift()?.trim() || "Candidate Name" : "Candidate Name";
    
    const currentLocale = resumeLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
    
    const sectionTitlesMap: Record<string, string> = {
        CONTACT_INFORMATION: getSectionTitle(t, 'sectionTitle_ContactInformation', currentLocale, currentLocale === 'es' ? 'DETALLES PERSONALES' : 'CONTACT INFORMATION'),
        PROFESSIONAL_PROFILE: getSectionTitle(t, 'sectionTitle_ProfessionalProfile', currentLocale, currentLocale === 'es' ? 'PERFIL PROFESIONAL' : 'PROFESSIONAL PROFILE'),
        WORK_EXPERIENCE: getSectionTitle(t, 'sectionTitle_WorkExperience', currentLocale, currentLocale === 'es' ? 'EXPERIENCIA LABORAL' : 'WORK EXPERIENCE'),
        EDUCATION: getSectionTitle(t, 'sectionTitle_Education', currentLocale, currentLocale === 'es' ? 'FORMACIÓN' : 'EDUCATION'),
        SKILLS: getSectionTitle(t, 'sectionTitle_Skills', currentLocale, currentLocale === 'es' ? 'HABILIDADES' : 'SKILLS'),
        LANGUAGES: getSectionTitle(t, 'sectionTitle_Languages', currentLocale, currentLocale === 'es' ? 'IDIOMAS' : 'LANGUAGES'),
        INTERESTS: getSectionTitle(t, 'sectionTitle_Interests', currentLocale, currentLocale === 'es' ? 'INTERESES' : 'INTERESTS'),
    };

    const sectionContent: Record<string, string[]> = {};
    let currentSectionKey: string | null = null;

    for (const line of resumeLines) {
        const trimmedLineUpper = line.trim().toUpperCase();
        let isTitle = false;
        for (const key in sectionTitlesMap) {
            if (trimmedLineUpper.startsWith(sectionTitlesMap[key].toUpperCase()) && 
                trimmedLineUpper.substring(sectionTitlesMap[key].length).trim().startsWith(':')) {
                currentSectionKey = key;
                sectionContent[currentSectionKey] = [];
                const contentAfterTitle = line.substring(sectionTitlesMap[key].length).replace(/^:\s*/, '').trim();
                if (contentAfterTitle) {
                    sectionContent[currentSectionKey].push(contentAfterTitle);
                }
                isTitle = true;
                break;
            }
        }
        if (!isTitle && currentSectionKey) {
            sectionContent[currentSectionKey].push(line.trim());
        }
    }
    
    yLeft = addPageIfNeeded(yLeft, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(nameColor[0], nameColor[1], nameColor[2]);
    const nameLines = doc.splitTextToSize(candidateFullName.toUpperCase(), leftColContentWidth - 5); 
    nameLines.forEach((nameLine: string) => {
        yLeft = addPageIfNeeded(yLeft, 8);
        doc.text(nameLine, margin / 2 + 2, yLeft);
        yLeft += 7;
    });
    yLeft += 3; 
    
    if (profilePhotoDataUri) {
        yLeft = addPageIfNeeded(yLeft, 40);
        const photoSize = 35;
        const photoX = (leftColWidth - photoSize) / 2; 
        try {
            const parts = profilePhotoDataUri.split(',');
            if (parts.length === 2) {
                const mimeTypePart = parts[0].match(/:(.*?);/);
                if (mimeTypePart && mimeTypePart[1]) {
                    const imageType = mimeTypePart[1].split('/')[1]?.toUpperCase();
                    if (imageType && (imageType === 'PNG' || imageType === 'JPEG' || imageType === 'JPG')) {
                        doc.addImage(profilePhotoDataUri, imageType, photoX, yLeft, photoSize, photoSize);
                        yLeft += photoSize + 7;
                    } else {
                         console.warn("Unsupported image type for profile photo:", imageType);
                    }
                }
            }
        } catch (e) {
            console.error("Error adding profile photo to PDF:", e);
        }
    }
    
    const contactInfoContent = sectionContent['CONTACT_INFORMATION'] || [];
    if (contactInfoContent.length > 0) {
        yLeft = addPageIfNeeded(yLeft, 8);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(sectionTitleTextLeftCol[0], sectionTitleTextLeftCol[1], sectionTitleTextLeftCol[2]);
        doc.text(sectionTitlesMap['CONTACT_INFORMATION'].toUpperCase(), margin/2, yLeft);
        yLeft += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(bodyTextLeftCol[0], bodyTextLeftCol[1], bodyTextLeftCol[2]);
        contactInfoContent.forEach(line => {
            let label = "";
            let value = line;
            const lcLine = line.toLowerCase();

            if (lcLine.includes('@') || lcLine.match(/(e-?mail)/i)) label = "Email: ";
            else if (lcLine.match(/\b\d{3}[\s-]?\d{3}[\s-]?\d{3,4}\b/) || lcLine.match(/(tel(é|e)fono|phone|móvil|mobile)/i)) label = "Tel: ";
            else if (lcLine.includes('linkedin.com/') || lcLine.includes('github.com/')) label = "Web: ";
            else if (lcLine.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) || lcLine.match(/(fecha de nacimiento|date of birth|nacimiento)/i)) label = "Nacimiento: ";
            else if (lcLine.match(/(calle|street|address|direcci(ó|o)n|ciudad|city|país|country)/i)) label = "Dir: ";
            
            if (label) {
                 const prefixesToRemove = ["email:", "e-mail:", "teléfono:", "telefono:", "phone:", "móvil:", "mobile:", "web:", "dirección:", "direccion:", "address:", "fecha de nacimiento:", "date of birth:", "nacimiento:","dir:"];
                 prefixesToRemove.forEach(prefix => {
                    if (value.toLowerCase().startsWith(prefix)) {
                        value = value.substring(prefix.length).trim();
                    }
                });
            }
            
            const contactLines = doc.splitTextToSize((label ? label : "") + value, leftColContentWidth);
            contactLines.forEach((l:string) => {
                 yLeft = addPageIfNeeded(yLeft, 4);
                 doc.text(l, margin/2, yLeft);
                 yLeft += 3.5; 
            });
        });
        yLeft += 5;
    }

    const drawLeftSection = (key: string, titleSize = 11, bodySize = 8.5, bodyLineHeight = 3.5) => {
        const content = sectionContent[key] || [];
        const title = sectionTitlesMap[key];
        if (content.length > 0 || (key === 'PROFESSIONAL_PROFILE' && content.length === 0 && tailoredResume.toUpperCase().includes(title.toUpperCase()))) {
            yLeft = addPageIfNeeded(yLeft, 8);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(titleSize);
            doc.setTextColor(sectionTitleTextLeftCol[0], sectionTitleTextLeftCol[1], sectionTitleTextLeftCol[2]);
            doc.text(title.toUpperCase(), margin/2, yLeft);
            yLeft += 5;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(bodySize);
            doc.setTextColor(bodyTextLeftCol[0], bodyTextLeftCol[1], bodyTextLeftCol[2]);
            content.forEach(line => {
                const textLines = doc.splitTextToSize(line, leftColContentWidth);
                textLines.forEach((l:string) => {
                    yLeft = addPageIfNeeded(yLeft, bodyLineHeight + 0.5);
                    doc.text(l, margin/2, yLeft);
                    yLeft += bodyLineHeight;
                });
                 if (key === 'LANGUAGES' && line.includes(':')) yLeft += 1; 
            });
            yLeft += 5;
        }
    };

    drawLeftSection('PROFESSIONAL_PROFILE');
    drawLeftSection('LANGUAGES');
    drawLeftSection('INTERESTS');

    const drawRightSection = (key: string) => {
        const content = sectionContent[key] || [];
        const title = sectionTitlesMap[key];
        const allSectionTitlesForParsing = Object.values(sectionTitlesMap);

        if (content.length > 0 || 
            (key === 'WORK_EXPERIENCE' && tailoredResume.toUpperCase().includes(title.toUpperCase())) ||
            (key === 'EDUCATION' && tailoredResume.toUpperCase().includes(title.toUpperCase())) ||
            (key === 'SKILLS' && tailoredResume.toUpperCase().includes(title.toUpperCase()))) {
            
            yRight = addPageIfNeeded(yRight, 10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(sectionTitleRightCol[0], sectionTitleRightCol[1], sectionTitleRightCol[2]);
            doc.text(title.toUpperCase(), rightColX, yRight);
            yRight += 1; 
            
            doc.setDrawColor(189, 195, 199); 
            doc.setLineWidth(0.3);
            doc.line(rightColX, yRight, rightColX + rightColWidth, yRight); 
            yRight += 6;

            let isFirstInSubSection = true; 

            for (let i = 0; i < content.length; i++) {
                let line = content[i];
                
                const itemFontSize = 10;
                const itemLineHeight = 4.5;
                const dateFontSize = 9;
                const descriptionFontSize = 9.5;
                const defaultStyle = 'normal';

                doc.setTextColor(bodyTextRightCol[0], bodyTextRightCol[1], bodyTextRightCol[2]);
                doc.setFontSize(itemFontSize);
                doc.setFont('Helvetica', defaultStyle);

                const isLikelyActualTitle = isFirstInSubSection || 
                                         (i > 0 && (content[i-1].match(/\d{4}\s*(-|–|to|a)\s*(\d{4}|Present|Actual|Hoy|Actualidad)/i) || content[i-1].trim() === "" || allSectionTitlesForParsing.some(st => content[i-1]?.toUpperCase().includes(st.toUpperCase()) ) ) );

                const isLikelyDateLine = line.match(/\d{4}\s*(-|–|to|a)\s*(\d{4}|Present|Actual|Hoy|Actualidad)/i) || 
                                       line.match(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Jul|Aug|Sept|Dec)\b\.?\s\d{4}/i);

                if (key === 'WORK_EXPERIENCE' && isLikelyActualTitle && !isLikelyDateLine) {
                    yRight = addPageIfNeeded(yRight, itemLineHeight + (i > 0 ? 2 : 0) ); 

                    let positionAndCompany = line;
                    let location = "";
                    const lastCommaIndex = line.lastIndexOf(',');

                    if (lastCommaIndex > 0 && line.substring(lastCommaIndex + 1).trim().length > 0) {
                        const textBeforeLastComma = line.substring(0, lastCommaIndex);
                        if (textBeforeLastComma.includes(',') || line.split(',').length >= 2) { 
                             positionAndCompany = textBeforeLastComma.trim();
                             location = line.substring(lastCommaIndex).trim(); 
                        } else { 
                             positionAndCompany = textBeforeLastComma.trim();
                             location = line.substring(lastCommaIndex).trim();
                        }
                    }

                    let currentX = rightColX;
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(itemFontSize + 0.5); 

                    const boldWrapped = doc.splitTextToSize(positionAndCompany, rightColWidth);
                    for (let idx = 0; idx < boldWrapped.length; idx++) {
                        if (idx > 0) { 
                            yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                            currentX = rightColX;
                        }
                        doc.text(boldWrapped[idx], currentX, yRight);
                        currentX += doc.getTextWidth(boldWrapped[idx]); 
                    }

                    if (location) {
                        doc.setFont('Helvetica', 'normal');
                        doc.setFontSize(itemFontSize); 
                        const spaceForLocation = rightColWidth - (currentX - rightColX);

                        if (currentX === rightColX || spaceForLocation < doc.getTextWidth(" ") + 5 ) { 
                            yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                            currentX = rightColX;
                        }
                        
                        const locationTextToPrint = location.startsWith(',') ? location : `, ${location}`;
                        const locationWrapped = doc.splitTextToSize(locationTextToPrint, rightColWidth - (currentX - rightColX));
                        for (let idx = 0; idx < locationWrapped.length; idx++) {
                            if (idx > 0) { 
                                 yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                                 currentX = rightColX;
                            }
                             doc.text(locationWrapped[idx], currentX, yRight);
                             currentX += doc.getTextWidth(locationWrapped[idx]);
                        }
                    }
                    yRight += itemLineHeight;
                    isFirstInSubSection = false;

                } else if (key === 'EDUCATION' && isLikelyActualTitle && !isLikelyDateLine) {
                    yRight = addPageIfNeeded(yRight, itemLineHeight + (i > 0 ? 2 : 0) );
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(itemFontSize + 0.5);
                    const textLines = doc.splitTextToSize(line, rightColWidth);
                    textLines.forEach((l: string) => {
                        doc.text(l, rightColX, yRight);
                        yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                    });
                    if (textLines.length > 0) yRight -= itemLineHeight;
                    yRight += itemLineHeight;
                    isFirstInSubSection = false;

                } else if (isLikelyDateLine) {
                    yRight = addPageIfNeeded(yRight, itemLineHeight);
                    doc.setFont('Helvetica', 'italic');
                    doc.setFontSize(dateFontSize);
                    doc.setTextColor(128, 128, 128); 
                    const textLines = doc.splitTextToSize(line, rightColWidth);
                    textLines.forEach((l:string) => {
                        doc.text(l, rightColX, yRight);
                        yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                    });
                    if (textLines.length > 0) yRight -= itemLineHeight; 
                    yRight += itemLineHeight;
                    doc.setTextColor(bodyTextRightCol[0], bodyTextRightCol[1], bodyTextRightCol[2]); 
                    isFirstInSubSection = false; 
                
                } else if (key === 'SKILLS' && (line.toLowerCase().startsWith('técnicas:') || line.toLowerCase().startsWith('technical:') || line.toLowerCase().startsWith('habilidades técnicas:'))) {
                    yRight = addPageIfNeeded(yRight + 2, itemLineHeight);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(itemFontSize);
                    doc.text(line, rightColX, yRight);
                    yRight += itemLineHeight;
                    isFirstInSubSection = false;
                } else if (key === 'SKILLS' && (line.toLowerCase().startsWith('blandas:') || line.toLowerCase().startsWith('soft:') || line.toLowerCase().startsWith('habilidades blandas:'))) {
                    yRight = addPageIfNeeded(yRight + 2, itemLineHeight);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(itemFontSize);
                    doc.text(line, rightColX, yRight);
                    yRight += itemLineHeight;
                    isFirstInSubSection = false;
                }
                else { 
                    yRight = addPageIfNeeded(yRight, itemLineHeight);
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(descriptionFontSize);
                    const textLines = doc.splitTextToSize(line, rightColWidth);
                    textLines.forEach((l:string) => {
                        doc.text(l, rightColX, yRight);
                        yRight = addPageIfNeeded(yRight + itemLineHeight, itemLineHeight);
                    });
                     if (textLines.length > 0) yRight -= itemLineHeight; 
                     yRight += itemLineHeight;
                    if (line.trim() !== "") isFirstInSubSection = true; 
                }
            }
            yRight += 5; 
        }
    };
    
    drawRightSection('WORK_EXPERIENCE');
    drawRightSection('EDUCATION');
    drawRightSection('SKILLS');
    
    doc.save('NailedJob_Resume.pdf');
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" />{t('aiCraftedResumeTitle')}</CardTitle>
        <CardDescription>{t('aiCraftedResumeDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {initialCompatibilityResult && (
          <Card className="mb-6 bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                {t('compatibilityImprovementTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('initialCompatibilityLabel')}</span>
                <div className="flex items-center">
                  <span className={`font-semibold text-lg mr-2 ${initialScore != null && initialScore < 60 ? 'text-red-500' : initialScore != null && initialScore < 70 ? 'text-yellow-500' : 'text-foreground'}`}>
                    {initialScore != null ? `${initialScore}%` : t('na')}
                  </span>
                  {initialScore != null && <Progress value={initialScore} className="w-24 h-2.5" indicatorClassName={getProgressColor(initialScore)} />}
                </div>
              </div>
              
              {newCompatibilityAnalysisResult ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('newCompatibilityLabel')}</span>
                    <div className="flex items-center">
                       <span className={`font-semibold text-lg mr-2 ${newScore != null && newScore < 60 ? 'text-red-500' : newScore != null && newScore < 70 ? 'text-yellow-500' : newScore != null && newScore >= 80 ? 'text-green-500' : 'text-foreground'}`}>
                        {newScore != null ? `${newScore}%` : t('na')}
                      </span>
                      {newScore != null && <Progress value={newScore} className="w-24 h-2.5" indicatorClassName={getProgressColor(newScore)} />}
                    </div>
                  </div>
                  {improvement != null && (
                    <div className="flex items-center justify-between pt-2 border-t border-dashed">
                      <span className="font-medium">{t('improvementLabel')}</span>
                      <span className={`font-bold text-xl ${improvement > 0 ? 'text-green-500' : improvement < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {improvement > 0 ? `+${improvement}%` : `${improvement}%`}
                        {improvement > 0 && <CheckCircle className="inline ml-1 h-5 w-5" />}
                        {improvement < 0 && <AlertTriangle className="inline ml-1 h-5 w-5" />}
                        {improvement === 0 && <Info className="inline ml-1 h-5 w-5" />}
                      </span>
                    </div>
                  )}
                  {newCompatibilityAnalysisResult.explanation && (
                     <p className="text-xs text-muted-foreground pt-1">
                        <span className="font-semibold">{t('aiExplanationLabel')}: </span>{newCompatibilityAnalysisResult.explanation.substring(0,150)}...
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground py-2">{t('improvementDataUnavailable')}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('tailoredResumeContentTitle')}</h3>
          <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/50">
            <pre className="text-sm whitespace-pre-wrap break-words font-sans">{tailoredResume}</pre>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleDownloadText}>
              <Download className="mr-2 h-4 w-4" /> {t('downloadAsTextButton')}
            </Button>
            <Button onClick={handleDownloadPdf} variant="outline">
              <FileType className="mr-2 h-4 w-4" /> {t('downloadAsPdfButton')}
            </Button>
          </div>
           <p className="text-xs text-muted-foreground mt-2">{t('pdfDownloadNote')}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('explanationOfModificationsTitle')}</h3>
          <ScrollArea className="h-48 w-full rounded-md border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{explanation}</p>
          </ScrollArea>
        </div>
         <p className="text-sm text-center text-muted-foreground">
          {t('happyWithResumePrompt')}
        </p>
      </CardContent>
    </Card>
  );
}
