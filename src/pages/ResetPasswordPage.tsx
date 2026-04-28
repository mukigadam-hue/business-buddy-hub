import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Listen for the PASSWORD_RECOVERY event from Supabase (legacy hash flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setExchanging(false);
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || '';
        const search = url.search || '';

        // Modern PKCE flow: ?code=...
        const code = url.searchParams.get('code');
        // Legacy hash flow: #access_token=...&type=recovery
        const hasHashRecovery = hash.includes('type=recovery') || hash.includes('access_token=');
        // Query-string recovery hint (?type=recovery)
        const queryType = url.searchParams.get('type');

        if (code) {
          // Exchange the recovery code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (cancelled) return;
          if (error) {
            toast.error('This reset link has expired or was already used. Please request a new one.', { duration: 8000 });
            setIsRecovery(false);
          } else {
            setIsRecovery(true);
            // Clean the URL so the code can't be reused / leaked
            window.history.replaceState({}, '', '/reset-password');
          }
        } else if (hasHashRecovery || queryType === 'recovery') {
          // Hash-based session is auto-handled by supabase-js; mark as recovery
          setIsRecovery(true);
        } else {
          // No code/hash — maybe the user is already in a recovery session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setIsRecovery(true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setExchanging(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Password updated successfully!');
      // Sign out so the user signs back in fresh with the new password
      setTimeout(async () => {
        try { await supabase.auth.signOut(); } catch {}
        window.location.href = '/';
      }, 1800);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, hsl(217 72% 12%) 0%, hsl(217 72% 18%) 35%, hsl(210 60% 25%) 65%, hsl(42 80% 45%) 100%)' }}>
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-3xl mb-2">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              {success ? 'Your password has been updated!' : exchanging ? 'Verifying your reset link…' : isRecovery ? 'Enter your new password below' : 'Reset link not detected'}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : exchanging ? (
            <div className="text-center space-y-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">One moment while we verify your link…</p>
            </div>
          ) : !isRecovery ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                This page opens after you tap the password reset link in your email. If you haven't received one, go back and request a reset.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
