'use client';

export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
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
  Filter,
  Search,
  Calendar,
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

interface ImportRunSummary {
  id: string;
  fileName: string;
  platform: string;
  rowCount: number;
  createdAt: string;
  rowsProcessed: number;
  rowsDropped: number;
  duplicatesMerged: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalResults: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [latestImport, setLatestImport] = useState<ImportRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [platform, setPlatform] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, campaignsRes, importRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/campaigns'),
        fetch('/api/import-runs?limit=1'),
      ]);

      if (!summaryRes.ok || !campaignsRes.ok || !importRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const summaryData = await summaryRes.json();
      const campaignsData = await campaignsRes.json();
      const importData = await importRes.json();

      setSummary(summaryData.data.summary);
      setCampaigns(campaignsData.data);
      setLatestImport(importData.data?.[0] ?? null);
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

      if (data.importSummary) {
        const diff = data.importSummary.diffFromPrevious;
        const diffText = diff
          ? `Δ Spend ${formatCurrency(diff.spend)}, Δ Impr. ${formatNumber(diff.impressions)}, Δ Clicks ${formatNumber(diff.clicks)}.`
          : 'No previous import to compare.';

        toast({
          title: 'Import Summary',
          description: `Rows processed ${formatNumber(data.importSummary.rowsProcessed)} • Dropped ${formatNumber(data.importSummary.rowsDropped)} • Duplicates merged ${formatNumber(data.importSummary.duplicatesMerged)}. ${diffText}`,
        });
      }

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
        body: JSON.stringify({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
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
    if (platform && campaign.platform !== platform) {
      return false;
    }
    if (objective && campaign.objective !== objective) {
      return false;
    }
    return true;
  });

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary rounded-lg p-2">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">PPIOF Ads Report</h1>
                  <p className="text-sm text-slate-600">Meta Ads Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">PPIOF Ads Report</h1>
                <p className="text-sm text-slate-600">Meta Ads Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
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
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
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
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary ? formatNumber(summary.totalClicks) : '0'}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  CTR: {summary.ctr.toFixed(2)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPC</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary ? formatCurrency(summary.avgCPC) : '$0'}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  CPM: {formatCurrency(summary.avgCPM)}
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

        {latestImport && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Latest Import Summary</CardTitle>
              <CardDescription>
                {latestImport.fileName} • {new Date(latestImport.createdAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Rows Processed</div>
                  <div className="font-semibold">{formatNumber(latestImport.rowsProcessed)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rows Dropped</div>
                  <div className="font-semibold">{formatNumber(latestImport.rowsDropped)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Duplicates Merged</div>
                  <div className="font-semibold">{formatNumber(latestImport.duplicatesMerged)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Spend</div>
                  <div className="font-semibold">{formatCurrency(latestImport.totalSpend)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <TableHead>Objective</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                        className={`cursor-pointer hover:bg-slate-50 ${
                          campaign.spend === 0 && campaign.impressions === 0 && campaign.clicks === 0
                            ? 'opacity-60'
                            : ''
                        }`}
                        onClick={() => router.push(`/campaign/${campaign.id}`)}
                      >
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          {campaign.objective ? (
                            <Badge variant="secondary">{campaign.objective}</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
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
      <footer className="mt-auto bg-white border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-slate-600">
          PPIOF Ads Report © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
