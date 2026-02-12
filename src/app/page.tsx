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
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';
import { BarChart3, Upload, TrendingUp, FileText, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
          title: t('login.toast.authFailed.title', 'Authentication Failed'),
          description: t('login.toast.authFailed.desc', 'Invalid password. Please try again.'),
        });
      } else {
        toast({
          title: t('login.toast.welcome.title', 'Welcome!'),
          description: t('login.toast.welcome.desc', 'You are now logged in.'),
        });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('error.title', 'Error'),
        description: t('login.toast.error.desc', 'Something went wrong. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/60 dark:from-background dark:to-muted/20 flex items-center justify-center p-4 relative">
      <div className="absolute right-4 top-4">
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-lg p-3">
              <BarChart3 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">{t('app.title', 'ADC Ads Reporting')}</h1>
          <p className="text-muted-foreground mt-2">{t('login.subtitle', 'Meta Ads Analytics Dashboard')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('login.cardTitle', 'Sign In')}
            </CardTitle>
            <CardDescription>
              {t('login.cardDescription', 'Enter your password to access the dashboard')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('action.signingIn', 'Signing in...') : t('action.signIn', 'Sign In')}
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
              <p className="font-medium text-sm">{t('login.feature.csvTitle', 'CSV Upload')}</p>
              <p className="text-xs text-muted-foreground">{t('login.feature.csvDescription', 'Import Meta Ads data')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="bg-green-100 p-2 rounded">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{t('login.feature.analyticsTitle', 'Analytics')}</p>
              <p className="text-xs text-muted-foreground">{t('login.feature.analyticsDescription', 'Track performance metrics')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="bg-purple-100 p-2 rounded">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{t('login.feature.pdfTitle', 'PDF Export')}</p>
              <p className="text-xs text-muted-foreground">{t('login.feature.pdfDescription', 'Generate reports')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
