'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { BarChart3, Upload, TrendingUp, FileText, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: 'Invalid password. Please try again.',
        });
      } else {
        toast({
          title: 'Welcome!',
          description: 'You are now logged in.',
        });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/60 dark:from-background dark:to-muted/20 flex items-center justify-center p-4 relative">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-lg p-3">
              <BarChart3 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">PPIOF Ads Report</h1>
          <p className="text-muted-foreground mt-2">Meta Ads Analytics Dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your password to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 gap-4">
          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="bg-blue-100 p-2 rounded">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">CSV Upload</p>
              <p className="text-xs text-muted-foreground">Import Meta Ads data</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="bg-green-100 p-2 rounded">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Analytics</p>
              <p className="text-xs text-muted-foreground">Track performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="bg-purple-100 p-2 rounded">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">PDF Export</p>
              <p className="text-xs text-muted-foreground">Generate reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
