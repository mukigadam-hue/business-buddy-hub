import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Briefcase, Loader2, ShieldCheck, ArrowLeft, KeyRound, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { CountryDialPicker } from "@/components/auth/CountryDialPicker";
import { SimulatedSmsScreen } from "@/components/auth/SimulatedSmsScreen";
import { COUNTRIES, detectDefaultCountry, type Country } from "@/lib/countries";
import { phoneSignIn, phoneSignUp, phoneResetPin } from "@/lib/phoneAuth";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="flex gap-2 items-center">
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
        <div className="flex gap-2 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-12 flex-1 rounded-lg border-2 flex items-center justify-center text-xl font-semibold transition-all ${
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
        className="h-12 w-12 rounded-lg border-2 border-border bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors shrink-0"
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
  const [mode, setMode] = useState<Mode>("signup");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Recovery sub-state
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryCountry, setRecoveryCountry] = useState<Country>(() => detectDefaultCountry());
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [newRecoveryEmail, setNewRecoveryEmail] = useState("");

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
      toast.success("Welcome back!");
    } catch (e: any) {
      toast.error(e.message || "Could not sign in");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen-safe bg-gradient-to-br from-primary/5 via-background to-amber-500/5 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Business Manager</h1>
            <p className="text-xs text-muted-foreground">Phone-first &middot; no email needed</p>
          </div>
        </div>

        {/* === SIGN UP === */}
        {mode === "signup" && (
          <div className="space-y-4">
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

            <div className="text-center text-sm pt-2 border-t">
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* === SIGN IN === */}
        {mode === "signin" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Welcome back</h2>
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
            </div>

            <div>
              <Label className="mb-2 block">5-digit PIN</Label>
              <PinBoxes value={pin} onChange={setPin} autoFocus />
            </div>

            <Button onClick={onSignIn} disabled={loading} className="w-full h-12 text-base font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={() => { setRecoveryPhone(phone); setRecoveryCountry(country); setMode("recover-phone"); }}
              className="w-full text-sm text-primary font-medium hover:underline flex items-center justify-center gap-1.5 py-2"
            >
              <KeyRound className="h-4 w-4" />
              Forgot PIN / Recover my business
            </button>

            <div className="text-center text-sm pt-2 border-t">
              New here?{" "}
              <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                Create account
              </button>
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

        <p className="text-[10px] text-center text-muted-foreground mt-6">
          By continuing you agree to our{" "}
          <a href="/privacy" className="underline">privacy policy</a>.
          {" · "}
          <a href="/login-email" className="underline">Use email instead</a>
        </p>
      </Card>
    </div>
  );
}
