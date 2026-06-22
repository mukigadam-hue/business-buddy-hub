import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { CountryDialPicker } from "@/components/auth/CountryDialPicker";
import { detectDefaultCountry, type Country } from "@/lib/countries";
import { phoneChangeNumber } from "@/lib/phoneAuth";

export function ChangePhoneCard() {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<Country>(() => detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const submit = async () => {
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Enter a valid new phone number");
      return;
    }
    if (!/^\d{5}$/.test(pin)) {
      toast.error("Enter your current 5-digit PIN");
      return;
    }
    setLoading(true);
    try {
      await phoneChangeNumber({
        new_phone: `${country.dial}${phone.replace(/\D/g, "")}`,
        country_code: country.code,
        pin,
      });
      toast.success("Phone number updated");
      setOpen(false);
      setPhone("");
      setPin("");
    } catch (e: any) {
      toast.error(e.message || "Could not update phone");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Change registered phone number</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moving to a new SIM? Update your number so nobody can access your business through your old line.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Change</Button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Update phone number
            </DialogTitle>
            <DialogDescription>
              Moving to a new network or SIM card? Update your number here so nobody else can ever access your business if your old SIM is recycled by the telecom company.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-2 block">New phone number</Label>
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
              <Label className="mb-2 block">Current 5-digit PIN</Label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  type={showPin ? "text" : "password"}
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="•••••"
                  className="h-12 text-center text-xl tracking-[0.5em] font-semibold pr-12"
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

            <Button onClick={submit} disabled={loading} className="w-full h-12 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update number"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
