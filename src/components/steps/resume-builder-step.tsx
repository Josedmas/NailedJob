
"use client";

import type { AIResumeBuilderOutput } from '@/ai/flows/ai-resume-builder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Wand2, FileType } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/contexts/language-context';
import type { Locale } from '@/lib/translations';

interface ResumeBuilderStepProps {
  result: AIResumeBuilderOutput | null;
  loading: boolean;
  profilePhotoDataUri?: string;
  resumeLanguage: string; 
}

// Helper to safely get translated section title or use a default
const getSectionTitle = (t: Function, key: string, lang: Locale, fallback: string): string => {
  const title = t(key, undefined, {lng: lang}); // Use correct i18next options
  return title === key ? fallback : title; 
};

export function ResumeBuilderStep({ result, loading, profilePhotoDataUri, resumeLanguage }: ResumeBuilderStepProps) {
  const { t } = useLanguage();

  if (loading) {
    return <LoadingIndicator message={t('buildingResumeMessage') || "Building your tailored resume..."} />;
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
    const leftColWidthRatio = 0.35; // Percentage of page width for left column
    const leftColWidth = pageWidth * leftColWidthRatio;
    const rightColX = leftColWidth + 5; 
    const rightColWidth = pageWidth - rightColX - margin;

    const leftColContentWidth = leftColWidth - margin - margin/2; // Content width for left column

    const lightGrayColor = [240, 240, 240]; 
    const darkGrayText = [80, 80, 80];
    const blackText = [0,0,0];
    const nameColor = blackText;
    const sectionTitleBG = [220, 220, 220]; // Lighter gray for section titles
    const sectionTitleText = blackText;


    let yLeft = margin;
    let yRight = margin;
    let currentPage = 1;

    const addPageIfNeeded = (currentY: number, neededHeight: number = 10, currentColumn: 'left' | 'right') => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        currentPage++;
        yLeft = margin;
        yRight = margin;
        // Redraw left column background on new page
        doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        doc.rect(0, 0, leftColWidth, pageHeight, 'F');
        return margin; // Reset Y for the current column
      }
      return currentY;
    };
    
    const drawLeftColumnBackground = () => {
      doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
      doc.rect(0, 0, leftColWidth, pageHeight, 'F');
    };
    
    drawLeftColumnBackground();

    // --- Parsing Logic ---
    const resumeLines = tailoredResume.split('\n').map(line => line.trim()).filter(line => line);
    const candidateFullName = resumeLines.length > 0 ? resumeLines.shift()?.trim() || "Candidate Name" : "Candidate Name";
    
    const currentLocale = resumeLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
    
    // Define section titles based on currentLocale for parsing
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
    const allSectionTitles = Object.values(sectionTitlesMap);

    for (const line of resumeLines) {
        const trimmedLineUpper = line.trim().toUpperCase();
        let isTitle = false;
        for (const key in sectionTitlesMap) {
            if (trimmedLineUpper.startsWith(sectionTitlesMap[key].toUpperCase())) {
                currentSectionKey = key;
                sectionContent[currentSectionKey] = [];
                isTitle = true;
                break;
            }
        }
        if (!isTitle && currentSectionKey) {
            sectionContent[currentSectionKey].push(line.trim());
        }
    }
    
    // --- LEFT COLUMN ---
    // Profile Photo
    if (profilePhotoDataUri) {
        yLeft = addPageIfNeeded(yLeft, 40, 'left');
        const photoSize = 35;
        const photoX = (leftColWidth - photoSize) / 2; // Centered in left column
        try {
            const parts = profilePhotoDataUri.split(',');
            if (parts.length === 2) {
                const mimeTypePart = parts[0].match(/:(.*?);/);
                if (mimeTypePart && mimeTypePart[1]) {
                    const imageType = mimeTypePart[1].split('/')[1]?.toUpperCase();
                    if (imageType && (imageType === 'PNG' || imageType === 'JPEG' || imageType === 'JPG')) {
                        doc.addImage(profilePhotoDataUri, imageType, photoX, yLeft, photoSize, photoSize);
                        yLeft += photoSize + 5;
                    } else {
                         console.warn("Unsupported image type for profile photo:", imageType);
                    }
                }
            }
        } catch (e) {
            console.error("Error adding profile photo to PDF:", e);
        }
    }
    
    // Candidate Name - Now in the right column header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(nameColor[0], nameColor[1], nameColor[2]);
    const nameLines = doc.splitTextToSize(candidateFullName.toUpperCase(), rightColWidth - margin);
    nameLines.forEach((line: string) => {
        yRight = addPageIfNeeded(yRight, 10, 'right');
        doc.text(line, rightColX, yRight);
        yRight += 9;
    });
    yRight += 3; // Space after name

    // Contact Information (Left Column)
    const contactInfoContent = sectionContent['CONTACT_INFORMATION'] || [];
    if (contactInfoContent.length > 0) {
        yLeft = addPageIfNeeded(yLeft, 10, 'left');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(sectionTitleText[0], sectionTitleText[1], sectionTitleText[2]);
        doc.setFillColor(sectionTitleBG[0], sectionTitleBG[1], sectionTitleBG[2]);
        doc.rect(margin / 2, yLeft - 4, leftColContentWidth + margin/2 , 6, 'F'); // Background for title
        doc.text(sectionTitlesMap['CONTACT_INFORMATION'].toUpperCase(), margin, yLeft);
        yLeft += 7;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(darkGrayText[0], darkGrayText[1], darkGrayText[2]);
        contactInfoContent.forEach(line => {
            let label = "";
            let value = line;

            if (line.toLowerCase().includes('@') || line.toLowerCase().match(/(e-?mail)/i)) label = "Email: ";
            else if (line.match(/\b\d{3}[\s-]?\d{3}[\s-]?\d{3,4}\b/) || line.toLowerCase().match(/(tel(é|e)fono|phone)/i)) label = "Teléfono: ";
            else if (line.toLowerCase().includes('github') || line.toLowerCase().includes('linkedin')) label = "Web: ";
            else if (line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) || line.toLowerCase().match(/(fecha de nacimiento|date of birth)/i)) label = "Nacimiento: ";
            else if (line.toLowerCase().match(/(calle|street|address|direcci(ó|o)n)/i)) label = "Dirección: ";
            
            // Remove common prefixes if label is set, to avoid duplication like "Email: Email: example@..."
            if (label) {
                const prefixesToRemove = ["email:", "e-mail:", "teléfono:", "telefono:", "phone:", "web:", "dirección:", "direccion:", "address:", "fecha de nacimiento:", "date of birth:"];
                prefixesToRemove.forEach(prefix => {
                    if (value.toLowerCase().startsWith(prefix)) {
                        value = value.substring(prefix.length).trim();
                    }
                });
            }
            
            const contactLines = doc.splitTextToSize(label + value, leftColContentWidth);
            contactLines.forEach((l:string) => {
                 yLeft = addPageIfNeeded(yLeft, 5, 'left');
                 doc.text(l, margin, yLeft);
                 yLeft += 4; 
            });
        });
        yLeft += 5;
    }

    // Function to draw left column sections
    const drawLeftSection = (key: string) => {
        const content = sectionContent[key] || [];
        const title = sectionTitlesMap[key];
        if (content.length > 0 || key === 'PROFESSIONAL_PROFILE') { // Always draw profile title
            yLeft = addPageIfNeeded(yLeft, 10, 'left');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(sectionTitleText[0], sectionTitleText[1], sectionTitleText[2]);
            doc.setFillColor(sectionTitleBG[0], sectionTitleBG[1], sectionTitleBG[2]);
            doc.rect(margin / 2, yLeft - 4, leftColContentWidth + margin/2 , 6, 'F');
            doc.text(title.toUpperCase(), margin, yLeft);
            yLeft += 7;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(darkGrayText[0], darkGrayText[1], darkGrayText[2]);
            content.forEach(line => {
                const textLines = doc.splitTextToSize(line, leftColContentWidth);
                textLines.forEach((l:string) => {
                    yLeft = addPageIfNeeded(yLeft, 5, 'left');
                    doc.text(l, margin, yLeft);
                    yLeft += 4;
                });
                 if (key === 'LANGUAGES' && line.includes(':')) yLeft += 1; // Extra space for language items
            });
            yLeft += 5;
        }
    };

    drawLeftSection('PROFESSIONAL_PROFILE');
    drawLeftSection('LANGUAGES');
    drawLeftSection('INTERESTS');


    // --- RIGHT COLUMN ---
    const drawRightSection = (key: string) => {
        const content = sectionContent[key] || [];
        const title = sectionTitlesMap[key];

        if (content.length > 0 || (key === 'WORK_EXPERIENCE' && sectionContent['WORK_EXPERIENCE']) || (key === 'EDUCATION' && sectionContent['EDUCATION']) || (key === 'SKILLS' && sectionContent['SKILLS'])) {
            yRight = addPageIfNeeded(yRight, 10, 'right');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(blackText[0], blackText[1], blackText[2]);
            doc.text(title.toUpperCase(), rightColX, yRight);
            yRight += 1; // Space for line
            
            doc.setDrawColor(darkGrayText[0], darkGrayText[1], darkGrayText[2]); 
            doc.setLineWidth(0.3);
            doc.line(rightColX, yRight, rightColX + rightColWidth - margin, yRight); // Use full available width for line
            yRight += 5;


            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(darkGrayText[0], darkGrayText[1], darkGrayText[2]);
            let isFirstInSubSection = true; 

            for (let i = 0; i < content.length; i++) {
                let line = content[i];
                
                // Heuristic for experience/education item titles
                const isLikelyTitle = (key === 'WORK_EXPERIENCE' || key === 'EDUCATION') && 
                                     (line.split(',').length >= 2 || line.split(/ en | at /i).length >=2 || i === 0 || allSectionTitles.some(st => content[i-1]?.toUpperCase().includes(st.toUpperCase())));
                const isLikelyDateLine = (key === 'WORK_EXPERIENCE' || key === 'EDUCATION') && 
                                       (line.match(/\d{4}\s*(-|–|to|a)\s*(\d{4}|Present|Actual|Hoy|Actualidad)/i) || line.match(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Jul|Aug|Sept|Dec)\b\.?\s\d{4}/i));

                let lineStyle = 'normal';
                let fontSize = 10;
                let lineSpacing = 4.5;

                if (isLikelyTitle && isFirstInSubSection) {
                    if (i > 0) yRight = addPageIfNeeded(yRight + 2, 5, 'right'); // Add space before new item title
                    lineStyle = 'bold';
                    fontSize = 11;
                    isFirstInSubSection = false;
                } else if (isLikelyDateLine) {
                    lineStyle = 'italic';
                    fontSize = 9;
                    doc.setTextColor(120,120,120); 
                } else {
                     // This means it's a description line or the start of a new item if previous was date
                     if(key === 'WORK_EXPERIENCE' || key === 'EDUCATION'){
                        const prevLineWasDate = i > 0 && (content[i-1].match(/\d{4}\s*(-|–|to|a)\s*(\d{4}|Present|Actual|Hoy|Actualidad)/i) || content[i-1].match(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Jul|Aug|Sept|Dec)\b\.?\s\d{4}/i));
                        if(prevLineWasDate) isFirstInSubSection = true; // Reset for next potential title
                     }
                }
                if (key === 'SKILLS' && (line.toLowerCase().startsWith('técnicas:') || line.toLowerCase().startsWith('technical:') || line.toLowerCase().startsWith('habilidades técnicas:'))) {
                     lineStyle = 'bold';
                     fontSize = 10.5;
                     yRight = addPageIfNeeded(yRight + 2, 5, 'right');
                } else if (key === 'SKILLS' && (line.toLowerCase().startsWith('blandas:') || line.toLowerCase().startsWith('soft:') || line.toLowerCase().startsWith('habilidades blandas:'))) {
                     lineStyle = 'bold';
                     fontSize = 10.5;
                     yRight = addPageIfNeeded(yRight + 2, 5, 'right');
                }

                doc.setFont('Helvetica', lineStyle);
                doc.setFontSize(fontSize);
                const textLines = doc.splitTextToSize(line, rightColWidth - margin);
                textLines.forEach((l:string) => {
                    yRight = addPageIfNeeded(yRight, 5, 'right');
                    doc.text(l, rightColX, yRight);
                    yRight += lineSpacing;
                });
                 doc.setFont('Helvetica', 'normal'); 
                 doc.setFontSize(10);
                 doc.setTextColor(darkGrayText[0], darkGrayText[1], darkGrayText[2]); 
            }
            yRight += 5;
        }
    };
    
    drawRightSection('WORK_EXPERIENCE');
    drawRightSection('EDUCATION');
    drawRightSection('SKILLS');
    
    doc.save('tailored_resume.pdf');
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" />{t('aiCraftedResumeTitle')}</CardTitle>
        <CardDescription>{t('aiCraftedResumeDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

