'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const nextLanguage = language === 'en' ? 'fr' : 'en';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={language === 'en' ? 'Passer en français' : 'Switch to English'}
      className="gap-2"
    >
      <Languages className="h-4 w-4" />
      {language.toUpperCase()}
    </Button>
  );
}
