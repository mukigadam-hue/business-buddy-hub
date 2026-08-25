import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { attachEmail } from "@/lib/phoneAuth";

/**
 * Lets a phone-first (or demo) account register a REAL email address later,
 * from Settings. The session stays alive and phone+PIN sign-in keeps working.
 * An optional password enables email+password sign-in too.
 */
export function RegisterEmailCard({ onDone, initialEmail = "" }: { onDone?: () => void; initialEmail?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error(t("accountSetup.invalidEmail"));
      return;
    }
    if (password && password.length < 6) {
      toast.error(t("accountSetup.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await attachEmail({ email: clean, password: password || undefined });
      toast.success(t("accountSetup.emailSaved"));
      setOpen(false);
      setEmail("");
      setPassword("");
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || t("accountSetup.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-4 flex items-start gap-3 border-primary/30 bg-primary/5">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{t("accountSetup.registerEmailTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("accountSetup.registerEmailDesc")}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>{t("accountSetup.add")}</Button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> {t("accountSetup.registerEmailTitle")}
            </DialogTitle>
            <DialogDescription>{t("accountSetup.registerEmailDialogDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-2 block">{t("accountSetup.emailLabel")}</Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12"
              />
            </div>
            <div>
              <Label className="mb-2 block">{t("accountSetup.passwordOptionalLabel")}</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t("accountSetup.passwordHint")}</p>
            </div>

            <Button onClick={submit} disabled={loading || !email.includes("@")} className="w-full h-12 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("accountSetup.saveEmail")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
