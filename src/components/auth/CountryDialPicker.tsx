import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, type Country } from "@/lib/countries";
import { Check, ChevronDown, Search } from "lucide-react";

interface Props {
  value: Country;
  onChange: (c: Country) => void;
}

export function CountryDialPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.dial.includes(needle) ||
        c.code.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 px-3 gap-2 shrink-0 rounded-r-none border-r-0"
          aria-label="Select country code"
        >
          <span className="text-xl leading-none">{value.flag}</span>
          <span className="font-medium text-sm tabular-nums">{value.dial}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country or code"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
                setQ("");
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <span className="text-xl">{c.flag}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-muted-foreground tabular-nums">{c.dial}</span>
              {value.code === c.code && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No matches</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
