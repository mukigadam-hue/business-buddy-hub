import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LogIn, UserPlus, Eye, EyeOff, HelpCircle, KeyRound, ArrowLeft, Phone, Mail } from 'lucide-react';
import LegalHelpModal from '@/components/LegalHelpModal';

type RecoveryMode = 'none' | 'choose' | 'email' | 'phone' | 'phone-result';

export default function AuthPage() {
  const { signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!phone.trim()) {
          toast.error('Phone number is required for account recovery');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, phone.trim());
        if (error) throw error;
        toast.success('Account created! Please check your email to confirm your account before signing in.', { duration: 8000 });
        setIsSignUp(false);
        setPassword('');
        return;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
        toast.error('Email or password is incorrect. Double-check both, or use "Forgot email or password?" below to recover your account.', { duration: 7000 });
      } else if (msg.includes('email not confirmed')) {
        toast.error('Please confirm your email first. Check your inbox (and spam folder) for the confirmation link.', { duration: 7000 });
      } else {
        toast.error(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent! Check your email inbox.', { duration: 8000 });
      setRecoveryMode('none');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('lookup_email_by_phone', {
        _phone: recoveryPhone.trim(),
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No account found with this phone number. Make sure you enter the exact number you used during registration.');
        return;
      }
      setMaskedEmail(data[0].masked_email);
      setRecoveryMode('phone-result');
    } catch (err: any) {
      toast.error(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetFromPhone() {
    // We need the real email to send reset. Use a secure RPC.
    // Actually, we'll let the user now use the masked email hint to remember their email,
    // then they type it and we send the reset.
    setRecoveryMode('email');
    toast.info('Now enter your full email address and we\'ll send you a reset link.', { duration: 6000 });
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }

  const resetRecovery = () => {
    setRecoveryMode('none');
    setMaskedEmail('');
    setRecoveryPhone('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto" style={{ background: 'linear-gradient(145deg, hsl(217 72% 12%) 0%, hsl(217 72% 18%) 35%, hsl(210 60% 25%) 65%, hsl(42 80% 45%) 100%)' }}>
      {/* Hero Section */}
      <div className="w-full max-w-md sm:max-w-xl text-center pt-8 sm:pt-14 pb-6 sm:pb-10 px-2">
        <h1 className="text-3xl sm:text-5xl font-extrabold drop-shadow-lg leading-tight mb-3 sm:mb-5" style={{ color: 'hsl(210, 40%, 98%)' }}>
          Grow Your Business with BizTrack
        </h1>
        <p className="text-base sm:text-lg leading-relaxed max-w-md mx-auto font-medium" style={{ color: 'hsla(210, 40%, 98%, 0.85)' }}>
          The all-in-one dashboard to track sales, manage expenses, and stay organized.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm mb-10">
        <CardContent className="p-6 space-y-6">
          {/* Recovery: Choose method */}
          {recoveryMode === 'choose' && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
                  <KeyRound className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Recover Account</h1>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to recover your account
                </p>
              </div>
              <div className="space-y-3">
                <Button variant="outline" className="w-full h-14 flex items-center gap-3 text-left" onClick={() => setRecoveryMode('email')}>
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">I remember my email</p>
                    <p className="text-xs text-muted-foreground">We'll send a password reset link</p>
                  </div>
                </Button>
                <Button variant="outline" className="w-full h-14 flex items-center gap-3 text-left" onClick={() => setRecoveryMode('phone')}>
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">I forgot my email</p>
                    <p className="text-xs text-muted-foreground">Use your phone number to find your account</p>
                  </div>
                </Button>
              </div>
              <div className="text-center">
                <button type="button" className="text-sm text-primary hover:underline inline-flex items-center gap-1" onClick={resetRecovery}>
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </button>
              </div>
            </>
          )}

          {/* Recovery: By email */}
          {recoveryMode === 'email' && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
                  <Mail className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a password reset link
                </p>
              </div>
              <form onSubmit={handleForgotPasswordByEmail} className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <div className="text-center">
                <button type="button" className="text-sm text-primary hover:underline inline-flex items-center gap-1" onClick={() => setRecoveryMode('choose')}>
                  <ArrowLeft className="h-3 w-3" /> Back to recovery options
                </button>
              </div>
            </>
          )}

          {/* Recovery: By phone */}
          {recoveryMode === 'phone' && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
                  <Phone className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Find Your Account</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the phone number you used when you registered
                </p>
              </div>
              <form onSubmit={handlePhoneLookup} className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input type="tel" value={recoveryPhone} onChange={e => setRecoveryPhone(e.target.value)} required placeholder="e.g. +256700123456" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Searching...' : 'Find My Account'}
                </Button>
              </form>
              <div className="text-center">
                <button type="button" className="text-sm text-primary hover:underline inline-flex items-center gap-1" onClick={() => setRecoveryMode('choose')}>
                  <ArrowLeft className="h-3 w-3" /> Back to recovery options
                </button>
              </div>
            </>
          )}

          {/* Recovery: Phone result */}
          {recoveryMode === 'phone-result' && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
                  ✅
                </div>
                <h1 className="text-2xl font-bold text-foreground">Account Found!</h1>
                <p className="text-sm text-muted-foreground">
                  We found an account linked to your phone number
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">Your email address is:</p>
                <p className="text-lg font-bold font-mono text-foreground tracking-wide">{maskedEmail}</p>
                <p className="text-xs text-muted-foreground">
                  Does this look familiar? Use this to reset your password.
                </p>
              </div>
              <Button className="w-full" onClick={handleSendResetFromPhone}>
                <Mail className="h-4 w-4 mr-2" /> Reset Password with this Email
              </Button>
              <div className="text-center space-y-1">
                <button type="button" className="text-sm text-primary hover:underline inline-flex items-center gap-1" onClick={() => setRecoveryMode('phone')}>
                  <ArrowLeft className="h-3 w-3" /> Try a different phone number
                </button>
              </div>
            </>
          )}

          {/* Normal sign in / sign up */}
          {recoveryMode === 'none' && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-3xl mb-2">
                  📦
                </div>
                <h1 className="text-2xl font-bold text-foreground">BizTrack</h1>
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? 'Create your account' : 'Sign in to your business'}
                </p>
              </div>

              {/* Google Sign-In */}
              <Button
                variant="outline"
                className="w-full flex items-center gap-3 h-11"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div>
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your name" />
                    </div>
                    <div>
                      <Label>Phone Number <span className="text-xs text-muted-foreground">(for account recovery)</span></Label>
                      <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="e.g. +256700123456" />
                    </div>
                  </>
                )}
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {!isSignUp && (
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setRecoveryMode('choose')}
                    >
                      Forgot email or password?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {isSignUp ? <><UserPlus className="h-4 w-4 mr-2" />Sign Up</> : <><LogIn className="h-4 w-4 mr-2" />Sign In</>}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center space-y-2">
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  ✨ Before you leave or continue, tap <strong>Help & Legal</strong> below to discover everything this app can do for your business!
                </p>
                <LegalHelpModal
                  defaultTab="guide"
                  trigger={
                    <Button variant="default" size="sm" className="gap-2 text-xs animate-pulse">
                      <HelpCircle className="h-4 w-4" /> Help & Legal
                    </Button>
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
