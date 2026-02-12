import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCSVFile, parseCurrency, parseNumber, calculateCPM, calculateCPC } from '@/lib/csv-parser';
import { z } from 'zod';

const UploadSchema = z.object({
  platform: z.enum(['meta', 'facebook', 'instagram']),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
});

function inferCreativeType(url?: string | null): 'IMAGE' | 'VIDEO' | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(lower)) return 'VIDEO';
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return 'IMAGE';
  return null;
}

function normalizePlatform(rawPlatform: string | undefined, fallback: 'meta' | 'facebook' | 'instagram') {
  const source = (rawPlatform || fallback).toLowerCase().trim();
  const hasInstagram = source.includes('instagram');
  const hasFacebook = source.includes('facebook');

  if (hasInstagram && !hasFacebook) return 'instagram';
  if (hasFacebook && !hasInstagram) return 'facebook';
  if (source.includes('meta') || (hasInstagram && hasFacebook)) return 'meta';

  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate input
    const validatedData = UploadSchema.parse({ platform });

    // Parse CSV
    const parseResult = await parseCSVFile(file);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Create import run
    const previousImportRun = await db.importRun.findFirst({
      where: { platform: validatedData.platform },
      orderBy: { createdAt: 'desc' },
    });

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalResults = 0;

    const importRun = await db.importRun.create({
      data: {
        fileName: file.name,
        platform: validatedData.platform,
        rowCount: parseResult.data.length,
        rowsProcessed: parseResult.data.length,
        rowsDropped: parseResult.rowsDropped,
      },
    });

    // Process data
    const campaignsMap = new Map<string, any>();
    const adSetsMap = new Map<string, any>();
    const adsMap = new Map<string, any>();
    const countryMetricsMap = new Map<
      string,
      {
        country: string;
        spend: number;
        impressions: number;
        reach: number;
        clicks: number;
        results: number;
      }
    >();

    for (const row of parseResult.data) {
      const campaignName = row.campaignName || 'Unknown Campaign';
      const adSetName = row.adSetName || campaignName;
      const adName = row.adName || adSetName;

      const spend = parseCurrency(row.amountSpent || '');
      const impressions = parseNumber(row.impressions || '');
      const reach = parseNumber(row.reach || '');
      const clicks = parseNumber(row.linkClicks || '');
      const results = parseNumber(row.results || '');
      const resultType = row.resultType;
      const objective = row.objective;
      const status = row.status;
      const platform = normalizePlatform(row.platform, validatedData.platform);
      const creativeUrl = row.creativeUrl;
      const creativeType = inferCreativeType(creativeUrl);
      const country = row.country?.trim() || '';

      const cpm = calculateCPM(spend, impressions);
      const cpc = calculateCPC(spend, clicks);

      totalSpend += spend;
      totalImpressions += impressions;
      totalClicks += clicks;
      totalResults += results;

      if (country) {
        const countryKey = country.toLowerCase();
        if (!countryMetricsMap.has(countryKey)) {
          countryMetricsMap.set(countryKey, {
            country,
            spend: 0,
            impressions: 0,
            reach: 0,
            clicks: 0,
            results: 0,
          });
        }
        const countryMetrics = countryMetricsMap.get(countryKey)!;
        countryMetrics.spend += spend;
        countryMetrics.impressions += impressions;
        countryMetrics.reach += reach;
        countryMetrics.clicks += clicks;
        countryMetrics.results += results;
      }

      // Aggregate campaign data
      if (!campaignsMap.has(campaignName)) {
        campaignsMap.set(campaignName, {
          importRunId: importRun.id,
          name: campaignName,
          objective,
          status,
          platform,
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          results: 0,
          resultType,
          cpm: 0,
          cpc: 0,
          rawRow: JSON.stringify(row),
        });
      }

      const campaign = campaignsMap.get(campaignName);
      campaign.spend += spend;
      campaign.impressions += impressions;
      campaign.reach += reach;
      campaign.clicks += clicks;
      campaign.results += results;

      // Aggregate ad set data
      if (!adSetsMap.has(`${campaignName}|${adSetName}`)) {
        adSetsMap.set(`${campaignName}|${adSetName}`, {
          name: adSetName,
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          results: 0,
          resultType,
          cpm: 0,
          cpc: 0,
          rawRow: JSON.stringify(row),
        });
      }

      const adSet = adSetsMap.get(`${campaignName}|${adSetName}`);
      adSet.spend += spend;
      adSet.impressions += impressions;
      adSet.reach += reach;
      adSet.clicks += clicks;
      adSet.results += results;
    }

    // Calculate computed metrics for campaigns
    for (const campaign of campaignsMap.values()) {
      campaign.cpm = calculateCPM(campaign.spend, campaign.impressions);
      campaign.cpc = calculateCPC(campaign.spend, campaign.clicks);
    }

    // Calculate computed metrics for ad sets
    for (const adSet of adSetsMap.values()) {
      adSet.cpm = calculateCPM(adSet.spend, adSet.impressions);
      adSet.cpc = calculateCPC(adSet.spend, adSet.clicks);
    }

    // Insert campaigns
    const createdCampaigns = await Promise.all(
      Array.from(campaignsMap.values()).map(campaignData =>
        db.campaign.create({ data: campaignData })
      )
    );

    // Build campaign name to ID map
    const campaignNameToId = new Map(
      createdCampaigns.map(c => [c.name, c.id])
    );

    // Insert ad sets
    const createdAdSets = await Promise.all(
      Array.from(adSetsMap.entries()).map(([key, adSetData]) => {
        const [campaignName] = key.split('|');
        return db.adSet.create({
          data: {
            ...adSetData,
            campaignId: campaignNameToId.get(campaignName)!,
            importRunId: importRun.id,
          },
        });
      })
    );

    // Build ad set name to ID map
    const adSetKeyToId = new Map(
      createdAdSets.map(as => [`${as.campaignId}|${as.name}`, as.id])
    );

    // Insert ads
    const adMap = new Map<string, any>();
    let duplicatesMerged = 0;

    for (const row of parseResult.data) {
      const campaignName = row.campaignName || 'Unknown Campaign';
      const adSetName = row.adSetName || campaignName;
      const adName = row.adName || adSetName;
      const campaignId = campaignNameToId.get(campaignName)!;
      const adSetId = adSetKeyToId.get(`${campaignId}|${adSetName}`);

      const spend = parseCurrency(row.amountSpent || '');
      const impressions = parseNumber(row.impressions || '');
      const reach = parseNumber(row.reach || '');
      const clicks = parseNumber(row.linkClicks || '');
      const results = parseNumber(row.results || '');
      const resultType = row.resultType;
      const creativeUrl = row.creativeUrl;
      const creativeType = inferCreativeType(creativeUrl);

      const cpm = calculateCPM(spend, impressions);
      const cpc = calculateCPC(spend, clicks);

      const adKey = `${campaignId}|${adSetId || ''}|${adName}`;

      if (!adMap.has(adKey)) {
        adMap.set(adKey, {
          name: adName,
          campaignId,
          adSetId,
          importRunId: importRun.id,
          creativeUrl,
          creativeType,
          creativeCarouselTotal: null,
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          results: 0,
          resultType,
          cpm: 0,
          cpc: 0,
          rawRow: JSON.stringify(row),
        });
      } else {
        duplicatesMerged += 1;
      }

      const ad = adMap.get(adKey)!;
      ad.spend += spend;
      ad.impressions += impressions;
      ad.reach += reach;
      ad.clicks += clicks;
      ad.results += results;
    }

    // Insert ads
    await db.ad.createMany({
      data: Array.from(adMap.values()),
    });

    await db.importRun.update({
      where: { id: importRun.id },
      data: {
        duplicatesMerged,
        totalSpend,
        totalImpressions,
        totalClicks,
        totalResults,
      },
    });

    if (countryMetricsMap.size > 0) {
      await db.dailyMetric.createMany({
        data: Array.from(countryMetricsMap.values()).map((countryMetrics) => ({
          entityType: 'country',
          entityId: countryMetrics.country,
          importRunId: importRun.id,
          date: importRun.createdAt,
          spend: countryMetrics.spend,
          impressions: countryMetrics.impressions,
          reach: countryMetrics.reach,
          clicks: countryMetrics.clicks,
          results: countryMetrics.results,
          resultType: null,
          cpm: calculateCPM(countryMetrics.spend, countryMetrics.impressions),
          cpc: calculateCPC(countryMetrics.spend, countryMetrics.clicks),
        })),
      });
    }

    const diffFromPrevious = previousImportRun
      ? {
          spend: totalSpend - previousImportRun.totalSpend,
          impressions: totalImpressions - previousImportRun.totalImpressions,
          clicks: totalClicks - previousImportRun.totalClicks,
          results: totalResults - previousImportRun.totalResults,
        }
      : null;

    return NextResponse.json({
      success: true,
      importRunId: importRun.id,
      campaignsCreated: createdCampaigns.length,
      adSetsCreated: createdAdSets.length,
      adsCreated: adMap.size,
      warnings: parseResult.warnings,
      importSummary: {
        rowsProcessed: parseResult.data.length,
        rowsDropped: parseResult.rowsDropped,
        duplicatesMerged,
        totals: {
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          results: totalResults,
        },
        diffFromPrevious,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
