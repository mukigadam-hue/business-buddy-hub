import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { ChangePhoneCard } from "@/components/auth/ChangePhoneCard";
import { RegisterEmailCard } from "@/components/auth/RegisterEmailCard";
import { RegisterPhoneCard } from "@/components/auth/RegisterPhoneCard";
import { isSyntheticEmail } from "@/lib/phoneAuth";

const DEMO_EMAIL = "reviewer@biztrack.demo";

/**
 * Account contact settings: shows the right cards depending on how the
 * account was created.
 * - Phone-first (synthetic email) or demo → "Register your email" card.
 * - Email-first without phone → "Register your phone number" card.
 * - Otherwise → the usual Change phone / Change email controls.
 */
export function AccountContactSettings() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const isDemo =
    user?.email?.toLowerCase() === DEMO_EMAIL ||
    (user?.user_metadata as any)?.is_demo === true;
  const hasRealEmail = !!user?.email && !isSyntheticEmail(user.email) && !isDemo;

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    setProfilePhone((data as any)?.phone || "");
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const hasPhone = !!profilePhone && profilePhone !== "";

  return (
    <>
      <div className="grid grid-cols-1 gap-2">
        {!hasRealEmail && <RegisterEmailCard onDone={loadProfile} />}
        {hasRealEmail && (
          <Button variant="outline" className="w-full justify-start" onClick={() => setShowChangeEmail(true)}>
            <Mail className="h-4 w-4 mr-2" /> {t("accountSetup.changeEmail")}
          </Button>
        )}
        {loaded && !hasPhone && <RegisterPhoneCard onDone={loadProfile} />}
        {(!loaded || hasPhone) && <ChangePhoneCard />}
      </div>

      {/* Change Email Dialog (real-email accounts only) */}
      <Dialog open={showChangeEmail} onOpenChange={(o) => { if (!o) setNewEmail(""); setShowChangeEmail(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> {t("accountSetup.changeEmail")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {t("accountSetup.current")}: <strong>{user?.email}</strong>
            </p>
            <div>
              <Label>{t("accountSetup.newEmailLabel")}</Label>
              <Input type="email" placeholder="newemail@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" />
            </div>
            <Button className="w-full" disabled={changingEmail || !newEmail.includes("@")} onClick={async () => {
              setChangingEmail(true);
              try {
                const res = await supabase.functions.invoke("change-email", {
                  body: { newEmail: newEmail.trim() },
                });
                if (res.error) throw new Error(res.error.message || "Failed");
                const resData = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
                if (resData.error) throw new Error(resData.error);
                toast.success(t("accountSetup.emailChanged"));
                setShowChangeEmail(false);
                setNewEmail("");
                await signOut();
              } catch (err: any) {
                toast.error(err.message || t("accountSetup.saveFailed"));
              } finally {
                setChangingEmail(false);
              }
            }}>
              <Mail className="h-4 w-4 mr-2" /> {changingEmail ? t("accountSetup.changing") : t("accountSetup.changeEmail")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
