
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
  resumeLanguage: string; // Expect 'English', 'Spanish', etc.
}

// Helper to safely get translated section title or use a default
const getSectionTitle = (t: Function, key: string, lang: Locale, fallback: string): string => {
  const title = t(key, undefined, lang);
  return title === key ? fallback : title; // If key is returned, translation is missing for that lang
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
    
    const margin = 10;
    const leftColWidth = 65; // Width for the gray left column
    const rightColX = margin + leftColWidth + 5; // Start X for the right column content
    const rightColWidth = pageWidth - rightColX - margin;

    const lightGrayColor = [240, 240, 240]; // RGB for light gray
    const textColor = [50, 50, 50]; // Dark gray for text
    const nameColor = [0,0,0]; // Black for name

    let yLeft = margin;
    let yRight = margin;

    const lineHeight = 5;
    const sectionTitleSpacing = 4;
    const paragraphSpacing = 3;
    const itemSpacing = 2;

    const addPageIfNeeded = (currentY: number, col: 'left' | 'right', neededHeight: number = lineHeight * 3) => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        yLeft = margin;
        yRight = margin;
        // Redraw left column background on new page
        doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
        doc.rect(0, 0, leftColWidth + margin / 2, pageHeight, 'F'); // Extend slightly for better edge
        return col === 'left' ? yLeft : yRight;
      }
      return currentY;
    };
    
    // --- Initial Page Setup ---
    doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
    doc.rect(0, 0, leftColWidth + margin / 2, pageHeight, 'F');


    // --- Parsing Logic ---
    const resumeLines = tailoredResume.split('\n');
    const candidateFullName = resumeLines.length > 0 ? resumeLines.shift()?.trim() || "Candidate Name" : "Candidate Name";

    const currentLocale = resumeLanguage.toLowerCase() as Locale;
    
    const sectionTitlesMap: Record<string, string> = {
        CONTACT_INFORMATION: getSectionTitle(t, 'sectionTitle_ContactInformation', currentLocale, 'CONTACT INFORMATION'),
        PROFESSIONAL_PROFILE: getSectionTitle(t, 'sectionTitle_ProfessionalProfile', currentLocale, 'PROFESSIONAL PROFILE'),
        WORK_EXPERIENCE: getSectionTitle(t, 'sectionTitle_WorkExperience', currentLocale, 'WORK EXPERIENCE'),
        EDUCATION: getSectionTitle(t, 'sectionTitle_Education', currentLocale, 'EDUCATION'),
        SKILLS: getSectionTitle(t, 'sectionTitle_Skills', currentLocale, 'SKILLS'),
        LANGUAGES: getSectionTitle(t, 'sectionTitle_Languages', currentLocale, 'LANGUAGES'),
        INTERESTS: getSectionTitle(t, 'sectionTitle_Interests', currentLocale, 'INTERESTS'),
    };
    
    const sectionContent: Record<string, string[]> = {};
    let currentSectionKey: string | null = null;

    for (const line of resumeLines) {
        const trimmedLine = line.trim();
        let isTitle = false;
        for (const key in sectionTitlesMap) {
            if (trimmedLine.toUpperCase().startsWith(sectionTitlesMap[key])) {
                currentSectionKey = key;
                sectionContent[currentSectionKey] = [];
                // Optional: if title also contains content on the same line, extract it
                // const contentAfterTitle = trimmedLine.substring(sectionTitlesMap[key].length).trim();
                // if (contentAfterTitle.length > 1) sectionContent[currentSectionKey].push(contentAfterTitle.substring(1).trim());
                isTitle = true;
                break;
            }
        }
        if (!isTitle && currentSectionKey && trimmedLine) {
            sectionContent[currentSectionKey].push(trimmedLine);
        }
    }
    
    // --- LEFT COLUMN ---
    // Candidate Name
    yLeft = addPageIfNeeded(yLeft, 'left', 20);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(nameColor[0], nameColor[1], nameColor[2]);
    const nameLines = doc.splitTextToSize(candidateFullName.toUpperCase(), leftColWidth - margin * 1.5);
    nameLines.forEach((line: string) => {
        doc.text(line, margin, yLeft);
        yLeft += 8;
    });
    yLeft += paragraphSpacing;

    // Profile Photo
    if (profilePhotoDataUri) {
        yLeft = addPageIfNeeded(yLeft, 'left', 40);
        const photoSize = 35;
        const photoX = margin + (leftColWidth - margin * 1.5 - photoSize) / 2; // Centered in available width
        try {
            const parts = profilePhotoDataUri.split(',');
            if (parts.length === 2) {
                const mimeTypePart = parts[0].match(/:(.*?);/);
                if (mimeTypePart && mimeTypePart[1]) {
                    const imageType = mimeTypePart[1].split('/')[1]?.toUpperCase();
                    if (imageType && (imageType === 'PNG' || imageType === 'JPEG' || imageType === 'JPG')) {
                        doc.addImage(profilePhotoDataUri, imageType, photoX, yLeft, photoSize, photoSize);
                        yLeft += photoSize + paragraphSpacing;
                    }
                }
            }
        } catch (e) {
            console.error("Error adding profile photo to PDF:", e);
        }
    }
    
    // Contact Information
    const contactInfoContent = sectionContent['CONTACT_INFORMATION'] || [];
    if (contactInfoContent.length > 0) {
        yLeft = addPageIfNeeded(yLeft, 'left', contactInfoContent.length * lineHeight + sectionTitleSpacing);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        contactInfoContent.forEach(line => {
            // Basic parsing for icons - can be improved
            let icon = "";
            if (line.toLowerCase().includes('@') || line.toLowerCase().includes('mail')) icon = "📧 ";
            else if (line.match(/\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/) || line.toLowerCase().includes('phone') || line.toLowerCase().includes('tel')) icon = "📞 ";
            else if (line.toLowerCase().includes('github')) icon = "🔗 ";
            else if (line.toLowerCase().includes('linkedin')) icon = "🔗 "; // Generic link for LinkedIn
            else if (line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) || line.toLowerCase().includes('birth')) icon = "🎂 "; // DOB
            else if (line.toLowerCase().includes('calle') || line.toLowerCase().includes('street') || line.toLowerCase().includes('address')) icon = "📍 ";

            const contactLines = doc.splitTextToSize(icon + line, leftColWidth - margin * 1.5);
            contactLines.forEach((l:string) => {
                 yLeft = addPageIfNeeded(yLeft, 'left');
                 doc.text(l, margin, yLeft);
                 yLeft += lineHeight * 0.9; // tighter spacing
            });
        });
        yLeft += paragraphSpacing;
    }

    // Function to draw left column sections
    const drawLeftSection = (key: string, title: string) => {
        const content = sectionContent[key] || [];
        if (content.length > 0) {
            yLeft = addPageIfNeeded(yLeft, 'left', sectionTitleSpacing + lineHeight);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(title.toUpperCase(), margin, yLeft);
            yLeft += sectionTitleSpacing;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            content.forEach(line => {
                const textLines = doc.splitTextToSize(line, leftColWidth - margin * 1.5);
                textLines.forEach((l:string) => {
                    yLeft = addPageIfNeeded(yLeft, 'left');
                    doc.text(l, margin, yLeft);
                    yLeft += lineHeight;
                });
            });
            yLeft += paragraphSpacing;
        }
    };

    drawLeftSection('PROFESSIONAL_PROFILE', sectionTitlesMap['PROFESSIONAL_PROFILE']);
    drawLeftSection('LANGUAGES', sectionTitlesMap['LANGUAGES']);
    drawLeftSection('INTERESTS', sectionTitlesMap['INTERESTS']);


    // --- RIGHT COLUMN ---
    const drawRightSection = (key: string, title: string) => {
        const content = sectionContent[key] || [];
        if (content.length > 0) {
            yRight = addPageIfNeeded(yRight, 'right', sectionTitleSpacing + lineHeight);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(title.toUpperCase(), rightColX, yRight);
            yRight += sectionTitleSpacing;
            
            // Horizontal line under title (subtle)
            doc.setDrawColor(200, 200, 200); // light gray line
            doc.setLineWidth(0.2);
            doc.line(rightColX, yRight - sectionTitleSpacing / 2 + 1, pageWidth - margin, yRight - sectionTitleSpacing / 2 + 1);
            yRight += itemSpacing;


            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            let isFirstInSubSection = true; // For bolding titles in experience/education

            for (let i = 0; i < content.length; i++) {
                let line = content[i];
                
                // Heuristic for experience/education item titles (Company, Position or Degree, Institution)
                // This assumes the AI formats them somewhat consistently.
                const isLikelyTitle = (key === 'WORK_EXPERIENCE' || key === 'EDUCATION') && 
                                     (line.split(',').length >= 2 || line.split(' en ').length >=2 || line.split(' at ').length >=2);
                const isLikelyDateLine = (key === 'WORK_EXPERIENCE' || key === 'EDUCATION') && 
                                       (line.match(/\d{4}\s*-\s*\d{4}/) || line.match(/\d{4}\s*-\s*(Present|Actual)/i) || line.match(/\d{2}\/\d{4}/));


                if (isLikelyTitle && isFirstInSubSection) {
                    if (i > 0) yRight += itemSpacing; // Add space before new item title
                    doc.setFont('Helvetica', 'bold');
                    isFirstInSubSection = false;
                } else if (isLikelyDateLine) {
                    doc.setFont('Helvetica', 'italic');
                    doc.setTextColor(100,100,100); // slightly lighter for dates
                } else {
                     doc.setFont('Helvetica', 'normal');
                     doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                     isFirstInSubSection = true; // Next line could be a new item title
                }
                if (key === 'SKILLS' && (line.toLowerCase().startsWith('técnicas:') || line.toLowerCase().startsWith('technical:'))) {
                     doc.setFont('Helvetica', 'bold');
                     yRight += itemSpacing;
                } else if (key === 'SKILLS' && (line.toLowerCase().startsWith('blandas:') || line.toLowerCase().startsWith('soft:'))) {
                     doc.setFont('Helvetica', 'bold');
                     yRight += itemSpacing;
                }


                const textLines = doc.splitTextToSize(line, rightColWidth);
                textLines.forEach((l:string) => {
                    yRight = addPageIfNeeded(yRight, 'right');
                    doc.text(l, rightColX, yRight);
                    yRight += lineHeight;
                });
                 doc.setFont('Helvetica', 'normal'); // reset font style
                 doc.setTextColor(textColor[0], textColor[1], textColor[2]); // reset color
            }
            yRight += paragraphSpacing;
        }
    };
    
    drawRightSection('WORK_EXPERIENCE', sectionTitlesMap['WORK_EXPERIENCE']);
    drawRightSection('EDUCATION', sectionTitlesMap['EDUCATION']);
    drawRightSection('SKILLS', sectionTitlesMap['SKILLS']);
    
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
