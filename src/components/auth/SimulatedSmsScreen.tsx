import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Loader2 } from "lucide-react";

interface Props {
  phone: string;
  onComplete: () => void;
  /** Override for tests; defaults to a friendly 3s delay. */
  delayMs?: number;
}

/**
 * Mimics a WhatsApp / Android auto-SMS-OTP retriever:
 * - shows "waiting" spinner
 * - after delayMs auto-fills a 6-digit code
 * - plays a success animation, then calls onComplete()
 */
export function SimulatedSmsScreen({ phone, onComplete, delayMs = 3000 }: Props) {
  const [stage, setStage] = useState<"waiting" | "filling" | "success">("waiting");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    const generated = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 10).toString(),
    );
    const fill = setTimeout(() => {
      setStage("filling");
      generated.forEach((d, i) =>
        setTimeout(() => {
          setCode((prev) => {
            const next = [...prev];
            next[i] = d;
            return next;
          });
        }, i * 120),
      );
      setTimeout(() => setStage("success"), generated.length * 120 + 250);
      setTimeout(() => onComplete(), generated.length * 120 + 1100);
    }, delayMs);
    return () => clearTimeout(fill);
  }, [delayMs, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
      <div
        className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${
          stage === "success"
            ? "bg-emerald-500/15 scale-110"
            : "bg-primary/10 animate-pulse"
        }`}
      >
        {stage === "success" ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        ) : stage === "filling" ? (
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        ) : (
          <MessageSquare className="h-10 w-10 text-primary" />
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-lg">
          {stage === "success"
            ? "Verified successfully"
            : stage === "filling"
              ? "Code received"
              : "Waiting for SMS…"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {stage === "success"
            ? "Your phone number has been confirmed."
            : `We're auto-detecting the secure code sent to ${phone}. No action needed.`}
        </p>
      </div>

      <div className="flex gap-2">
        {code.map((d, i) => (
          <div
            key={i}
            className={`h-12 w-10 rounded-lg border-2 flex items-center justify-center text-xl font-semibold tabular-nums transition-all ${
              d
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-muted/30 text-muted-foreground"
            }`}
          >
            {d || "•"}
          </div>
        ))}
      </div>

      {stage === "waiting" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Listening for secure SMS OTP…
        </div>
      )}
    </div>
  );
}
