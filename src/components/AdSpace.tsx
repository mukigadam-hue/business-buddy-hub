import { cn } from '@/lib/utils';

interface AdSpaceProps {
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
}

/**
 * Native ad placeholder. Replace the inner content with your ad network's component.
 * - banner: Full-width, taller — for between sections
 * - inline: Full-width, medium — for between list items  
 * - compact: Smaller — for sidebar or tight spaces
 */
export default function AdSpace({ variant = 'banner', className }: AdSpaceProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground/50 select-none',
        variant === 'banner' && 'h-20 w-full',
        variant === 'inline' && 'h-16 w-full',
        variant === 'compact' && 'h-12 w-full',
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-widest">Ad Space</span>
    </div>
  );
}

/**
 * Utility: interleave ad placeholders every `interval` items in a list.
 */
export function withInlineAds<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  interval = 8,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  items.forEach((item, i) => {
    result.push(renderItem(item, i));
    if ((i + 1) % interval === 0 && i + 1 < items.length) {
      result.push(<AdSpace key={`ad-${i}`} variant="inline" />);
    }
  });
  return result;
}
