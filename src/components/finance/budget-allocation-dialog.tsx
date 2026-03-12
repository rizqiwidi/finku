'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  refreshAllocationQueries,
  useCategories,
  useSettings,
} from '@/hooks/use-api';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrency } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  budget?: number | null;
  allocationPercentage: number;
}

interface BudgetAllocationDialogProps {
  month: number;
  year: number;
  trigger?: React.ReactNode;
}

function formatPercentDisplay(value: number) {
  if (!value) {
    return '';
  }

  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function buildInputMap(items: Category[]) {
  return Object.fromEntries(items.map((item) => [item.id, formatPercentDisplay(item.allocationPercentage)]));
}

function roundAllocationValue(value: number) {
  return Number(value.toFixed(2));
}

function sumAllocations(items: Category[]) {
  return roundAllocationValue(
    items.reduce((sum, category) => sum + (category.allocationPercentage || 0), 0)
  );
}

function sortCategoriesForAllocation(items: Category[]) {
  return [...items].sort((left, right) => {
    const leftActive = (left.allocationPercentage || 0) > 0;
    const rightActive = (right.allocationPercentage || 0) > 0;

    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }

    if ((left.allocationPercentage || 0) !== (right.allocationPercentage || 0)) {
      return (right.allocationPercentage || 0) - (left.allocationPercentage || 0);
    }

    return left.name.localeCompare(right.name, 'id');
  });
}

async function readJsonOrThrow<T>(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    throw new Error(
      (payload && typeof payload === 'object' && 'error' in payload && payload.error) ||
        fallbackMessage
    );
  }

  return payload as T;
}

export function BudgetAllocationDialog({ month, year, trigger }: BudgetAllocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'expense' | 'savings'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsCategories, setSavingsCategories] = useState<Category[]>([]);
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});
  const [savingsInputs, setSavingsInputs] = useState<Record<string, string>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<string>('0');
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [hasReportedLoadError, setHasReportedLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories({ enabled: open });
  const settingsQuery = useSettings({ enabled: open });
  const currentScope = `${month}-${year}`;
  const needsHydration = hydratedScope !== currentScope;
  const isLoading =
    needsHydration || categoriesQuery.isLoading || settingsQuery.isLoading;

  const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (!open) {
      setHydratedScope(null);
      setHasReportedLoadError(false);
    }
  }, [open]);

  const applyCategoryCollection = (items: Category[], isSavings: boolean) => {
    const nextItems = items.map((item) => ({
      ...item,
      allocationPercentage: roundAllocationValue(item.allocationPercentage || 0),
    }));

    if (isSavings) {
      setSavingsCategories(nextItems);
      setSavingsInputs(buildInputMap(nextItems));
      return;
    }

    setCategories(nextItems);
    setExpenseInputs(buildInputMap(nextItems));
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const allCategories = categoriesQuery.data;
    const settings = settingsQuery.data;
    if (!allCategories || !settings) {
      return;
    }

    if (
      categoriesQuery.isFetching ||
      settingsQuery.isFetching ||
      hydratedScope === currentScope
    ) {
      return;
    }

    const expenseData = allCategories.filter((category) => category.type === 'expense');
    const savingsData = allCategories.filter((category) => category.type === 'savings');
    const nextCategories = sortCategoriesForAllocation(
      expenseData.map((category) => ({
        ...category,
        allocationPercentage: category.allocationPercentage || 0,
      }))
    );
    const nextSavings = sortCategoriesForAllocation(
      savingsData.map((category) => ({
        ...category,
        allocationPercentage: category.allocationPercentage || 0,
      }))
    );

    setCategories(nextCategories);
    setExpenseInputs(buildInputMap(nextCategories));
    setSavingsCategories(nextSavings);
    setSavingsInputs(buildInputMap(nextSavings));
    setMonthlyIncome(String(settings.monthlyIncome || 0));
    setActiveSection(nextCategories.length > 0 ? 'expense' : 'savings');
    setHydratedScope(currentScope);
  }, [
    categoriesQuery.data,
    categoriesQuery.isFetching,
    currentScope,
    hydratedScope,
    open,
    settingsQuery.data,
    settingsQuery.isFetching,
  ]);

  useEffect(() => {
    if (!open || hasReportedLoadError) {
      return;
    }

    const loadError = categoriesQuery.error ?? settingsQuery.error;
    if (!loadError) {
      return;
    }

    console.error('Error fetching allocation data:', loadError);
    toast({
      title: 'Gagal memuat alokasi',
      description:
        loadError instanceof Error
          ? loadError.message
          : 'Data kategori atau pengaturan belum bisa dimuat.',
      variant: 'destructive',
    });
    setHasReportedLoadError(true);
  }, [
    categoriesQuery.error,
    hasReportedLoadError,
    open,
    settingsQuery.error,
    toast,
  ]);

  const incomeValue = Number.parseFloat(monthlyIncome.replace(/[^\d.-]/g, '')) || 0;
  const totalExpensePercentage = sumAllocations(categories);
  const totalSavingsPercentage = sumAllocations(savingsCategories);
  const totalAllocated = totalExpensePercentage + totalSavingsPercentage;
  const normalizedTotalAllocated = roundAllocationValue(totalAllocated);
  const remainingPercentage = Math.max(0, roundAllocationValue(100 - normalizedTotalAllocated));
  const isOverAllocated = normalizedTotalAllocated > 100;
  const isFullyAllocated = normalizedTotalAllocated === 100;
  const activeSectionItems = activeSection === 'savings' ? savingsCategories : categories;
  const allocatedAmountValue = Math.round((incomeValue * normalizedTotalAllocated) / 100);
  const remainingAmountValue = Math.round((incomeValue * remainingPercentage) / 100);
  const activeExpenseCount = categories.filter((category) => category.allocationPercentage > 0).length;
  const activeSavingsCount = savingsCategories.filter((category) => category.allocationPercentage > 0).length;
  const configuredCategoriesCount = activeExpenseCount + activeSavingsCount;
  const totalCategoriesCount = categories.length + savingsCategories.length;
  const totalAllocatedLabel = normalizedTotalAllocated.toFixed(2).replace('.', ',');
  const remainingPercentageLabel = remainingPercentage.toFixed(2).replace('.', ',');
  const expensePercentageLabel = totalExpensePercentage.toFixed(2).replace('.', ',');
  const savingsPercentageLabel = totalSavingsPercentage.toFixed(2).replace('.', ',');
  const statusTone = isOverAllocated ? 'rose' : isFullyAllocated ? 'emerald' : 'amber';
  const statusLabel = isOverAllocated
    ? 'Melebihi 100%'
    : isFullyAllocated
      ? 'Pas 100%'
      : `${remainingPercentageLabel}% belum dialokasikan`;
  const activeSectionTitle =
    activeSection === 'savings'
      ? 'Sisihkan ruang untuk tabungan dan tujuan finansial.'
      : 'Prioritaskan kebutuhan rutin dan pengeluaran penting.';
  const activeSectionDescription =
    activeSection === 'savings'
      ? 'Atur dana darurat, investasi, atau target khusus tanpa mengganggu kebutuhan bulanan.'
      : 'Geser slider atau isi persen secara langsung. Semua perubahan langsung menghitung sisa anggaran.';
  const saveHelperText = isSaving
    ? 'Menyimpan perubahan alokasi bulan ini...'
    : isOverAllocated
      ? 'Total alokasi melebihi 100%. Kurangi beberapa kategori sebelum menyimpan.'
      : isFullyAllocated
        ? 'Alokasi sudah pas 100% dan siap disimpan.'
        : 'Perubahan bisa disimpan sekarang, lalu Anda lanjutkan penyesuaian nanti bila diperlukan.';

  const setCategoryAllocation = (
    categoryId: string,
    nextValue: number,
    isSavings: boolean,
    options?: { formatInput?: boolean }
  ) => {
    const items = isSavings ? savingsCategories : categories;
    const category = items.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    const currentTotal = normalizedTotalAllocated - (category.allocationPercentage || 0);
    const maxAllowed = Math.max(0, Math.min(100, 100 - currentTotal));
    const finalValue = Math.min(Math.max(0, nextValue), maxAllowed);

    if (isSavings) {
      setSavingsCategories((current) =>
        current.map((item) =>
          item.id === categoryId ? { ...item, allocationPercentage: finalValue } : item
        )
      );
      if (options?.formatInput) {
        setSavingsInputs((current) => ({ ...current, [categoryId]: formatPercentDisplay(finalValue) }));
      }
      return;
    }

    setCategories((current) =>
      current.map((item) =>
        item.id === categoryId ? { ...item, allocationPercentage: finalValue } : item
      )
    );
    if (options?.formatInput) {
      setExpenseInputs((current) => ({ ...current, [categoryId]: formatPercentDisplay(finalValue) }));
    }
  };

  const handleSliderChange = (categoryId: string, value: number[], isSavings: boolean) => {
    setCategoryAllocation(categoryId, value[0] ?? 0, isSavings, { formatInput: true });
  };

  const handlePercentageInput = (categoryId: string, rawValue: string, isSavings: boolean) => {
    const normalizedDisplay = rawValue.replace('.', ',');
    const isValidFormat = /^\d{0,3}(?:[.,]\d{0,2})?$/.test(normalizedDisplay);
    if (!isValidFormat) {
      return;
    }

    if (isSavings) {
      setSavingsInputs((current) => ({ ...current, [categoryId]: normalizedDisplay }));
    } else {
      setExpenseInputs((current) => ({ ...current, [categoryId]: normalizedDisplay }));
    }

    if (normalizedDisplay === '') {
      setCategoryAllocation(categoryId, 0, isSavings);
      return;
    }

    const parsedValue = Number.parseFloat(normalizedDisplay.replace(',', '.'));
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setCategoryAllocation(categoryId, parsedValue, isSavings);
  };

  const normalizePercentageInput = (categoryId: string, isSavings: boolean) => {
    const items = isSavings ? savingsCategories : categories;
    const category = items.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    const nextValue = formatPercentDisplay(category.allocationPercentage);
    if (isSavings) {
      setSavingsInputs((current) => ({ ...current, [categoryId]: nextValue }));
    } else {
      setExpenseInputs((current) => ({ ...current, [categoryId]: nextValue }));
    }
  };

  const handleIncomeChange = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (!cleanValue) {
      setMonthlyIncome('0');
      return;
    }

    setMonthlyIncome(cleanValue.replace(/^0+/, '') || '0');
  };

  const formatIncomeDisplay = (value: string) => {
    const number = Number.parseFloat(value) || 0;
    if (!number) {
      return '';
    }

    return number.toLocaleString('id-ID');
  };

  const distributeRemainingToSection = (isSavings: boolean) => {
    const items = isSavings ? savingsCategories : categories;
    if (items.length === 0) {
      return;
    }

    if (remainingPercentage <= 0) {
      toast({
        title: 'Alokasi sudah penuh',
        description: 'Tidak ada sisa persentase yang bisa dibagikan lagi.',
      });
      return;
    }

    const sharePerCategory = remainingPercentage / items.length;
    let distributed = 0;
    const nextItems = items.map((item, index) => {
      const addition =
        index === items.length - 1
          ? roundAllocationValue(remainingPercentage - distributed)
          : roundAllocationValue(sharePerCategory);

      distributed = roundAllocationValue(distributed + addition);

      return {
        ...item,
        allocationPercentage: roundAllocationValue((item.allocationPercentage || 0) + addition),
      };
    });

    applyCategoryCollection(nextItems, isSavings);
  };

  const resetAllocations = (target: 'all' | 'expense' | 'savings') => {
    if (target === 'all' || target === 'expense') {
      applyCategoryCollection(
        categories.map((category) => ({ ...category, allocationPercentage: 0 })),
        false
      );
    }

    if (target === 'all' || target === 'savings') {
      applyCategoryCollection(
        savingsCategories.map((category) => ({ ...category, allocationPercentage: 0 })),
        true
      );
    }
  };

  const handleSaveAllocation = async () => {
    if (normalizedTotalAllocated > 100) {
      toast({
        title: 'Alokasi melebihi batas',
        description: 'Total alokasi tidak boleh lebih dari 100%.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const allCategories = [...categories, ...savingsCategories];
      const budgetRequest = fetch('/api/budgets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          monthlyIncome: incomeValue,
          allocations: allCategories.map((category) => ({
            allocationPercentage: category.allocationPercentage,
            categoryId: category.id,
          })),
        }),
      });

      await readJsonOrThrow(
        await budgetRequest,
        'Gagal menyimpan alokasi anggaran bulanan.'
      );

      toast({
        title: 'Alokasi tersimpan',
        description: 'Perubahan alokasi anggaran berhasil disimpan.',
      });

      await refreshAllocationQueries(queryClient);
      setOpen(false);
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast({
        title: 'Gagal menyimpan alokasi',
        description:
          error instanceof Error
            ? error.message
            : 'Coba lagi setelah memeriksa nominal dan persentase.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderAllocationSection = (
    items: Category[],
    inputs: Record<string, string>,
    isSavings: boolean
  ) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-border bg-muted/35 p-5 text-sm text-muted-foreground">
          {isSavings
            ? 'Belum ada kategori tabungan yang bisa diatur untuk bulan ini.'
            : 'Belum ada kategori pengeluaran yang bisa diatur untuk bulan ini.'}
        </div>
      ) : (
        items.map((category, index) => {
          const IconComponent = getCategoryIconComponent(category.icon);
          const allocatedAmount = Math.round((incomeValue * category.allocationPercentage) / 100);
          const isAllocated = category.allocationPercentage > 0;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'rounded-[26px] border p-4 transition-all',
                isAllocated
                  ? 'border-border bg-background shadow-sm'
                  : 'border-border/80 bg-muted/25 hover:border-border'
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="rounded-2xl p-2.5 shadow-sm"
                    style={{ backgroundColor: `${category.color}18` }}
                  >
                    <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isAllocated
                        ? `Estimasi ${formatCurrency(allocatedAmount)}`
                        : 'Belum dialokasikan'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-[112px]">
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={inputs[category.id] ?? ''}
                      onChange={(event) =>
                        handlePercentageInput(category.id, event.target.value, isSavings)
                      }
                      onBlur={() => normalizePercentageInput(category.id, isSavings)}
                      placeholder="0"
                      className="h-11 rounded-2xl border-border bg-background pr-8 text-right text-sm font-semibold"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <Slider
                  value={[category.allocationPercentage]}
                  onValueChange={(value) => handleSliderChange(category.id, value, isSavings)}
                  min={0}
                  max={100}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl px-3">
            <Settings2 className="h-4 w-4" />
            Atur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground sm:max-h-[92vh] sm:max-w-[1120px]">
        <DialogHeader className="relative isolate shrink-0 overflow-hidden border-b border-border bg-background px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_36%)]" />
          <div className="relative flex items-start gap-3 pr-8">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 shadow-lg shadow-emerald-500/20">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">Atur Anggaran Bulanan</DialogTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tetapkan pemasukan dan bagikan 100% ke pos pengeluaran atau tabungan untuk {monthName}.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5 xl:grid xl:grid-cols-[320px,minmax(0,1fr)] xl:overflow-hidden">
            <div className="shrink-0 space-y-4 xl:sticky xl:top-0 xl:max-h-full">
              <div className="rounded-[30px] border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Pemasukan Bulanan</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">
                    Rp
                  </span>
                  <Input
                    type="text"
                    value={formatIncomeDisplay(monthlyIncome)}
                    onChange={(event) => handleIncomeChange(event.target.value)}
                    placeholder="0"
                    className="h-12 rounded-2xl border-border bg-background pl-10 text-right text-base font-semibold"
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Semua estimasi nominal kategori dihitung otomatis dari pemasukan ini.
                </p>
              </div>

              <div className="rounded-[30px] border border-border bg-card/95 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">Ringkasan Alokasi</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pantau progres total tanpa perlu berpindah tab.
                    </p>
                  </div>
                  <BadgePill tone={statusTone} label={statusLabel} />
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black tracking-tight text-foreground">
                      {totalAllocatedLabel}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sudah dialokasikan dari pemasukan bulanan.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-right">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Sisa
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(remainingAmountValue)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(normalizedTotalAllocated, 100)}%` }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      'h-full rounded-full',
                      isOverAllocated
                        ? 'bg-gradient-to-r from-rose-500 to-red-500'
                        : isFullyAllocated
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    )}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl bg-muted/55 px-3 py-3">
                    <p className="text-muted-foreground">Teralokasi</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(allocatedAmountValue)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/55 px-3 py-3">
                    <p className="text-muted-foreground">Kategori aktif</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {configuredCategoriesCount}/{totalCategoriesCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/55 px-3 py-3">
                    <p className="text-muted-foreground">Belum terisi</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {remainingPercentageLabel}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-xs text-muted-foreground">
                  Distribusi saat ini: pengeluaran {expensePercentageLabel}% dan tabungan {savingsPercentageLabel}%.
                </div>
              </div>

              <div className="rounded-[30px] border border-border bg-card/92 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-sky-500" />
                  Aksi Cepat
                </div>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 justify-start rounded-2xl"
                    onClick={() => distributeRemainingToSection(activeSection === 'savings')}
                    disabled={remainingPercentage <= 0 || activeSectionItems.length === 0}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Ratakan sisa tab aktif
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 justify-start rounded-2xl text-muted-foreground"
                    onClick={() => resetAllocations('all')}
                    disabled={normalizedTotalAllocated === 0}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset semua alokasi
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Ratakan sisa hanya berlaku untuk tab yang sedang dibuka.
                </p>
              </div>
            </div>

            <div className="min-h-0 shrink-0 overflow-visible xl:flex xl:min-h-0 xl:flex-col">
              <Tabs
                value={activeSection}
                onValueChange={(value) => setActiveSection(value as 'expense' | 'savings')}
                className="flex min-h-0 flex-col rounded-[30px] border border-border bg-card/95 p-4 shadow-sm xl:h-full xl:overflow-hidden xl:p-5"
              >
                <div className="shrink-0 space-y-4 border-b border-border/70 pb-4">
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] bg-muted/70 p-1.5">
                    <TabsTrigger
                      value="expense"
                      className="h-auto min-h-[72px] flex-col items-start justify-center rounded-[18px] px-4 py-3 text-left hover:translate-y-0 data-[state=active]:border-rose-500/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
                    >
                      <span className="text-sm font-semibold">Pengeluaran</span>
                      <span className="text-xs opacity-80">Kebutuhan rutin dan gaya hidup</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="savings"
                      className="h-auto min-h-[72px] flex-col items-start justify-center rounded-[18px] px-4 py-3 text-left hover:translate-y-0 data-[state=active]:border-amber-500/35 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
                    >
                      <span className="text-sm font-semibold">Tabungan</span>
                      <span className="text-xs opacity-80">Dana tujuan, investasi, dan cadangan</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{activeSectionTitle}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {activeSectionDescription}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-2xl px-3 text-muted-foreground"
                      onClick={() => resetAllocations(activeSection === 'savings' ? 'savings' : 'expense')}
                      disabled={activeSectionItems.length === 0}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Reset tab ini
                    </Button>
                  </div>
                </div>

                <TabsContent value="expense" className="mt-0 min-h-0 flex-1 overflow-visible pt-4 xl:overflow-y-auto xl:pr-1">
                  {renderAllocationSection(categories, expenseInputs, false)}
                </TabsContent>
                <TabsContent value="savings" className="mt-0 min-h-0 flex-1 overflow-visible pt-4 xl:overflow-y-auto xl:pr-1">
                  {renderAllocationSection(savingsCategories, savingsInputs, true)}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {!isLoading ? (
          <div className="shrink-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={cn(
                  'text-sm',
                  isOverAllocated
                    ? 'text-rose-500'
                    : isFullyAllocated
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                )}
              >
                {saveHelperText}
              </p>
              <Button
                onClick={handleSaveAllocation}
                disabled={isSaving || isOverAllocated}
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 sm:w-auto sm:min-w-[220px]"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Simpan Alokasi
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BadgePill({
  label,
  tone,
}: {
  label: string;
  tone: 'amber' | 'emerald' | 'rose';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'emerald' && 'bg-emerald-500/12 text-emerald-600',
        tone === 'amber' && 'bg-amber-500/12 text-amber-600',
        tone === 'rose' && 'bg-rose-500/12 text-rose-500'
      )}
    >
      {label}
    </span>
  );
}
