'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Check,
  Loader2,
  PiggyBank,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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

export function BudgetAllocationDialog({ month, year, trigger }: BudgetAllocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsCategories, setSavingsCategories] = useState<Category[]>([]);
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});
  const [savingsInputs, setSavingsInputs] = useState<Record<string, string>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [month, open, year]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expenseRes, savingsRes, settingsRes] = await Promise.all([
        fetch('/api/categories?type=expense'),
        fetch('/api/categories?type=savings'),
        fetch('/api/settings'),
      ]);

      if (expenseRes.ok) {
        const data = (await expenseRes.json()) as Category[];
        const nextCategories = data.map((category) => ({
          ...category,
          allocationPercentage: category.allocationPercentage || 0,
        }));
        setCategories(nextCategories);
        setExpenseInputs(buildInputMap(nextCategories));
      }

      if (savingsRes.ok) {
        const data = (await savingsRes.json()) as Category[];
        const nextSavings = data.map((category) => ({
          ...category,
          allocationPercentage: category.allocationPercentage || 0,
        }));
        setSavingsCategories(nextSavings);
        setSavingsInputs(buildInputMap(nextSavings));
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setMonthlyIncome(String(settings.monthlyIncome || 0));
      }
    } catch (error) {
      console.error('Error fetching allocation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const incomeValue = Number.parseFloat(monthlyIncome.replace(/[^\d.-]/g, '')) || 0;
  const totalExpensePercentage = categories.reduce((sum, category) => sum + (category.allocationPercentage || 0), 0);
  const totalSavingsPercentage = savingsCategories.reduce(
    (sum, category) => sum + (category.allocationPercentage || 0),
    0
  );
  const totalAllocated = totalExpensePercentage + totalSavingsPercentage;
  const normalizedTotalAllocated = Number(totalAllocated.toFixed(2));
  const remainingPercentage = Math.max(0, 100 - normalizedTotalAllocated);
  const isOverAllocated = normalizedTotalAllocated > 100;
  const isFullyAllocated = normalizedTotalAllocated === 100;

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
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyIncome: incomeValue }),
      });

      const allCategories = [...categories, ...savingsCategories];

      await Promise.all(
        allCategories.map((category) =>
          fetch(`/api/categories/${category.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              allocationPercentage: category.allocationPercentage,
              budget:
                category.allocationPercentage > 0
                  ? Math.round((incomeValue * category.allocationPercentage) / 100)
                  : 0,
            }),
          })
        )
      );

      await fetch('/api/budgets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          allocations: allCategories.map((category) => ({
            categoryId: category.id,
            amount: Math.round((incomeValue * category.allocationPercentage) / 100),
          })),
        }),
      });

      toast({
        title: 'Alokasi tersimpan',
        description: 'Perubahan alokasi anggaran berhasil disimpan.',
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
      ]);
      setOpen(false);
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast({
        title: 'Gagal menyimpan alokasi',
        description: 'Coba lagi setelah memeriksa nominal dan persentase.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderAllocationSection = (
    title: string,
    subtitle: string,
    items: Category[],
    inputs: Record<string, string>,
    isSavings: boolean
  ) => (
    <div className="rounded-3xl border border-border bg-card/92 p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <BadgePill
          tone={isSavings ? 'amber' : 'rose'}
          label={`${items
            .reduce((sum, item) => sum + item.allocationPercentage, 0)
            .toFixed(2)
            .replace('.', ',')}%`}
        />
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Belum ada kategori untuk bagian ini.
          </div>
        ) : (
          items.map((category, index) => {
            const IconComponent = getCategoryIconComponent(category.icon);
            const allocatedAmount = Math.round((incomeValue * category.allocationPercentage) / 100);

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-2xl border border-border bg-muted/25 p-3 transition-colors hover:border-primary/30"
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr),88px] sm:items-center">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="rounded-xl p-2"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(allocatedAmount)}</p>
                    </div>
                  </div>
                  <div className="w-full">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={inputs[category.id] ?? ''}
                      onChange={(event) =>
                        handlePercentageInput(category.id, event.target.value, isSavings)
                      }
                      onBlur={() => normalizePercentageInput(category.id, isSavings)}
                      placeholder="0"
                      className="h-9 rounded-xl border-border bg-background text-center text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <Slider
                    value={[category.allocationPercentage]}
                    onValueChange={(value) => handleSliderChange(category.id, value, isSavings)}
                    min={0}
                    max={100}
                    step={0.01}
                    className="flex-1"
                  />
                  <span className="w-11 text-right text-xs font-medium text-muted-foreground">
                    {formatPercentDisplay(category.allocationPercentage) || '0'}%
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
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
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground sm:max-w-[1120px]">
        <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-r from-violet-500/10 to-sky-500/10 px-5 py-5">
          <div className="flex items-center gap-3 pr-8">
            <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-sky-600 p-2.5 shadow-lg">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Atur Alokasi Anggaran</DialogTitle>
              <p className="text-sm text-muted-foreground">{monthName}</p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 lg:grid-cols-[290px,minmax(0,1fr)]">
            <div className="space-y-3 lg:sticky lg:top-0">
              <div className="rounded-3xl border border-border bg-muted/40 p-4">
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
                    className="h-11 rounded-2xl border-border bg-background pl-10 text-right text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/92 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">Total Alokasi</Label>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      isOverAllocated
                        ? 'text-destructive'
                        : isFullyAllocated
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                    )}
                  >
                    {normalizedTotalAllocated.toFixed(2).replace('.', ',')}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
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
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-2xl bg-muted/60 px-3 py-2">
                    <p>Terpakai</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(Math.round((incomeValue * normalizedTotalAllocated) / 100))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/60 px-3 py-2">
                    <p>Sisa</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(Math.round((incomeValue * remainingPercentage) / 100))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/92 p-4 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">Ringkasan</span>
                    <BadgePill
                      tone={
                        isOverAllocated ? 'rose' : isFullyAllocated ? 'emerald' : 'amber'
                      }
                      label={
                        isOverAllocated
                          ? 'Melebihi 100%'
                          : isFullyAllocated
                            ? 'Pas 100%'
                            : `${remainingPercentage.toFixed(2).replace('.', ',')}% sisa`
                      }
                    />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Pengeluaran {totalExpensePercentage.toFixed(2).replace('.', ',')}% dan tabungan{' '}
                    {totalSavingsPercentage.toFixed(2).replace('.', ',')}% untuk {monthName}.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSaveAllocation}
                disabled={isSaving || isOverAllocated}
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Simpan Alokasi
              </Button>
            </div>

            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                {renderAllocationSection(
                  'Kategori Pengeluaran',
                  'Atur porsi belanja bulanan Anda',
                  categories,
                  expenseInputs,
                  false
                )}
                {renderAllocationSection(
                  'Kategori Tabungan',
                  'Atur porsi tabungan dan investasi',
                  savingsCategories,
                  savingsInputs,
                  true
                )}
              </div>
            </div>
          </div>
        )}
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
