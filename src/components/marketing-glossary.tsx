'use client';

import { MarketingTerm } from '@/components/marketing-term';
import { MARKETING_GLOSSARY, MarketingTermKey } from '@/lib/marketing-glossary';

interface MarketingGlossaryProps {
  terms: MarketingTermKey[];
}

export function MarketingGlossary({ terms }: MarketingGlossaryProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {terms.map((key) => {
        const entry = MARKETING_GLOSSARY[key];
        return (
          <MarketingTerm
            key={key}
            term={entry.term}
            definition={entry.definition}
            className="text-xs"
          />
        );
      })}
    </div>
  );
}
