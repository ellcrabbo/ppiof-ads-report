import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderToBuffer } from '@react-pdf/renderer';
import { generateCampaignReportPDF } from '@/lib/pdf-generator';
import { z } from 'zod';

const ExportSchema = z.object({
  campaignIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ADC-Ads-Reporting-PDF/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Keep PDF size under control when creatives are large.
    if (buffer.byteLength > 2_500_000) return null;

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ExportSchema.parse(body);

    const { campaignIds, startDate, endDate } = validatedData;

    // Build where clause
    const where: any = {};

    if (campaignIds && campaignIds.length > 0) {
      where.id = { in: campaignIds };
    }

    if (startDate || endDate) {
      where.importRun = {};
      if (startDate) {
        where.importRun.createdAt = { ...(where.importRun.createdAt || {}), gte: new Date(startDate) };
      }
      if (endDate) {
        where.importRun.createdAt = { ...(where.importRun.createdAt || {}), lte: new Date(endDate) };
      }
    }

    // Fetch campaigns with related data
    const campaigns = await db.campaign.findMany({
      where,
      include: {
        AdSet: {
          include: {
            Ad: true,
          },
          orderBy: {
            spend: 'desc',
          },
        },
      },
      orderBy: {
        spend: 'desc',
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json(
        { error: 'No campaigns found for the specified criteria' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalResults = campaigns.reduce((sum, c) => sum + c.results, 0);

    // Get date range from import runs
    const importRuns = await db.importRun.findMany({
      where: campaigns.length > 0 ? {
        id: { in: campaigns.map(c => c.importRunId) }
      } : undefined,
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dateRange = {
      start: startDate || (importRuns.length > 0 ? importRuns[0].createdAt.toISOString().split('T')[0] : 'N/A'),
      end: endDate || (importRuns.length > 0 ? importRuns[importRuns.length - 1].createdAt.toISOString().split('T')[0] : 'N/A'),
    };

    // Generate PDF
    const normalizedCampaigns = campaigns.map(({ AdSet, ...campaign }) => ({
      ...campaign,
      adSets: AdSet.map(({ Ad, ...adSet }) => ({
        ...adSet,
        ads: Ad,
      })),
    }));

    const reportData = {
      campaigns: normalizedCampaigns,
      dateRange,
      totalSpend,
      totalImpressions,
      totalClicks,
      totalResults,
      creatives: await Promise.all(
        campaigns
          .flatMap((campaign) =>
            campaign.AdSet.flatMap((adSet) =>
              adSet.Ad.map((ad) => ({
                adName: ad.name,
                campaignName: campaign.name,
                creativeUrl: ad.creativeUrl,
                creativeType: ad.creativeType,
                spend: ad.spend,
              }))
            )
          )
          .filter((creative) => Boolean(creative.creativeUrl))
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 8)
          .map(async (creative) => ({
            ...creative,
            imageDataUrl: creative.creativeUrl
              ? await fetchImageAsDataUrl(creative.creativeUrl)
              : null,
          }))
      ),
    };

    const pdfBuffer = await renderToBuffer(generateCampaignReportPDF(reportData));
    const pdfBytes = new Uint8Array(pdfBuffer);

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ppiof-ads-report-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBytes.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
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
