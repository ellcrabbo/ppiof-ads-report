import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const QuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  platform: z.string().optional(),
  objective: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['spend', 'impressions', 'clicks', 'cpc', 'cpm']).default('spend'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedData = QuerySchema.parse(searchParams);

    const { startDate, endDate, platform, objective, status, search, sortBy, sortOrder, page, limit } = validatedData;

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

    if (platform) {
      where.platform = platform;
    }

    if (objective) {
      where.objective = objective;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get campaigns with pagination
    const [campaigns, totalCount] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          adSets: {
            include: {
              ads: true,
            },
          },
          _count: {
            select: {
              adSets: true,
            },
          },
        },
      }),
      db.campaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
