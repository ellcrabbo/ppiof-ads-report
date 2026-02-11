'use client';

export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { MarketingTerm } from '@/components/marketing-term';
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
  const { status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask me anything about this dataset, e.g. "top campaign by spend", "overall CTR", or "how many campaigns do we have?"',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

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
        title: 'Error',
        description: 'Failed to load dashboard data.',
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
        title: 'Invalid File',
        description: 'Please upload a CSV file.',
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
        title: 'Upload Successful',
        description: `Imported ${data.campaignsCreated} campaigns, ${data.adSetsCreated} ad sets, and ${data.adsCreated} ads.`,
      });

      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: 'Warnings',
          description: data.warnings.join(', '),
        });
      }

      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
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
        title: 'Export Successful',
        description: 'PDF report has been downloaded.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
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
    .slice(0, 6);

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
        label: 'Strong',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      };
    }
    if (ctrDelta >= 0 || cpcDelta >= 0) {
      return {
        label: 'Solid',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      };
    }
    return {
      label: 'Watch',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    };
  };

  const sendChatMessage = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
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
          content: `I couldn't answer that right now: ${(error as Error).message}`,
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
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PPIOF Ads Report</h1>
                <p className="text-sm text-muted-foreground">Meta Ads Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => fetchData()}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <MarketingTerm
                  term="Total Spend"
                  definition="Total ad budget used in the selected dataset."
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
                  term="Impressions"
                  definition="How many times ads were shown. One person can generate multiple impressions."
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
                  term="Clicks"
                  definition="How many times users clicked from an ad to your destination."
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
                    term="CTR"
                    definition="Click-through rate. CTR = Clicks / Impressions × 100. Higher CTR usually means stronger ad relevance."
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
                  term="Avg CPC"
                  definition="Cost per click. CPC = Spend / Clicks. Lower CPC means cheaper traffic."
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
                    term="CPM"
                    definition="Cost per thousand impressions. CPM = Spend / (Impressions / 1,000)."
                    className="text-xs"
                  />{' '}
                  {formatCurrency(summary.avgCPM)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
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
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>

        {/* Visual Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6 items-start">
          <Card className="xl:col-span-2 self-start">
            <CardHeader>
              <CardTitle>Spend vs CTR</CardTitle>
              <CardDescription>
                Spend bars with CTR trend line so you can spot expensive but weak campaigns fast.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[250px]">
                {performanceMixData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No chart data available
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
                          if (key === 'spend') return [formatCurrency(Number(value)), 'Spend'];
                          if (key === 'ctr') return [`${Number(value).toFixed(2)}%`, 'CTR'];
                          return [String(value), key];
                        }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="ctr"
                        name="CTR %"
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
                  <p className="text-xs text-muted-foreground">Top Spend Campaign</p>
                  <p className="text-sm font-medium truncate mt-1">{topSpendCampaign?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {topSpendCampaign
                      ? `${formatCurrency(topSpendCampaign.spend)} • ${((topSpendCampaign.spend / Math.max(totalFilteredSpend, 1)) * 100).toFixed(1)}% of spend`
                      : 'No data'}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Best CTR</p>
                  <p className="text-sm font-medium truncate mt-1">{bestCtrCampaign?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestCtrCampaign
                      ? `${((bestCtrCampaign.clicks / Math.max(bestCtrCampaign.impressions, 1)) * 100).toFixed(2)}% CTR`
                      : 'No data'}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Lowest CPC</p>
                  <p className="text-sm font-medium truncate mt-1">{lowestCpcCampaign?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lowestCpcCampaign ? formatCurrency(lowestCpcCampaign.cpc || 0) : 'No data'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Efficiency Snapshot</CardTitle>
              <CardDescription>
                Ranked by CTR relative to CPC. No red flags, just quick prioritization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {efficiencyRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comparison data available.</p>
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
                          <span>CTR {row.ctr.toFixed(2)}%</span>
                          <span>
                            {row.ctrDelta >= 0 ? '+' : ''}
                            {row.ctrDelta.toFixed(2)} vs avg
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>CPC {formatCurrency(row.cpc)}</span>
                          <span>
                            {row.cpcDelta >= 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(row.cpcDelta))} vs avg
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
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term="Spend"
                        definition="Amount spent by this campaign over the imported reporting window."
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term="Impressions"
                        definition="How many times this campaign's ads were served."
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term="Clicks"
                        definition="Total clicks generated by this campaign."
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <MarketingTerm
                        term="CPC"
                        definition="Cost per click for this campaign."
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
                          <p>No campaigns found</p>
                          <p className="text-sm">Upload a CSV file to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/campaign/${campaign.id}`)}
                      >
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          {campaign.platform ? (
                            <Badge variant="outline">{campaign.platform}</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
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
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.spend)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.impressions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
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
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          PPIOF Ads Report © {new Date().getFullYear()}
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
                    Ask the Dashboard
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quick answers on campaigns, spend, CTR, CPC, and totals.
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
                    Thinking...
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder='Ask, e.g. "Which campaign has the best CTR?"'
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
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setChatOpen((prev) => !prev)}
          aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        >
          <Bot className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
