import { Campaign, AdSet, Ad } from '@prisma/client';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 150,
    fontSize: 11,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 11,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  kpiCard: {
    width: '48%',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginRight: '2%',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    padding: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 11,
  },
  tableCell: {
    fontSize: 10,
  },
  col1: { width: '40%' },
  col2: { width: '15%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '15%' },
  recommendation: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff8e1',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  recommendationSummary: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 10,
    marginBottom: 3,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
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
}

/**
 * Generate PDF report for campaigns
 */
export function generateCampaignReportPDF(data: ReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>PPIOF Ads Report</Text>
        <Text style={styles.subtitle}>
          Date Range: {data.dateRange.start} to {data.dateRange.end}
        </Text>

        {/* Summary KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Spend</Text>
              <Text style={styles.kpiValue}>${data.totalSpend.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Impressions</Text>
              <Text style={styles.kpiValue}>{data.totalImpressions.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Clicks</Text>
              <Text style={styles.kpiValue}>{data.totalClicks.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Results</Text>
              <Text style={styles.kpiValue}>{data.totalResults.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg CPM</Text>
              <Text style={styles.kpiValue}>
                ${(data.totalSpend / data.totalImpressions * 1000 || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg CPC</Text>
              <Text style={styles.kpiValue}>
                ${(data.totalSpend / data.totalClicks || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Campaign List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Performance</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.col1]}>Campaign</Text>
              <Text style={[styles.tableCell, styles.col2]}>Spend</Text>
              <Text style={[styles.tableCell, styles.col2]}>Impr.</Text>
              <Text style={[styles.tableCell, styles.col2]}>Clicks</Text>
              <Text style={[styles.tableCell, styles.col2]}>CPC</Text>
            </View>
            {data.campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>{campaign.name}</Text>
                <Text style={[styles.tableCell, styles.col2]}>${campaign.spend.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{campaign.impressions.toLocaleString()}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{campaign.clicks.toLocaleString()}</Text>
                <Text style={[styles.tableCell, styles.col2]}>
                  ${(campaign.cpc || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Campaign Details */}
        {data.campaigns.map((campaign) => (
          <Page key={campaign.id} size="A4" style={styles.page}>
            <Text style={styles.title}>Campaign: {campaign.name}</Text>
            <Text style={styles.subtitle}>
              Objective: {campaign.objective || 'N/A'} | Status: {campaign.status || 'N/A'}
            </Text>

            {/* Campaign KPIs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Spend</Text>
                  <Text style={styles.kpiValue}>${campaign.spend.toFixed(2)}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Impressions</Text>
                  <Text style={styles.kpiValue}>{campaign.impressions.toLocaleString()}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Reach</Text>
                  <Text style={styles.kpiValue}>{campaign.reach.toLocaleString()}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Clicks</Text>
                  <Text style={styles.kpiValue}>{campaign.clicks.toLocaleString()}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Results</Text>
                  <Text style={styles.kpiValue}>{campaign.results.toLocaleString()}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>CTR</Text>
                  <Text style={styles.kpiValue}>
                    {((campaign.clicks / campaign.impressions) * 100 || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>CPM</Text>
                  <Text style={styles.kpiValue}>${(campaign.cpm || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>CPC</Text>
                  <Text style={styles.kpiValue}>${(campaign.cpc || 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Ad Sets */}
            {campaign.adSets && campaign.adSets.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ad Sets</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.col1]}>Ad Set</Text>
                    <Text style={[styles.tableCell, styles.col2]}>Spend</Text>
                    <Text style={[styles.tableCell, styles.col2]}>Impr.</Text>
                    <Text style={[styles.tableCell, styles.col2]}>Clicks</Text>
                    <Text style={[styles.tableCell, styles.col2]}>CPC</Text>
                  </View>
                  {campaign.adSets.map((adSet) => (
                    <View key={adSet.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.col1]}>{adSet.name}</Text>
                      <Text style={[styles.tableCell, styles.col2]}>${adSet.spend.toFixed(2)}</Text>
                      <Text style={[styles.tableCell, styles.col2]}>{adSet.impressions.toLocaleString()}</Text>
                      <Text style={[styles.tableCell, styles.col2]}>{adSet.clicks.toLocaleString()}</Text>
                      <Text style={[styles.tableCell, styles.col2]}>
                        ${(adSet.cpc || 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Top Ads */}
            {campaign.adSets && campaign.adSets.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Performing Ads</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.col1]}>Ad</Text>
                    <Text style={[styles.tableCell, styles.col2]}>Spend</Text>
                    <Text style={[styles.tableCell, styles.col2]}>Clicks</Text>
                    <Text style={[styles.tableCell, styles.col2]}>CTR</Text>
                    <Text style={[styles.tableCell, styles.col2]}>CPC</Text>
                  </View>
                  {campaign.adSets
                    .flatMap(adSet => adSet.ads || [])
                    .filter(ad => ad.impressions > 100)
                    .sort((a, b) => {
                      const ctrA = a.impressions > 0 ? a.clicks / a.impressions : 0;
                      const ctrB = b.impressions > 0 ? b.clicks / b.impressions : 0;
                      return ctrB - ctrA;
                    })
                    .slice(0, 5)
                    .map((ad) => (
                      <View key={ad.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.col1]}>{ad.name}</Text>
                        <Text style={[styles.tableCell, styles.col2]}>${ad.spend.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, styles.col2]}>{ad.clicks.toLocaleString()}</Text>
                        <Text style={[styles.tableCell, styles.col2]}>
                          {((ad.clicks / ad.impressions) * 100 || 0).toFixed(2)}%
                        </Text>
                        <Text style={[styles.tableCell, styles.col2]}>
                          ${(ad.cpc || 0).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            <Text style={styles.footer}>
              Generated on {new Date().toLocaleDateString()} | PPIOF Ads Report
            </Text>
          </Page>
        ))}
      </Page>
    </Document>
  );
}
