'use client';

export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';
import { MarketingTerm } from '@/components/marketing-term';
import { MarketingGlossary } from '@/components/marketing-glossary';
import { MARKETING_GLOSSARY } from '@/lib/marketing-glossary';
import {
  ComposedChart,
  Bar,
  Line,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Upload,
  Download,
  LogOut,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer2,
  Target,
  AlertCircle,
  Search,
  Send,
  Bot,
  Loader2,
  X,
  Play,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardSummary {
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalResults: number;
  avgCPM: number;
  avgCPC: number;
  ctr: number;
}

interface Campaign {
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
  AdSet?: Array<{
    id: string;
    name: string;
    Ad?: Array<{
      id: string;
      name: string;
      creativeUrl: string | null;
      creativeType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | null;
      creativeCarouselTotal?: number | null;
      spend: number;
      impressions: number;
      clicks: number;
    }>;
  }>;
  _count: {
    adSets: number;
  };
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Ask me anything about this dataset, e.g. "top campaign by spend", "overall CTR", or "how many campaigns do we have?"',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);
  const [creativeScrollPaused, setCreativeScrollPaused] = useState(false);
  const creativeStripRef = useRef<HTMLDivElement | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  useEffect(() => {
    if (loading || hasAutoCollapsed) return;
    const timer = setTimeout(() => {
      setChatOpen(false);
      setHasAutoCollapsed(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [loading, hasAutoCollapsed]);

  useEffect(() => {
    setChatMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== 'assistant') return prev;
      return [
        {
          role: 'assistant',
          content: t(
            'dashboard.chat.initial',
            'Ask me anything about this dataset, e.g. "top campaign by spend", "overall CTR", or "how many campaigns do we have?"'
          ),
        },
      ];
    });
  }, [t, language]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, campaignsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/campaigns'),
      ]);

      if (!summaryRes.ok || !campaignsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const summaryData = await summaryRes.json();
      const campaignsData = await campaignsRes.json();

      setSummary(summaryData.data.summary);
      setCampaigns(campaignsData.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        variant: 'destructive',
        title: t('error.title', 'Error'),
        description: t('error.loadDashboard', 'Failed to load dashboard data.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: t('dashboard.upload.invalidFileTitle', 'Invalid File'),
        description: t('dashboard.upload.invalidFileDescription', 'Please upload a CSV file.'),
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', 'meta');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: t('dashboard.upload.successTitle', 'Upload Successful'),
        description: `${t('dashboard.upload.importedPrefix', 'Imported')} ${data.campaignsCreated} ${t('dashboard.campaigns.title', 'Campaigns').toLowerCase()}, ${data.adSetsCreated} ${t('campaign.tabs.adsets', 'Ad Sets').toLowerCase()}, ${t('dashboard.upload.and', 'and')} ${data.adsCreated} ${t('campaign.tabs.ads', 'Ads').toLowerCase()}.`,
      });

      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: t('dashboard.upload.warningsTitle', 'Warnings'),
          description: data.warnings.join(', '),
        });
      }

      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: t('dashboard.upload.failedTitle', 'Upload Failed'),
        description: (error as Error).message,
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ppiof-ads-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('dashboard.export.successTitle', 'Export Successful'),
        description: t('dashboard.export.successDescription', 'PDF report has been downloaded.'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: t('dashboard.export.failedTitle', 'Export Failed'),
        description: (error as Error).message,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const creativeAds = filteredCampaigns
    .flatMap((campaign) =>
      (campaign.AdSet || []).flatMap((adSet) =>
        (adSet.Ad || []).map((ad) => ({
          id: ad.id,
          campaignId: campaign.id,
          campaignName: campaign.name,
          adSetName: adSet.name,
          adName: ad.name,
          creativeUrl: ad.creativeUrl,
          creativeType: ad.creativeType || null,
          creativeCarouselTotal: ad.creativeCarouselTotal || null,
          spend: ad.spend,
          impressions: ad.impressions,
          clicks: ad.clicks,
        }))
      )
    )
    .filter((ad) => Boolean(ad.creativeUrl))
    .sort((a, b) => b.spend - a.spend);

  const creativeHighlights = creativeAds.slice(0, 16);

  const autoScrollCreatives =
    creativeHighlights.length > 1
      ? [...creativeHighlights, ...creativeHighlights]
      : creativeHighlights;

  useEffect(() => {
    const container = creativeStripRef.current;
    if (!container || creativeHighlights.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frameId: number | null = null;
    let lastTs = 0;
    const pxPerSecond = 36;

    const tick = (ts: number) => {
      if (lastTs === 0) {
        lastTs = ts;
      }
      const elapsed = (ts - lastTs) / 1000;
      lastTs = ts;

      if (!creativeScrollPaused) {
        container.scrollLeft += pxPerSecond * elapsed;
        const loopPoint = container.scrollWidth / 2;
        if (container.scrollLeft >= loopPoint) {
          container.scrollLeft = 0;
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [creativeHighlights.length, creativeScrollPaused]);

  const performanceMixData = [...filteredCampaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((campaign) => ({
      name: campaign.name.length > 18 ? `${campaign.name.slice(0, 17)}…` : campaign.name,
      spend: Number(campaign.spend.toFixed(2)),
      ctr: campaign.impressions > 0 ? Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2)) : 0,
    }));

  const efficiencyRows = [...filteredCampaigns]
    .filter((campaign) => campaign.impressions > 0 && campaign.clicks > 0)
    .map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.cpc || 0,
      ctrDelta: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 - (summary?.ctr || 0) : 0,
      cpcDelta: (summary?.avgCPC || 0) - (campaign.cpc || 0),
      efficiencyScore: campaign.impressions > 0
        ? ((campaign.clicks / campaign.impressions) * 100) / Math.max(campaign.cpc || 0, 0.01)
        : 0,
    }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    .slice(0, 4);

  const maxEfficiencyScore = Math.max(...efficiencyRows.map((row) => row.efficiencyScore), 1);
  const totalFilteredSpend = filteredCampaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const topSpendCampaign = [...filteredCampaigns].sort((a, b) => b.spend - a.spend)[0];
  const bestCtrCampaign = [...filteredCampaigns]
    .filter((campaign) => campaign.impressions > 0)
    .sort((a, b) => (b.clicks / b.impressions) - (a.clicks / a.impressions))[0];
  const lowestCpcCampaign = [...filteredCampaigns]
    .filter((campaign) => campaign.clicks > 0 && campaign.cpc !== null)
    .sort((a, b) => (a.cpc || 0) - (b.cpc || 0))[0];

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getEfficiencyTone = (ctrDelta: number, cpcDelta: number) => {
    if (ctrDelta >= 0.2 && cpcDelta >= 0.01) {
      return {
        label: t('dashboard.efficiency.strong', 'Strong'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      };
    }
    if (ctrDelta >= 0 || cpcDelta >= 0) {
      return {
        label: t('dashboard.efficiency.solid', 'Solid'),
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      };
    }
    return {
      label: t('dashboard.efficiency.watch', 'Watch'),
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    };
  };

  const sendChatMessage = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    const history = chatMessages.slice(-10).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${t('dashboard.chat.failPrefix', "I couldn't answer that right now:")} ${(error as Error).message}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loading.dashboard', 'Loading dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('app.title', 'ADC Ads Reporting')}</h1>
                <p className="text-sm text-muted-foreground">{t('app.subtitle', 'Meta Ads Analytics')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => fetchData()}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('action.refresh', 'Refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('action.signOut', 'Sign Out')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={t('dashboard.totalSpend', 'Total Spend')}
                  definition={MARKETING_GLOSSARY.spend.definition[language]}
                />
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary ? formatCurrency(summary.totalSpend) : '$0'}
              </div>
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
              <div className="text-2xl font-bold">
                {summary ? formatNumber(summary.totalImpressions) : '0'}
              </div>
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
              <div className="text-2xl font-bold">
                {summary ? formatNumber(summary.totalClicks) : '0'}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  <MarketingTerm
                    term={MARKETING_GLOSSARY.ctr.term[language]}
                    definition={MARKETING_GLOSSARY.ctr.definition[language]}
                    className="text-xs"
                  />{' '}
                  {summary.ctr.toFixed(2)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term={t('dashboard.avgCpc', 'Avg CPC')}
                  definition={MARKETING_GLOSSARY.cpc.definition[language]}
                />
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary ? formatCurrency(summary.avgCPC) : '$0'}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  <MarketingTerm
                    term={MARKETING_GLOSSARY.cpm.term[language]}
                    definition={MARKETING_GLOSSARY.cpm.definition[language]}
                    className="text-xs"
                  />{' '}
                  {formatCurrency(summary.avgCPM)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('dashboard.searchCampaigns', 'Search campaigns...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? t('action.uploading', 'Uploading...') : t('action.uploadCsv', 'Upload CSV')}
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".csv"
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={handleExport} disabled={exporting || filteredCampaigns.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? t('action.exporting', 'Exporting...') : t('action.exportPdf', 'Export PDF')}
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t('dashboard.creativeHighlights.title', 'Creative Highlights')}</CardTitle>
              <Badge variant="outline" className="text-[11px]">
                {t('dashboard.autoScroll', 'Auto-scroll')}
              </Badge>
            </div>
            <CardDescription>
              {t(
                'dashboard.creativeHighlights.desc',
                'Visual strip of top creatives by spend so ads are immediately recognizable.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {creativeHighlights.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t(
                  'dashboard.creativeHighlights.empty',
                  'No creative previews yet. Upload or save creative URLs to populate this gallery.'
                )}
              </div>
            ) : (
              <div
                ref={creativeStripRef}
                className="overflow-x-auto pb-2"
                onMouseEnter={() => setCreativeScrollPaused(true)}
                onMouseLeave={() => setCreativeScrollPaused(false)}
                onTouchStart={() => setCreativeScrollPaused(true)}
                onTouchEnd={() => setCreativeScrollPaused(false)}
              >
                <div className="flex gap-3 min-w-max">
                  {autoScrollCreatives.map((creative, index) => {
                    const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0;
                    return (
                      <div
                        key={`${creative.id}-${index}`}
                        className="w-64 rounded-lg border bg-card overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => router.push(`/campaign/${creative.campaignId}`)}
                      >
                        <div className="relative aspect-video bg-muted">
                          {creative.creativeUrl ? (
                            <img
                              src={creative.creativeUrl}
                              alt={creative.adName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}

                          {creative.creativeType === 'VIDEO' && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                              <Play className="h-6 w-6 text-white" />
                            </span>
                          )}

                          {creative.creativeType === 'CAROUSEL' && (
                            <span className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-0.5 text-xs">
                              1/{creative.creativeCarouselTotal || '?'}
                            </span>
                          )}

                          <span className="absolute top-2 left-2 rounded bg-black/65 px-2 py-0.5 text-xs text-white">
                            {creative.creativeType || t('campaign.creatives.image', 'IMAGE')}
                          </span>
                        </div>

                        <div className="p-3 space-y-1.5">
                          <p className="text-sm font-semibold truncate">{creative.adName}</p>
                          <p className="text-xs text-muted-foreground truncate">{creative.campaignName}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(creative.spend)}</span>
                            <span>{MARKETING_GLOSSARY.ctr.term[language]} {ctr.toFixed(2)}%</span>
                          </div>
                          {creative.creativeUrl && (
                            <a
                              href={creative.creativeUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t('action.openOriginal', 'Open original')}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6 items-start">
          <Card className="xl:col-span-2 self-start h-fit">
            <CardHeader>
              <CardTitle>
                <span className="flex flex-wrap items-center gap-2">
                  <MarketingTerm
                    term={MARKETING_GLOSSARY.spend.term[language]}
                    definition={MARKETING_GLOSSARY.spend.definition[language]}
                  />
                  <span>vs</span>
                  <MarketingTerm
                    term={MARKETING_GLOSSARY.ctr.term[language]}
                    definition={MARKETING_GLOSSARY.ctr.definition[language]}
                  />
                </span>
              </CardTitle>
              <CardDescription>
                {t(
                  'dashboard.visualInsights.spendVsCtrDesc',
                  'Spend bars with CTR trend line so you can spot expensive but weak campaigns fast.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[250px]">
                {performanceMixData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {t('dashboard.visualInsights.noChartData', 'No chart data available')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performanceMixData} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-25}
                        textAnchor="end"
                        tick={{ fontSize: 11 }}
                        height={55}
                        interval={0}
                      />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number, key: string) => {
                          if (key === 'spend') return [formatCurrency(Number(value)), MARKETING_GLOSSARY.spend.term[language]];
                          if (key === 'ctr') return [`${Number(value).toFixed(2)}%`, MARKETING_GLOSSARY.ctr.term[language]];
                          return [String(value), key];
                        }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="spend" name={MARKETING_GLOSSARY.spend.term[language]} fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="ctr"
                        name={`${MARKETING_GLOSSARY.ctr.term[language]} %`}
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t('dashboard.visualInsights.topSpendCampaign', 'Top Spend Campaign')}</p>
                  <p className="text-sm font-medium truncate mt-1">{topSpendCampaign?.name || t('common.na', 'N/A')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {topSpendCampaign
                      ? `${formatCurrency(topSpendCampaign.spend)} • ${((topSpendCampaign.spend / Math.max(totalFilteredSpend, 1)) * 100).toFixed(1)}% ${t('dashboard.ofSpend', 'of spend')}`
                      : t('dashboard.visualInsights.noData', 'No data')}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t('dashboard.visualInsights.bestCtr', 'Best CTR')}</p>
                  <p className="text-sm font-medium truncate mt-1">{bestCtrCampaign?.name || t('common.na', 'N/A')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestCtrCampaign
                      ? `${((bestCtrCampaign.clicks / Math.max(bestCtrCampaign.impressions, 1)) * 100).toFixed(2)}% ${MARKETING_GLOSSARY.ctr.term[language]}`
                      : t('dashboard.visualInsights.noData', 'No data')}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t('dashboard.visualInsights.lowestCpc', 'Lowest CPC')}</p>
                  <p className="text-sm font-medium truncate mt-1">{lowestCpcCampaign?.name || t('common.na', 'N/A')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lowestCpcCampaign ? formatCurrency(lowestCpcCampaign.cpc || 0) : t('dashboard.visualInsights.noData', 'No data')}
                  </p>
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('dashboard.glossary.title', 'Marketing Glossary')}
                </p>
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
              </div>
            </CardContent>
          </Card>

          <Card className="self-start h-fit">
            <CardHeader>
              <CardTitle>{t('dashboard.efficiency.title', 'Efficiency Snapshot')}</CardTitle>
              <CardDescription>
                Ranked by{' '}
                <MarketingTerm
                  term={MARKETING_GLOSSARY.opportunityScore.term[language]}
                  definition={MARKETING_GLOSSARY.opportunityScore.definition[language]}
                  className="text-xs"
                />{' '}
                (higher{' '}
                <MarketingTerm
                  term={MARKETING_GLOSSARY.ctr.term[language]}
                  definition={MARKETING_GLOSSARY.ctr.definition[language]}
                  className="text-xs"
                />{' '}
                with lower{' '}
                <MarketingTerm
                  term={MARKETING_GLOSSARY.cpc.term[language]}
                  definition={MARKETING_GLOSSARY.cpc.definition[language]}
                  className="text-xs"
                />
                ).
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-y-auto pr-1">
              <div className="space-y-3">
                {efficiencyRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.efficiency.noData', 'No comparison data available.')}</p>
                ) : (
                  efficiencyRows.map((row, index) => {
                    const tone = getEfficiencyTone(row.ctrDelta, row.cpcDelta);
                    const scorePercent = Math.max(10, Math.round((row.efficiencyScore / maxEfficiencyScore) * 100));
                    return (
                      <div key={row.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{index + 1}. {row.name}</p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${tone.className}`}>
                            {tone.label}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${scorePercent}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{MARKETING_GLOSSARY.ctr.term[language]} {row.ctr.toFixed(2)}%</span>
                          <span>
                            {row.ctrDelta >= 0 ? '+' : ''}
                            {row.ctrDelta.toFixed(2)} {t('dashboard.vsAvg', 'vs avg')}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{MARKETING_GLOSSARY.cpc.term[language]} {formatCurrency(row.cpc)}</span>
                          <span>
                            {row.cpcDelta >= 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(row.cpcDelta))} {t('dashboard.vsAvg', 'vs avg')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.campaigns.title', 'Campaigns')}</CardTitle>
            <CardDescription>
              {filteredCampaigns.length} {t('dashboard.campaigns.found', 'campaigns found')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-[1] bg-background">
                  <TableRow>
                    <TableHead>{t('dashboard.table.campaignName', 'Campaign Name')}</TableHead>
                    <TableHead>{t('dashboard.table.platform', 'Platform')}</TableHead>
                    <TableHead>{t('dashboard.table.status', 'Status')}</TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term={MARKETING_GLOSSARY.spend.term[language]}
                        definition={MARKETING_GLOSSARY.spend.definition[language]}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term={MARKETING_GLOSSARY.impressions.term[language]}
                        definition={MARKETING_GLOSSARY.impressions.definition[language]}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term={MARKETING_GLOSSARY.clicks.term[language]}
                        definition={MARKETING_GLOSSARY.clicks.definition[language]}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term={MARKETING_GLOSSARY.cpc.term[language]}
                        definition={MARKETING_GLOSSARY.cpc.definition[language]}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          <p>{t('dashboard.campaigns.notFound', 'No campaigns found')}</p>
                          <p className="text-sm">{t('dashboard.campaigns.uploadPrompt', 'Upload a CSV file to get started')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/40 text-sm"
                        onClick={() => router.push(`/campaign/${campaign.id}`)}
                      >
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          {campaign.platform ? (
                            <Badge variant="outline">{campaign.platform}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('common.na', 'N/A')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {campaign.status ? (
                            <Badge
                              variant={
                                campaign.status.toLowerCase() === 'active'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('common.na', 'N/A')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(campaign.spend)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(campaign.impressions)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(campaign.clicks)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(campaign.cpc || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </main>

      {/* Footer */}
      <footer className="mt-auto bg-background border-t">
        <div className="container max-w-7xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <div>{t('dashboard.footer', 'ADC Ads Reporting ©')} {new Date().getFullYear()}</div>
          <div className="text-xs mt-1">{t('footer.madeIn', 'Made in Cambodia · EJC Digital')}</div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {chatOpen && (
          <Card className="w-[340px] shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {t('dashboard.chat.title', 'Ask the Dashboard')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('dashboard.chat.desc', 'Quick answers on campaigns, spend, CTR, CPC, and totals.')}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-3 h-[220px] overflow-y-auto space-y-3 bg-muted/20">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-md px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-8'
                        : 'bg-background border mr-8'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-background border mr-8 rounded-md px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('dashboard.chat.thinking', 'Thinking...')}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder={t('dashboard.chat.placeholder', 'Ask, e.g. "Which campaign has the best CTR?"')}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  disabled={chatLoading}
                />
                <Button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {t('action.send', 'Send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setChatOpen((prev) => !prev)}
          aria-label={chatOpen ? t('dashboard.chat.close', 'Close chat') : t('dashboard.chat.open', 'Open chat')}
        >
          <Bot className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
