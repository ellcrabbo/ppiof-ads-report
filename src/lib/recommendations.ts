import { Campaign, AdSet, Ad } from '@prisma/client';

export interface MetricComparison {
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
}

export interface Recommendation {
  summary: string;
  whatHappened: string;
  whatToChange: string;
  whatToTest: string;
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

  // High CPC Recommendation
  if (cpc > 3) {
    recommendations.push({
      summary: 'High Cost Per Click',
      whatHappened: `CPC is $${cpc.toFixed(2)}, which is significantly higher than industry benchmarks ($1-2 for most verticals).`,
      whatToChange: 'Review audience targeting - consider narrowing to more specific segments. Test different ad placements and optimize creative for higher click-through rates.',
      whatToTest: 'A/B test new creatives with different value propositions. Test lookalike audiences based on converters. Consider adjusting bid strategy to lowest cost.',
      severity: 'high',
      metrics: ['CPC', 'Clicks', 'Impressions'],
    });
  }

  // Low CTR Recommendation
  if (ctr < 0.5) {
    recommendations.push({
      summary: 'Low Click-Through Rate',
      whatHappened: `CTR is ${ctr.toFixed(2)}%, indicating ads may not be resonating with the audience.`,
      whatToChange: 'Refresh ad creative with new images, copy, or formats. Review ad copy for clarity and compelling offers. Ensure headlines are attention-grabbing.',
      whatToTest: 'Test carousel ads vs single image. Test video vs static. Test different calls-to-action. Try different ad placements (e.g., Stories, Feed).',
      severity: 'high',
      metrics: ['CTR', 'Impressions', 'Clicks'],
    });
  }

  // Low Conversion Rate
  if (conversionRate < 2 && results > 0) {
    recommendations.push({
      summary: 'Low Conversion Rate',
      whatHappened: `Conversion rate is ${conversionRate.toFixed(2)}%. Clickers are not converting.`,
      whatToChange: 'Review landing page experience. Ensure clear call-to-action and value proposition. Check for friction in conversion funnel.',
      whatToTest: 'A/B test landing page elements (headline, CTA, form fields). Test different offers or incentives. Consider retargeting campaigns for non-converters.',
      severity: cpc > 2 ? 'high' : 'medium',
      metrics: ['Conversion Rate', 'Results', 'Clicks'],
    });
  }

  // High CPM Recommendation
  if (cpm > 20) {
    recommendations.push({
      summary: 'High Cost Per Mille',
      whatHappened: `CPM is $${cpm.toFixed(2)}, indicating high competition or inefficient targeting.`,
      whatToChange: 'Consider expanding audience to reduce competition. Test campaign objectives to find more efficient delivery times. Review geographic targeting for cost optimization.',
      whatToTest: 'Test audience lookalikes at different percentages. Test different campaign objectives. Consider dayparting to advertise during lower-competition hours.',
      severity: 'medium',
      metrics: ['CPM', 'Spend', 'Impressions'],
    });
  }

  // CPC Increased Significantly
  if (cpcChangePercent && cpcChangePercent > 30 && previousCampaign) {
    recommendations.push({
      summary: 'CPC Increased Significantly',
      whatHappened: `CPC rose from $${previousCampaign.cpc?.toFixed(2) || '0'} to $${cpc.toFixed(2)} (${cpcChangePercent.toFixed(1)}% increase).`,
      whatToChange: 'Audit audience targeting for saturation. Review creative for fatigue. Consider refreshing campaigns that have been running too long.',
      whatToTest: 'Test new audience segments. Launch new creative variations. Consider pausing underperforming ads and reallocating budget to top performers.',
      severity: cpcChangePercent > 50 ? 'high' : 'medium',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  // Low Reach Compared to Impressions
  if (reach > 0 && impressions > 0) {
    const frequency = impressions / reach;
    if (frequency > 5) {
      recommendations.push({
        summary: 'High Ad Frequency',
        whatHappened: `Average frequency is ${frequency.toFixed(1)}x, indicating audiences may be seeing ads too often.`,
        whatToChange: 'Expand audience to reach new people. Increase budget for new audiences. Consider campaign frequency capping.',
        whatToTest: 'Test lookalike audiences at different percentages. Test new interest-based audiences. Consider launching campaigns in new markets.',
        severity: 'medium',
        metrics: ['Frequency', 'Reach', 'Impressions'],
      });
    }
  }

  // High Spend with Low Results
  if (spend > 100 && results < 10) {
    recommendations.push({
      summary: 'Low Return on Spend',
      whatHappened: `$${spend.toFixed(2)} spent with only ${results} results (Cost per result: $${costPerResult.toFixed(2)}).`,
      whatToChange: 'Review campaign objective alignment. Audit targeting and creative. Consider reallocating budget to better-performing campaigns.',
      whatToTest: 'Test different campaign objectives. Test conversion events optimization. Review pixel setup and tracking accuracy.',
      severity: 'high',
      metrics: ['Spend', 'Results', 'Cost Per Result'],
    });
  }

  // Good Performance - Maintain Recommendation
  if (ctr > 1 && cpc < 2 && conversionRate > 3) {
    recommendations.push({
      summary: 'Strong Performance',
      whatHappened: `Campaign showing strong metrics: CTR ${ctr.toFixed(2)}%, CPC $${cpc.toFixed(2)}, Conversion Rate ${conversionRate.toFixed(2)}%.`,
      whatToChange: 'Maintain current strategy. Consider scaling budget incrementally while monitoring efficiency.',
      whatToTest: 'Test scaling by 20-30% to see if performance holds. Test new audiences similar to current performers. Expand to similar products or offers.',
      severity: 'low',
      metrics: ['CTR', 'CPC', 'Conversion Rate'],
    });
  }

  return recommendations.length > 0 ? recommendations : [{
    summary: 'Insufficient Data',
    whatHappened: 'Not enough performance data to generate specific recommendations.',
    whatToChange: 'Allow campaign to accumulate more data before making significant changes.',
    whatToTest: 'Continue monitoring and check back after reaching at least 1,000 impressions or 100 clicks.',
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
      summary: 'Low CTR for Ad Set',
      whatHappened: `Ad set CTR is ${ctr.toFixed(2)}%, below recommended 0.5% threshold.`,
      whatToChange: 'Review ad set targeting specificity. Audience may be too broad or not aligned with creative.',
      whatToTest: 'A/B test different creative variations within this ad set. Test narrower audience segments based on performance.',
      severity: 'medium',
      metrics: ['CTR', 'Clicks', 'Impressions'],
    });
  }

  if (cpc > 3) {
    recommendations.push({
      summary: 'High CPC in Ad Set',
      whatHappened: `CPC of $${cpc.toFixed(2)} is above optimal range for this ad set.`,
      whatToChange: 'Consider adjusting targeting or refreshing creative in this ad set.',
      whatToTest: 'Test new creatives specifically for this audience. Test bid strategy adjustments.',
      severity: 'high',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      summary: 'Ad Set Performing Well',
      whatHappened: 'Ad set metrics are within acceptable ranges.',
      whatToChange: 'Continue monitoring performance.',
      whatToTest: 'Test incremental optimizations to improve efficiency.',
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
      summary: 'Low CTR for Ad',
      whatHappened: `Ad CTR is ${ctr.toFixed(2)}%. Creative may not be engaging.`,
      whatToChange: 'Update ad creative, headline, or call-to-action.',
      whatToTest: 'Test different creative formats (image vs video vs carousel). Test new copy variations.',
      severity: 'high',
      metrics: ['CTR', 'Clicks', 'Impressions'],
    });
  }

  if (cpc > 4) {
    recommendations.push({
      summary: 'High CPC for Ad',
      whatHappened: `CPC of $${cpc.toFixed(2)} indicates inefficient ad delivery.`,
      whatToChange: 'Review creative relevance and audience fit.',
      whatToTest: 'Test completely new creative concept. Test different ad placements.',
      severity: 'high',
      metrics: ['CPC', 'Spend', 'Clicks'],
    });
  }

  if (recommendations.length === 0 && spend > 10) {
    recommendations.push({
      summary: 'Ad Performing Adequately',
      whatHappened: `Ad showing reasonable performance with CPC at $${cpc.toFixed(2)}.`,
      whatToChange: 'Monitor for creative fatigue over time.',
      whatToTest: 'Test creative refresh after 2-3 weeks if CTR declines.',
      severity: 'low',
      metrics: ['CPC', 'CTR'],
    });
  }

  return recommendations.length > 0 ? recommendations : [{
    summary: 'Limited Data',
    whatHappened: 'Insufficient data to evaluate ad performance.',
    whatToChange: 'Allow more time for ad to accumulate impressions and clicks.',
    whatToTest: 'Check back after reaching at least 500 impressions.',
    severity: 'low',
    metrics: ['Impressions', 'Clicks'],
  }];
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
