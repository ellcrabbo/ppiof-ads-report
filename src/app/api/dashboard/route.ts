import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildCampaignPlatformFilter } from '@/lib/platform-filter';
import { z } from 'zod';

const QuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  platform: z.string().optional(),
  objective: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedData = QuerySchema.parse(searchParams);

    const { startDate, endDate, platform, objective } = validatedData;

    // Build where clause
    const where: any = {};

    if (startDate || endDate) {
      where.importRun = {};
      if (startDate) {
        where.importRun.createdAt = { ...(where.importRun.createdAt || {}), gte: new Date(startDate) };
      }
      if (endDate) {
        where.importRun.createdAt = { ...(where.importRun.createdAt || {}), lte: new Date(endDate) };
      }
    }

    const platformWhere = buildCampaignPlatformFilter(platform);
    if (platformWhere) {
      Object.assign(where, platformWhere);
    }

    if (objective) {
      where.objective = objective;
    }

    // Get aggregated metrics
    const campaigns = await db.campaign.findMany({
      where,
      select: {
        spend: true,
        impressions: true,
        reach: true,
        clicks: true,
        results: true,
        cpm: true,
        cpc: true,
        objective: true,
        platform: true,
      },
    });

    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalResults = campaigns.reduce((sum, c) => sum + c.results, 0);

    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Group by platform
    const platformBreakdown = campaigns.reduce((acc: any, campaign) => {
      const platform = campaign.platform || 'unknown';
      if (!acc[platform]) {
        acc[platform] = { spend: 0, impressions: 0, clicks: 0, results: 0 };
      }
      acc[platform].spend += campaign.spend;
      acc[platform].impressions += campaign.impressions;
      acc[platform].clicks += campaign.clicks;
      acc[platform].results += campaign.results;
      return acc;
    }, {});

    // Group by objective
    const objectiveBreakdown = campaigns.reduce((acc: any, campaign) => {
      const objective = campaign.objective || 'unknown';
      if (!acc[objective]) {
        acc[objective] = { spend: 0, impressions: 0, clicks: 0, results: 0, count: 0 };
      }
      acc[objective].spend += campaign.spend;
      acc[objective].impressions += campaign.impressions;
      acc[objective].clicks += campaign.clicks;
      acc[objective].results += campaign.results;
      acc[objective].count += 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSpend,
          totalImpressions,
          totalReach,
          totalClicks,
          totalResults,
          avgCPM,
          avgCPC,
          ctr,
        },
        platformBreakdown,
        objectiveBreakdown,
      },
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
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
