import { Campaign, AdSet, Ad } from '@prisma/client';

export interface MetricComparison {
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
}

export interface Recommendation {
  claim: string;
  evidence: string;
  suggestedAction: string;
  confidence: number; // 0-1
  severity: 'high' | 'medium' | 'low';
  metrics: string[];
}

type CampaignMetrics = Pick<
  Campaign,
  'spend' | 'impressions' | 'reach' | 'clicks' | 'results' | 'cpm' | 'cpc'
>;

type AdSetMetrics = Pick<AdSet, 'spend' | 'impressions' | 'clicks' | 'cpc'>;

/**
 * Generate recommendations for a campaign
 */
export function generateCampaignRecommendations(
  campaign: CampaignMetrics,
  previousCampaign?: CampaignMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const spend = campaign.spend;
  const impressions = campaign.impressions;
  const reach = campaign.reach;
  const clicks = campaign.clicks;
  const results = campaign.results;
  const cpm = campaign.cpm || (impressions > 0 ? calculateCPM(spend, impressions) : 0);
  const cpc = campaign.cpc || (clicks > 0 ? calculateCPC(spend, clicks) : 0);

  // Previous comparison if available
  const spendChange = previousCampaign
    ? campaign.spend - previousCampaign.spend
    : undefined;
  const spendChangePercent = previousCampaign && previousCampaign.spend > 0
    ? ((campaign.spend - previousCampaign.spend) / previousCampaign.spend) * 100
    : undefined;

  const cpcChange = previousCampaign
    ? cpc - (previousCampaign.cpc || 0)
    : undefined;
  const cpcChangePercent = previousCampaign && previousCampaign.cpc
    ? ((cpc - (previousCampaign.cpc || 0)) / previousCampaign.cpc) * 100
    : undefined;

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const conversionRate = clicks > 0 ? (results / clicks) * 100 : 0;
  const costPerResult = results > 0 ? spend / results : 0;
  const confidence = calculateConfidence({ impressions, clicks, results });

  // High CPC Recommendation
  if (cpc > 3) {
    recommendations.push({
      claim: 'Cost per click is high relative to efficient ranges.',
      evidence: `CPC is $${cpc.toFixed(2)} across ${clicks.toLocaleString()} clicks (${ctr.toFixed(2)}% CTR).`,
      suggestedAction:
        'Tighten targeting, refresh creative, and test alternative placements to lift CTR and reduce CPC.',
      confidence,
      severity: 'high',
      metrics: ['CPC', 'Clicks', 'Impressions'],
    });
  }

  // Low CTR Recommendation
  if (ctr < 0.5) {
    recommendations.push({
      claim: 'Click-through rate is low.',
      evidence: `CTR is ${ctr.toFixed(2)}% on ${impressions.toLocaleString()} impressions.`,
      suggestedAction:
        'Refresh creative and copy; test new formats (carousel/video) and stronger CTAs.',
      confidence,
      severity: 'high',
      metrics: ['CTR', 'Impressions', 'Clicks'],
    });
  }

  // Low Conversion Rate
  if (conversionRate < 2 && results > 0) {
    recommendations.push({
      claim: 'Conversion rate is underperforming.',
      evidence: `Conversion rate is ${conversionRate.toFixed(2)}% with ${results.toLocaleString()} results.`,
      suggestedAction:
        'Audit landing page friction and test offers; consider retargeting non-converters.',
      confidence,
      severity: cpc > 2 ? 'high' : 'medium',
      metrics: ['Conversion Rate', 'Results', 'Clicks'],
    });
  }

  // High CPM Recommendation
  if (cpm > 20) {
    recommendations.push({
      claim: 'CPM is elevated, indicating inefficient delivery.',
      evidence: `CPM is $${cpm.toFixed(2)} across ${impressions.toLocaleString()} impressions.`,
      suggestedAction:
        'Broaden audiences and test objectives/placements to lower CPM.',
      confidence,
      severity: 'medium',
      metrics: ['CPM', 'Spend', 'Impressions'],
    });
  }

  // CPC Increased Significantly
  if (cpcChangePercent && cpcChangePercent > 30 && previousCampaign) {
    recommendations.push({
      claim: 'Cost per click increased materially versus previous period.',
      evidence: `CPC rose from $${previousCampaign.cpc?.toFixed(2) || '0'} to $${cpc.toFixed(2)} (${cpcChangePercent.toFixed(1)}% increase).`,
      suggestedAction:
        'Refresh creative and rotate audiences to address fatigue; reallocate budget to top performers.',
      confidence,
      severity: cpcChangePercent > 50 ? 'high' : 'medium',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  // Low Reach Compared to Impressions
  if (reach > 0 && impressions > 0) {
    const frequency = impressions / reach;
    if (frequency > 5) {
      recommendations.push({
        claim: 'Ad frequency is high and may indicate fatigue.',
        evidence: `Average frequency is ${frequency.toFixed(1)}x (impressions/reach).`,
        suggestedAction:
          'Expand audiences or add frequency caps; test new markets.',
        confidence,
        severity: 'medium',
        metrics: ['Frequency', 'Reach', 'Impressions'],
      });
    }
  }

  // High Spend with Low Results
  if (spend > 100 && results < 10) {
    recommendations.push({
      claim: 'Return on spend is weak.',
      evidence: `$${spend.toFixed(2)} spent for ${results} results (CPR $${costPerResult.toFixed(2)}).`,
      suggestedAction:
        'Audit targeting and creative; shift budget to stronger performers.',
      confidence,
      severity: 'high',
      metrics: ['Spend', 'Results', 'Cost Per Result'],
    });
  }

  // Good Performance - Maintain Recommendation
  if (ctr > 1 && cpc < 2 && conversionRate > 3) {
    recommendations.push({
      claim: 'Performance is strong and scalable.',
      evidence: `CTR ${ctr.toFixed(2)}%, CPC $${cpc.toFixed(2)}, Conversion Rate ${conversionRate.toFixed(2)}%.`,
      suggestedAction:
        'Scale budget gradually (+20–30%) while monitoring efficiency.',
      confidence,
      severity: 'low',
      metrics: ['CTR', 'CPC', 'Conversion Rate'],
    });
  }

  return recommendations.length > 0 ? recommendations : [{
    claim: 'Insufficient data to recommend changes.',
    evidence: 'Need more delivery to make confident recommendations.',
    suggestedAction: 'Monitor until at least 1,000 impressions or 100 clicks.',
    confidence: 0.2,
    severity: 'low',
    metrics: ['Impressions', 'Clicks'],
  }];
}

/**
 * Generate recommendations for an ad set
 */
export function generateAdSetRecommendations(
  adSet: AdSetMetrics,
  previousAdSet?: AdSetMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const spend = adSet.spend;
  const impressions = adSet.impressions;
  const clicks = adSet.clicks;
  const cpc = adSet.cpc || (clicks > 0 ? calculateCPC(spend, clicks) : 0);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Ad set-specific recommendations
  if (ctr < 0.4) {
    recommendations.push({
      claim: 'Ad set CTR is low.',
      evidence: `CTR ${ctr.toFixed(2)}% with ${impressions.toLocaleString()} impressions.`,
      suggestedAction:
        'Tighten targeting and test new creative variants within the ad set.',
      confidence: calculateConfidence({ impressions, clicks: adSet.clicks, results: 0 }),
      severity: 'medium',
      metrics: ['CTR', 'Clicks', 'Impressions'],
    });
  }

  if (cpc > 3) {
    recommendations.push({
      claim: 'Ad set CPC is high.',
      evidence: `CPC $${cpc.toFixed(2)} on ${adSet.clicks.toLocaleString()} clicks.`,
      suggestedAction: 'Refresh creative and test alternative placements.',
      confidence: calculateConfidence({ impressions, clicks: adSet.clicks, results: 0 }),
      severity: 'high',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      claim: 'Ad set performance is stable.',
      evidence: 'Metrics are within acceptable ranges.',
      suggestedAction: 'Maintain and test incremental optimizations.',
      confidence: calculateConfidence({ impressions, clicks: adSet.clicks, results: 0 }),
      severity: 'low',
      metrics: ['CPC', 'CTR'],
    });
  }

  return recommendations;
}

/**
 * Generate recommendations for an ad
 */
export function generateAdRecommendations(
  ad: Ad,
  previousAd?: Ad
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const spend = ad.spend;
  const impressions = ad.impressions;
  const clicks = ad.clicks;
  const cpc = ad.cpc || (clicks > 0 ? calculateCPC(spend, clicks) : 0);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Ad-specific recommendations
  if (ctr < 0.4) {
    recommendations.push({
      claim: 'Ad CTR is low.',
      evidence: `CTR ${ctr.toFixed(2)}% with ${impressions.toLocaleString()} impressions.`,
      suggestedAction: 'Test new creative formats and copy variations.',
      confidence: calculateConfidence({ impressions, clicks, results: 0 }),
      severity: 'high',
      metrics: ['CTR', 'Clicks', 'Impressions'],
    });
  }

  if (cpc > 4) {
    recommendations.push({
      claim: 'Ad CPC is high.',
      evidence: `CPC $${cpc.toFixed(2)} on ${clicks.toLocaleString()} clicks.`,
      suggestedAction: 'Refresh creative and test alternate placements.',
      confidence: calculateConfidence({ impressions, clicks, results: 0 }),
      severity: 'high',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  if (recommendations.length === 0 && spend > 10) {
    recommendations.push({
      claim: 'Ad performance is stable.',
      evidence: `CPC $${cpc.toFixed(2)} with ${clicks.toLocaleString()} clicks.`,
      suggestedAction: 'Monitor for fatigue and refresh creative periodically.',
      confidence: calculateConfidence({ impressions, clicks, results: 0 }),
      severity: 'low',
      metrics: ['CPC', 'CTR'],
    });
  }

  return recommendations.length > 0 ? recommendations : [{
    claim: 'Limited data to evaluate this ad.',
    evidence: 'Not enough impressions or clicks to be confident.',
    suggestedAction: 'Wait until at least 500 impressions.',
    confidence: 0.2,
    severity: 'low',
    metrics: ['Impressions', 'Clicks'],
  }];
}

function calculateConfidence({
  impressions,
  clicks,
  results,
}: {
  impressions: number;
  clicks: number;
  results: number;
}): number {
  const impressionScore = Math.min(1, impressions / 100000);
  const clickScore = Math.min(1, clicks / 1000);
  const resultScore = Math.min(1, results / 200);
  const raw = impressionScore * 0.4 + clickScore * 0.4 + resultScore * 0.2;
  return Math.round(raw * 100) / 100;
}

/**
 * Calculate CPM helper
 */
function calculateCPM(spend: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (spend / impressions) * 1000;
}

/**
 * Calculate CPC helper
 */
function calculateCPC(spend: number, clicks: number): number {
  if (clicks === 0) return 0;
  return spend / clicks;
}

/**
 * Get top performing ads based on CTR
 */
export function getTopPerformingAds(ads: Ad[], limit: number = 5): Ad[] {
  return ads
    .filter(ad => ad.impressions > 100) // Only consider ads with meaningful data
    .sort((a, b) => {
      const ctrA = a.impressions > 0 ? a.clicks / a.impressions : 0;
      const ctrB = b.impressions > 0 ? b.clicks / b.impressions : 0;
      return ctrB - ctrA;
    })
    .slice(0, limit);
}
