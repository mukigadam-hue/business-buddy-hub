import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Smartphone, Loader2, Eye, EyeOff, Building2 } from "lucide-react";
import { CountryDialPicker } from "@/components/auth/CountryDialPicker";
import { detectDefaultCountry, getCountryByCode, type Country } from "@/lib/countries";
import { attachEmail, attachPhone, isSyntheticEmail } from "@/lib/phoneAuth";

const SNOOZE_KEY = "bm:contact-consent-snooze";
const SNOOZE_MS = 6 * 60 * 60 * 1000; // match the demo banner reminder period
const DEMO_EMAIL = "reviewer@biztrack.demo";

/**
 * When a user (e.g. demo or phone-first signup) creates a business with a
 * contact phone / email but never registered those on their ACCOUNT, offer —
 * with consent — to save them for sign-in & recovery. Never forced: "Not now"
 * snoozes and business contacts always stay independent per business.
 */
export default function BusinessContactConsent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { businesses, memberships } = useBusiness();
  const [open, setOpen] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [useEmail, setUseEmail] = useState(true);
  const [usePhone, setUsePhone] = useState(true);
  const [country, setCountry] = useState<Country>(() => detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDemo =
    user?.email?.toLowerCase() === DEMO_EMAIL ||
    (user?.user_metadata as any)?.is_demo === true;
  const needsEmail = !!user && (isSyntheticEmail(user.email) || isDemo);

  // Owned businesses that carry contact info
  const ownedWithInfo = useMemo(() => {
    const ownedIds = new Set(
      memberships.filter((m) => m.role === "owner").map((m) => m.business_id),
    );
    return businesses.filter(
      (b: any) => ownedIds.has(b.id) && (b.contact || (b.email && b.email.includes("@"))),
    );
  }, [businesses, memberships]);

  const candidate = useMemo(() => {
    const withEmail = ownedWithInfo.find(
      (b: any) => b.email && b.email.includes("@") && b.email.toLowerCase() !== (user?.email || "").toLowerCase(),
    );
    const withPhone = ownedWithInfo.find((b: any) => (b.contact || "").replace(/\D/g, "").length >= 6);
    return {
      email: (withEmail as any)?.email?.trim() || "",
      phone: (withPhone as any)?.contact || "",
      businessName: ((withEmail || withPhone) as any)?.name || "",
      countryCode: ((withPhone || withEmail) as any)?.country_code || "",
    };
  }, [ownedWithInfo, user?.email]);

  /** E.164 version of the candidate phone, matching how attach-phone stores it. */
  const candidateE164 = useMemo(() => {
    const digits = (candidate.phone || "").replace(/\D/g, "");
    if (!digits) return "";
    const cc = getCountryByCode(candidate.countryCode);
    const dialDigits = (cc?.dial || "").replace(/\D/g, "");
    const national = dialDigits && digits.startsWith(dialDigits)
      ? digits
      : `${dialDigits}${digits.replace(/^0+/, "")}`;
    return national ? `+${national}` : "";
  }, [candidate.phone, candidate.countryCode]);

  // null = not checked yet, true = already registered on an account (cannot attach)
  const [phoneTaken, setPhoneTaken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const until = Number(localStorage.getItem(SNOOZE_KEY) || "0");
        if (until && Date.now() < until) return;
      } catch {}
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfilePhone((data as any)?.phone || "");
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const needsPhone = loaded && profilePhone === "";

  // Cloud check: if the candidate phone is already registered (on this or any
  // other account), it cannot be attached — never ask for it. This survives
  // reinstalls and new devices because it reads the account, not local flags.
  useEffect(() => {
    if (!loaded || !user) return;
    if (!needsPhone || !candidateE164) { setPhoneTaken(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("phone_exists", { _phone: candidateE164 });
        if (!cancelled) setPhoneTaken(!!data);
      } catch {
        // On a failed check, let the user try; a real conflict surfaces on save.
        if (!cancelled) setPhoneTaken(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, user, needsPhone, candidateE164]);

  const phoneActionable = needsPhone && !!candidate.phone && phoneTaken === false;

  // Open the dialog once we know something is missing AND we have a candidate
  useEffect(() => {
    if (!loaded || !user) return;
    // Wait for the phone availability check before deciding
    if (needsPhone && !!candidate.phone && phoneTaken === null) return;
    if ((!needsEmail || !candidate.email) && !phoneActionable) return;
    if (candidate.phone) {
      const cc = getCountryByCode(candidate.countryCode);
      if (cc) setCountry(cc);
      // Strip a leading dial code from the stored contact for a clean prefill
      let digits = candidate.phone.replace(/\D/g, "");
      const dialDigits = (cc?.dial || "").replace(/\D/g, "");
      if (dialDigits && digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length);
      setPhone(digits.replace(/^0+/, ""));
    }
    setUseEmail(needsEmail && !!candidate.email);
    setUsePhone(phoneActionable);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, needsEmail, needsPhone, phoneTaken, phoneActionable, candidate.email, candidate.phone, candidate.countryCode, user]);

  if (!open) return null;

  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
    setOpen(false);
  };

  const save = async () => {
    if (usePhone) {
      if (phone.replace(/\D/g, "").length < 6) { toast.error(t("accountSetup.invalidPhone")); return; }
      if (!/^\d{5}$/.test(pin)) { toast.error(t("accountSetup.invalidPin")); return; }
      if (pin !== pin2) { toast.error(t("accountSetup.pinMismatch")); return; }
    }
    if (!useEmail && !usePhone) { snooze(); return; }
    setSaving(true);
    const failures: string[] = [];
    try {
      if (useEmail && candidate.email) {
        try {
          await attachEmail({ email: candidate.email.toLowerCase() });
        } catch (e: any) { failures.push(e.message || "email"); }
      }
      if (usePhone && phone) {
        try {
          await attachPhone({
            phone: `${country.dial}${phone.replace(/\D/g, "").replace(/^0+/, "")}`,
            country_code: country.code,
            pin,
          });
        } catch (e: any) { failures.push(e.message || "phone"); }
      }
      if (failures.length === 0) {
        toast.success(t("accountSetup.consentSaved"));
        setOpen(false);
      } else {
        toast.error(failures[0]);
        // Keep the dialog open so the user can adjust or skip
      }
    } finally {
      setSaving(false);
    }
  };

  const pinInputCls = "h-12 text-center text-xl tracking-[0.5em] font-semibold";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> {t("accountSetup.consentTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("accountSetup.consentDesc", { business: candidate.businessName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {needsEmail && !!candidate.email && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t("accountSetup.emailLabel")}</p>
                  <p className="text-sm font-medium truncate">{candidate.email}</p>
                </div>
              </div>
              <Switch checked={useEmail} onCheckedChange={setUseEmail} />
            </div>
          )}

          {needsPhone && !!candidate.phone && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t("accountSetup.phoneLabel")}</p>
                    <p className="text-sm font-medium truncate">{candidate.phone}</p>
                  </div>
                </div>
                <Switch checked={usePhone} onCheckedChange={setUsePhone} />
              </div>
              {usePhone && (
                <div className="space-y-3 pt-1">
                  <div className="flex">
                    <CountryDialPicker value={country} onChange={setCountry} />
                    <Input
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="700 123 456"
                      className="h-11 rounded-l-none flex-1"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">{t("accountSetup.createPinLabel")}</Label>
                    <div className="relative">
                      <Input
                        inputMode="numeric"
                        type={showPin ? "text" : "password"}
                        maxLength={5}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="•••••"
                        className={`${pinInputCls} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={showPin ? "Hide PIN" : "Show PIN"}
                        tabIndex={-1}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">{t("accountSetup.confirmPinLabel")}</Label>
                    <Input
                      inputMode="numeric"
                      type={showPin ? "text" : "password"}
                      maxLength={5}
                      value={pin2}
                      onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="•••••"
                      className={pinInputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">{t("accountSetup.consentPrivacy")}</p>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={snooze} disabled={saving}>
              {t("accountSetup.notNow")}
            </Button>
            <Button className="flex-1 font-semibold" onClick={save} disabled={saving || (!useEmail && !usePhone)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("accountSetup.yesSave")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
