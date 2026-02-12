export type MarketingTermKey =
  | 'campaign'
  | 'adSet'
  | 'creative'
  | 'spend'
  | 'impressions'
  | 'reach'
  | 'clicks'
  | 'results'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'opportunityScore';

export const MARKETING_GLOSSARY: Record<MarketingTermKey, { term: string; definition: string }> = {
  campaign: {
    term: 'Campaign',
    definition: 'A top-level ad initiative. It groups multiple ad sets and ads under one objective and budget strategy.',
  },
  adSet: {
    term: 'Ad Set',
    definition: 'A subgroup inside a campaign that controls audience targeting, placements, and delivery settings.',
  },
  creative: {
    term: 'Creative',
    definition: 'The ad asset people see, such as an image, video, or carousel.',
  },
  spend: {
    term: 'Spend',
    definition: 'Total amount of money used on ads in the selected reporting window.',
  },
  impressions: {
    term: 'Impressions',
    definition: 'How many times ads were shown. The same person can generate multiple impressions.',
  },
  reach: {
    term: 'Reach',
    definition: 'How many unique people saw the ad at least once.',
  },
  clicks: {
    term: 'Clicks',
    definition: 'How many times users clicked from an ad to a destination.',
  },
  results: {
    term: 'Results',
    definition: 'The tracked outcome from your import setup, such as conversions, leads, or landing page actions.',
  },
  ctr: {
    term: 'CTR',
    definition: 'Click-through rate. CTR = Clicks / Impressions × 100. Higher CTR usually means stronger relevance.',
  },
  cpc: {
    term: 'CPC',
    definition: 'Cost per click. CPC = Spend / Clicks. Lower CPC means cheaper traffic.',
  },
  cpm: {
    term: 'CPM',
    definition: 'Cost per 1,000 impressions. CPM = Spend / (Impressions / 1,000).',
  },
  opportunityScore: {
    term: 'Opportunity Score',
    definition: 'A ranking signal used here to prioritize campaigns with stronger CTR efficiency relative to CPC.',
  },
};
