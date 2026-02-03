import Papa from 'papaparse';
import { z } from 'zod';

// Column mapping for Meta Ads CSV exports
export const META_COLUMN_MAPPING = {
  campaignName: [
    'Campaign name',
    'Campaign Name',
    'campaign_name',
    'Campaign',
  ],
  adSetName: [
    'Ad set name',
    'Ad Set Name',
    'adset_name',
    'Ad set',
  ],
  adName: [
    'Ad name',
    'Ad Name',
    'ad_name',
    'Ads',
    'Ad',
  ],
  amountSpent: [
    'Amount spent (USD)',
    'Amount spent',
    'Spend (USD)',
    'Spend',
    'Cost',
    'amount_spent',
  ],
  impressions: [
    'Impressions',
    'impressions',
  ],
  reach: [
    'Reach',
    'reach',
  ],
  linkClicks: [
    'Link clicks',
    'Link Clicks',
    'link_clicks',
    'Clicks (all)',
    'Clicks',
  ],
  results: [
    'Results',
    'results',
    'Conversions',
  ],
  resultType: [
    'Result Type',
    'Result type',
    'result_type',
  ],
  reportingStarts: [
    'Reporting starts',
    'Reporting Starts',
    'reporting_start',
    'Date start',
  ],
  reportingEnds: [
    'Reporting ends',
    'Reporting Ends',
    'reporting_end',
    'Date stop',
  ],
  objective: [
    'Objective',
    'objective',
  ],
  status: [
    'Delivery status',
    'Status',
    'status',
  ],
  platform: [
    'Platform',
    'platform',
  ],
  creativeUrl: [
    'Ad creative URL',
    'Ad url',
    'Ad URL',
  ],
} as const;

// Validation schema for a parsed CSV row
export const CSVRowSchema = z.object({
  campaignName: z.string().optional(),
  adSetName: z.string().optional(),
  adName: z.string().optional(),
  amountSpent: z.string().optional(),
  impressions: z.string().optional(),
  reach: z.string().optional(),
  linkClicks: z.string().optional(),
  results: z.string().optional(),
  resultType: z.string().optional(),
  reportingStarts: z.string().optional(),
  reportingEnds: z.string().optional(),
  objective: z.string().optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
  creativeUrl: z.string().optional(),
});

export type CSVRow = z.infer<typeof CSVRowSchema>;

export interface ColumnMapping {
  [key: string]: string | null;
}

export interface ParseResult {
  success: boolean;
  headers: string[];
  data: CSVRow[];
  errors: string[];
  warnings: string[];
  mapping: ColumnMapping;
  confidence: number;
}

/**
 * Auto-detect column mappings based on headers
 */
export function detectColumnMapping(headers: string[]): {
  mapping: ColumnMapping;
  confidence: number;
  warnings: string[];
} {
  const mapping: ColumnMapping = {};
  const warnings: string[] = [];
  let confidenceScore = 0;
  let totalMatches = 0;

  // Normalize headers for comparison
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

  for (const [field, possibleNames] of Object.entries(META_COLUMN_MAPPING)) {
    let matched = false;

    for (const name of possibleNames) {
      const index = normalizedHeaders.findIndex(h => h === name.toLowerCase());
      if (index !== -1) {
        mapping[field] = headers[index];
        matched = true;
        confidenceScore += 1;
        totalMatches++;
        break;
      }
    }

    if (!matched) {
      mapping[field] = null;
    }
  }

  // Check for breakdown exports
  const breakdownIndicators = ['age', 'gender', 'region', 'country', 'device'];
  const hasBreakdown = breakdownIndicators.some(indicator =>
    headers.some(h => h.toLowerCase().includes(indicator))
  );

  if (hasBreakdown) {
    warnings.push(
      'Breakdown export detected. For best results, use a campaign-level or ad-level export without breakdowns.'
    );
  }

  // Calculate confidence
  const totalRequired = Object.keys(META_COLUMN_MAPPING).length;
  const confidence = totalMatches / totalRequired;

  if (confidence < 0.8) {
    warnings.push(
      'Auto-detection confidence below 80%. Please review column mappings.'
    );
  }

  return { mapping, confidence, warnings };
}

/**
 * Check if a row is a totals row
 */
export function isTotalsRow(row: any): boolean {
  const values = Object.values(row).map(v => String(v).toLowerCase().trim());
  return values.some(v => v === 'total' || v === 'totals');
}

/**
 * Parse CSV file
 */
export async function parseCSVFile(
  file: File
): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const { mapping, confidence, warnings } = detectColumnMapping(headers);

        // Filter out totals rows and parse numeric values
        const filteredData = results.data
          .filter((row: any) => !isTotalsRow(row))
          .map((row: any) => {
            const parsedRow: any = {};

            // Map columns to standard field names
            for (const [field, header] of Object.entries(mapping)) {
              if (header && row[header] !== undefined) {
                parsedRow[field] = row[header];
              }
            }

            return parsedRow;
          });

        const errors: string[] = [];

        if (filteredData.length === 0) {
          errors.push('No valid data rows found in CSV file.');
        }

        resolve({
          success: errors.length === 0,
          headers,
          data: filteredData,
          errors,
          warnings,
          mapping,
          confidence,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          headers: [],
          data: [],
          errors: [`CSV parsing error: ${error.message}`],
          warnings: [],
          mapping: {},
          confidence: 0,
        });
      },
    });
  });
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse number string to integer
 */
export function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse date string to Date object
 */
export function parseDate(value: string): Date | null {
  if (!value) return null;

  const cleaned = String(value).trim();

  // Try common date formats
  const formats = [
    /^(\d{4}-\d{2}-\d{2})$/, // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Calculate CPM (Cost per mille)
 */
export function calculateCPM(spend: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (spend / impressions) * 1000;
}

/**
 * Calculate CPC (Cost per click)
 */
export function calculateCPC(spend: number, clicks: number): number {
  if (clicks === 0) return 0;
  return spend / clicks;
}
