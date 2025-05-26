
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

interface AccentColor {
  r: number;
  g: number;
  b: number;
  name?: string; // Optional name for debugging
}

interface ResumeBuilderStepProps {
  result: AIResumeBuilderOutput | null;
  loading: boolean;
  profilePhotoDataUri?: string;
  resumeLanguage: string; // Expect 'English', 'Spanish', etc.
  accentColor: AccentColor;
}

export function ResumeBuilderStep({ result, loading, profilePhotoDataUri, resumeLanguage, accentColor }: ResumeBuilderStepProps) {
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
    const leftColumnWidth = 55; // Slightly wider for colored background
    const rightColumnX = margin + leftColumnWidth + 5;
    const contentWidth = pageWidth - rightColumnX - margin;
    let yPosition = margin;
    const lineHeight = 6; // For 10pt font
    const sectionSpacing = 8;
    const itemSpacing = 3;

    doc.setFont('Helvetica', 'normal');

    // --- Resume Header (Photo and Name) ---
    const photoSize = 30;
    let nameYOffset = (photoSize / 2) + 3; // Initial offset for name, centered with photo

    if (profilePhotoDataUri) {
      try {
        const parts = profilePhotoDataUri.split(',');
        if (parts.length === 2) {
          const mimeTypePart = parts[0].match(/:(.*?);/);
          if (mimeTypePart && mimeTypePart[1]) {
            const imageType = mimeTypePart[1].split('/')[1]?.toUpperCase();
            if (imageType && (imageType === 'PNG' || imageType === 'JPEG' || imageType === 'JPG')) {
              doc.addImage(profilePhotoDataUri, imageType, margin + 5, yPosition, photoSize, photoSize); // Photo slightly indented in left column
            }
          }
        }
      } catch (e) {
        console.error("Error adding profile photo to PDF:", e);
      }
      yPosition += photoSize + sectionSpacing / 2;
    } else {
      nameYOffset = 0; // If no photo, name starts higher
    }
    
    const resumeLines = tailoredResume.split('\n');
    const candidateName = resumeLines.length > 0 ? resumeLines[0].trim() : "Candidate Name";
    
    doc.setFontSize(24);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b); // Name in accent color
    // Name in the right column, potentially below where photo would be, or at top if no photo
    const nameX = profilePhotoDataUri ? rightColumnX : margin;
    const nameActualY = profilePhotoDataUri ? margin + nameYOffset : yPosition + nameYOffset;
    doc.text(candidateName, nameX, nameActualY);
    doc.setTextColor(0,0,0); // Reset text color

    // Adjust yPosition based on whether photo was present and name position
    if (!profilePhotoDataUri) {
      yPosition += lineHeight * 2 + sectionSpacing / 2; // Space after name if no photo
    } else {
      // yPosition was already incremented by photoSize
    }
    
    // Horizontal line below name/photo area
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += sectionSpacing;


    // --- Helper Function to Draw Sections ---
    const drawSection = (titleKey: string, content: string, iconUnicode: string) => {
      if (yPosition + lineHeight * 3 > pageHeight - margin) { 
        doc.addPage();
        yPosition = margin;
      }

      // Section Title (Left Column)
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.rect(margin, yPosition - lineHeight / 1.5, leftColumnWidth, lineHeight * 1.5, 'F');
      
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255); // White text on accent background
      const sectionTitleText = `${iconUnicode} ${t(titleKey, undefined, resumeLanguage.toLowerCase() as Locale)}`;
      doc.text(sectionTitleText, margin + 3, yPosition + 2);
      
      // Section Content (Right Column)
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black text for content
      
      const splitContent = doc.splitTextToSize(content, contentWidth);
      let currentYForContent = yPosition;

      splitContent.forEach((line: string) => {
        if (currentYForContent + lineHeight > pageHeight - margin) {
          doc.addPage();
          currentYForContent = margin;
        }
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            doc.text("•", rightColumnX, currentYForContent); // Bullet point
            doc.text(trimmedLine.substring(1).trim(), rightColumnX + 3, currentYForContent); // Text after bullet
        } else {
            doc.text(trimmedLine, rightColumnX, currentYForContent);
        }
        currentYForContent += lineHeight;
      });
      yPosition = Math.max(yPosition + lineHeight * 1.5 + itemSpacing, currentYForContent + itemSpacing); 
      yPosition += sectionSpacing / 2; 
    };

    // --- Parsing and Drawing Sections ---
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
    
    // Skip the name part (first line) for section parsing
    const resumeContentForParsing = resumeLines.slice(1).join('\n');
    const allSectionTitlesForParsing = Object.values(sectionHeaders);

    const extractContent = (text: string, startMarker: string, allMarkers: string[]): string => {
        const startIndex = text.toLowerCase().indexOf(startMarker.toLowerCase());
        if (startIndex === -1) return "";

        let contentStart = text.indexOf('\n', startIndex); // Content starts on the next line
        if (contentStart === -1) contentStart = startIndex + startMarker.length; 
        else contentStart +=1;

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
    
    const personalDetailsContent = extractContent(resumeContentForParsing, sectionHeaders.personalDetails, allSectionTitlesForParsing);
    const profileContent = extractContent(resumeContentForParsing, sectionHeaders.profile, allSectionTitlesForParsing);
    const experienceContent = extractContent(resumeContentForParsing, sectionHeaders.workExperience, allSectionTitlesForParsing);
    const educationContent = extractContent(resumeContentForParsing, sectionHeaders.academicTraining, allSectionTitlesForParsing);
    const skillsContent = extractContent(resumeContentForParsing, sectionHeaders.skills, allSectionTitlesForParsing);
    const languagesContent = extractContent(resumeContentForParsing, sectionHeaders.languages, allSectionTitlesForParsing);
    const projectsContent = extractContent(resumeContentForParsing, sectionHeaders.projects, allSectionTitlesForParsing);

    // Determine draw order - typically contact info first, then profile, then experience etc.
    // The content from the AI might not have all sections or have them in a specific order.
    // We draw what we find.

    // Right column content section (usually personal details are better in right column under name)
    if (personalDetailsContent) {
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(80, 80, 80); // Slightly muted text for contact details
      const personalDetailsLines = doc.splitTextToSize(personalDetailsContent, contentWidth);
      let tempY = nameActualY + lineHeight; // Start below the name
      if (!profilePhotoDataUri) tempY = yPosition; // If no photo, start from current yPos

      personalDetailsLines.forEach(line => {
        if (tempY + lineHeight > pageHeight - margin) {
            doc.addPage();
            tempY = margin;
        }
        doc.text(line, nameX, tempY);
        tempY += lineHeight * 0.8; // Slightly tighter line spacing for contact details
      });
       if (!profilePhotoDataUri) yPosition = tempY + sectionSpacing;
       else yPosition = Math.max(yPosition, tempY + sectionSpacing); // Ensure yPosition is past contact details or photo
       doc.setTextColor(0,0,0); // Reset text color
    }


    if (profileContent) drawSection('sectionTitle_Profile', profileContent, '📝'); // User icon (U+1F4DD)
    if (experienceContent) drawSection('sectionTitle_WorkExperience', experienceContent, '💼'); // Briefcase icon (U+1F4BC)
    if (projectsContent) drawSection('sectionTitle_Projects', projectsContent, '💡'); // Light bulb (U+1F4A1)
    if (educationContent) drawSection('sectionTitle_AcademicTraining', educationContent, '🎓'); // Graduation cap (U+1F393)
    if (skillsContent) drawSection('sectionTitle_Skills', skillsContent, '🛠️'); // Hammer and Wrench (U+1F6E0️) - may not render well in all PDF viewers
    if (languagesContent) drawSection('sectionTitle_Languages', languagesContent, '🌐'); // Globe with meridians (U+1F310)
    
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
