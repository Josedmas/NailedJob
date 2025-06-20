
"use client";

import { Languages } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { useLanguage } from '@/contexts/language-context';
import type { Locale } from '@/lib/translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function AppHeader() {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Locale);
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          {/* Replace Briefcase icon with Image component */}
          <Image
            src="/logo.png" // Assumes logo.png is in the public folder
            alt={t('appLogoAlt') || "NailedJob Logo"}
            width={40} // Increased from 32
            height={40} // Increased from 32
            className="h-10 w-10" // Increased from h-8 w-8
          />
          <span>{t('appName')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Label htmlFor="language-select" className="sr-only">
            {t('languageSelectorLabel')}
          </Label>
           <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select" className="w-auto min-w-[120px]" aria-label={t('languageSelectorLabel')}>
              <Languages className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder={t('languageSelectorLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('langEnglish')}</SelectItem>
              <SelectItem value="es">{t('langSpanish')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
