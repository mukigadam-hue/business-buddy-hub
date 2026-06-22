import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, MessageSquare, Cloud, X } from "lucide-react";
import { SimulatedSmsScreen } from "./SimulatedSmsScreen";
import { markVerified } from "@/lib/phoneAuth";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const SNOOZE_KEY = "bm.securityUpgrade.snoozeUntil";
const DAY = 86_400_000;

interface Profile {
  verification_status: string;
  created_at: string;
  recovery_email: string;
}

export function SecurityUpgradeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"prompt" | "sms" | "done">("prompt");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (snooze > Date.now()) return;

      const { data } = await supabase
        .from("profiles")
        .select("verification_status, created_at, recovery_email")
        .eq("id", user.id)
        .maybeSingle<Profile>();
      if (cancelled || !data) return;
      if (data.verification_status === "verified") return;

      const ageDays = (Date.now() - new Date(data.created_at).getTime()) / DAY;
      const forceParam = new URLSearchParams(window.location.search).get("secure") === "1";
      if (ageDays >= 7 || forceParam) {
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + DAY));
    setOpen(false);
    setStage("prompt");
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) { toast.error("Google sign-in failed"); return; }
      if (res.redirected) return;
      // We're back with a (possibly new) Google session — grab the email and mark this account verified.
      const { data: { user: u } } = await supabase.auth.getUser();
      const email = u?.email || "";
      await markVerified(email);
      toast.success("Account secured");
      setStage("done");
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) {
      toast.error(e.message || "Could not link Google");
    } finally {
      setBusy(false);
    }
  };

  const onSmsDone = async () => {
    try {
      await markVerified("");
      toast.success("Account secured via SMS");
      setStage("done");
      setTimeout(() => setOpen(false), 1000);
    } catch (e: any) {
      toast.error(e.message || "Could not save verification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {stage === "prompt" && (
          <div className="relative">
            <div className="h-28 bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <button
              onClick={snooze}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 space-y-5">
              <DialogHeader className="space-y-2 text-center">
                <DialogTitle className="text-xl">🔐 Secure Your Business Records</DialogTitle>
                <DialogDescription>
                  Your data is currently only saved on this phone. Link your account now so you can back up your records to the cloud and never lose them if your phone is lost or broken.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Button onClick={onGoogle} disabled={busy} variant="outline" className="w-full h-12 justify-start gap-3 border-2">
                  <span className="h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-[#4285F4]">G</span>
                  <span className="font-medium">Continue with Google</span>
                </Button>
                <Button onClick={() => setStage("sms")} disabled={busy} className="w-full h-12 justify-start gap-3 bg-emerald-600 hover:bg-emerald-700">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">Secure via SMS</span>
                </Button>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <Cloud className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <p>Takes 5 seconds. You'll still use the same PIN to sign in.</p>
              </div>

              <button
                onClick={snooze}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
              >
                I don't know my email / Skip for now
              </button>
            </div>
          </div>
        )}

        {stage === "sms" && (
          <div className="p-6">
            <SimulatedSmsScreen
              phone={(user?.user_metadata as any)?.phone || ""}
              onComplete={onSmsDone}
            />
          </div>
        )}

        {stage === "done" && (
          <div className="p-10 text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">All secured!</h3>
            <p className="text-sm text-muted-foreground">Your records are now backed up to the cloud.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
