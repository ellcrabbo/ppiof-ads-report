'use client';

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MarketingTermProps {
  term: string;
  definition: string;
  className?: string;
}

export function MarketingTerm({ term, definition, className }: MarketingTermProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex cursor-help items-center gap-1 border-b border-dotted border-muted-foreground/70',
            className
          )}
        >
          {term}
          <Info className="h-3 w-3 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left" sideOffset={6}>
        {definition}
      </TooltipContent>
    </Tooltip>
  );
}
