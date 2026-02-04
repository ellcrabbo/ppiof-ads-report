import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateCreativeSchema = z.object({
  creativeUrl: z.string().trim().optional().nullable(),
  creativeType: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL']).optional().nullable(),
  creativeCarouselTotal: z.number().int().positive().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateCreativeSchema.parse(body);

    const data: {
      creativeUrl?: string | null;
      creativeType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | null;
      creativeCarouselTotal?: number | null;
    } = {};

    if ('creativeUrl' in validatedData) {
      const normalized = validatedData.creativeUrl?.trim() || null;
      data.creativeUrl = normalized === '' ? null : normalized;
    }

    if ('creativeType' in validatedData) {
      data.creativeType = validatedData.creativeType ?? null;
    }

    if ('creativeCarouselTotal' in validatedData) {
      data.creativeCarouselTotal = validatedData.creativeCarouselTotal ?? null;
    }

    if (data.creativeType !== 'CAROUSEL') {
      data.creativeCarouselTotal = null;
    }

    const updatedAd = await db.ad.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: updatedAd,
    });
  } catch (error) {
    console.error('Update ad creative error:', error);
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
