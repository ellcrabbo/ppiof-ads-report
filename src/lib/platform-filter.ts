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

function platformContains(value: string): Prisma.CampaignWhereInput {
  return {
    platform: {
      contains: value,
      mode: 'insensitive',
    },
  };
}

function metaOrUnknownPlatform(): Prisma.CampaignWhereInput {
  return {
    OR: [
      platformContains('meta'),
      { platform: null },
    ],
  };
}

export function buildCampaignPlatformFilter(platform?: string): Prisma.CampaignWhereInput | undefined {
  if (!platform) return undefined;
  const normalized = platform.trim().toLowerCase();

  if (normalized === 'instagram') {
    return {
      OR: [
        platformContains('instagram'),
        { AND: [metaOrUnknownPlatform(), instagramSignal()] },
      ],
    };
  }

  if (normalized === 'facebook') {
    return {
      OR: [
        platformContains('facebook'),
        { AND: [metaOrUnknownPlatform(), { NOT: instagramSignal() }] },
      ],
    };
  }

  return platformContains(normalized);
}
