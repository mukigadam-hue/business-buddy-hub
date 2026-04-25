import { forwardRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * Phone input that enforces an international country-code prefix.
 * - Always starts with `+`
 * - Only digits allowed after the `+`
 * - Strips spaces, dashes, parentheses, and any leading zeros after the `+`
 * - Helper text reminds the user about the country code (e.g. +254...)
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, className, placeholder, required, ...rest }, ref) => {
    const normalized = useMemo(() => normalize(value), [value]);
    const valid = isValidIntlPhone(normalized);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleaned = normalize(e.target.value);
      onChange(cleaned);
    }

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          value={normalized}
          onChange={handleChange}
          placeholder={placeholder || '+254712345678'}
          className={cn(
            !valid && normalized.length > 0 && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...rest}
        />
        {!valid && normalized.length > 0 ? (
          <p className="text-[10px] text-destructive">
            Phone must start with country code (e.g. +254, +1, +44)
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Include country code (e.g. +254712345678)
          </p>
        )}
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';

export function normalize(raw: string): string {
  if (!raw) return '';
  // Drop everything that's not a digit or a leading +
  const trimmed = raw.trim();
  const startsWithPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d]/g, '');
  // Always force a + prefix; strip any leading zeros so people can't bypass with "00..."
  digits = digits.replace(/^0+/, '');
  if (!digits) return startsWithPlus ? '+' : '';
  return '+' + digits;
}

export function isValidIntlPhone(value: string): boolean {
  if (!value) return false;
  // E.164: '+' followed by 7-15 digits
  return /^\+\d{7,15}$/.test(value);
}
