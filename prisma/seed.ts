import { PrismaClient, Campaign, AdSet } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data
  console.log('Cleaning up existing data...');
  await prisma.campaignNote.deleteMany();
  await prisma.dailyMetric.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.adSet.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.importRun.deleteMany();

  // Read sample CSV file
  const csvPath = join(process.cwd(), 'samples', 'sample-ads-export.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  const campaignsMap = new Map<string, any>();
  const adSetsMap = new Map<string, any>();
  const adsMap = new Map<string, any>();

  // Parse CSV rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Parse values
    const spend = parseFloat(row['Amount spent (USD)'] || '0') || 0;
    const impressions = parseInt(row['Impressions'] || '0') || 0;
    const reach = parseInt(row['Reach'] || '0') || 0;
    const clicks = parseInt(row['Link clicks'] || '0') || 0;
    const results = parseInt(row['Results'] || '0') || 0;
    const resultType = row['Result Type'] || null;
    const objective = row['Objective'] || null;
    const status = row['Delivery status'] || null;
    const platform = row['Platform'] || null;

    const campaignName = row['Campaign name'] || 'Unknown Campaign';
    const adSetName = row['Ad set name'] || campaignName;
    const adName = row['Ad name'] || adSetName;

    // Calculate derived metrics
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;

    // Aggregate campaign data
    if (!campaignsMap.has(campaignName)) {
      campaignsMap.set(campaignName, {
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
      });
    }

    const adSet = adSetsMap.get(`${campaignName}|${adSetName}`);
    adSet.spend += spend;
    adSet.impressions += impressions;
    adSet.reach += reach;
    adSet.clicks += clicks;
    adSet.results += results;

    // Aggregate ad data
    const adKey = `${campaignName}|${adSetName}|${adName}`;
    if (!adsMap.has(adKey)) {
      adsMap.set(adKey, {
        name: adName,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        results: 0,
        resultType,
        creativeUrl: null,
      });
    }

    const ad = adsMap.get(adKey);
    ad.spend += spend;
    ad.impressions += impressions;
    ad.reach += reach;
    ad.clicks += clicks;
    ad.results += results;
  }

  // Create import run
  console.log('Creating import run...');
  const importRun = await prisma.importRun.create({
    data: {
      fileName: 'sample-ads-export.csv',
      platform: 'meta',
      rowCount: lines.length - 1,
    },
  });

  // Create campaigns
  console.log('Creating campaigns...');
  const createdCampaigns: Campaign[] = [];
  for (const campaignData of campaignsMap.values()) {
    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        importRunId: importRun.id,
        cpm: campaignData.impressions > 0
          ? (campaignData.spend / campaignData.impressions) * 1000
          : 0,
        cpc: campaignData.clicks > 0
          ? campaignData.spend / campaignData.clicks
          : 0,
      },
    });
    createdCampaigns.push(campaign);
  }

  // Build campaign name to ID map
  const campaignNameToId = new Map(
    createdCampaigns.map(c => [c.name, c.id])
  );

  // Create ad sets
  console.log('Creating ad sets...');
  const createdAdSets: AdSet[] = [];
  for (const [key, adSetData] of adSetsMap.entries()) {
    const [campaignName] = key.split('|');
    const campaignId = campaignNameToId.get(campaignName);

    if (!campaignId) {
      console.warn(`Campaign not found for ad set: ${key}`);
      continue;
    }

    const adSet = await prisma.adSet.create({
      data: {
        ...adSetData,
        campaignId,
        importRunId: importRun.id,
        cpm: adSetData.impressions > 0
          ? (adSetData.spend / adSetData.impressions) * 1000
          : 0,
        cpc: adSetData.clicks > 0
          ? adSetData.spend / adSetData.clicks
          : 0,
      },
    });
    createdAdSets.push(adSet);
  }

  // Build ad set name to ID map
  const adSetKeyToId = new Map(
    createdAdSets.map(as => [`${as.campaignId}|${as.name}`, as.id])
  );

  // Create ads
  console.log('Creating ads...');
  let adCount = 0;
  for (const [key, adData] of adsMap.entries()) {
    const [campaignName, adSetName] = key.split('|');
    const campaignId = campaignNameToId.get(campaignName);
    const adSetId = adSetKeyToId.get(`${campaignId}|${adSetName}`);

    if (!campaignId) {
      console.warn(`Campaign not found for ad: ${key}`);
      continue;
    }

    await prisma.ad.create({
      data: {
        ...adData,
        campaignId,
        adSetId,
        importRunId: importRun.id,
        cpm: adData.impressions > 0
          ? (adData.spend / adData.impressions) * 1000
          : 0,
        cpc: adData.clicks > 0
          ? adData.spend / adData.clicks
          : 0,
      },
    });
    adCount++;
  }

  console.log('Seed completed successfully!');
  console.log(`Import Run: ${importRun.id}`);
  console.log(`Campaigns: ${createdCampaigns.length}`);
  console.log(`Ad Sets: ${createdAdSets.length}`);
  console.log(`Ads: ${adCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
