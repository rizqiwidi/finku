'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  PiggyBank,
  TrendingUp,
  Loader2,
  Calculator,
  Check,
  Settings2,
} from 'lucide-react';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

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

export function BudgetAllocationDialog({ month, year, trigger }: BudgetAllocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsCategories, setSavingsCategories] = useState<Category[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthName = new Date(year, month - 1).toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, month, year]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expenseRes, savingsRes, settingsRes] = await Promise.all([
        fetch('/api/categories?type=expense'),
        fetch('/api/categories?type=savings'),
        fetch('/api/settings'),
      ]);

      if (expenseRes.ok) {
        const data = await expenseRes.json();
        setCategories(data.map((c: Category) => ({
          ...c,
          allocationPercentage: c.allocationPercentage || 0,
        })));
      }

      if (savingsRes.ok) {
        const data = await savingsRes.json();
        setSavingsCategories(data.map((c: Category) => ({
          ...c,
          allocationPercentage: c.allocationPercentage || 0,
        })));
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setMonthlyIncome(String(settings.monthlyIncome || 0));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse income value
  const incomeValue = parseFloat(monthlyIncome.replace(/[^\d.-]/g, '')) || 0;

  // Calculate total allocated percentage
  const totalExpensePercentage = categories.reduce((sum, c) => sum + (c.allocationPercentage || 0), 0);
  const totalSavingsPercentage = savingsCategories.reduce((sum, c) => sum + (c.allocationPercentage || 0), 0);
  const totalAllocated = totalExpensePercentage + totalSavingsPercentage;
  const normalizedTotalAllocated = Number(totalAllocated.toFixed(2));
  const remainingPercentage = Math.max(0, 100 - totalAllocated);
  const isOverAllocated = normalizedTotalAllocated > 100;
  const isFullyAllocated = normalizedTotalAllocated === 100;

  // Handle slider change
  const handleSliderChange = (categoryId: string, value: number[], isSavings: boolean) => {
    const newValue = value[0];
    const items = isSavings ? savingsCategories : categories;
    const category = items.find(c => c.id === categoryId);
    if (!category) return;

    const currentTotal = totalAllocated - (category.allocationPercentage || 0);
    const maxAllowed = Math.min(100 - currentTotal, 100);
    const finalValue = Math.min(Math.max(0, newValue), maxAllowed);

    if (isSavings) {
      setSavingsCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, allocationPercentage: finalValue } : c
      ));
    } else {
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, allocationPercentage: finalValue } : c
      ));
    }
  };

  // Handle manual percentage input with decimal support (comma or dot)
  const handlePercentageInput = (categoryId: string, value: string, isSavings: boolean) => {
    // Allow empty input
    if (value === '' || value === '0' || value === '0,') {
      if (isSavings) {
        setSavingsCategories(prev => prev.map(c => 
          c.id === categoryId ? { ...c, allocationPercentage: 0 } : c
        ));
      } else {
        setCategories(prev => prev.map(c => 
          c.id === categoryId ? { ...c, allocationPercentage: 0 } : c
        ));
      }
      return;
    }

    // Replace comma with dot for parsing
    const normalizedValue = value.replace(',', '.');
    
    // Check if it's a valid number format
    if (!/^\d*\.?\d*$/.test(normalizedValue)) return;
    
    const numValue = parseFloat(normalizedValue) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    
    const items = isSavings ? savingsCategories : categories;
    const category = items.find(c => c.id === categoryId);
    if (!category) return;
    
    const currentTotal = totalAllocated - (category.allocationPercentage || 0);
    const maxAllowed = 100 - currentTotal;
    const finalValue = Math.min(clampedValue, maxAllowed);

    if (isSavings) {
      setSavingsCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, allocationPercentage: finalValue } : c
      ));
    } else {
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, allocationPercentage: finalValue } : c
      ));
    }
  };

  // Handle income input with auto formatting
  const handleIncomeChange = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d]/g, '');
    
    // Don't set empty or just 0
    if (cleanValue === '' || cleanValue === '0') {
      setMonthlyIncome('0');
      return;
    }
    
    // Remove leading zeros
    const noLeadingZeros = cleanValue.replace(/^0+/, '') || '0';
    setMonthlyIncome(noLeadingZeros);
  };

  // Format income for display
  const formatIncomeDisplay = (value: string) => {
    const num = parseFloat(value) || 0;
    if (num === 0) return '';
    return num.toLocaleString('id-ID');
  };

  // Format percentage for display
  const formatPercentDisplay = (value: number) => {
    if (value === 0) return '';
    // Use Indonesian locale which uses comma for decimals
    return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Save allocation
  const handleSaveAllocation = async () => {
    if (totalAllocated > 100) {
      toast({
        title: 'Error',
        description: 'Total alokasi tidak boleh lebih dari 100%',
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
        allCategories.map(category =>
          fetch(`/api/categories/${category.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              allocationPercentage: category.allocationPercentage,
              budget: category.allocationPercentage > 0 
                ? Math.round(incomeValue * category.allocationPercentage / 100)
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
          allocations: allCategories.map(c => ({
            categoryId: c.id,
            amount: Math.round(incomeValue * c.allocationPercentage / 100),
          })),
        }),
      });

      toast({
        title: 'Berhasil',
        description: 'Alokasi anggaran berhasil disimpan',
      });

      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setOpen(false);
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan alokasi anggaran',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get max value for a category's slider
  const getMaxForCategory = (categoryId: string, isSavings: boolean) => {
    const items = isSavings ? savingsCategories : categories;
    const category = items.find(c => c.id === categoryId);
    if (!category) return 100;
    
    const currentTotal = totalAllocated - (category.allocationPercentage || 0);
    return 100 - currentTotal;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Settings2 className="w-3.5 h-3.5" />
            Atur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Alokasi Anggaran</DialogTitle>
              <p className="text-sm text-muted-foreground">{monthName}</p>
            </div>
          </motion.div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-3">
            {/* Income Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="budget-allocation-muted p-4"
            >
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground">Gaji/Bulan</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Rp</span>
                  <Input
                    type="text"
                    value={formatIncomeDisplay(monthlyIncome)}
                    onChange={(e) => handleIncomeChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="h-9 w-36 border-border bg-background text-right font-bold text-foreground focus:border-emerald-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* Total Allocation Progress */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground">Total Alokasi</Label>
                <span className={`font-bold ${isOverAllocated ? 'text-destructive' : isFullyAllocated ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {totalAllocated.toFixed(2).replace('.', ',')}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div 
                  className={`h-full rounded-full ${isOverAllocated ? 'bg-red-500' : isFullyAllocated ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-amber-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(totalAllocated, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Terisi: {totalAllocated.toFixed(2).replace('.', ',')}%</span>
                <span>Sisa: {remainingPercentage.toFixed(2).replace('.', ',')}%</span>
              </div>
            </motion.div>

            {/* Expense Categories */}
            {categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Pengeluaran ({totalExpensePercentage.toFixed(2).replace('.', ',')}%)
                </h4>
                <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                  {categories.map((category, index) => {
                    const IconComponent = getCategoryIconComponent(category.icon);
                    const allocatedAmount = Math.round(incomeValue * category.allocationPercentage / 100);
                    const maxForThis = getMaxForCategory(category.id, false);
                    
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.03 }}
                        className="budget-allocation-panel p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="p-1.5 rounded-lg"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              <IconComponent className="w-4 h-4" style={{ color: category.color }} />
                            </div>
                            <span className="font-medium text-sm">{category.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            {formatCurrency(allocatedAmount)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[category.allocationPercentage]}
                            onValueChange={(value) => handleSliderChange(category.id, value, false)}
                            max={maxForThis}
                            step={0.01}
                            className="flex-1"
                          />
                          <Input
                            type="text"
                            value={formatPercentDisplay(category.allocationPercentage)}
                            onChange={(e) => handlePercentageInput(category.id, e.target.value, false)}
                            placeholder="0"
                            className="h-8 w-16 border-border bg-background text-center text-sm text-foreground"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Savings Categories */}
            {savingsCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2 border-t border-border pt-2"
              >
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Tabungan ({totalSavingsPercentage.toFixed(2).replace('.', ',')}%)
                </h4>
                <div className="space-y-3">
                  {savingsCategories.map((category, index) => {
                    const IconComponent = getCategoryIconComponent(category.icon);
                    const allocatedAmount = Math.round(incomeValue * category.allocationPercentage / 100);
                    const maxForThis = getMaxForCategory(category.id, true);
                    
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.03 }}
                        className="budget-allocation-panel p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="p-1.5 rounded-lg"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              <IconComponent className="w-4 h-4" style={{ color: category.color }} />
                            </div>
                            <span className="font-medium text-sm">{category.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            {formatCurrency(allocatedAmount)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[category.allocationPercentage]}
                            onValueChange={(value) => handleSliderChange(category.id, value, true)}
                            max={maxForThis}
                            step={0.01}
                            className="flex-1"
                          />
                          <Input
                            type="text"
                            value={formatPercentDisplay(category.allocationPercentage)}
                            onChange={(e) => handlePercentageInput(category.id, e.target.value, true)}
                            placeholder="0"
                            className="h-8 w-16 border-border bg-background text-center text-sm text-foreground"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-3 rounded-xl text-sm ${
                isOverAllocated
                  ? 'border border-red-500/30 bg-red-500/10'
                  : isFullyAllocated
                    ? 'border border-emerald-500/30 bg-emerald-500/10'
                    : 'border border-amber-500/30 bg-amber-500/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">
                  {isOverAllocated
                    ? 'Melebihi 100%'
                    : isFullyAllocated
                      ? 'Alokasi Sempurna'
                      : `Tersisa ${remainingPercentage.toFixed(2).replace('.', ',')}%`}
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(Math.round(incomeValue * totalAllocated / 100))} / {formatCurrency(incomeValue)}
                </span>
              </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Button 
                onClick={handleSaveAllocation}
                disabled={isSaving || isOverAllocated}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Simpan Alokasi
              </Button>
            </motion.div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
