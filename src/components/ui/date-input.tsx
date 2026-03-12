'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type DateInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, disabled, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    const assignRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;

        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
          return;
        }

        if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    const openPicker = React.useCallback(() => {
      const input = innerRef.current;
      if (!input || disabled) {
        return;
      }

      input.focus({ preventScroll: true });

      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }

      input.click();
    }, [disabled]);

    return (
      <div className="relative">
        <Input
          ref={assignRef}
          type="date"
          disabled={disabled}
          className={cn(
            'date-input-native h-11 pr-12 text-left [color-scheme:light] dark:[color-scheme:dark]',
            className
          )}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <CalendarDays className="h-5 w-5" />
          <span className="sr-only">Buka pemilih tanggal</span>
        </button>
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
