'use client';

import { useState, type ComponentType } from 'react';
import { FileScan, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReceiptScanDialogProps } from './receipt-scan-dialog';

type ReceiptScanDialogComponent =
  typeof import('./receipt-scan-dialog').ReceiptScanDialog;

let receiptScanDialogModulePromise:
  | Promise<typeof import('./receipt-scan-dialog')>
  | null = null;

function loadReceiptScanDialog() {
  receiptScanDialogModulePromise ??= import('./receipt-scan-dialog');
  return receiptScanDialogModulePromise;
}

export function DeferredReceiptScanDialog() {
  const [LoadedComponent, setLoadedComponent] =
    useState<ReceiptScanDialogComponent | null>(null);
  const [openOnMount, setOpenOnMount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ensureLoaded = async () => {
    if (LoadedComponent) {
      return LoadedComponent;
    }

    setIsLoading(true);
    try {
      const loadedDialog = await loadReceiptScanDialog();
      setLoadedComponent(() => loadedDialog.ReceiptScanDialog);
      return loadedDialog.ReceiptScanDialog;
    } finally {
      setIsLoading(false);
    }
  };

  if (LoadedComponent) {
    const Component = LoadedComponent as ComponentType<ReceiptScanDialogProps>;
    return <Component openOnMount={openOnMount} />;
  }

  return (
    <Button
      variant="outline"
      className="h-11 w-full gap-2 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-sm text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-600 sm:w-auto"
      onPointerEnter={() => {
        void ensureLoaded();
      }}
      onFocus={() => {
        void ensureLoaded();
      }}
      onClick={(event) => {
        event.preventDefault();
        setOpenOnMount(true);
        void ensureLoaded();
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileScan className="h-4 w-4" />
      )}
      Scan Struk
    </Button>
  );
}
