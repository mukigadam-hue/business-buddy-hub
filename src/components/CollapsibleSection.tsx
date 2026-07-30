import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  title: ReactNode;
  /** Small text shown on the header line even while collapsed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Simple fold / unfold wrapper for long lists so screens stay short.
 */
export default function CollapsibleSection({ title, summary, defaultOpen = false, children, className = '' }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 min-h-[44px] text-left"
      >
        <span className="flex-1 min-w-0">{title}</span>
        <span className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
          {summary}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="pt-2 space-y-2">{children}</div>}
    </div>
  );
}
