
"use client";

import { Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';

interface LoadingIndicatorProps {
  message?: string;
}

export default function LoadingIndicator({ message }: LoadingIndicatorProps) {
  const { t } = useLanguage();
  const displayMessage = message || t('loadingMessageDefault');

  return (
    <Card className="shadow-lg">
      <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <Sparkles className="h-8 w-8 text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">{displayMessage}</p>
        <p className="text-sm text-muted-foreground">{t('loadingAiMagic')}</p>
      </CardContent>
    </Card>
  );
}
