import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Briefcase, Loader2, ShieldCheck, ArrowLeft, KeyRound, Eye, EyeOff, Mail, Phone, HelpCircle, UserPlus } from "lucide-react";
import { CountryDialPicker } from "@/components/auth/CountryDialPicker";
import { SimulatedSmsScreen } from "@/components/auth/SimulatedSmsScreen";
import { COUNTRIES, detectDefaultCountry, type Country } from "@/lib/countries";
import { phoneSignIn, phoneSignUp, phoneResetPin } from "@/lib/phoneAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
import LegalHelpModal from "@/components/LegalHelpModal";
import PlayStoreUpdateButton from "@/components/PlayStoreUpdateButton";
import { AuthGrowthNudge } from "@/components/GrowthNudge";
import { BANNER_HEIGHT_PX } from "@/lib/nativeAdBridge";
import { isNativeShell } from "@/lib/nativeAdBridge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LAST_AUTH_KEY = "bm:last-auth";
type LastAuth =
  | { method: "phone"; phone: string; dial: string; iso: string }
  | { method: "email"; email: string };

type Mode = "signin" | "signup" | "recover-phone" | "recover-sms" | "recover-reset";

function PinBoxes({
  value,
  onChange,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  const [reveal, setReveal] = useState(false);
  // Single hidden numeric input drives a 5-slot visual display.
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="relative flex-1">
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          pattern="\d*"
          maxLength={5}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
          aria-label="5-digit PIN"
        />
        <div className="flex gap-1.5 pointer-events-none sm:gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex h-11 flex-1 items-center justify-center rounded-md border-2 text-lg font-semibold transition-all sm:h-12 sm:rounded-lg sm:text-xl ${
                value[i]
                  ? "border-primary bg-primary/5"
                  : value.length === i
                    ? "border-primary/60 bg-background"
                    : "border-border bg-muted/30"
              }`}
            >
              {value[i] ? (reveal ? value[i] : "•") : ""}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:h-12 sm:w-12 sm:rounded-lg"
        aria-label={reveal ? "Hide PIN" : "Show PIN"}
        tabIndex={-1}
      >
        {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

export default function PhoneAuthPage() {
  const [country, setCountry] = useState<Country>(() => detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Sign-in method toggle (legacy email/password users supported alongside phone+PIN)
  const [signinMethod, setSigninMethod] = useState<"phone" | "email">("phone");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [notRegisteredOpen, setNotRegisteredOpen] = useState(false);

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  // Demo / Reviewer login — required by Google Play policy so app reviewers
  // (and anyone who wants to try the app) can bypass the phone+PIN login wall.
  const onDemoSignIn = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch(
        "https://evuswzfmrfkmlcdsphgu.supabase.co/functions/v1/demo-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXN3emZtcmZrbWxjZHNwaGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTYzNjIsImV4cCI6MjA4NjczMjM2Mn0.mfuHVhSIxCMe68o7SPQtMJ4ELMIYQDTMTpoctrz1FO8",
          },
          body: JSON.stringify({}),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.email) throw new Error(json?.error || "Demo login unavailable");
      const { error } = await supabase.auth.signInWithPassword({
        email: json.email,
        password: json.password,
      });
      if (error) throw error;
      toast.success("Signed in as demo reviewer");
    } catch (e: any) {
      toast.error(e.message || "Demo sign-in failed");
    } finally {
      setDemoLoading(false);
    }
  };

  // Recovery sub-state
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryCountry, setRecoveryCountry] = useState<Country>(() => detectDefaultCountry());
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [newRecoveryEmail, setNewRecoveryEmail] = useState("");

  // Restore last-used identifier on first mount, jump straight to sign-in
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_AUTH_KEY);
      if (!raw) return;
      const last = JSON.parse(raw) as LastAuth;
      setMode("signin");
      if (last.method === "email") {
        setSigninMethod("email");
        setLoginEmail(last.email || "");
      } else if (last.method === "phone") {
        setSigninMethod("phone");
        setPhone(last.phone || "");
        const match = COUNTRIES.find((c) => c.code === last.iso) || COUNTRIES.find((c) => c.dial === last.dial);
        if (match) setCountry(match);
      }
    } catch {}
  }, []);

  const fullPhone = useMemo(
    () => `${country.dial}${phone.replace(/\D/g, "")}`,
    [country, phone],
  );
  const fullRecoveryPhone = useMemo(
    () => `${recoveryCountry.dial}${recoveryPhone.replace(/\D/g, "")}`,
    [recoveryCountry, recoveryPhone],
  );

  useEffect(() => {
    // Reset transient state when switching modes
    setPin("");
    setConfirmPin("");
  }, [mode]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const isFormField = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
      if (!isFormField) return;

      window.setTimeout(() => {
        target.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "auto",
        });
      }, 250);
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  const onSignUp = async () => {
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!/^\d{5}$/.test(pin)) {
      toast.error("PIN must be 5 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    setLoading(true);
    try {
      await phoneSignUp({
        phone: fullPhone,
        country_code: country.code,
        pin,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      try {
        localStorage.setItem(
          LAST_AUTH_KEY,
          JSON.stringify({ method: "phone", phone, dial: country.dial, iso: country.code }),
        );
      } catch {}
      toast.success("Welcome! You're signed in.");
    } catch (e: any) {
      toast.error(e.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const onSignIn = async () => {
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!/^\d{5}$/.test(pin)) {
      toast.error("Enter your 5-digit PIN");
      return;
    }
    setLoading(true);
    try {
      await phoneSignIn(fullPhone, pin);
      try {
        localStorage.setItem(
          LAST_AUTH_KEY,
          JSON.stringify({ method: "phone", phone, dial: country.dial, iso: country.code }),
        );
      } catch {}
      toast.success("Welcome back!");
    } catch (e: any) {
      const msg: string = e?.message || "Could not sign in";
      // If the phone isn't registered, prompt the user to create an account
      // right away instead of failing silently with a toast.
      if (/no account found/i.test(msg) || /404/.test(msg)) {
        setNotRegisteredOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onEmailSignIn = async () => {
    const em = loginEmail.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (!loginPassword) {
      toast.error("Enter your password");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password: loginPassword });
      if (error) throw error;
      try {
        localStorage.setItem(LAST_AUTH_KEY, JSON.stringify({ method: "email", email: em }));
      } catch {}
      toast.success("Welcome back!");
    } catch (e: any) {
      toast.error(e.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  const onEmailReset = async () => {
    const em = loginEmail.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      toast.error("Enter your email first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(
        `Reset link sent to ${em}. Check your inbox (and spam folder) — tap the link to set a new password, then come back here to sign in.`,
        { duration: 10000 },
      );
    } catch (e: any) {
      toast.error(e.message || "Could not send reset email");
    }
  };

  const startRecovery = () => {
    if (recoveryPhone.replace(/\D/g, "").length < 6) {
      toast.error("Enter your phone number");
      return;
    }
    setMode("recover-sms");
  };

  const onResetSubmit = async () => {
    if (!/^\d{5}$/.test(newPin)) {
      toast.error("New PIN must be 5 digits");
      return;
    }
    if (newPin !== newPinConfirm) {
      toast.error("PINs don't match");
      return;
    }
    setLoading(true);
    try {
      await phoneResetPin(fullRecoveryPhone, newPin);
      toast.success("PIN updated. You're signed in!");
      // The new recovery email is purely a hint here — saved after sign-in via mark_account_verified
      if (newRecoveryEmail) {
        const { markVerified } = await import("@/lib/phoneAuth");
        await markVerified(newRecoveryEmail.trim().toLowerCase()).catch(() => {});
      }
    } catch (e: any) {
      toast.error(e.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  // -------- Render --------
  return (
    <div
      data-auth-scroll-root
      className="flex min-h-[100svh] w-full flex-col items-center justify-start overflow-x-hidden overflow-y-visible px-2.5 pb-0 pt-1.5 sm:p-6"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        background: 'linear-gradient(145deg, hsl(217 72% 12%) 0%, hsl(217 72% 18%) 35%, hsl(210 60% 25%) 65%, hsl(42 80% 45%) 100%)',
        // Let the PAGE scroll naturally on mobile WebViews instead of locking
        // content inside a fixed-height inner container. Reserve extra bottom
        // room so the native banner ad never covers the auth controls.
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${isNativeShell() ? BANNER_HEIGHT_PX + 40 : 76}px)`,
      }}
    >


      {/* Hero Section */}
      <div className="w-full max-w-md px-1 text-center pb-2 pt-1 sm:max-w-xl sm:px-2 sm:pb-8 sm:pt-10">
        <h1
          className="mb-1 text-2xl font-extrabold leading-tight drop-shadow-lg sm:mb-4 sm:text-4xl"
          style={{ color: 'hsl(210, 40%, 98%)' }}
        >
          Grow Your Business with BizTrack
        </h1>
        <p
          className="mx-auto max-w-md text-sm font-medium leading-snug sm:text-base"
          style={{ color: 'hsla(210, 40%, 98%, 0.85)' }}
        >
          The all-in-one dashboard to track sales, manage expenses, and stay organized.
        </p>

        {/* Google Play — "Check updates on Google Play". Shown to everyone
            (web visitors and installed users) so updates are always one tap
            away. */}
        <div className="mt-5">
          <PlayStoreUpdateButton />
        </div>

        {/* Encouraging first-open message for visitors who have not signed up yet */}
        <AuthGrowthNudge onAction={() => setMode("signup")} />

      </div>

      <Card className="w-full max-w-md border-2 bg-card/95 p-3 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="mb-2 flex items-center gap-3 sm:mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white shadow-lg sm:h-11 sm:w-11">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight">Business Manager</h2>
            <p className="text-xs text-muted-foreground">Phone-first &middot; no email needed</p>
          </div>
        </div>


        {/* === SIGN UP === */}
        {mode === "signup" && (
          <div className="space-y-4">
            {/* Prominent "already have an account" banner — top of screen */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground mb-2">
                Already have an account?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Continue where you left off — sign in with your phone &amp; PIN, or your old email &amp; password.
              </p>
              <Button
                onClick={() => setMode("signin")}
                variant="default"
                className="w-full h-11 font-semibold"
              >
                Sign in to my account
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR CREATE NEW</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div>
              <Label className="mb-2 block">Your name (optional)</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="What should we call you?"
                className="h-12"
              />
            </div>

            <div>
              <Label className="mb-2 block">Phone number</Label>
              <div className="flex">
                <CountryDialPicker value={country} onChange={setCountry} />
                <Input
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="700 123 456"
                  className="h-12 rounded-l-none flex-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used to sign in. We won't send any SMS today.
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Create 5-digit PIN</Label>
              <PinBoxes value={pin} onChange={setPin} />
            </div>

            <div>
              <Label className="mb-2 block">Confirm PIN</Label>
              <PinBoxes value={confirmPin} onChange={setConfirmPin} />
              {confirmPin.length === 5 && pin !== confirmPin && (
                <p className="text-xs text-destructive mt-1">PINs don't match</p>
              )}
            </div>

            {!showEmail ? (
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="text-xs text-primary hover:underline"
              >
                + Add email (optional, for backup)
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Email <span className="text-muted-foreground">(optional)</span></Label>
                  <button
                    type="button"
                    onClick={() => { setShowEmail(false); setEmail(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Skip
                  </button>
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12"
                />
              </div>
            )}

            <Button onClick={onSignUp} disabled={loading} className="w-full h-12 text-base font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start App →"}
            </Button>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <p>You'll get straight into the app. We'll offer to back up your data later, only when you're ready.</p>
            </div>

          </div>
        )}


        {/* === SIGN IN === */}
        {mode === "signin" && (
          <div className="space-y-2.5 sm:space-y-4">
            <h2 className="font-semibold text-lg text-center">Welcome</h2>

            {/* Google sign-in — easiest recovery path, no password needed */}
            <Button
              variant="outline"
              onClick={onGoogleSignIn}
              disabled={googleLoading}
              className="flex h-11 w-full items-center gap-3 font-medium"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </Button>
            <p className="hidden text-[10px] leading-snug text-muted-foreground sm:block">
              Forgot your password? Just tap Google — no password needed.
            </p>

            {/* Demo / Reviewer login — bypasses the login wall for Google Play
                reviewers and lets curious users try the app without signing up. */}
            <Button
              variant="secondary"
              onClick={onDemoSignIn}
              disabled={demoLoading}
              className="h-11 w-full font-medium"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>🎬 Try demo account (no signup)</>
              )}
            </Button>
            <p className="hidden text-[10px] leading-snug text-muted-foreground sm:block">
              For reviewers & first-time visitors — instant access, no phone or email required.
            </p>

            <div className="flex items-center gap-2.5">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Method toggle: phone+PIN (new) vs email+password (legacy) */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setSigninMethod("phone")}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all ${
                  signinMethod === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Phone + PIN
              </button>
              <button
                type="button"
                onClick={() => setSigninMethod("email")}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all ${
                  signinMethod === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email + Password
              </button>
            </div>

            {signinMethod === "phone" ? (
              <>
                <div>
                  <Label className="mb-1 block">Phone number</Label>
                  <div className="flex">
                    <CountryDialPicker value={country} onChange={setCountry} />
                    <Input
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="700 123 456"
                      className="h-11 flex-1 rounded-l-none"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">5-digit PIN</Label>
                  <PinBoxes value={pin} onChange={setPin} autoFocus />
                </div>

                <Button onClick={onSignIn} disabled={loading} className="h-11 w-full text-base font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setRecoveryPhone(phone); setRecoveryCountry(country); setMode("recover-phone"); }}
                  className="flex w-full items-center justify-center gap-1.5 py-0.5 text-sm font-medium text-primary hover:underline"
                >
                  <KeyRound className="h-4 w-4" />
                  Forgot PIN / Recover my business
                </button>
              </>
            ) : (
              <>
                <div>
                  <Label className="mb-2 block">Email</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Password</Label>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Your password"
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button onClick={onEmailSignIn} disabled={loading} className="w-full h-12 text-base font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>

                <button
                  type="button"
                  onClick={onEmailReset}
                  className="w-full text-sm text-primary font-medium hover:underline flex items-center justify-center gap-1.5 py-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Forgot password? Email me a reset link
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  For users who registered with the old email/password sign-up.
                </p>
              </>
            )}

            {/* Prominent "Create new account" card — highlighted differently from Sign in */}
            <div className="mt-1 rounded-xl border-2 border-dashed border-amber-500/60 bg-amber-500/10 p-2.5 sm:mt-4 sm:p-4">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2.5">
                <div className="min-w-0">
                  <p className="mb-0.5 flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <UserPlus className="h-4 w-4 shrink-0 text-amber-600" />
                    New to BizTrack?
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    Create your account in seconds.
                  </p>
                </div>
                <Button
                  onClick={() => setMode("signup")}
                  variant="outline"
                  className="h-11 border-2 border-amber-500 px-3 font-semibold text-amber-700 hover:bg-amber-500 hover:text-white dark:text-amber-400"
                >
                  Create account
                </Button>
              </div>
            </div>
          </div>
        )}


        {/* === RECOVERY: phone entry === */}
        {mode === "recover-phone" && (
          <div className="space-y-4">
            <button onClick={() => setMode("signin")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="font-semibold text-lg">Recover your business</h2>
            <p className="text-sm text-muted-foreground">
              Enter the phone number you used to sign up. We'll auto-detect a secure SMS so you can set a new PIN.
            </p>
            <div>
              <Label className="mb-2 block">Phone number</Label>
              <div className="flex">
                <CountryDialPicker value={recoveryCountry} onChange={setRecoveryCountry} />
                <Input
                  inputMode="tel"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="700 123 456"
                  className="h-12 rounded-l-none flex-1"
                  autoFocus
                />
              </div>
            </div>
            <Button onClick={startRecovery} className="w-full h-12 font-semibold">
              Recover →
            </Button>
          </div>
        )}

        {/* === RECOVERY: simulated SMS === */}
        {mode === "recover-sms" && (
          <SimulatedSmsScreen
            phone={fullRecoveryPhone}
            onComplete={() => setMode("recover-reset")}
          />
        )}

        {/* === RECOVERY: reset PIN + email === */}
        {mode === "recover-reset" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Set up new security</h2>
            <p className="text-sm text-muted-foreground">
              Phone verified. Choose a new PIN — all your business data stays intact.
            </p>

            <div>
              <Label className="mb-2 block">New 5-digit PIN</Label>
              <PinBoxes value={newPin} onChange={setNewPin} autoFocus />
            </div>
            <div>
              <Label className="mb-2 block">Confirm new PIN</Label>
              <PinBoxes value={newPinConfirm} onChange={setNewPinConfirm} />
              {newPinConfirm.length === 5 && newPin !== newPinConfirm && (
                <p className="text-xs text-destructive mt-1">PINs don't match</p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Recovery email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                type="email"
                value={newRecoveryEmail}
                onChange={(e) => setNewRecoveryEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12"
              />
            </div>

            <Button onClick={onResetSubmit} disabled={loading} className="w-full h-12 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update & sign in"}
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-center sm:mt-6 sm:space-y-2 sm:p-3">
          <p className="text-[11px] font-medium leading-relaxed text-foreground sm:text-xs">
            ✨ Before you leave or continue, tap <strong>Help &amp; Legal</strong> below to discover everything this app can do for your business!
          </p>
          <LegalHelpModal
            defaultTab="guide"
            trigger={
              <Button variant="default" size="sm" className="h-10 gap-2 text-xs animate-pulse">
                <HelpCircle className="h-4 w-4" /> Help &amp; Legal
              </Button>
            }
          />
        </div>

        <p className="mt-3 text-center text-[9px] leading-tight text-muted-foreground sm:mt-4 sm:text-[10px]">
          By continuing you agree to our{" "}
          <a href="/privacy" className="underline">privacy policy</a>.
          {" · "}
          <a href="/login-email" className="underline">Use email instead</a>
        </p>
      </Card>

      {/* Bottom duplicate of the Play Store update button (auth page only).
          Extra bottom margin keeps it clear of the fixed banner ad. */}
      <div
        className="flex w-full max-w-md justify-center px-2 pt-6"
        style={{ paddingBottom: `calc(${BANNER_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 16px)` }}
      >
        <PlayStoreUpdateButton />
      </div>


      {/* Auto-detected: phone not registered → invite to create an account */}
      <AlertDialog open={notRegisteredOpen} onOpenChange={setNotRegisteredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-600" />
              New here? Create an account
            </AlertDialogTitle>
            <AlertDialogDescription>
              We couldn't find an account for <strong>{fullPhone}</strong>. It looks like you
              haven't registered yet. Tap <strong>Create account</strong> to continue — we'll
              keep the phone number and PIN you already typed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Try a different number</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setNotRegisteredOpen(false);
                // Preserve the phone + PIN the user already typed and jump to signup.
                setConfirmPin(pin);
                setMode("signup");
              }}
            >
              Create account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

