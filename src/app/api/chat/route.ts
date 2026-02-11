import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const ChatSchema = z.object({
  question: z.string().trim().min(2).max(500),
});

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = ChatSchema.parse(body);
    const q = question.toLowerCase();

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

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        answer: 'I do not have campaign data yet. Upload a CSV first, then ask again.',
      });
    }

    const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
    const totalResults = campaigns.reduce((sum, campaign) => sum + campaign.results, 0);

    if ((q.includes('how many') || q.includes('number of')) && q.includes('campaign')) {
      return NextResponse.json({
        success: true,
        answer: `There are ${campaigns.length} campaigns in the current dataset.`,
      });
    }

    if (q.includes('summary') || q.includes('overview')) {
      return NextResponse.json({
        success: true,
        answer: `Summary: Spend ${formatCurrency(totalSpend)}, Impressions ${formatNumber(totalImpressions)}, Clicks ${formatNumber(totalClicks)}, CTR ${overallCtr(campaigns).toFixed(2)}%, Avg CPC ${formatCurrency(averageCpc(campaigns))}, Avg CPM ${formatCurrency(averageCpm(campaigns))}.`,
      });
    }

    if (q.includes('total spend') || (q.includes('spend') && q.includes('total')) || q.includes('how much spent')) {
      return NextResponse.json({
        success: true,
        answer: `Total spend is ${formatCurrency(totalSpend)} across ${campaigns.length} campaigns.`,
      });
    }

    if ((q.includes('total') || q.includes('overall')) && q.includes('impression')) {
      return NextResponse.json({
        success: true,
        answer: `Total impressions are ${formatNumber(totalImpressions)}.`,
      });
    }

    if ((q.includes('total') || q.includes('overall')) && q.includes('click')) {
      return NextResponse.json({
        success: true,
        answer: `Total clicks are ${formatNumber(totalClicks)}.`,
      });
    }

    if ((q.includes('total') || q.includes('overall')) && q.includes('result')) {
      return NextResponse.json({
        success: true,
        answer: `Total results are ${formatNumber(totalResults)}.`,
      });
    }

    if (q.includes('ctr')) {
      return NextResponse.json({
        success: true,
        answer: `Overall CTR is ${overallCtr(campaigns).toFixed(2)}% (clicks ÷ impressions).`,
      });
    }

    if (q.includes('cpc')) {
      return NextResponse.json({
        success: true,
        answer: `Average CPC is ${formatCurrency(averageCpc(campaigns))}.`,
      });
    }

    if (q.includes('cpm')) {
      return NextResponse.json({
        success: true,
        answer: `Average CPM is ${formatCurrency(averageCpm(campaigns))}.`,
      });
    }

    const wantsTop = q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('most');
    const wantsWorst = q.includes('worst') || q.includes('lowest') || q.includes('least');

    if ((q.includes('campaign') && wantsTop) || (q.includes('campaign') && wantsWorst)) {
      if (q.includes('ctr')) {
        const sorted = [...campaigns]
          .filter((campaign) => campaign.impressions > 0)
          .sort((a, b) => (b.clicks / b.impressions) - (a.clicks / a.impressions));
        const match = wantsWorst ? sorted[sorted.length - 1] : sorted[0];
        if (match) {
          const ctr = (match.clicks / match.impressions) * 100;
          return NextResponse.json({
            success: true,
            answer: `${wantsWorst ? 'Lowest' : 'Top'} CTR campaign is "${match.name}" at ${ctr.toFixed(2)}%.`,
          });
        }
      }

      if (q.includes('cpc')) {
        const sorted = [...campaigns].sort((a, b) => (a.cpc || Number.POSITIVE_INFINITY) - (b.cpc || Number.POSITIVE_INFINITY));
        const match = wantsWorst ? sorted[sorted.length - 1] : sorted[0];
        if (match) {
          return NextResponse.json({
            success: true,
            answer: `${wantsWorst ? 'Highest' : 'Lowest'} CPC campaign is "${match.name}" at ${formatCurrency(match.cpc || 0)}.`,
          });
        }
      }

      if (q.includes('click')) {
        const sorted = [...campaigns].sort((a, b) => b.clicks - a.clicks);
        const match = wantsWorst ? sorted[sorted.length - 1] : sorted[0];
        return NextResponse.json({
          success: true,
          answer: `${wantsWorst ? 'Lowest' : 'Top'} clicks campaign is "${match.name}" with ${formatNumber(match.clicks)} clicks.`,
        });
      }

      if (q.includes('impression')) {
        const sorted = [...campaigns].sort((a, b) => b.impressions - a.impressions);
        const match = wantsWorst ? sorted[sorted.length - 1] : sorted[0];
        return NextResponse.json({
          success: true,
          answer: `${wantsWorst ? 'Lowest' : 'Top'} impressions campaign is "${match.name}" with ${formatNumber(match.impressions)} impressions.`,
        });
      }

      if (q.includes('result')) {
        const sorted = [...campaigns].sort((a, b) => b.results - a.results);
        const match = wantsWorst ? sorted[sorted.length - 1] : sorted[0];
        return NextResponse.json({
          success: true,
          answer: `${wantsWorst ? 'Lowest' : 'Top'} results campaign is "${match.name}" with ${formatNumber(match.results)} results.`,
        });
      }

      const sortedBySpend = [...campaigns].sort((a, b) => b.spend - a.spend);
      const match = wantsWorst ? sortedBySpend[sortedBySpend.length - 1] : sortedBySpend[0];
      return NextResponse.json({
        success: true,
        answer: `${wantsWorst ? 'Lowest' : 'Top'} spend campaign is "${match.name}" at ${formatCurrency(match.spend)}.`,
      });
    }

    return NextResponse.json({
      success: true,
      answer:
        'I can help with totals, averages, and top campaigns. Try: "overall CTR", "top campaign by spend", "lowest CPC campaign", or "summary".',
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
