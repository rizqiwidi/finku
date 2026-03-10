'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { useCategories, useCreateTransaction, useUpdateTransaction } from '@/hooks/use-api';
import type { Transaction, TransactionType } from '@/types';

const formSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  amount: z.number().min(1, 'Jumlah harus lebih dari 0'),
  description: z.string().min(1, 'Deskripsi harus diisi'),
  categoryId: z.string().min(1, 'Kategori harus dipilih'),
  date: z.date(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddTransactionDialogProps {
  editTransaction?: Transaction | null;
  onClose?: () => void;
}

const getDefaultFormValues = (): FormData => ({
  type: 'expense',
  amount: 0,
  description: '',
  categoryId: '',
  date: new Date(),
  notes: '',
});

const getEditFormValues = (transaction: Transaction): FormData => ({
  type: transaction.type as TransactionType,
  amount: transaction.amount,
  description: transaction.description,
  categoryId: transaction.categoryId,
  date: new Date(transaction.date),
  notes: transaction.notes || '',
});

export function AddTransactionDialog({ editTransaction, onClose }: AddTransactionDialogProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });
  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const watchedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
  const watchedDate = useWatch({ control: form.control, name: 'date' });
  const watchedDescription = useWatch({ control: form.control, name: 'description' });
  const watchedType = useWatch({ control: form.control, name: 'type' });

  useEffect(() => {
    if (editTransaction) {
      form.reset(getEditFormValues(editTransaction));
      return;
    }
    if (!createOpen) {
      form.reset(getDefaultFormValues());
    }
  }, [createOpen, editTransaction, form]);

  const selectedType = watchedType ?? 'expense';
  const amountDisplay = watchedAmount ? watchedAmount.toLocaleString('id-ID') : '';
  const isEditing = Boolean(editTransaction);
  const open = isEditing || createOpen;

  const filteredCategories = categories?.filter(c => c.type === selectedType) || [];

  // Handle amount input with auto formatting
  const handleAmountChange = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (!numericValue || numericValue === '0') {
      form.setValue('amount', 0);
      return;
    }

    // Remove leading zeros
    const cleanValue = numericValue.replace(/^0+/, '');
    
    // Set the actual numeric value
    form.setValue('amount', Number(cleanValue));
  };

  const onSubmit = (data: FormData) => {
    const transactionData = {
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      type: data.type,
      date: data.date,
      notes: data.notes,
    };

    if (editTransaction) {
      updateMutation.mutate(
        { id: editTransaction.id, ...transactionData },
        {
          onSuccess: () => {
            form.reset(getDefaultFormValues());
            onClose?.();
          },
        }
      );
    } else {
      createMutation.mutate(transactionData, {
        onSuccess: () => {
          form.reset(getDefaultFormValues());
          setCreateOpen(false);
        },
      });
    }
  };

  const handleTypeChange = (type: string) => {
    if (type === 'income' || type === 'expense' || type === 'savings') {
      form.setValue('type', type);
      form.setValue('categoryId', '');
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isEditing) {
      if (!nextOpen) {
        onClose?.();
      }
      return;
    }

    setCreateOpen(nextOpen);

    if (!nextOpen) {
      form.reset(getDefaultFormValues());
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Transaksi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            {editTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Transaction Type Toggle */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipe Transaksi</Label>
            <ToggleGroup 
              type="single" 
              value={selectedType}
              onValueChange={handleTypeChange}
              className="justify-start gap-1.5"
            >
              <ToggleGroupItem 
                value="expense" 
                className={cn(
                  "flex-1 text-xs data-[state=on]:bg-red-500 data-[state=on]:text-white rounded-lg px-3 h-9",
                  "border-2 data-[state=off]:border-red-200 data-[state=off]:hover:border-red-300 transition-all duration-200"
                )}
              >
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
                Pengeluaran
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="income"
                className={cn(
                  "flex-1 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white rounded-lg px-3 h-9",
                  "border-2 data-[state=off]:border-emerald-200 data-[state=off]:hover:border-emerald-300 transition-all duration-200"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Pemasukan
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="savings"
                className={cn(
                  "flex-1 text-xs data-[state=on]:bg-amber-500 data-[state=on]:text-white rounded-lg px-3 h-9",
                  "border-2 data-[state=off]:border-amber-200 data-[state=off]:hover:border-amber-300 transition-all duration-200"
                )}
              >
                <PiggyBank className="w-3.5 h-3.5 mr-1" />
                Tabungan
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-sm font-medium">Jumlah (Rp)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 text-base font-semibold h-11 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {form.formState.errors.amount && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {form.formState.errors.amount.message}
              </motion.p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">Deskripsi</Label>
            <Input
              id="description"
              placeholder="Contoh: Makan siang di kafe"
              className="h-11 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {form.formState.errors.description.message}
              </motion.p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Kategori</Label>
            <div className="grid grid-cols-4 gap-1.5">
              <AnimatePresence mode="popLayout">
                {filteredCategories.map((category) => {
                  const IconComponent = getCategoryIconComponent(category.icon);
                  const isSelected = watchedCategoryId === category.id;
                  
                  return (
                    <motion.button
                      key={category.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => form.setValue('categoryId', category.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-md scale-105" 
                          : "border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <div 
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <IconComponent 
                          className="w-4 h-4"
                          style={{ color: category.color }}
                        />
                      </div>
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {category.name}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
            {form.formState.errors.categoryId && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {form.formState.errors.categoryId.message}
              </motion.p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 transition-all duration-200 hover:bg-muted/50",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {watchedDate ? (
                    format(watchedDate, 'EEEE, d MMMM yyyy', { locale: id })
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => date && form.setValue('date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan..."
              className="resize-none h-16 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
              {...form.register('notes')}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-10"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !watchedAmount || !watchedCategoryId || !watchedDescription}
              className={cn(
                "flex-1 h-10 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]",
                selectedType === 'income' 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25"
                : selectedType === 'savings'
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25"
                : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-500/25"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                editTransaction ? 'Simpan Perubahan' : 'Tambah Transaksi'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
