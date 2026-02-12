import { Campaign, Ad, AdSet } from '@prisma/client';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#4B5563',
  },
  generated: {
    fontSize: 9,
    color: '#6B7280',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -4,
    marginRight: -4,
  },
  summaryCard: {
    width: '33.33%',
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 8,
  },
  summaryCardInner: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    backgroundColor: '#F9FAFB',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  insightsBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  insightLine: {
    marginBottom: 4,
    color: '#374151',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableCell: {
    fontSize: 9,
    color: '#111827',
  },
  colCampaign: {
    width: '40%',
  },
  colMetric: {
    width: '15%',
    textAlign: 'right',
  },
  colCtr: {
    width: '10%',
    textAlign: 'right',
  },
  barsBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    width: '34%',
    fontSize: 8,
    color: '#374151',
    paddingRight: 4,
  },
  barTrack: {
    width: '50%',
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginRight: 6,
  },
  barFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#111827',
  },
  barValue: {
    width: '16%',
    textAlign: 'right',
    fontSize: 8,
    color: '#111827',
  },
  campaignCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  creativeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -4,
    marginRight: -4,
    marginBottom: 10,
  },
  creativeCard: {
    width: '50%',
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 8,
  },
  creativeCardInner: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  creativeImage: {
    width: '100%',
    height: 96,
    objectFit: 'cover',
    backgroundColor: '#E5E7EB',
  },
  creativeImageFallback: {
    width: '100%',
    height: 96,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creativeImageFallbackText: {
    fontSize: 8,
    color: '#6B7280',
  },
  creativeMeta: {
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
  },
  creativeName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  creativeSub: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2,
  },
  creativeSpend: {
    fontSize: 8,
    color: '#374151',
  },
  campaignTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  campaignMeta: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 6,
  },
  campaignKpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  campaignKpi: {
    width: '24%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    backgroundColor: '#F9FAFB',
  },
  campaignKpiLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2,
  },
  campaignKpiValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  adSetLine: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 2,
  },
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
});

interface ReportData {
  campaigns: (Campaign & {
    adSets?: (AdSet & {
      ads?: Ad[];
    })[];
  })[];
  dateRange: {
    start: string;
    end: string;
  };
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalResults: number;
  creatives?: Array<{
    adName: string;
    campaignName: string;
    creativeUrl: string | null;
    creativeType: string | null;
    spend: number;
    imageDataUrl: string | null;
  }>;
}

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

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

export function generateCampaignReportPDF(data: ReportData) {
  const campaigns = [...data.campaigns].sort((a, b) => b.spend - a.spend);
  const topCampaigns = campaigns.slice(0, 10);
  const topCreatives = (data.creatives || []).filter((creative) => Boolean(creative.creativeUrl)).slice(0, 8);
  const campaignCount = campaigns.length;

  const ctr = data.totalImpressions > 0 ? (data.totalClicks / data.totalImpressions) * 100 : 0;
  const cpc = data.totalClicks > 0 ? data.totalSpend / data.totalClicks : 0;
  const cpm = data.totalImpressions > 0 ? (data.totalSpend / data.totalImpressions) * 1000 : 0;

  const highestSpend = campaigns[0];
  const bestCtr = [...campaigns]
    .filter((campaign) => campaign.impressions > 0)
    .sort((a, b) => b.clicks / b.impressions - a.clicks / a.impressions)[0];
  const maxSpend = Math.max(...topCampaigns.map((campaign) => campaign.spend), 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>ADC Ads Performance Report</Text>
            <Text style={styles.subtitle}>
              Reporting Window: {data.dateRange.start} to {data.dateRange.end}
            </Text>
          </View>
          <Text style={styles.generated}>Generated {new Date().toLocaleDateString('en-US')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Campaigns</Text>
                <Text style={styles.summaryValue}>{formatNumber(campaignCount)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Total Spend</Text>
                <Text style={styles.summaryValue}>{formatCurrency(data.totalSpend)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Impressions</Text>
                <Text style={styles.summaryValue}>{formatNumber(data.totalImpressions)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>Clicks</Text>
                <Text style={styles.summaryValue}>{formatNumber(data.totalClicks)}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>CTR</Text>
                <Text style={styles.summaryValue}>{ctr.toFixed(2)}%</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardInner}>
                <Text style={styles.summaryLabel}>CPM / CPC</Text>
                <Text style={styles.summaryValue}>{formatCurrency(cpm)} / {formatCurrency(cpc)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Takeaways</Text>
          <View style={styles.insightsBox}>
            <Text style={styles.insightLine}>
              • Top spend campaign: {highestSpend ? truncate(highestSpend.name, 48) : 'N/A'}
              {highestSpend ? ` (${formatCurrency(highestSpend.spend)})` : ''}
            </Text>
            <Text style={styles.insightLine}>
              • Best CTR campaign: {bestCtr ? truncate(bestCtr.name, 48) : 'N/A'}
              {bestCtr ? ` (${((bestCtr.clicks / bestCtr.impressions) * 100).toFixed(2)}%)` : ''}
            </Text>
            <Text style={styles.insightLine}>
              • Total results tracked: {formatNumber(data.totalResults)}
            </Text>
            <Text style={styles.insightLine}>
              • Average CPC across all campaigns: {formatCurrency(cpc)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Campaign Performance</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colCampaign]}>Campaign</Text>
              <Text style={[styles.tableHeaderCell, styles.colMetric]}>Spend</Text>
              <Text style={[styles.tableHeaderCell, styles.colMetric]}>Impr.</Text>
              <Text style={[styles.tableHeaderCell, styles.colMetric]}>Clicks</Text>
              <Text style={[styles.tableHeaderCell, styles.colCtr]}>CTR</Text>
            </View>
            {topCampaigns.map((campaign) => {
              const campaignCtr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
              return (
                <View key={campaign.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colCampaign]}>{truncate(campaign.name, 46)}</Text>
                  <Text style={[styles.tableCell, styles.colMetric]}>{formatCurrency(campaign.spend)}</Text>
                  <Text style={[styles.tableCell, styles.colMetric]}>{formatNumber(campaign.impressions)}</Text>
                  <Text style={[styles.tableCell, styles.colMetric]}>{formatNumber(campaign.clicks)}</Text>
                  <Text style={[styles.tableCell, styles.colCtr]}>{campaignCtr.toFixed(2)}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spend Distribution (Top Campaigns)</Text>
          <View style={styles.barsBox}>
            {topCampaigns.slice(0, 8).map((campaign) => (
              <View key={`bar-${campaign.id}`} style={styles.barRow}>
                <Text style={styles.barLabel}>{truncate(campaign.name, 30)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(4, Math.round((campaign.spend / maxSpend) * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{formatCurrency(campaign.spend)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>ADC Ads Reporting</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        {topCreatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Creative Highlights</Text>
            <View style={styles.creativeGrid}>
              {topCreatives.map((creative, index) => (
                <View key={`creative-${creative.adName}-${index}`} style={styles.creativeCard} wrap={false}>
                  <View style={styles.creativeCardInner}>
                    {creative.imageDataUrl ? (
                      <Image src={creative.imageDataUrl} style={styles.creativeImage} />
                    ) : (
                      <View style={styles.creativeImageFallback}>
                        <Text style={styles.creativeImageFallbackText}>
                          {creative.creativeType === 'VIDEO' ? 'Video Preview' : 'Creative Preview'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.creativeMeta}>
                      <Text style={styles.creativeName}>{truncate(creative.adName, 40)}</Text>
                      <Text style={styles.creativeSub}>{truncate(creative.campaignName, 42)}</Text>
                      <Text style={styles.creativeSpend}>
                        {creative.creativeType || 'IMAGE'} • {formatCurrency(creative.spend)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Campaign Drilldown (Top 8 by Spend)</Text>
        {topCampaigns.slice(0, 8).map((campaign) => {
          const campaignCtr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
          const topAdSets = (campaign.adSets || []).slice().sort((a, b) => b.spend - a.spend).slice(0, 3);

          return (
            <View key={`detail-${campaign.id}`} style={styles.campaignCard} wrap={false}>
              <Text style={styles.campaignTitle}>{campaign.name}</Text>
              <Text style={styles.campaignMeta}>
                {campaign.platform || 'N/A'} | {campaign.status || 'N/A'}
              </Text>

              <View style={styles.campaignKpiRow}>
                <View style={styles.campaignKpi}>
                  <Text style={styles.campaignKpiLabel}>Spend</Text>
                  <Text style={styles.campaignKpiValue}>{formatCurrency(campaign.spend)}</Text>
                </View>
                <View style={styles.campaignKpi}>
                  <Text style={styles.campaignKpiLabel}>Impressions</Text>
                  <Text style={styles.campaignKpiValue}>{formatNumber(campaign.impressions)}</Text>
                </View>
                <View style={styles.campaignKpi}>
                  <Text style={styles.campaignKpiLabel}>Clicks</Text>
                  <Text style={styles.campaignKpiValue}>{formatNumber(campaign.clicks)}</Text>
                </View>
                <View style={styles.campaignKpi}>
                  <Text style={styles.campaignKpiLabel}>CTR</Text>
                  <Text style={styles.campaignKpiValue}>{campaignCtr.toFixed(2)}%</Text>
                </View>
              </View>

              {topAdSets.length > 0 ? (
                <>
                  <Text style={styles.campaignKpiLabel}>Top Ad Sets by Spend</Text>
                  {topAdSets.map((adSet) => (
                    <Text key={adSet.id} style={styles.adSetLine}>
                      • {truncate(adSet.name, 60)} — {formatCurrency(adSet.spend)} spend, {formatNumber(adSet.clicks)} clicks
                    </Text>
                  ))}
                </>
              ) : (
                <Text style={styles.adSetLine}>• No ad set data available</Text>
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>Generated on {new Date().toLocaleDateString('en-US')}</Text>
      </Page>
    </Document>
  );
}
