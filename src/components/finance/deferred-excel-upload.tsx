'use client';

import { useState, type ComponentType } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExcelUploadProps } from './excel-upload';

type ExcelUploadComponent = typeof import('./excel-upload').ExcelUpload;

let excelUploadModulePromise: Promise<typeof import('./excel-upload')> | null =
  null;

function loadExcelUpload() {
  excelUploadModulePromise ??= import('./excel-upload');
  return excelUploadModulePromise;
}

export function DeferredExcelUpload() {
  const [LoadedComponent, setLoadedComponent] =
    useState<ExcelUploadComponent | null>(null);
  const [openOnMount, setOpenOnMount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ensureLoaded = async () => {
    if (LoadedComponent) {
      return LoadedComponent;
    }

    setIsLoading(true);
    try {
      const loadedDialog = await loadExcelUpload();
      setLoadedComponent(() => loadedDialog.ExcelUpload);
      return loadedDialog.ExcelUpload;
    } finally {
      setIsLoading(false);
    }
  };

  if (LoadedComponent) {
    const Component = LoadedComponent as ComponentType<ExcelUploadProps>;
    return <Component openOnMount={openOnMount} />;
  }

  return (
    <Button
      variant="outline"
      className="h-11 w-full gap-2 border-0 bg-gradient-to-r from-violet-500 to-purple-500 px-4 text-sm text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 hover:from-violet-600 hover:to-purple-600 sm:w-auto"
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
        <Upload className="h-4 w-4" />
      )}
      Import File
    </Button>
  );
}
