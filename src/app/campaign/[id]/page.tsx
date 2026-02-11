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
import { MarketingTerm } from '@/components/marketing-term';
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
        title: 'Error',
        description: 'Failed to load campaign data.',
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
        title: 'Note Saved',
        description: 'Your note has been saved successfully.',
      });

      setNewNote('');
      fetchCampaign();
    } catch (error) {
      console.error('Save note error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save note.',
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
        title: 'Creative updated',
        description: 'Creative metadata saved successfully.',
      });
    } catch (error) {
      console.error('Creative update error:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: (error as Error).message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading campaign...</p>
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{campaign.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {campaign.platform || 'N/A'} • {campaign.status || 'N/A'}
                </p>
              </div>
            </div>
            <ThemeToggle />
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
                  term="Spend"
                  definition="Total amount spent by this campaign in the imported time window."
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
                  term="Impressions"
                  definition="How many times this campaign's ads were served."
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
                  term="Clicks"
                  definition="Total number of ad clicks sent to your destination."
                />
              </CardTitle>
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(campaign.clicks)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <MarketingTerm
                  term="CTR"
                  definition="Click-through rate. CTR = Clicks / Impressions × 100. It measures how often people click after seeing an ad."
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
                  term="CPC"
                  definition="Cost per click. CPC = Spend / Clicks."
                />
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(campaign.cpc || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <MarketingTerm
                  term="CPM"
                  definition="Cost per thousand impressions. CPM = Spend / (Impressions / 1,000)."
                  className="text-xs"
                />{' '}
                {formatCurrency(campaign.cpm || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="adsets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="adsets">Ad Sets</TabsTrigger>
            <TabsTrigger value="ads">Top Ads</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Ad Sets Tab */}
          <TabsContent value="adsets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ad Sets</CardTitle>
                <CardDescription>
                  {campaign.adSets.length} ad set{campaign.adSets.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Set Name</TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Spend" definition="Amount spent by this ad set." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Impressions" definition="Total times ads from this ad set were shown." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Clicks" definition="Total ad clicks for this ad set." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="CTR" definition="Click-through rate for this ad set." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="CPC" definition="Cost per click for this ad set." />
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
                <CardTitle>Top Performing Ads</CardTitle>
                <CardDescription>
                  Top 10 ads by click-through rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad Name</TableHead>
                        <TableHead>Creative</TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Spend" definition="Amount spent by this ad." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Impressions" definition="Total times this ad was shown." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="Clicks" definition="Total clicks generated by this ad." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="CTR" definition="Click-through rate for this ad." />
                        </TableHead>
                        <TableHead className="text-right">
                          <MarketingTerm term="CPC" definition="Cost per click for this ad." />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            <div className="flex flex-col items-center gap-2">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              <p>No ads with sufficient data</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        topAds.map((ad) => {
                          const adCtr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;

                          return (
                            <TableRow key={ad.id}>
                              <TableCell className="font-medium">{ad.name}</TableCell>
                              <TableCell>
                                {ad.creativeUrl ? (
                                  <a
                                    href={ad.creativeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    <ImageIcon className="h-4 w-4 inline" /> View
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
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
                <CardTitle>Ad Creatives</CardTitle>
                <CardDescription>
                  Store thumbnails and creative metadata per ad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creative</TableHead>
                        <TableHead>Ad</TableHead>
                        <TableHead>Ad Set</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Carousel</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No ads found for this campaign.
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
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UNSET">Not set</SelectItem>
                                    <SelectItem value="IMAGE">Image</SelectItem>
                                    <SelectItem value="VIDEO">Video</SelectItem>
                                    <SelectItem value="CAROUSEL">Carousel</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {isUrlLocked ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                      <Lock className="mr-1 h-3 w-3" />
                                      URL saved
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => unlockCreativeUrl(ad.id)}
                                    >
                                      <LockOpen className="h-4 w-4 mr-1" />
                                      Unlock
                                    </Button>
                                    {ad.creativeUrl && (
                                      <a
                                        href={ad.creativeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Open
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
                                      placeholder="Paste creative URL"
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
                                        Open
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
                                    placeholder={isCarousel ? 'Cards' : 'N/A'}
                                    className="w-20"
                                  />
                                  {isCarousel && <Layers className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => handleSaveCreative(ad.id)}>
                                  <Save className="h-4 w-4 mr-2" />
                                  {creativeUrlUnlocked[ad.id] ? 'Save & Lock' : 'Save'}
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
                <CardTitle>Campaign Recommendations</CardTitle>
                <CardDescription>
                  Actionable insights based on campaign performance
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
                            <strong>What Happened:</strong> {rec.whatHappened}
                          </div>
                          <div>
                            <strong>What to Change:</strong> {rec.whatToChange}
                          </div>
                          <div>
                            <strong>What to Test:</strong> {rec.whatToTest}
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
                <CardTitle>Campaign Notes</CardTitle>
                <CardDescription>
                  Add your observations and annotations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-note">Add a Note</Label>
                  <Textarea
                    id="new-note"
                    placeholder="Enter your notes or observations..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleSaveNote} disabled={!newNote.trim() || savingNote}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Previous Notes
                  </h3>
                  {campaign.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No notes yet. Add your first note above.
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
