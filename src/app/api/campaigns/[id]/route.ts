import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Get campaign detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        AdSet: {
          include: {
            Ad: true,
          },
          orderBy: {
            spend: 'desc',
          },
        },
        CampaignNote: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const { AdSet, CampaignNote, ...campaignData } = campaign;
    const normalizedCampaign = {
      ...campaignData,
      adSets: AdSet.map(({ Ad, ...adSet }) => ({
        ...adSet,
        ads: Ad,
      })),
      notes: CampaignNote,
    };

    return NextResponse.json({
      success: true,
      data: normalizedCampaign,
    });
  } catch (error) {
    console.error('Campaign detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
