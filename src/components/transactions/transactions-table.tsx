'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Utensils,
  Car,
  ShoppingBag,
  Gamepad2,
  Receipt,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Wallet,
  Laptop,
  Plus,
  TrendingUp,
  PiggyBank,
  Shield,
  Star,
  X,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useTransactions, useDeleteTransactionsBulk } from '@/hooks/use-api';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { calculateFinancialSummary } from '@/lib/finance-summary';

export function TransactionsTable() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  
  const month = parseInt(selectedMonth);
  const year = parseInt(selectedYear);
  
  const { data: transactions, isLoading } = useTransactions(
    selectedType === 'all' ? month : undefined,
    selectedType === 'all' ? year : undefined
  );
  
  const bulkDeleteMutation = useDeleteTransactionsBulk();

  // Filter transactions based on type and date
  const filteredTransactions = transactions?.filter((t: Transaction) => {
    const transactionDate = new Date(t.date);
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesMonth = transactionDate.getMonth() + 1 === month;
    const matchesYear = transactionDate.getFullYear() === year;
    const matchesDateFrom = !dateFrom || transactionDate >= dateFrom;
    const matchesDateTo = !dateTo || transactionDate <= dateTo;
    return matchesType && matchesMonth && matchesYear && matchesDateFrom && matchesDateTo;
  });

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
    if (filteredTransactions && selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else if (filteredTransactions) {
      setSelectedIds(new Set(filteredTransactions.map((t: Transaction) => t.id)));
    }
  };

  // Generate month options
  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map(y => ({
    value: y.toString(),
    label: y.toString(),
  }));

  // Calculate totals
  const summary = calculateFinancialSummary(filteredTransactions ?? []);
  const totalIncome = summary.income;
  const totalExpense = summary.expenses;
  const totalSavings = summary.savings;
  const balance = summary.balance;

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah'];
    const rows = filteredTransactions.map((t: Transaction) => [
      formatDate(new Date(t.date)),
      t.description,
      t.category.name,
      t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Tabungan',
      t.amount.toString(),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete all transactions
  const handleDeleteAll = async () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    
    setIsDeletingAll(true);
    try {
      await bulkDeleteMutation.mutateAsync(filteredTransactions.map((transaction) => transaction.id));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting transactions:', error);
    } finally {
      setIsDeletingAll(false);
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

  // Get type badge styling
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'income':
        return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-xs">Pemasukan</Badge>;
      case 'expense':
        return <Badge className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border-0 text-xs">Pengeluaran</Badge>;
      case 'savings':
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 text-xs">Tabungan</Badge>;
      default:
        return null;
    }
  };

  // Clear date filters
  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="border border-emerald-500/20 bg-card/92 shadow-lg backdrop-blur">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Pemasukan</p>
                  <p className="text-[clamp(1rem,4vw,1.25rem)] font-bold leading-tight text-emerald-600 whitespace-normal break-words">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="border border-rose-500/20 bg-card/92 shadow-lg backdrop-blur">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-xl">
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Pengeluaran</p>
                  <p className="text-[clamp(1rem,4vw,1.25rem)] font-bold leading-tight text-rose-500 whitespace-normal break-words">
                    {formatCurrency(totalExpense)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="border border-amber-500/20 bg-card/92 shadow-lg backdrop-blur">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                  <PiggyBank className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Tabungan</p>
                  <p className="text-[clamp(1rem,4vw,1.25rem)] font-bold leading-tight text-amber-600 whitespace-normal break-words">
                    {formatCurrency(totalSavings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className={cn(
            'border bg-card/92 shadow-lg backdrop-blur',
            balance >= 0 ? 'border-teal-500/20' : 'border-rose-500/20'
          )}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  balance >= 0 ? "bg-teal-100 dark:bg-teal-900/50" : "bg-red-100 dark:bg-red-900/50"
                )}>
                  <Calendar className={cn("w-4 h-4", balance >= 0 ? "text-teal-600" : "text-red-500")} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Saldo</p>
                  <p className={cn(
                    'text-[clamp(1rem,4vw,1.25rem)] font-bold leading-tight whitespace-normal break-words',
                    balance >= 0 ? "text-teal-600" : "text-red-500"
                  )}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Riwayat Transaksi</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Delete Selected Button */}
              {selectedIds.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDeletingSelected}
                      className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-500"
                    >
                      {isDeletingSelected ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
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
                        Tindakan ini akan menghapus <strong className="text-foreground">{selectedIds.size} transaksi</strong> yang dipilih.
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
              
              {/* Delete All Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!filteredTransactions || filteredTransactions.length === 0 || isDeletingAll}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                  >
                    {isDeletingAll ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Hapus Semua
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-500">
                      <AlertTriangle className="w-5 h-5" />
                      Hapus Semua Transaksi?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini akan menghapus <strong className="text-foreground">{filteredTransactions?.length || 0} transaksi</strong> yang sedang ditampilkan.
                      Data yang sudah dihapus tidak dapat dikembalikan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      Ya, Hapus Semua
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={!filteredTransactions || filteredTransactions.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            
            {/* Month Select */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-[110px] min-w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Year Select */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-[88px] min-w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Type Select */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 w-[132px] min-w-[132px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="savings">Tabungan</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "h-8 gap-1",
                  dateFrom && "bg-emerald-100 dark:bg-emerald-900/50"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  {dateFrom ? format(dateFrom, 'd MMM', { locale: id }) : 'Dari'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "h-8 gap-1",
                  dateTo && "bg-emerald-100 dark:bg-emerald-900/50"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  {dateTo ? format(dateTo, 'd MMM', { locale: id }) : 'Sampai'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Clear Date Filter */}
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                onClick={clearDateFilters}
              >
                <X className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Table */}
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  {filteredTransactions?.map((transaction: Transaction, index: number) => {
                    const IconComponent = getCategoryIconComponent(transaction.category.icon);
                    const isSelected = selectedIds.has(transaction.id);

                    return (
                      <motion.button
                        key={transaction.id}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className={cn(
                          'w-full rounded-2xl border p-3 text-left transition-colors',
                          isSelected
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-border bg-card/70 hover:bg-muted/40'
                        )}
                        onClick={() => toggleSelection(transaction.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(transaction.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <div
                                  className="rounded-lg p-1.5"
                                  style={{ backgroundColor: `${transaction.category.color}20` }}
                                >
                                  <IconComponent
                                    className="h-3.5 w-3.5"
                                    style={{ color: transaction.category.color }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {transaction.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(new Date(transaction.date))}
                                  </p>
                                  {transaction.notes ? (
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                      {transaction.notes}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={cn(
                                  'shrink-0 text-sm font-semibold',
                                  transaction.type === 'income'
                                    ? 'text-emerald-600'
                                    : transaction.type === 'expense'
                                      ? 'text-rose-500'
                                      : 'text-amber-600'
                                )}
                              >
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-0 text-xs"
                                style={{
                                  backgroundColor: `${transaction.category.color}20`,
                                  color: transaction.category.color,
                                }}
                              >
                                {transaction.category.name}
                              </Badge>
                              {getTypeBadge(transaction.type)}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs w-10">
                          <button
                            onClick={toggleAllSelection}
                            className="rounded p-1 transition-colors hover:bg-muted"
                          >
                            {filteredTransactions && selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs">Deskripsi</TableHead>
                        <TableHead className="text-xs">Kategori</TableHead>
                        <TableHead className="text-xs">Tipe</TableHead>
                        <TableHead className="text-xs text-right">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions?.map((transaction: Transaction, index: number) => {
                        const IconComponent = getCategoryIconComponent(transaction.category.icon);
                        const isSelected = selectedIds.has(transaction.id);

                        return (
                          <motion.tr
                            key={transaction.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.01 }}
                            className={cn(
                              'cursor-pointer transition-colors',
                              isSelected ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'hover:bg-muted/50'
                            )}
                            onClick={() => toggleSelection(transaction.id)}
                          >
                            <TableCell className="py-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(transaction.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                            </TableCell>
                            <TableCell className="py-2 text-sm font-medium">
                              {formatDate(new Date(transaction.date))}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="rounded p-1"
                                    style={{ backgroundColor: `${transaction.category.color}20` }}
                                  >
                                    <IconComponent
                                      className="w-3 h-3"
                                      style={{ color: transaction.category.color }}
                                    />
                                  </div>
                                  <span className="text-sm">{transaction.description}</span>
                                </div>
                                {transaction.notes ? (
                                  <p className="line-clamp-2 pl-6 text-xs leading-relaxed text-muted-foreground">
                                    {transaction.notes}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className="border-0 text-xs"
                                style={{
                                  backgroundColor: `${transaction.category.color}20`,
                                  color: transaction.category.color,
                                }}
                              >
                                {transaction.category.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              {getTypeBadge(transaction.type)}
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm font-semibold">
                              <span
                                className={cn(
                                  transaction.type === 'income'
                                    ? 'text-emerald-600'
                                    : transaction.type === 'expense'
                                      ? 'text-rose-500'
                                      : 'text-amber-600'
                                )}
                              >
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            
            {!isLoading && (!filteredTransactions || filteredTransactions.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Tidak ada transaksi untuk periode yang dipilih</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
