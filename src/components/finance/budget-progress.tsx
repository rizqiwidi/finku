'use client';

import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Loader2, 
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBudgets } from '@/hooks/use-api';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { formatCurrency, cn } from '@/lib/utils';
import { BudgetAllocationDialog } from './budget-allocation-dialog';

interface BudgetProgressProps {
  month: number;
  year: number;
}

export function BudgetProgress({ month, year }: BudgetProgressProps) {
  const { data: budgets, isLoading } = useBudgets(month, year);

  // Filter out budgets with 0 allocation and sort by amount (largest first)
  const activeBudgets = budgets?.filter(b => b.amount > 0)
    .sort((a, b) => b.amount - a.amount) ?? [];
  
  const onTrackCount = activeBudgets.filter(b => b.spent <= b.amount).length;
  const totalBudgets = activeBudgets.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Anggaran Bulan Ini</CardTitle>
            <div className="flex items-center gap-2">
              <BudgetAllocationDialog month={month} year={year} />
              {totalBudgets > 0 && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {onTrackCount}/{totalBudgets} on track
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeBudgets.length > 0 ? (
            activeBudgets.map((budget, index) => {
              const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
              const isOverBudget = percentage > 100;
              const isNearLimit = percentage >= 80 && percentage <= 100;
              const IconComponent = getCategoryIconComponent(budget.category.icon);
              
              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${budget.category.color}20` }}
                      >
                        <IconComponent 
                          className="w-3.5 h-3.5" 
                          style={{ color: budget.category.color }}
                        />
                      </div>
                      <span className="font-medium text-sm">{budget.category.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOverBudget ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : isNearLimit ? (
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        isOverBudget ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={Math.min(percentage, 100)}
                      className="h-1.5"
                      indicatorClassName={cn(
                        isOverBudget 
                          ? "bg-gradient-to-r from-red-500 to-rose-500" 
                          : isNearLimit 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500"
                      )}
                    />
                    {isOverBudget && (
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="absolute top-0 left-0 h-1.5 bg-red-500/30 rounded-full"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex min-h-[240px] items-center justify-center py-4">
              <div className="mx-auto flex max-w-sm flex-col items-center justify-center rounded-[28px] border border-dashed border-violet-500/25 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,250,255,0.94))] px-6 py-8 text-center shadow-lg shadow-sky-500/10 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_56%),linear-gradient(180deg,rgba(9,14,24,0.96),rgba(12,19,33,0.92))]">
                <div className="mb-4 rounded-3xl bg-sky-500/12 p-4 text-sky-600 shadow-inner dark:text-sky-400">
                  <Settings2 className="h-8 w-8" />
                </div>
                <p className="text-base font-semibold text-foreground">Anggaran belum diatur</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Atur alokasi anggaran agar tiap kategori punya batas belanja yang jelas dan progresnya langsung terlihat.
                </p>
                <div className="mt-5">
                  <BudgetAllocationDialog
                    month={month}
                    year={year}
                    trigger={
                      <Button className="h-11 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 text-white shadow-lg shadow-sky-500/20 transition-all duration-300 hover:scale-[1.02] hover:from-sky-600 hover:to-cyan-600 hover:shadow-xl hover:shadow-sky-500/30">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Atur Anggaran
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
