'use client';

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEvent,
  type MouseEventHandler,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AddTransactionDialogProps } from './add-transaction-dialog';

type AddTransactionDialogComponent =
  typeof import('./add-transaction-dialog').AddTransactionDialog;
type TriggerElementProps = {
  onClick?: MouseEventHandler<HTMLElement>;
  onPointerEnter?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  className?: string;
  'aria-busy'?: boolean;
};

let addTransactionDialogModulePromise:
  | Promise<typeof import('./add-transaction-dialog')>
  | null = null;

function loadAddTransactionDialog() {
  addTransactionDialogModulePromise ??= import('./add-transaction-dialog');
  return addTransactionDialogModulePromise;
}

function composeMouseHandler(
  original?: MouseEventHandler<HTMLElement>,
  next?: MouseEventHandler<HTMLElement>
) {
  return (event: MouseEvent<HTMLElement>) => {
    const currentEvent = event as MouseEvent<HTMLElement>;
    original?.(currentEvent);
    if (!currentEvent.defaultPrevented) {
      next?.(currentEvent);
    }
  };
}

function composeFocusHandler(
  original?: FocusEventHandler<HTMLElement>,
  next?: FocusEventHandler<HTMLElement>
) {
  return (event: FocusEvent<HTMLElement>) => {
    original?.(event);
    if (!event.defaultPrevented) {
      next?.(event);
    }
  };
}

function renderFallbackTrigger(
  trigger: ReactNode,
  isLoading: boolean,
  onActivate: MouseEventHandler<HTMLElement>,
  onPrefetchMouse: MouseEventHandler<HTMLElement>,
  onPrefetchFocus: FocusEventHandler<HTMLElement>
) {
  if (trigger && isValidElement<TriggerElementProps>(trigger)) {
    const originalProps = trigger.props;

    return cloneElement(trigger as ReactElement<TriggerElementProps>, {
      onClick: composeMouseHandler(originalProps.onClick, onActivate),
      onPointerEnter: composeMouseHandler(
        originalProps.onPointerEnter,
        onPrefetchMouse
      ),
      onFocus: composeFocusHandler(originalProps.onFocus, onPrefetchFocus),
      'aria-busy': isLoading || undefined,
    });
  }

  if (trigger) {
    const handleKeyDown: KeyboardEventHandler<HTMLSpanElement> = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onActivate(event as unknown as MouseEvent<HTMLElement>);
    };

    return (
      <span
        onClick={onActivate}
        onPointerEnter={onPrefetchMouse}
        onFocus={onPrefetchFocus}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {trigger}
      </span>
    );
  }

  return (
    <Button
      className="h-11 w-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-105 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/30 sm:w-auto"
      onClick={onActivate}
      onPointerEnter={onPrefetchMouse}
      onFocus={onPrefetchFocus}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-1.5 h-4 w-4" />
      )}
      Tambah Transaksi
    </Button>
  );
}

export function DeferredAddTransactionDialog(props: AddTransactionDialogProps) {
  const { editTransaction, trigger } = props;
  const [LoadedComponent, setLoadedComponent] =
    useState<AddTransactionDialogComponent | null>(null);
  const [openOnMount, setOpenOnMount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ensureLoaded = useCallback(async () => {
    if (LoadedComponent) {
      return LoadedComponent;
    }

    setIsLoading(true);
    try {
      const loadedDialog = await loadAddTransactionDialog();
      setLoadedComponent(() => loadedDialog.AddTransactionDialog);
      return loadedDialog.AddTransactionDialog;
    } finally {
      setIsLoading(false);
    }
  }, [LoadedComponent]);

  useEffect(() => {
    if (editTransaction) {
      void ensureLoaded();
    }
  }, [editTransaction, ensureLoaded]);

  if (LoadedComponent) {
    const Component = LoadedComponent as ComponentType<AddTransactionDialogProps>;
    return <Component {...props} openOnMount={openOnMount} />;
  }

  if (editTransaction) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/45 backdrop-blur-sm">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handlePrefetchMouse: MouseEventHandler<HTMLElement> = () => {
    void ensureLoaded();
  };

  const handlePrefetchFocus: FocusEventHandler<HTMLElement> = () => {
    void ensureLoaded();
  };

  const handleActivate: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    setOpenOnMount(true);
    void ensureLoaded();
  };

  return renderFallbackTrigger(
    trigger,
    isLoading,
    handleActivate,
    handlePrefetchMouse,
    handlePrefetchFocus
  );
}
