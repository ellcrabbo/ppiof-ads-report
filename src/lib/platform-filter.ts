import { Prisma } from '@prisma/client';

function instagramSignal(): Prisma.CampaignWhereInput {
  return {
    OR: [
      { name: { contains: 'instagram', mode: 'insensitive' } },
      {
        AdSet: {
          some: {
            name: { contains: 'instagram', mode: 'insensitive' },
          },
        },
      },
      {
        AdSet: {
          some: {
            Ad: {
              some: {
                name: { contains: 'instagram', mode: 'insensitive' },
              },
            },
          },
        },
      },
    ],
  };
}

export function buildCampaignPlatformFilter(platform?: string): Prisma.CampaignWhereInput | undefined {
  if (!platform) return undefined;

  if (platform === 'instagram') {
    return {
      OR: [
        { platform: 'instagram' },
        { AND: [{ platform: 'meta' }, instagramSignal()] },
        { AND: [{ platform: null }, instagramSignal()] },
      ],
    };
  }

  if (platform === 'facebook') {
    return {
      OR: [
        { platform: 'facebook' },
        { AND: [{ platform: 'meta' }, { NOT: instagramSignal() }] },
        { AND: [{ platform: null }, { NOT: instagramSignal() }] },
      ],
    };
  }

  return { platform };
}
