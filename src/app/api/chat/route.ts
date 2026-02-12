import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

const ChatSchema = z.object({
  question: z.string().trim().min(2).max(500),
  history: z.array(ChatMessageSchema).max(16).optional().default([]),
});

type ChatMessage = z.infer<typeof ChatMessageSchema>;

type CampaignMetric = {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cpc: number | null;
  cpm: number | null;
  platform: string | null;
};

type CampaignWithDerived = CampaignMetric & {
  ctr: number;
  safeCpc: number;
  safeCpm: number;
};

type AdMetric = {
  id: string;
  name: string;
  campaignName: string;
  adSetName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cpc: number | null;
  cpm: number | null;
};

type AdWithDerived = AdMetric & {
  ctr: number;
  safeCpc: number;
  safeCpm: number;
  efficiencyScore: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);

const overallCtr = (campaigns: CampaignMetric[]) => {
  const clicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const impressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
};

const averageCpc = (campaigns: CampaignMetric[]) => {
  const clicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const spend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  return clicks > 0 ? spend / clicks : 0;
};

const averageCpm = (campaigns: CampaignMetric[]) => {
  const impressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  const spend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  return impressions > 0 ? (spend / impressions) * 1000 : 0;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitTokens = (value: string) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);

const findTopN = (query: string) => {
  const match = query.match(/\b(top|best|highest|lowest|worst|least|most)\s+(\d{1,2})\b/i);
  if (!match) return 1;
  const n = Number(match[2]);
  return Number.isFinite(n) ? Math.min(Math.max(1, n), 10) : 1;
};

const detectMetric = (query: string) => {
  const q = query.toLowerCase();
  if (q.includes('cost per click') || /\bcpc\b/.test(q)) return 'cpc' as const;
  if (q.includes('cost per thousand') || /\bcpm\b/.test(q)) return 'cpm' as const;
  if (q.includes('click through rate') || /\bctr\b/.test(q)) return 'ctr' as const;
  if (q.includes('impression')) return 'impressions' as const;
  if (q.includes('click')) return 'clicks' as const;
  if (q.includes('result') || q.includes('conversion')) return 'results' as const;
  if (q.includes('spend') || q.includes('cost') || q.includes('budget')) return 'spend' as const;
  return null;
};

const detectOrder = (query: string, metric: string | null) => {
  const q = query.toLowerCase();
  const isCostMetric = metric === 'cpc' || metric === 'cpm';

  if (/\b(lowest|least|min|bottom)\b/.test(q)) return 'asc' as const;
  if (/\b(highest|most|max|top)\b/.test(q)) return 'desc' as const;

  if (q.includes('best')) return isCostMetric ? ('asc' as const) : ('desc' as const);
  if (q.includes('worst')) return isCostMetric ? ('desc' as const) : ('asc' as const);

  return isCostMetric ? ('asc' as const) : ('desc' as const);
};

const metricValue = (campaign: CampaignWithDerived, metric: ReturnType<typeof detectMetric>) => {
  switch (metric) {
    case 'ctr':
      return campaign.ctr;
    case 'cpc':
      return campaign.safeCpc;
    case 'cpm':
      return campaign.safeCpm;
    case 'impressions':
      return campaign.impressions;
    case 'clicks':
      return campaign.clicks;
    case 'results':
      return campaign.results;
    case 'spend':
    default:
      return campaign.spend;
  }
};

const formatMetric = (metric: ReturnType<typeof detectMetric>, value: number) => {
  switch (metric) {
    case 'ctr':
      return `${value.toFixed(2)}%`;
    case 'cpc':
    case 'cpm':
    case 'spend':
      return formatCurrency(value);
    case 'impressions':
    case 'clicks':
    case 'results':
      return formatNumber(value);
    default:
      return value.toFixed(2);
  }
};

const adMetricValue = (
  ad: AdWithDerived,
  metric: ReturnType<typeof detectMetric> | 'efficiency'
) => {
  switch (metric) {
    case 'ctr':
      return ad.ctr;
    case 'cpc':
      return ad.safeCpc;
    case 'cpm':
      return ad.safeCpm;
    case 'impressions':
      return ad.impressions;
    case 'clicks':
      return ad.clicks;
    case 'results':
      return ad.results;
    case 'efficiency':
      return ad.efficiencyScore;
    case 'spend':
    default:
      return ad.spend;
  }
};

const definitions = {
  ctr: 'CTR (Click-Through Rate) = clicks / impressions x 100. It measures how often people click after seeing the ad.',
  cpc: 'CPC (Cost Per Click) = spend / clicks. Lower CPC means you are paying less for each click.',
  cpm: 'CPM (Cost Per Mille) = spend / impressions x 1,000. It is the cost to get 1,000 impressions.',
  impressions: 'Impressions are how many times your ads were shown.',
  clicks: 'Clicks are how many times users clicked your ad.',
  results: 'Results are the outcome metric captured from your import (for example conversions or landing actions).',
  efficiency:
    'Efficiency score is a custom ranking in this dashboard: Efficiency Score = CTR / max(CPC, 0.01), where CTR is in percentage points. Higher is better.',
};

const findNamedCampaigns = (question: string, campaigns: CampaignWithDerived[]) => {
  const quoted = [...question.matchAll(/"([^"]{2,140})"/g)].map((match) => normalizeText(match[1]));
  if (quoted.length > 0) {
    const matched = quoted
      .map((name) => campaigns.find((campaign) => normalizeText(campaign.name) === name))
      .filter(Boolean) as CampaignWithDerived[];
    if (matched.length > 0) return matched;
  }

  const qTokens = splitTokens(question);
  if (qTokens.length === 0) return [];

  return campaigns
    .map((campaign) => {
      const cTokens = splitTokens(campaign.name);
      const overlap = cTokens.filter((token) => qTokens.includes(token)).length;
      const score = overlap / Math.max(cTokens.length, 1);
      return { campaign, score };
    })
    .filter((item) => item.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.campaign);
};

const matchCampaignByName = (name: string, campaigns: CampaignWithDerived[]) => {
  const normalized = normalizeText(name);
  if (!normalized) return null;

  const exact = campaigns.find((campaign) => normalizeText(campaign.name) === normalized);
  if (exact) return exact;

  return (
    campaigns.find((campaign) => {
      const campaignName = normalizeText(campaign.name);
      return campaignName.includes(normalized) || normalized.includes(campaignName);
    }) || null
  );
};

const matchAdByName = (name: string, ads: AdWithDerived[]) => {
  const normalized = normalizeText(name);
  if (!normalized) return null;

  const exact = ads.find((ad) => normalizeText(ad.name) === normalized);
  if (exact) return exact;

  return (
    ads.find((ad) => {
      const adName = normalizeText(ad.name);
      return adName.includes(normalized) || normalized.includes(adName);
    }) || null
  );
};

const findMostRecentMentionedAd = (history: ChatMessage[], ads: AdWithDerived[]) => {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    if (message.role !== 'assistant') continue;

    const quotedNames = [...message.content.matchAll(/"([^"]{2,180})"/g)].map((match) => match[1]);
    for (const name of quotedNames) {
      const ad = matchAdByName(name, ads);
      if (ad) return ad;
    }

    const rankedNames = [...message.content.matchAll(/(?:^|\n)\s*\d+\.\s(.+?)\s[-–—]\s/g)].map((match) =>
      match[1].trim()
    );
    for (const name of rankedNames) {
      const ad = matchAdByName(name, ads);
      if (ad) return ad;
    }
  }

  return null;
};

const uniqueCampaigns = (campaigns: Array<CampaignWithDerived | null | undefined>) => {
  const seen = new Set<string>();
  const result: CampaignWithDerived[] = [];

  for (const campaign of campaigns) {
    if (!campaign || seen.has(campaign.id)) continue;
    seen.add(campaign.id);
    result.push(campaign);
  }

  return result;
};

const extractRankedNames = (history: ChatMessage[]) => {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    if (message.role !== 'assistant') continue;

    const listMatches = [...message.content.matchAll(/(?:^|\n)\s*\d+\.\s(.+?)\s[--]\s/g)];
    if (listMatches.length > 0) {
      return listMatches.map((match) => match[1].trim());
    }
  }

  return [] as string[];
};

const extractOrdinalIndexes = (query: string) => {
  const q = query.toLowerCase();
  const indexes: number[] = [];

  const namedOrdinals: Record<string, number> = {
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,
    fifth: 4,
    sixth: 5,
    seventh: 6,
    eighth: 7,
    ninth: 8,
    tenth: 9,
  };

  for (const [word, index] of Object.entries(namedOrdinals)) {
    if (new RegExp(`\\b${word}\\b`).test(q)) {
      indexes.push(index);
    }
  }

  for (const match of q.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:one|campaign|option)\b/g)) {
    const index = Number(match[1]) - 1;
    if (Number.isFinite(index) && index >= 0 && index < 10) indexes.push(index);
  }

  for (const match of q.matchAll(/(?:\bnumber\s+|#)(\d{1,2})\b/g)) {
    const index = Number(match[1]) - 1;
    if (Number.isFinite(index) && index >= 0 && index < 10) indexes.push(index);
  }

  return [...new Set(indexes)];
};

const findMostRecentMention = (history: ChatMessage[], campaigns: CampaignWithDerived[]) => {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];

    const quoted = [...message.content.matchAll(/"([^"]{2,140})"/g)]
      .map((match) => match[1])
      .map((name) => matchCampaignByName(name, campaigns));

    const resolvedQuoted = uniqueCampaigns(quoted);
    if (resolvedQuoted.length > 0) return resolvedQuoted;

    const rankedNames = [...message.content.matchAll(/(?:^|\n)\s*\d+\.\s(.+?)\s[--]\s/g)].map((match) => match[1]);
    const resolvedRanked = uniqueCampaigns(rankedNames.map((name) => matchCampaignByName(name, campaigns)));
    if (resolvedRanked.length > 0) return resolvedRanked;
  }

  return [] as CampaignWithDerived[];
};

const resolveCampaignReferences = (
  question: string,
  history: ChatMessage[],
  campaigns: CampaignWithDerived[]
) => {
  const explicit = findNamedCampaigns(question, campaigns);
  if (explicit.length > 0) return explicit;

  const q = question.toLowerCase();
  const rankedNames = extractRankedNames(history);
  const rankedCampaigns = uniqueCampaigns(rankedNames.map((name) => matchCampaignByName(name, campaigns)));

  if ((q.includes('those two') || q.includes('both')) && rankedCampaigns.length >= 2) {
    return rankedCampaigns.slice(0, 2);
  }

  const ordinals = extractOrdinalIndexes(q);
  if (ordinals.length > 0 && rankedCampaigns.length > 0) {
    const picked = uniqueCampaigns(ordinals.map((index) => rankedCampaigns[index]));
    if (picked.length > 0) return picked;
  }

  const pronounReference =
    q.includes('that one') ||
    q.includes('that campaign') ||
    q.includes('this campaign') ||
    q === 'it' ||
    q.includes(' about it') ||
    q.includes('about that');

  if (pronounReference) {
    if (rankedCampaigns.length > 0) return [rankedCampaigns[0]];

    const mentioned = findMostRecentMention(history, campaigns);
    if (mentioned.length > 0) return [mentioned[0]];
  }

  return [] as CampaignWithDerived[];
};

const buildRuleBasedAnswer = (
  question: string,
  campaigns: CampaignMetric[],
  history: ChatMessage[],
  ads: AdMetric[]
) => {
  const q = question.toLowerCase();
  const derivedCampaigns: CampaignWithDerived[] = campaigns.map((campaign) => ({
    ...campaign,
    ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
    safeCpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : campaign.cpc || 0,
    safeCpm: campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : campaign.cpm || 0,
  }));
  const derivedAds: AdWithDerived[] = ads.map((ad) => ({
    ...ad,
    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    safeCpc: ad.clicks > 0 ? ad.spend / ad.clicks : ad.cpc || 0,
    safeCpm: ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : ad.cpm || 0,
    efficiencyScore:
      ad.impressions > 0 && ad.clicks > 0
        ? ((ad.clicks / ad.impressions) * 100) / Math.max(ad.cpc || 0, 0.01)
        : 0,
  }));

  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const totalResults = campaigns.reduce((sum, campaign) => sum + campaign.results, 0);

  if ((q.includes('how many') || q.includes('number of')) && q.includes('campaign')) {
    return `There are ${campaigns.length} campaigns in the current dataset.`;
  }

  const asksForAds = /\b(ad|ads|creative|creatives)\b/.test(q);
  if ((q.includes('how many') || q.includes('number of')) && asksForAds) {
    return `There are ${derivedAds.length} ads in the current dataset.`;
  }

  const isDefinitionQuery =
    /\b(what(?:'s| is)|define|meaning|means|explain)\b/.test(q) ||
    (q.includes('how') && (q.includes('calculate') || q.includes('computed')));
  const asksEfficiency = q.includes('efficiency score') || q === 'efficiency' || q === 'efficiency score';
  const wantsTop = q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('most');
  const wantsWorst = q.includes('worst') || q.includes('lowest') || q.includes('least');

  if (asksEfficiency && (isDefinitionQuery || (!wantsTop && !wantsWorst && !q.includes('perform') && !q.includes('winner')))) {
    const recentAd = findMostRecentMentionedAd(history, derivedAds);
    const bestOverall =
      recentAd ||
      [...derivedAds]
        .filter((ad) => ad.impressions >= 100 && ad.clicks > 0)
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

    if (bestOverall) {
      return [
        definitions.efficiency,
        `For "${bestOverall.name}", score = ${bestOverall.efficiencyScore.toFixed(2)} (CTR ${bestOverall.ctr.toFixed(2)} / CPC ${formatCurrency(bestOverall.safeCpc)}).`,
      ].join('\n');
    }

    return definitions.efficiency;
  }

  if (asksForAds && (wantsTop || wantsWorst || q.includes('perform') || q.includes('winner'))) {
    if (derivedAds.length === 0) {
      return 'I do not have ad-level rows yet. Upload data with ads first, then ask again.';
    }

    const topN = findTopN(q);
    const metric = detectMetric(q);
    const selectedMetric: ReturnType<typeof detectMetric> | 'efficiency' =
      metric ||
      (q.includes('perform') || q.includes('best') || q.includes('winner') ? 'efficiency' : 'ctr');
    const metricLabel =
      selectedMetric === 'efficiency' ? 'EFFICIENCY SCORE' : selectedMetric.toUpperCase();

    const sortOrder =
      selectedMetric === 'efficiency'
        ? wantsWorst ? 'asc' : 'desc'
        : detectOrder(q, selectedMetric);
    const sourceAds =
      selectedMetric === 'efficiency'
        ? derivedAds.filter((ad) => ad.impressions >= 100 && ad.clicks > 0)
        : derivedAds.filter((ad) => ad.impressions > 0 || ad.clicks > 0 || ad.spend > 0);
    const sorted = [...sourceAds].sort((a, b) => {
      const diff = adMetricValue(a, selectedMetric) - adMetricValue(b, selectedMetric);
      return sortOrder === 'asc' ? diff : -diff;
    });
    const selected = sorted.slice(0, topN);

    if (selected.length === 0) {
      return 'Not enough ad-level data to rank performance yet.';
    }

    if (topN === 1) {
      const best = selected[0];
      return [
        `Best ad by ${metricLabel}: "${best.name}"`,
        `- Campaign: ${best.campaignName}${best.adSetName ? ` | Ad Set: ${best.adSetName}` : ''}`,
        `- Spend ${formatCurrency(best.spend)} | Impressions ${formatNumber(best.impressions)} | Clicks ${formatNumber(best.clicks)}`,
        `- CTR ${best.ctr.toFixed(2)}% | CPC ${formatCurrency(best.safeCpc)} | CPM ${formatCurrency(best.safeCpm)}`,
        selectedMetric === 'efficiency'
          ? `- Efficiency score ${best.efficiencyScore.toFixed(2)} (CTR / max(CPC, 0.01)).`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const label = topN === 1 ? 'Ad' : `Top ${topN} ads`;
    const lines = selected.map((ad, index) => {
      const value =
        selectedMetric === 'efficiency'
          ? `${ad.efficiencyScore.toFixed(2)} score`
          : formatMetric(selectedMetric, adMetricValue(ad, selectedMetric));
      return `${index + 1}. ${ad.name} - ${value} (${ad.campaignName})`;
    });
    return `${label} by ${metricLabel}:\n- ${lines.join('\n- ')}`;
  }

  const definitionMetric = detectMetric(q);
  if ((q.includes('what is') || q.includes('define') || q.includes('meaning')) && definitionMetric) {
    const definition = definitions[definitionMetric as keyof typeof definitions];
    if (definition) return definition;
  }

  if (q.includes('summary') || q.includes('overview')) {
    return `Summary: Spend ${formatCurrency(totalSpend)}, Impressions ${formatNumber(totalImpressions)}, Clicks ${formatNumber(totalClicks)}, CTR ${overallCtr(campaigns).toFixed(2)}%, Avg CPC ${formatCurrency(averageCpc(campaigns))}, Avg CPM ${formatCurrency(averageCpm(campaigns))}.`;
  }

  if (q.includes('platform')) {
    const grouped = derivedCampaigns.reduce<Record<string, { spend: number; clicks: number; impressions: number }>>(
      (acc, campaign) => {
        const key = campaign.platform || 'unknown';
        if (!acc[key]) acc[key] = { spend: 0, clicks: 0, impressions: 0 };
        acc[key].spend += campaign.spend;
        acc[key].clicks += campaign.clicks;
        acc[key].impressions += campaign.impressions;
        return acc;
      },
      {}
    );

    const lines = Object.entries(grouped)
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 4)
      .map(([platform, values]) => {
        const ctr = values.impressions > 0 ? (values.clicks / values.impressions) * 100 : 0;
        return `${platform}: ${formatCurrency(values.spend)} spend, ${ctr.toFixed(2)}% CTR`;
      });

    if (lines.length > 0) {
      return `Platform breakdown:\n- ${lines.join('\n- ')}`;
    }
  }

  if (q.includes('total spend') || (q.includes('spend') && q.includes('total')) || q.includes('how much spent')) {
    return `Total spend is ${formatCurrency(totalSpend)} across ${campaigns.length} campaigns.`;
  }

  if ((q.includes('total') || q.includes('overall')) && q.includes('impression')) {
    return `Total impressions are ${formatNumber(totalImpressions)}.`;
  }

  if ((q.includes('total') || q.includes('overall')) && q.includes('click')) {
    return `Total clicks are ${formatNumber(totalClicks)}.`;
  }

  if ((q.includes('total') || q.includes('overall')) && q.includes('result')) {
    return `Total results are ${formatNumber(totalResults)}.`;
  }

  if (q.includes('ctr')) {
    return `Overall CTR is ${overallCtr(campaigns).toFixed(2)}% (clicks / impressions).`;
  }

  if (q.includes('cpc')) {
    return `Average CPC is ${formatCurrency(averageCpc(campaigns))}.`;
  }

  if (q.includes('cpm')) {
    return `Average CPM is ${formatCurrency(averageCpm(campaigns))}.`;
  }

  const referencedCampaigns = resolveCampaignReferences(question, history, derivedCampaigns);

  if (referencedCampaigns.length > 0 && (q.includes('compare') || q.includes('vs') || q.includes('versus'))) {
    const [left, right] = referencedCampaigns;
    if (left && right) {
      const leftScore = left.ctr / Math.max(left.safeCpc, 0.01);
      const rightScore = right.ctr / Math.max(right.safeCpc, 0.01);
      const winner = leftScore >= rightScore ? left : right;

      return [
        `Comparison: "${left.name}" vs "${right.name}"`,
        `- ${left.name}: Spend ${formatCurrency(left.spend)}, CTR ${left.ctr.toFixed(2)}%, CPC ${formatCurrency(left.safeCpc)}`,
        `- ${right.name}: Spend ${formatCurrency(right.spend)}, CTR ${right.ctr.toFixed(2)}%, CPC ${formatCurrency(right.safeCpc)}`,
        `Winner by efficiency (CTR/CPC): ${winner.name}`,
      ].join('\n');
    }
  }

  if (referencedCampaigns.length > 0) {
    const campaign = referencedCampaigns[0];
    const spendRank =
      [...derivedCampaigns].sort((a, b) => b.spend - a.spend).findIndex((item) => item.id === campaign.id) + 1;
    const share = totalSpend > 0 ? (campaign.spend / totalSpend) * 100 : 0;

    return [
      `"${campaign.name}" summary:`,
      `- Spend ${formatCurrency(campaign.spend)} (${share.toFixed(1)}% of account spend, rank #${spendRank})`,
      `- Impressions ${formatNumber(campaign.impressions)} | Clicks ${formatNumber(campaign.clicks)} | Results ${formatNumber(campaign.results)}`,
      `- CTR ${campaign.ctr.toFixed(2)}% | CPC ${formatCurrency(campaign.safeCpc)} | CPM ${formatCurrency(campaign.safeCpm)}`,
    ].join('\n');
  }

  const metric = detectMetric(q);

  if ((q.includes('campaign') && (wantsTop || wantsWorst)) || ((wantsTop || wantsWorst) && metric)) {
    const topN = findTopN(q);
    const sortOrder = detectOrder(q, metric);
    const selectedMetric = metric || 'spend';
    const sorted = [...derivedCampaigns].sort((a, b) => {
      const diff = metricValue(a, selectedMetric) - metricValue(b, selectedMetric);
      return sortOrder === 'asc' ? diff : -diff;
    });
    const selected = sorted.slice(0, topN);

    if (selected.length === 0) {
      return 'No matching campaigns found for that request.';
    }

    const label = topN === 1 ? 'Campaign' : `Top ${topN} campaigns`;
    const lines = selected.map((campaign, index) => {
      const value = metricValue(campaign, selectedMetric);
      return `${index + 1}. ${campaign.name} - ${formatMetric(selectedMetric, value)}`;
    });

    return `${label} by ${selectedMetric.toUpperCase()}:\n- ${lines.join('\n- ')}`;
  }

  if (q.includes('recommend') || q.includes('improve') || q.includes('optimiz')) {
    const highSpendLowCtr = [...derivedCampaigns]
      .filter((campaign) => campaign.spend > 0)
      .sort((a, b) => b.spend - a.spend || a.ctr - b.ctr)[0];
    const strongEfficiency = [...derivedCampaigns]
      .filter((campaign) => campaign.clicks > 0)
      .sort((a, b) => (b.ctr / Math.max(b.safeCpc, 0.01)) - (a.ctr / Math.max(a.safeCpc, 0.01)))[0];
    const lowVolume = [...derivedCampaigns]
      .filter((campaign) => campaign.spend > 0)
      .sort((a, b) => a.impressions - b.impressions)[0];

    return [
      'Suggested actions:',
      highSpendLowCtr
        ? `- Review ${highSpendLowCtr.name}: high spend (${formatCurrency(highSpendLowCtr.spend)}) but CTR at ${highSpendLowCtr.ctr.toFixed(2)}%.`
        : '- Not enough data for spend/CTR review.',
      strongEfficiency
        ? `- Consider scaling ${strongEfficiency.name}: CTR ${strongEfficiency.ctr.toFixed(2)}% at CPC ${formatCurrency(strongEfficiency.safeCpc)}.`
        : '- Not enough data for scaling recommendation.',
      lowVolume
        ? `- Check delivery on ${lowVolume.name}: only ${formatNumber(lowVolume.impressions)} impressions.`
        : '- Not enough data for delivery recommendation.',
    ].join('\n');
  }

  return 'I can answer detailed questions now. Try: "show top 5 by CTR", "compare those two", "what about the second one?", "recommend optimizations", or "tell me about Cambodia Average".';
};

const buildPromptContext = (campaigns: CampaignMetric[], ads: AdMetric[]) => {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const totalResults = campaigns.reduce((sum, campaign) => sum + campaign.results, 0);

  const compactCampaigns = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 80)
    .map((campaign) => ({
      name: campaign.name,
      platform: campaign.platform,
      spend: Number(campaign.spend.toFixed(2)),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      results: campaign.results,
      ctr: campaign.impressions > 0 ? Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2)) : 0,
      cpc: Number((campaign.cpc || 0).toFixed(2)),
      cpm: Number((campaign.cpm || 0).toFixed(2)),
    }));

  const compactAds = [...ads]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 120)
    .map((ad) => ({
      name: ad.name,
      campaign: ad.campaignName,
      adSet: ad.adSetName,
      spend: Number(ad.spend.toFixed(2)),
      impressions: ad.impressions,
      clicks: ad.clicks,
      results: ad.results,
      ctr: ad.impressions > 0 ? Number(((ad.clicks / ad.impressions) * 100).toFixed(2)) : 0,
      cpc: Number((ad.cpc || 0).toFixed(2)),
      cpm: Number((ad.cpm || 0).toFixed(2)),
    }));

  return {
    totals: {
      campaignCount: campaigns.length,
      spend: Number(totalSpend.toFixed(2)),
      impressions: totalImpressions,
      clicks: totalClicks,
      results: totalResults,
      ctr: Number(overallCtr(campaigns).toFixed(2)),
      avgCpc: Number(averageCpc(campaigns).toFixed(2)),
      avgCpm: Number(averageCpm(campaigns).toFixed(2)),
    },
    campaigns: compactCampaigns,
    ads: compactAds,
  };
};

const extractResponseText = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return '';

  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: string; output_text?: string }> }>;
  };

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const parts: string[] = [];
  for (const block of response.output || []) {
    for (const content of block.content || []) {
      if (typeof content.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      } else if (typeof content.output_text === 'string' && content.output_text.trim()) {
        parts.push(content.output_text.trim());
      }
    }
  }

  return parts.join('\n').trim();
};

const getAiConfig = () => {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    const baseUrl = (process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1').replace(/\/+$/, '');
    return {
      kind: 'gateway' as const,
      apiKey: gatewayKey,
      baseUrl,
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return {
      kind: 'openai' as const,
      apiKey: openAiKey,
      baseUrl: 'https://api.openai.com/v1',
    };
  }

  return null;
};

const getAiAnswer = async (
  question: string,
  campaigns: CampaignMetric[],
  history: ChatMessage[],
  ads: AdMetric[]
) => {
  const config = getAiConfig();
  if (!config) return null;

  const model =
    process.env.OPENAI_CHAT_MODEL ||
    process.env.AI_CHAT_MODEL ||
    (config.kind === 'gateway' ? 'openai/gpt-4.1-mini' : 'gpt-4.1-mini');
  const context = buildPromptContext(campaigns, ads);
  const recentHistory = history.slice(-8).map((item) => `${item.role}: ${item.content}`).join('\n');

  const systemPrompt = [
    'You are an analytics assistant for a marketing dashboard.',
    'Answer only from the provided JSON context.',
    'Use conversation history for references like "second one" or "that campaign".',
    'Be concise, clear, and numeric. Include exact values when available.',
    'If the data is insufficient, explicitly say what is missing.',
    'Do not invent benchmarks or external facts.',
  ].join(' ');

  const userPrompt = [
    recentHistory ? `Conversation so far:\n${recentHistory}` : '',
    `Question: ${question}`,
    'Context JSON:',
    JSON.stringify(context),
  ]
    .filter(Boolean)
    .join('\n\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_output_tokens: 260,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI request failed (${config.kind}) with status ${res.status}: ${errorText.slice(0, 300)}`);
    }

    const payload: unknown = await res.json();
    const answer = extractResponseText(payload);
    if (!answer) {
      throw new Error('OpenAI response did not include text output');
    }

    return answer;
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, history } = ChatSchema.parse(body);

    const campaigns = await db.campaign.findMany({
      select: {
        id: true,
        name: true,
        spend: true,
        impressions: true,
        clicks: true,
        results: true,
        cpc: true,
        cpm: true,
        platform: true,
      },
    });

    const adsRaw = await db.ad.findMany({
      select: {
        id: true,
        name: true,
        spend: true,
        impressions: true,
        clicks: true,
        results: true,
        cpc: true,
        cpm: true,
        campaign: { select: { name: true } },
        adSet: { select: { name: true } },
      },
    });
    const ads: AdMetric[] = adsRaw.map((ad) => ({
      id: ad.id,
      name: ad.name,
      campaignName: ad.campaign.name,
      adSetName: ad.adSet?.name || null,
      spend: ad.spend,
      impressions: ad.impressions,
      clicks: ad.clicks,
      results: ad.results,
      cpc: ad.cpc,
      cpm: ad.cpm,
    }));

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        answer: 'I do not have campaign data yet. Upload a CSV first, then ask again.',
        mode: 'basic',
      });
    }

    try {
      const aiAnswer = await getAiAnswer(question, campaigns, history, ads);
      if (aiAnswer) {
        return NextResponse.json({
          success: true,
          answer: aiAnswer,
          mode: 'ai',
        });
      }
    } catch (error) {
      console.error('AI chat fallback:', error);
    }

    return NextResponse.json({
      success: true,
      answer: buildRuleBasedAnswer(question, campaigns, history, ads),
      mode: 'basic',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
