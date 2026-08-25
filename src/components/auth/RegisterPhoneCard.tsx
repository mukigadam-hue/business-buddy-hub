import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { CountryDialPicker } from "@/components/auth/CountryDialPicker";
import { detectDefaultCountry, type Country } from "@/lib/countries";
import { attachPhone } from "@/lib/phoneAuth";

/**
 * Lets an email-first (or demo) account register a phone number + 5-digit PIN
 * later, from Settings. Never touches the existing email/password sign-in.
 */
export function RegisterPhoneCard({ onDone, initialPhone = "", initialCountry }: { onDone?: () => void; initialPhone?: string; initialCountry?: Country }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<Country>(() => initialCountry ?? detectDefaultCountry());
  const [phone, setPhone] = useState(initialPhone);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      toast.error(t("accountSetup.invalidPhone"));
      return;
    }
    if (!/^\d{5}$/.test(pin)) {
      toast.error(t("accountSetup.invalidPin"));
      return;
    }
    if (pin !== pin2) {
      toast.error(t("accountSetup.pinMismatch"));
      return;
    }
    setLoading(true);
    try {
      await attachPhone({
        phone: `${country.dial}${digits.replace(/^0+/, "")}`,
        country_code: country.code,
        pin,
      });
      toast.success(t("accountSetup.phoneSaved"));
      setOpen(false);
      setPhone("");
      setPin("");
      setPin2("");
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || t("accountSetup.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const pinInputCls = "h-12 text-center text-xl tracking-[0.5em] font-semibold";

  return (
    <>
      <Card className="p-4 flex items-start gap-3 border-primary/30 bg-primary/5">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{t("accountSetup.registerPhoneTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("accountSetup.registerPhoneDesc")}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>{t("accountSetup.add")}</Button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> {t("accountSetup.registerPhoneTitle")}
            </DialogTitle>
            <DialogDescription>{t("accountSetup.registerPhoneDialogDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-2 block">{t("accountSetup.phoneLabel")}</Label>
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
              <Label className="mb-2 block">{t("accountSetup.createPinLabel")}</Label>
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
              <Label className="mb-2 block">{t("accountSetup.confirmPinLabel")}</Label>
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

            <Button onClick={submit} disabled={loading} className="w-full h-12 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("accountSetup.savePhone")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
