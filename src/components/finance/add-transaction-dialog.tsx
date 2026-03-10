'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AudioLines,
  BotMessageSquare,
  Calendar,
  Loader2,
  Mic,
  MicOff,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { findMatchingCategoryId, type SuggestedTransactionDraft } from '@/lib/transaction-drafts';
import { cn } from '@/lib/utils';
import { useCategories, useCreateTransaction, useUpdateTransaction } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import type { Category, Transaction, TransactionType } from '@/types';

const formSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  amount: z.number().min(1, 'Jumlah harus lebih dari 0'),
  description: z.string().min(1, 'Deskripsi harus diisi'),
  categoryId: z.string().min(1, 'Kategori harus dipilih'),
  date: z.date(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type InputMode = 'manual' | 'ai';

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

function isValidDate(value?: string | null) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export function AddTransactionDialog({ editTransaction, onClose }: AddTransactionDialogProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantDraft, setAssistantDraft] = useState<SuggestedTransactionDraft | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });

  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const watchedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
  const watchedDate = useWatch({ control: form.control, name: 'date' });
  const watchedDescription = useWatch({ control: form.control, name: 'description' });
  const watchedType = useWatch({ control: form.control, name: 'type' });

  const isEditing = Boolean(editTransaction);
  const open = isEditing || createOpen;
  const selectedType = watchedType ?? 'expense';
  const amountDisplay = watchedAmount ? watchedAmount.toLocaleString('id-ID') : '';
  const filteredCategories = categories?.filter((category) => category.type === selectedType) || [];
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  useEffect(() => {
    if (editTransaction) {
      form.reset(getEditFormValues(editTransaction));
      return;
    }

    if (!createOpen) {
      form.reset(getDefaultFormValues());
      setAssistantPrompt('');
      setAssistantDraft(null);
      setInputMode('manual');
    }
  }, [createOpen, editTransaction, form]);

  useEffect(() => () => {
    stopMediaStream();
  }, []);

  const applySuggestedDraft = (draft: SuggestedTransactionDraft) => {
    const nextType = draft.type ?? 'expense';
    const resolvedDescription =
      draft.description?.trim() || draft.merchantName?.trim() || 'Transaksi dari AI';
    const matchedCategoryId = findMatchingCategoryId(
      (categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
      })),
      nextType,
      draft.categoryName,
      `${resolvedDescription} ${draft.notes ?? ''} ${draft.merchantName ?? ''}`
    );

    form.setValue('type', nextType);
    form.setValue('amount', draft.amount ?? 0);
    form.setValue('description', resolvedDescription);
    form.setValue('notes', draft.notes ?? '');
    form.setValue('categoryId', matchedCategoryId ?? '');
    form.setValue('date', isValidDate(draft.date) ? new Date(draft.date!) : new Date());
    setAssistantDraft(draft);
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');

    if (!numericValue || numericValue === '0') {
      form.setValue('amount', 0);
      return;
    }

    const cleanValue = numericValue.replace(/^0+/, '');
    form.setValue('amount', Number(cleanValue));
  };

  const requestAssistantDraft = async (prompt: string, sourceLabel: 'chat' | 'voice' = 'chat') => {
    setAssistantLoading(true);
    try {
      const response = await fetch('/api/ai/transaction-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sourceLabel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal meminta bantuan AI.');
      }

      applySuggestedDraft(data.draft);
      setInputMode('manual');
      toast({
        title: 'Draft AI siap',
        description: 'Periksa kembali hasil AI sebelum menyimpan transaksi.',
      });
    } catch (error) {
      toast({
        title: 'AI gagal memproses',
        description: error instanceof Error ? error.message : 'Gagal memproses prompt AI.',
        variant: 'destructive',
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleAnalyzePrompt = async () => {
    const prompt = assistantPrompt.trim();
    if (prompt.length < 5) {
      toast({
        title: 'Prompt terlalu singkat',
        description: 'Tulis transaksi dengan lebih lengkap agar AI bisa membantu.',
        variant: 'destructive',
      });
      return;
    }

    await requestAssistantDraft(prompt, 'chat');
  };

  const handleStartRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Browser tidak mendukung',
        description: 'Perekaman suara tidak didukung di browser ini.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined,
      });

      recordedChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        recordedChunksRef.current = [];
        stopMediaStream();
        setIsRecording(false);

        if (audioBlob.size === 0) {
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' }));

          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Gagal mentranskrip suara.');
          }

          const nextPrompt = assistantPrompt.trim()
            ? `${assistantPrompt.trim()}\n${data.text}`
            : data.text;

          setAssistantPrompt(nextPrompt);
          await requestAssistantDraft(nextPrompt, 'voice');
        } catch (error) {
          toast({
            title: 'Suara gagal diproses',
            description:
              error instanceof Error ? error.message : 'Gagal mengubah suara menjadi teks.',
            variant: 'destructive',
          });
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: 'Rekam suara dimulai',
        description: 'Jelaskan transaksi Anda, lalu tekan stop.',
      });
    } catch {
      stopMediaStream();
      toast({
        title: 'Akses mikrofon gagal',
        description: 'Izinkan mikrofon terlebih dahulu untuk menggunakan input suara.',
        variant: 'destructive',
      });
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
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
      return;
    }

    createMutation.mutate(transactionData, {
      onSuccess: () => {
        form.reset(getDefaultFormValues());
        setAssistantPrompt('');
        setAssistantDraft(null);
        setCreateOpen(false);
      },
    });
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
      setAssistantPrompt('');
      setAssistantDraft(null);
      setInputMode('manual');
      if (isRecording) {
        handleStopRecording();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-105 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/30 sm:w-auto"
          size="sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah Transaksi
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            {editTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!isEditing && (
              <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)}>
                <TabsList className="grid h-10 w-full grid-cols-2">
                  <TabsTrigger value="manual">Input Manual</TabsTrigger>
                  <TabsTrigger value="ai">Chat / Suara AI</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="rounded-2xl border border-border bg-muted/35 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Isi form seperti biasa</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Gunakan mode manual jika Anda sudah tahu nominal, kategori, dan detail transaksi.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-3 rounded-2xl border border-border bg-muted/35 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-2 text-violet-500">
                      <BotMessageSquare className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Biarkan AI menyiapkan draft</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Ceritakan transaksi lewat chat atau rekam suara. Hasil AI akan tetap bisa Anda edit sebelum disimpan.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assistant-prompt" className="text-sm font-medium">
                      Prompt AI
                    </Label>
                    <Textarea
                      id="assistant-prompt"
                      value={assistantPrompt}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                      placeholder="Contoh: barusan bayar makan siang 48 ribu di warung padang hari ini pakai cash"
                      className="min-h-24 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={isTranscribing || assistantLoading}
                      className={cn(
                        'flex-1',
                        isRecording
                          ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                          : 'border-border'
                      )}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="mr-2 h-4 w-4" />
                          Stop Rekam
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Rekam Suara
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAnalyzePrompt}
                      disabled={assistantLoading || isTranscribing}
                      className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600"
                    >
                      {assistantLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <WandSparkles className="mr-2 h-4 w-4" />
                      )}
                      Analisis AI
                    </Button>
                  </div>

                  {(isTranscribing || assistantDraft) && (
                    <div className="rounded-2xl border border-border bg-background/80 p-3">
                      {isTranscribing ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AudioLines className="h-4 w-4 animate-pulse" />
                          Mengubah suara menjadi teks...
                        </div>
                      ) : assistantDraft ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {assistantDraft.type === 'income'
                                ? 'Pemasukan'
                                : assistantDraft.type === 'savings'
                                  ? 'Tabungan'
                                  : 'Pengeluaran'}
                            </Badge>
                            {assistantDraft.confidence ? (
                              <Badge variant="outline">Confidence {assistantDraft.confidence}%</Badge>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>
                              <span className="font-medium text-foreground">Deskripsi:</span>{' '}
                              {assistantDraft.description ?? '-'}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Kategori:</span>{' '}
                              {assistantDraft.categoryName ?? '-'}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Nominal:</span>{' '}
                              {assistantDraft.amount?.toLocaleString('id-ID') ?? '-'}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Tanggal:</span>{' '}
                              {assistantDraft.date ? format(new Date(assistantDraft.date), 'd MMM yyyy', { locale: id }) : '-'}
                            </div>
                          </div>
                          {assistantDraft.reasoning ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {assistantDraft.reasoning}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

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
                    'flex-1 rounded-lg border-2 px-3 text-xs transition-all duration-200 data-[state=on]:bg-red-500 data-[state=on]:text-white',
                    'h-9 data-[state=off]:border-red-200 data-[state=off]:hover:border-red-300'
                  )}
                >
                  <TrendingDown className="mr-1 h-3.5 w-3.5" />
                  Pengeluaran
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="income"
                  className={cn(
                    'flex-1 rounded-lg border-2 px-3 text-xs transition-all duration-200 data-[state=on]:bg-emerald-500 data-[state=on]:text-white',
                    'h-9 data-[state=off]:border-emerald-200 data-[state=off]:hover:border-emerald-300'
                  )}
                >
                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                  Pemasukan
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="savings"
                  className={cn(
                    'flex-1 rounded-lg border-2 px-3 text-xs transition-all duration-200 data-[state=on]:bg-amber-500 data-[state=on]:text-white',
                    'h-9 data-[state=off]:border-amber-200 data-[state=off]:hover:border-amber-300'
                  )}
                >
                  <PiggyBank className="mr-1 h-3.5 w-3.5" />
                  Tabungan
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm font-medium">
                Jumlah (Rp)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountDisplay}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className="h-11 pl-10 text-base font-semibold transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              {form.formState.errors.amount ? (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500"
                >
                  {form.formState.errors.amount.message}
                </motion.p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Deskripsi
              </Label>
              <Input
                id="description"
                placeholder="Contoh: Makan siang di kafe"
                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                {...form.register('description')}
              />
              {form.formState.errors.description ? (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500"
                >
                  {form.formState.errors.description.message}
                </motion.p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Kategori</Label>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filteredCategories.map((category: Category) => {
                    const IconComponent = getCategoryIconComponent(category.icon);
                    const isSelected = watchedCategoryId === category.id;

                    return (
                      <motion.button
                        key={category.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => form.setValue('categoryId', category.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all duration-200',
                          isSelected
                            ? 'scale-[1.02] border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                        )}
                      >
                        <div className="rounded-lg p-1.5" style={{ backgroundColor: `${category.color}20` }}>
                          <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                        </div>
                        <span className="w-full truncate text-center text-[10px] font-medium">
                          {category.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
              {form.formState.errors.categoryId ? (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500"
                >
                  {form.formState.errors.categoryId.message}
                </motion.p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tanggal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start text-left font-normal transition-all duration-200 hover:bg-muted/50',
                      !watchedDate && 'text-muted-foreground'
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

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium">
                Catatan (Opsional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan catatan..."
                className="h-16 resize-none transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20"
                {...form.register('notes')}
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading || assistantLoading || isTranscribing}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isLoading ||
                assistantLoading ||
                isTranscribing ||
                !watchedAmount ||
                !watchedCategoryId ||
                !watchedDescription
              }
              className={cn(
                'h-10 flex-1 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]',
                selectedType === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600'
                  : selectedType === 'savings'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/25 hover:from-red-600 hover:to-rose-600'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editTransaction ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Transaksi'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
