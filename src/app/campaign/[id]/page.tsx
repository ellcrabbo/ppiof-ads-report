'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';
import { MarketingTerm } from '@/components/marketing-term';
import { MarketingGlossary } from '@/components/marketing-glossary';
import { MARKETING_GLOSSARY } from '@/lib/marketing-glossary';
import {
  ArrowLeft,
  DollarSign,
  Eye,
  MousePointer2,
  Target,
  TrendingUp,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Layers,
  Play,
  Save,
  MessageSquare,
  Lock,
  LockOpen,
  ExternalLink,
} from 'lucide-react';
import { generateCampaignRecommendations } from '@/lib/recommendations';

type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | null;

interface CampaignDetail {
  id: string;
  name: string;
  objective: string | null;
  status: string | null;
  platform: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  results: number;
  cpm: number | null;
  cpc: number | null;
  adSets: Array<{
    id: string;
    name: string;
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    results: number;
    cpm: number | null;
    cpc: number | null;
    ads: Array<{
      id: string;
      name: string;
      creativeUrl: string | null;
      creativeType: CreativeType;
      creativeCarouselTotal: number | null;
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      results: number;
      cpm: number | null;
      cpc: number | null;
    }>;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const params = useParams<{ id: string }>();
  const campaignId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [creativeEdits, setCreativeEdits] = useState<Record<string, {
    creativeUrl: string;
    creativeType: CreativeType;
    creativeCarouselTotal: string;
  }>>({});
  const [creativeUrlUnlocked, setCreativeUrlUnlocked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!campaignId) return;
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      if (!campaignId) return;
      const res = await fetch(`/api/campaigns/${campaignId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch campaign');
      }

      const data = await res.json();
      setCampaign(data.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        variant: 'destructive',
        title: t('error.title', 'Error'),
        description: t('error.loadCampaign', 'Failed to load campaign data.'),
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    if (!campaignId) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) {
        throw new Error('Failed to save note');
      }

      toast({
        title: t('campaign.notes.saved.title', 'Note Saved'),
        description: t('campaign.notes.saved.desc', 'Your note has been saved successfully.'),
      });

      setNewNote('');
      fetchCampaign();
    } catch (error) {
      console.error('Save note error:', error);
      toast({
        variant: 'destructive',
        title: t('error.title', 'Error'),
        description: t('campaign.notes.saveError', 'Failed to save note.'),
      });
    } finally {
      setSavingNote(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecommendationColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-50 dark:bg-red-950/30';
      case 'medium':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950/30';
      case 'low':
        return 'border-green-500 bg-green-50 dark:bg-green-950/30';
      default:
        return 'border-border bg-muted';
    }
  };

  const getRecommendationIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <TrendingUp className="h-5 w-5 text-orange-600" />;
      case 'low':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCreativeEdit = (ad: CampaignDetail['adSets'][number]['ads'][number]) => {
    return (
      creativeEdits[ad.id] ?? {
        creativeUrl: ad.creativeUrl || '',
        creativeType: ad.creativeType || null,
        creativeCarouselTotal: ad.creativeCarouselTotal ? String(ad.creativeCarouselTotal) : '',
      }
    );
  };

  const updateCreativeEdit = (
    adId: string,
    updates: Partial<{
      creativeUrl: string;
      creativeType: CreativeType;
      creativeCarouselTotal: string;
    }>
  ) => {
    setCreativeEdits((prev) => ({
      ...prev,
      [adId]: {
        ...(prev[adId] || { creativeUrl: '', creativeType: null, creativeCarouselTotal: '' }),
        ...updates,
      },
    }));
  };

  const updateAdInState = (
    adId: string,
    updates: Partial<CampaignDetail['adSets'][number]['ads'][number]>
  ) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adSets: prev.adSets.map((adSet) => ({
          ...adSet,
          ads: adSet.ads.map((ad) => (ad.id === adId ? { ...ad, ...updates } : ad)),
        })),
      };
    });
  };

  const unlockCreativeUrl = (adId: string) => {
    setCreativeUrlUnlocked((prev) => ({ ...prev, [adId]: true }));
  };

  const lockCreativeUrl = (adId: string) => {
    setCreativeUrlUnlocked((prev) => ({ ...prev, [adId]: false }));
  };

  const handleSaveCreative = async (adId: string) => {
    const ad = campaign?.adSets.flatMap((adSet) => adSet.ads).find((item) => item.id === adId);
    if (!ad) return;

    const edit = getCreativeEdit(ad);
    const payload = {
      creativeUrl: edit.creativeUrl.trim() || null,
      creativeType: edit.creativeType,
      creativeCarouselTotal:
        edit.creativeType === 'CAROUSEL' && edit.creativeCarouselTotal
          ? Number(edit.creativeCarouselTotal)
          : null,
    };

    try {
      const res = await fetch(`/api/ads/${adId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update creative');
      }

      updateAdInState(adId, {
        creativeUrl: payload.creativeUrl,
        creativeType: payload.creativeType,
        creativeCarouselTotal: payload.creativeCarouselTotal,
      });
      setCreativeEdits((prev) => {
        const next = { ...prev };
        delete next[adId];
        return next;
      });
      if (payload.creativeUrl) {
        lockCreativeUrl(adId);
      } else {
        setCreativeUrlUnlocked((prev) => {
          const next = { ...prev };
          delete next[adId];
          return next;
        });
      }

      toast({
        title: t('campaign.creatives.saved.title', 'Creative updated'),
        description: t('campaign.creatives.saved.desc', 'Creative metadata saved successfully.'),
      });
    } catch (error) {
      console.error('Creative update error:', error);
      toast({
        variant: 'destructive',
        title: t('campaign.creatives.saveError', 'Update failed'),
        description: (error as Error).message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loading.campaign', 'Loading campaign...')}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const recommendations = generateCampaignRecommendations(campaign);

  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

  const topAds = campaign.adSets
    .flatMap(adSet => adSet.ads)
    .filter(ad => ad.impressions > 100)
    .sort((a, b) => {
      const ctrA = a.impressions > 0 ? a.clicks / a.impressions : 0;
      const ctrB = b.impressions > 0 ? b.clicks / b.impressions : 0;
      return ctrB - ctrA;
    })
    .slice(0, 10);

  const allAds = campaign.adSets.flatMap((adSet) =>
    adSet.ads.map((ad) => ({ ...ad, adSetName: adSet.name }))
  );
  const adsWithCreative = allAds
    .filter((ad) => getCreativeEdit(ad).creativeUrl.trim().length > 0)
    .sort((a, b) => b.spend - a.spend);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('action.back', 'Back')}
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{campaign.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {campaign.platform || t('common.na', 'N/A')} • {campaign.status || t('common.na', 'N/A')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.spend.term[language]}
                  definition={MARKETING_GLOSSARY.spend.definition[language]}
                />
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(campaign.spend)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.impressions.term[language]}
                  definition={MARKETING_GLOSSARY.impressions.definition[language]}
                />
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(campaign.impressions)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.clicks.term[language]}
                  definition={MARKETING_GLOSSARY.clicks.definition[language]}
                />
              </CardTitle>
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(campaign.clicks)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.ctr.term[language]}
                  definition={MARKETING_GLOSSARY.ctr.definition[language]}
                  className="text-xs"
                />{' '}
                {ctr.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.cpc.term[language]}
                  definition={MARKETING_GLOSSARY.cpc.definition[language]}
                />
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(campaign.cpc || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <MarketingTerm
                  term={MARKETING_GLOSSARY.cpm.term[language]}
                  definition={MARKETING_GLOSSARY.cpm.definition[language]}
                  className="text-xs"
                />{' '}
                {formatCurrency(campaign.cpm || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>{t('dashboard.glossary.title', 'Marketing Glossary')}</CardTitle>
            <CardDescription>
              {t(
                'campaign.glossary.desc',
                'Hover any term to get a quick definition while reviewing this campaign.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingGlossary
              terms={[
                'campaign',
                'adSet',
                'creative',
                'spend',
                'impressions',
                'reach',
                'clicks',
                'results',
                'ctr',
                'cpc',
                'cpm',
              ]}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="creatives" className="space-y-4">
          <TabsList>
            <TabsTrigger value="adsets">{t('campaign.tabs.adsets', 'Ad Sets')}</TabsTrigger>
            <TabsTrigger value="ads">{t('campaign.tabs.ads', 'Top Ads')}</TabsTrigger>
            <TabsTrigger value="creatives">{t('campaign.tabs.creatives', 'Creatives')}</TabsTrigger>
            <TabsTrigger value="recommendations">{t('campaign.tabs.recommendations', 'Recommendations')}</TabsTrigger>
            <TabsTrigger value="notes">{t('campaign.tabs.notes', 'Notes')}</TabsTrigger>
          </TabsList>

          {/* Ad Sets Tab */}
          <TabsContent value="adsets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('campaign.adsets.title', 'Ad Sets')}</CardTitle>
                <CardDescription>
                  {campaign.adSets.length} {t('campaign.adsets.count', 'ad sets')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Set Name</TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.spend.term[language]} definition={MARKETING_GLOSSARY.spend.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.impressions.term[language]} definition={MARKETING_GLOSSARY.impressions.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.clicks.term[language]} definition={MARKETING_GLOSSARY.clicks.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.ctr.term[language]} definition={MARKETING_GLOSSARY.ctr.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.cpc.term[language]} definition={MARKETING_GLOSSARY.cpc.definition[language]} />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaign.adSets.map((adSet) => {
                        const adSetCtr = adSet.impressions > 0 ? (adSet.clicks / adSet.impressions) * 100 : 0;

                        return (
                          <TableRow key={adSet.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{adSet.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {adSet.ads.length} ad{adSet.ads.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(adSet.spend)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(adSet.impressions)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(adSet.clicks)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={adSetCtr < 0.5 ? 'destructive' : 'secondary'}>
                                {adSetCtr.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(adSet.cpc || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Ads Tab */}
          <TabsContent value="ads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('campaign.ads.title', 'Top Performing Ads')}</CardTitle>
                <CardDescription>
                  {t('campaign.ads.desc', 'Top 10 ads by click-through rate')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('campaign.table.adName', 'Ad Name')}</TableHead>
                        <TableHead>{t('campaign.table.creative', 'Creative')}</TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.spend.term[language]} definition={MARKETING_GLOSSARY.spend.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.impressions.term[language]} definition={MARKETING_GLOSSARY.impressions.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.clicks.term[language]} definition={MARKETING_GLOSSARY.clicks.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.ctr.term[language]} definition={MARKETING_GLOSSARY.ctr.definition[language]} />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term={MARKETING_GLOSSARY.cpc.term[language]} definition={MARKETING_GLOSSARY.cpc.definition[language]} />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            <div className="flex flex-col items-center gap-2">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              <p>{t('campaign.ads.noData', 'No ads with sufficient data')}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        topAds.map((ad) => {
                          const adCtr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
                          const edit = getCreativeEdit(ad);
                          const creativeUrl = edit.creativeUrl.trim();

                          return (
                            <TableRow key={ad.id}>
                              <TableCell className="font-medium">{ad.name}</TableCell>
                              <TableCell>
                                {creativeUrl ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-12 w-20 rounded border overflow-hidden bg-muted relative shrink-0">
                                      <img
                                        src={creativeUrl}
                                        alt={ad.name}
                                        className="h-full w-full object-cover"
                                      />
                                      {edit.creativeType === 'VIDEO' && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                          <Play className="h-4 w-4 text-white" />
                                        </span>
                                      )}
                                      {edit.creativeType === 'CAROUSEL' && (
                                        <span className="absolute bottom-1 right-1 rounded bg-background/90 px-1 text-[10px] text-foreground">
                                          1/{edit.creativeCarouselTotal || '?'}
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={creativeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      {t('action.open', 'Open')}
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">{t('dashboard.creativeHighlights.noPreview', 'No creative')}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(ad.spend)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(ad.impressions)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(ad.clicks)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={adCtr < 0.5 ? 'destructive' : 'default'}>
                                  {adCtr.toFixed(2)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(ad.cpc || 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Creatives Tab */}
          <TabsContent value="creatives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('campaign.creatives.title', 'Ad Creatives')}</CardTitle>
                <CardDescription>
                  {t('campaign.creatives.desc', 'Visual creative gallery plus editable metadata per ad')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t('campaign.creatives.galleryTitle', 'Creative Gallery')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {adsWithCreative.length} {t('campaign.creatives.galleryCount', 'ads with previews')}
                    </p>
                  </div>
                  {adsWithCreative.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {t('campaign.creatives.galleryEmpty', 'No creatives saved yet. Add URLs below to build the gallery.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {adsWithCreative.slice(0, 18).map((ad) => {
                        const edit = getCreativeEdit(ad);
                        const creativeUrl = edit.creativeUrl.trim();
                        return (
                          <div key={`gallery-${ad.id}`} className="rounded-lg border bg-card overflow-hidden">
                            <div className="relative aspect-video bg-muted">
                              <img
                                src={creativeUrl}
                                alt={ad.name}
                                className="h-full w-full object-cover"
                              />
                              {edit.creativeType === 'VIDEO' && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                                  <Play className="h-6 w-6 text-white" />
                                </span>
                              )}
                              {edit.creativeType === 'CAROUSEL' && (
                                <span className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">
                                  Carousel 1/{edit.creativeCarouselTotal || '?'}
                                </span>
                              )}
                              <span className="absolute top-2 left-2 rounded bg-black/65 px-2 py-0.5 text-xs text-white">
                                {edit.creativeType || 'UNSET'}
                              </span>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <p className="text-sm font-semibold leading-tight max-h-10 overflow-hidden">{ad.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Ad Set: {ad.adSetName}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Spend {formatCurrency(ad.spend)}</span>
                                <span>{MARKETING_GLOSSARY.clicks.term[language]} {formatNumber(ad.clicks)}</span>
                              </div>
                              <a
                                href={creativeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {t('action.openOriginal', 'Open Original')}
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {adsWithCreative.length > 18 && (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'campaign.creatives.galleryShowing',
                        'Showing top 18 creatives by spend. Full list remains editable below.'
                      )}
                    </p>
                  )}
                </div>

                <div className="rounded-md border max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('campaign.table.creative', 'Creative')}</TableHead>
                        <TableHead>{t('campaign.table.ad', 'Ad')}</TableHead>
                        <TableHead>{t('campaign.table.adSet', 'Ad Set')}</TableHead>
                        <TableHead>{t('campaign.table.type', 'Type')}</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>{t('campaign.table.carousel', 'Carousel')}</TableHead>
                        <TableHead className="text-right">{t('campaign.table.action', 'Action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {t('campaign.creatives.noAds', 'No ads found for this campaign.')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        allAds.map((ad) => {
                          const edit = getCreativeEdit(ad);
                          const creativeUrl = edit.creativeUrl.trim();
                          const isCarousel = edit.creativeType === 'CAROUSEL';
                          const isUrlLocked = Boolean(ad.creativeUrl) && !creativeUrlUnlocked[ad.id];

                          return (
                            <TableRow key={ad.id}>
                              <TableCell>
                                <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center overflow-hidden relative">
                                  {creativeUrl ? (
                                    <>
                                      <img
                                        src={creativeUrl}
                                        alt={ad.name}
                                        className="h-full w-full object-cover"
                                      />
                                      {edit.creativeType === 'VIDEO' && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                          <Play className="h-5 w-5 text-white" />
                                        </span>
                                      )}
                                      {edit.creativeType === 'CAROUSEL' && (
                                        <span className="absolute bottom-1 right-1 rounded bg-background/90 px-1 text-[10px] text-foreground">
                                          1/{edit.creativeCarouselTotal || '?'}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{ad.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {ad.adSetName}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={edit.creativeType ?? 'UNSET'}
                                  onValueChange={(value) =>
                                    updateCreativeEdit(ad.id, {
                                      creativeType: value === 'UNSET' ? null : (value as CreativeType),
                                    })
                                  }
                                >
                                    <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder={t('campaign.creatives.selectType', 'Select type')} />
                                    </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UNSET">{t('campaign.creatives.notSet', 'Not set')}</SelectItem>
                                    <SelectItem value="IMAGE">{t('campaign.creatives.imageLabel', 'Image')}</SelectItem>
                                    <SelectItem value="VIDEO">{t('campaign.creatives.videoLabel', 'Video')}</SelectItem>
                                    <SelectItem value="CAROUSEL">{t('campaign.creatives.carouselLabel', 'Carousel')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {isUrlLocked ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                      <Lock className="mr-1 h-3 w-3" />
                                      {t('campaign.creatives.urlSaved', 'URL saved')}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => unlockCreativeUrl(ad.id)}
                                    >
                                      <LockOpen className="h-4 w-4 mr-1" />
                                      {t('action.unlock', 'Unlock')}
                                    </Button>
                                    {ad.creativeUrl && (
                                      <a
                                        href={ad.creativeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {t('action.open', 'Open')}
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={edit.creativeUrl}
                                      onChange={(e) =>
                                        updateCreativeEdit(ad.id, { creativeUrl: e.target.value })
                                      }
                                      placeholder={t('campaign.creatives.placeholderUrl', 'Paste creative URL')}
                                      className="min-w-[240px]"
                                    />
                                    {creativeUrl && (
                                      <a
                                        href={creativeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {t('action.open', 'Open')}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    disabled={!isCarousel}
                                    value={edit.creativeCarouselTotal}
                                    onChange={(e) =>
                                      updateCreativeEdit(ad.id, {
                                        creativeCarouselTotal: e.target.value,
                                      })
                                    }
                                    placeholder={isCarousel ? t('campaign.creatives.cards', 'Cards') : t('common.na', 'N/A')}
                                    className="w-20"
                                  />
                                  {isCarousel && <Layers className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => handleSaveCreative(ad.id)}>
                                  <Save className="h-4 w-4 mr-2" />
                                  {creativeUrlUnlocked[ad.id]
                                    ? t('action.saveAndLock', 'Save & Lock')
                                    : t('action.save', 'Save')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('campaign.recommendations.title', 'Campaign Recommendations')}</CardTitle>
                <CardDescription>
                  {t('campaign.recommendations.desc', 'Actionable insights based on campaign performance')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${getRecommendationColor(rec.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getRecommendationIcon(rec.severity)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">{rec.summary}</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>{t('campaign.recommendations.whatHappened', 'What Happened')}:</strong> {rec.whatHappened}
                          </div>
                          <div>
                            <strong>{t('campaign.recommendations.whatToChange', 'What to Change')}:</strong> {rec.whatToChange}
                          </div>
                          <div>
                            <strong>{t('campaign.recommendations.whatToTest', 'What to Test')}:</strong> {rec.whatToTest}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('campaign.notes.title', 'Campaign Notes')}</CardTitle>
                <CardDescription>
                  {t('campaign.notes.desc', 'Add your observations and annotations')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-note">{t('campaign.notes.addLabel', 'Add a Note')}</Label>
                  <Textarea
                    id="new-note"
                    placeholder={t('campaign.notes.placeholder', 'Enter your notes or observations...')}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleSaveNote} disabled={!newNote.trim() || savingNote}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingNote ? t('campaign.notes.saving', 'Saving...') : t('campaign.notes.saveAction', 'Save Note')}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('campaign.notes.previous', 'Previous Notes')}
                  </h3>
                  {campaign.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('campaign.notes.empty', 'No notes yet. Add your first note above.')}
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {campaign.notes.map((note) => (
                        <div key={note.id} className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="text-sm flex-1">{note.content}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-background border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          PPIOF Ads Report © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
