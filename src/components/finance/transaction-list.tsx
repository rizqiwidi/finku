'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, 
  Trash2, 
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTransactions, useDeleteTransaction, useDeleteTransactionsBulk } from '@/hooks/use-api';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { formatCurrency, formatRelativeDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { AddTransactionDialog } from './add-transaction-dialog';

interface TransactionListProps {
  month: number;
  year: number;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ month, year, onEdit }: TransactionListProps) {
  const { data: transactions, isLoading } = useTransactions(month, year);
  const deleteMutation = useDeleteTransaction();
  const bulkDeleteMutation = useDeleteTransactionsBulk();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (transactions && selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else if (transactions) {
      setSelectedIds(new Set(transactions.map((t: Transaction) => t.id)));
    }
  };

  // Delete selected transactions
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeletingSelected(true);
    try {
      await bulkDeleteMutation.mutateAsync([...selectedIds]);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting transactions:', error);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Transaksi Terbaru</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <CardTitle className="text-lg font-semibold">Transaksi Terbaru</CardTitle>
            <Badge variant="secondary" className="font-normal">
              {transactions?.length ?? 0} transaksi
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Select All Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllSelection}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {transactions && selectedIds.size === transactions.length && transactions.length > 0 ? (
                <CheckSquare className="w-4 h-4 mr-1 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              <span className="text-xs">Pilih Semua</span>
            </Button>
            
            {/* Delete Selected Button */}
            {selectedIds.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDeletingSelected}
                    className="bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-400"
                  >
                    {isDeletingSelected ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Hapus ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-500">
                      <AlertTriangle className="w-5 h-5" />
                      Hapus Transaksi Terpilih?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini akan menghapus <strong>{selectedIds.size} transaksi</strong> yang dipilih.
                      Data yang sudah dihapus tidak dapat dikembalikan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ScrollArea className="h-[400px] px-4 sm:px-6">
          <AnimatePresence mode="popLayout">
            {transactions?.map((transaction, index) => {
              const IconComponent = getCategoryIconComponent(transaction.category.icon);
              const isIncome = transaction.type === 'income';
              const isSelected = selectedIds.has(transaction.id);
              
              return (
                <motion.div
                  key={transaction.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group flex flex-col gap-3 border-b py-4 last:border-0 transition-colors cursor-pointer rounded-lg px-3 sm:-mx-2 sm:flex-row sm:items-center sm:justify-between sm:px-2",
                    isSelected ? "bg-emerald-500/10" : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleSelection(transaction.id)}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(transaction.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div
                      className="p-2.5 rounded-xl shadow-sm"
                      style={{ 
                        backgroundColor: `${transaction.category.color}15`,
                      }}
                    >
                      <IconComponent
                        className="w-5 h-5"
                        style={{ color: transaction.category.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-sm">{transaction.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="h-5 border-0 px-2 py-0 text-xs font-normal"
                          style={{ 
                            backgroundColor: `${transaction.category.color}20`,
                            color: transaction.category.color,
                          }}
                        >
                          {transaction.category.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(new Date(transaction.date))}
                        </span>
                      </div>
                      {transaction.notes ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {transaction.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className={cn(
                        "font-semibold flex items-center gap-1",
                        isIncome ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(transaction.id); }}
                          className="text-rose-500 focus:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {transactions?.length === 0 && (
            <div className="flex min-h-[280px] items-center justify-center py-8">
              <div className="mx-auto flex max-w-sm flex-col items-center justify-center rounded-[28px] border border-dashed border-emerald-500/25 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,252,249,0.92))] px-6 py-8 text-center shadow-lg shadow-emerald-500/10 dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_58%),linear-gradient(180deg,rgba(8,19,17,0.96),rgba(11,28,24,0.92))]">
                <div className="mb-4 rounded-3xl bg-emerald-500/12 p-4 text-emerald-500 shadow-inner">
                  <Receipt className="h-8 w-8" />
                </div>
                <p className="text-base font-semibold text-foreground">Belum ada transaksi terbaru</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tambahkan transaksi pertama Anda untuk mulai melihat riwayat terbaru, catatan, dan ringkasan arus uang.
                </p>
                <div className="mt-5">
                  <AddTransactionDialog
                    trigger={
                      <Button className="h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/30">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Tambah Transaksi
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
