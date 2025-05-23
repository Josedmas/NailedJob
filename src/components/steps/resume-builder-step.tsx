
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

export function ResumeBuilderStep({ result, loading, profilePhotoDataUri, resumeLanguage }: ResumeBuilderStepProps) {
  const { t, language: uiLanguage } = useLanguage();

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
    const leftColumnWidth = 50;
    const rightColumnX = margin + leftColumnWidth + 5;
    const contentWidth = pageWidth - rightColumnX - margin;
    let yPosition = margin;
    const lineHeight = 6;
    const sectionSpacing = 8;
    const itemSpacing = 3; // Spacing between items in a list (e.g. experience details)

    // --- Default Font ---
    doc.setFont('Helvetica', 'normal');

    // --- Resume Header (Photo and Name) ---
    const photoSize = 30; // mm
    if (profilePhotoDataUri) {
      try {
        const parts = profilePhotoDataUri.split(',');
        if (parts.length === 2) {
          const mimeTypePart = parts[0].match(/:(.*?);/);
          if (mimeTypePart && mimeTypePart[1]) {
            const imageType = mimeTypePart[1].split('/')[1]?.toUpperCase();
            if (imageType && (imageType === 'PNG' || imageType === 'JPEG' || imageType === 'JPG')) {
              doc.addImage(profilePhotoDataUri, imageType, margin, yPosition, photoSize, photoSize);
            }
          }
        }
      } catch (e) {
        console.error("Error adding profile photo to PDF:", e);
      }
    }

    // Extract name (assuming it's the first line of tailoredResume)
    const resumeLines = tailoredResume.split('\n');
    const candidateName = resumeLines.length > 0 ? resumeLines[0].trim() : "Candidate Name";
    
    doc.setFontSize(22);
    doc.setFont('Helvetica', 'bold');
    const nameX = profilePhotoDataUri ? margin + photoSize + 5 : margin;
    doc.text(candidateName, nameX, yPosition + (photoSize / 2) + 3); // Vertically centerish name with photo
    yPosition += photoSize + sectionSpacing;


    // --- Helper Function to Draw Sections ---
    const drawSection = (titleKey: string, content: string, iconUnicode: string) => {
      if (yPosition + lineHeight * 3 > pageHeight - margin) { // Check if enough space for title + a bit of content
        doc.addPage();
        yPosition = margin;
      }

      // Section Title (Left Column)
      doc.setFillColor(230, 230, 230); // Light gray background
      doc.rect(margin, yPosition - lineHeight / 1.5, leftColumnWidth, lineHeight * 1.5, 'F');
      
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(50, 50, 50); // Dark gray text
      const sectionTitleText = `${iconUnicode} ${t(titleKey, undefined, resumeLanguage.toLowerCase() as Locale)}`;
      doc.text(sectionTitleText, margin + 3, yPosition + 2);
      
      // Section Content (Right Column)
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text
      
      const splitContent = doc.splitTextToSize(content, contentWidth);
      let currentYForContent = yPosition;

      splitContent.forEach((line: string) => {
        if (currentYForContent + lineHeight > pageHeight - margin) {
          doc.addPage();
          currentYForContent = margin;
           // Redraw title on new page if content spans multiple pages (optional, can be complex)
        }
        // Handle bullet points (simple check for now)
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
            doc.text("•", rightColumnX, currentYForContent);
            doc.text(line.trim().substring(1).trim(), rightColumnX + 3, currentYForContent);
        } else {
            doc.text(line, rightColumnX, currentYForContent);
        }
        currentYForContent += lineHeight;
      });
      yPosition = Math.max(yPosition + lineHeight * 1.5 + itemSpacing, currentYForContent + itemSpacing); // Ensure yPosition moves past title or content
      yPosition += sectionSpacing / 2; // Reduced spacing after content before next section
    };

    // --- Parsing and Drawing Sections ---
    // Define section titles based on the resume's language for parsing
    const currentLocale = resumeLanguage.toLowerCase() as Locale;
    const sectionHeaders = {
      personalDetails: t('sectionTitle_ContactInformation', undefined, currentLocale),
      profile: t('sectionTitle_Profile', undefined, currentLocale),
      workExperience: t('sectionTitle_WorkExperience', undefined, currentLocale),
      academicTraining: t('sectionTitle_AcademicTraining', undefined, currentLocale),
      skills: t('sectionTitle_Skills', undefined, currentLocale),
      languages: t('sectionTitle_Languages', undefined, currentLocale),
      projects: t('sectionTitle_Projects', undefined, currentLocale),
    };
    
    // The AI output might start with the name, then section titles.
    // We need to skip the name part for section parsing if it was already handled.
    const resumeContentForParsing = resumeLines.slice(1).join('\n');

    const extractContent = (text: string, startMarker: string, allMarkers: string[]): string => {
        const startIndex = text.toLowerCase().indexOf(startMarker.toLowerCase());
        if (startIndex === -1) return "";

        let contentStart = text.indexOf('\n', startIndex);
        if (contentStart === -1) contentStart = startIndex + startMarker.length; // if title is last thing
        else contentStart +=1; // move past newline


        let endIndex = text.length;
        for (const marker of allMarkers) {
            if (marker.toLowerCase() === startMarker.toLowerCase()) continue;
            const nextMarkerIndex = text.toLowerCase().indexOf(marker.toLowerCase(), contentStart);
            if (nextMarkerIndex !== -1 && nextMarkerIndex < endIndex) {
                endIndex = nextMarkerIndex;
            }
        }
        return text.substring(contentStart, endIndex).trim();
    };
    
    const allSectionTitlesForParsing = Object.values(sectionHeaders);

    const personalDetailsContent = extractContent(resumeContentForParsing, sectionHeaders.personalDetails, allSectionTitlesForParsing);
    const profileContent = extractContent(resumeContentForParsing, sectionHeaders.profile, allSectionTitlesForParsing);
    const experienceContent = extractContent(resumeContentForParsing, sectionHeaders.workExperience, allSectionTitlesForParsing);
    const educationContent = extractContent(resumeContentForParsing, sectionHeaders.academicTraining, allSectionTitlesForParsing);
    const skillsContent = extractContent(resumeContentForParsing, sectionHeaders.skills, allSectionTitlesForParsing);
    const languagesContent = extractContent(resumeContentForParsing, sectionHeaders.languages, allSectionTitlesForParsing);
    const projectsContent = extractContent(resumeContentForParsing, sectionHeaders.projects, allSectionTitlesForParsing);

    if (personalDetailsContent) drawSection('sectionTitle_ContactInformation', personalDetailsContent, '👤');
    if (profileContent) drawSection('sectionTitle_Profile', profileContent, '📝');
    if (experienceContent) drawSection('sectionTitle_WorkExperience', experienceContent, '💼');
    if (projectsContent) drawSection('sectionTitle_Projects', projectsContent, '💡');
    if (educationContent) drawSection('sectionTitle_AcademicTraining', educationContent, '🎓');
    if (skillsContent) drawSection('sectionTitle_Skills', skillsContent, '🛠️');
    if (languagesContent) drawSection('sectionTitle_Languages', languagesContent, '🌐');
    
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
