import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Select nativo con las clases del design system (shadcn/ui).
 * Se usa el elemento HTML para no romper los tests que disparan `change`
 * y consultan `option` / `value` (el Select de Radix no es un <select>).
 */
function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none md:text-sm',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
