'use client';

import { MarketingTerm } from '@/components/marketing-term';
import { MARKETING_GLOSSARY, MarketingTermKey } from '@/lib/marketing-glossary';
import { useLanguage } from '@/components/language-provider';

interface MarketingGlossaryProps {
  terms: MarketingTermKey[];
}

export function MarketingGlossary({ terms }: MarketingGlossaryProps) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {terms.map((key) => {
        const entry = MARKETING_GLOSSARY[key];
        return (
          <MarketingTerm
            key={key}
            term={entry.term[language]}
            definition={entry.definition[language]}
            className="text-xs"
          />
        );
      })}
    </div>
  );
}
