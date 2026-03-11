'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AudioLines,
  BotMessageSquare,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCategories, useCreateTransaction, useUpdateTransaction } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIconComponent } from '@/lib/category-icons';
import { formatDateInputValue, parseDateInputValue } from '@/lib/date-input';
import {
  findCategoryIdFromDescription,
  findMatchingCategoryId,
  sanitizeSuggestedTransactionDraftInput,
  suggestedTransactionDraftSchema,
  type SuggestedTransactionDraft,
} from '@/lib/transaction-drafts';
import { formatCurrency, cn } from '@/lib/utils';
import type { Category, Transaction, TransactionType } from '@/types';

const formSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  amount: z.number().min(1, 'Jumlah harus lebih dari 0'),
  description: z.string().trim().min(1, 'Deskripsi harus diisi'),
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

interface LocalAssistantDraft extends SuggestedTransactionDraft {
  categoryId?: string | null;
}

interface AssistantResponse {
  drafts?: SuggestedTransactionDraft[];
  summary?: string | null;
  error?: string;
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

function resolveDraftCategoryId(categories: Category[], draft: SuggestedTransactionDraft) {
  const descriptionContext = [draft.description, draft.merchantName, draft.notes].filter(Boolean).join(' ');
  const descriptionMatch = findCategoryIdFromDescription(categories, draft.type, descriptionContext);
  const categoryNameMatch = draft.categoryName?.trim()
    ? findMatchingCategoryId(categories, draft.type, draft.categoryName, null)
    : null;

  if (descriptionMatch && categoryNameMatch && descriptionMatch !== categoryNameMatch) {
    return descriptionMatch;
  }

  return (
    descriptionMatch ??
    categoryNameMatch ??
    findMatchingCategoryId(categories, draft.type, draft.categoryName, descriptionContext)
  );
}

function toLocalAssistantDraft(draft: SuggestedTransactionDraft, categories: Category[]) {
  const normalizedDraft = suggestedTransactionDraftSchema.parse(
    sanitizeSuggestedTransactionDraftInput(draft)
  );
  return {
    ...normalizedDraft,
    categoryId: resolveDraftCategoryId(categories, normalizedDraft),
  } satisfies LocalAssistantDraft;
}

function buildFormValuesFromDraft(draft: LocalAssistantDraft, categories: Category[]): FormData {
  const categoryId = draft.categoryId ?? resolveDraftCategoryId(categories, draft) ?? '';

  return {
    type: draft.type ?? 'expense',
    amount: draft.amount ?? 0,
    description: draft.description ?? draft.merchantName ?? '',
    categoryId,
    date: parseDateInputValue(formatDateInputValue(draft.date)),
    notes: draft.notes ?? '',
  };
}

function buildDraftFromForm(
  values: FormData,
  categories: Category[],
  currentDraft?: LocalAssistantDraft | null
) {
  const selectedCategory = categories.find((category) => category.id === values.categoryId);
  const nextDraft = suggestedTransactionDraftSchema.parse(
    sanitizeSuggestedTransactionDraftInput({
      type: values.type,
      amount: values.amount > 0 ? values.amount : null,
      description: values.description.trim() || null,
      categoryName: selectedCategory?.name ?? currentDraft?.categoryName ?? null,
      date: formatDateInputValue(values.date),
      notes: values.notes?.trim() || null,
      merchantName: currentDraft?.merchantName ?? null,
      confidence: currentDraft?.confidence ?? null,
      reasoning: currentDraft?.reasoning ?? null,
    })
  );

  return {
    ...nextDraft,
    categoryId: values.categoryId || null,
  } satisfies LocalAssistantDraft;
}

function isSameDraft(left: LocalAssistantDraft, right: LocalAssistantDraft) {
  return (
    left.type === right.type &&
    left.amount === right.amount &&
    left.description === right.description &&
    left.categoryName === right.categoryName &&
    left.categoryId === right.categoryId &&
    left.date === right.date &&
    left.notes === right.notes &&
    left.merchantName === right.merchantName &&
    left.confidence === right.confidence &&
    left.reasoning === right.reasoning
  );
}

function prepareTransactionPayload(draft: LocalAssistantDraft, categories: Category[]) {
  const categoryId = draft.categoryId ?? resolveDraftCategoryId(categories, draft);
  const description = draft.description?.trim() || draft.merchantName?.trim() || '';
  const amount = draft.amount ?? 0;

  if (!(amount > 0)) {
    return { error: 'Nominal draft masih kosong atau belum valid.' };
  }

  if (!description) {
    return { error: 'Deskripsi draft masih kosong.' };
  }

  if (!categoryId) {
    return { error: 'Kategori draft belum berhasil dipetakan.' };
  }

  return {
    data: {
      amount,
      description,
      categoryId,
      type: draft.type,
      date: draft.date ? formatDateInputValue(draft.date) : formatDateInputValue(),
      notes: draft.notes?.trim() || undefined,
    },
  };
}

export function AddTransactionDialog({ editTransaction, onClose }: AddTransactionDialogProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantSummary, setAssistantSummary] = useState<string | null>(null);
  const [assistantDrafts, setAssistantDrafts] = useState<LocalAssistantDraft[]>([]);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  });

  const watchedType = useWatch({ control: form.control, name: 'type' });
  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const watchedDescription = useWatch({ control: form.control, name: 'description' });
  const watchedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
  const watchedDate = useWatch({ control: form.control, name: 'date' });
  const watchedNotes = useWatch({ control: form.control, name: 'notes' });

  const selectedType = watchedType ?? 'expense';
  const isEditing = Boolean(editTransaction);
  const open = isEditing || createOpen;
  const filteredCategories = useMemo(
    () => (categories ?? []).filter((category) => category.type === selectedType),
    [categories, selectedType]
  );
  const activeDraft = assistantDrafts[activeDraftIndex] ?? null;
  const isBusy =
    assistantLoading ||
    isTranscribing ||
    isSavingAll ||
    createMutation.isPending ||
    updateMutation.isPending;

  const clearAssistantState = () => {
    setInputMode('manual');
    setAssistantPrompt('');
    setAssistantSummary(null);
    setAssistantDrafts([]);
    setActiveDraftIndex(0);
    setAssistantLoading(false);
    setIsTranscribing(false);
    setIsSavingAll(false);
  };

  const releaseRecorder = () => {
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const stopRecording = (discard = false) => {
    cancelRecordingRef.current = discard;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      releaseRecorder();
      return;
    }

    recorder.stop();
  };

  const syncAssistantDraftsFromForm = () => {
    if (inputMode !== 'ai' || !activeDraft) {
      return assistantDrafts;
    }

    const snapshot = assistantDrafts.map((draft, index) =>
      index === activeDraftIndex
        ? buildDraftFromForm(form.getValues(), categories ?? [], draft)
        : draft
    );

    setAssistantDrafts(snapshot);
    return snapshot;
  };

  const applyAssistantDraft = (index: number, drafts = assistantDrafts) => {
    const draft = drafts[index];
    if (!draft) {
      return;
    }

    setInputMode('ai');
    setActiveDraftIndex(index);
    form.reset(buildFormValuesFromDraft(draft, categories ?? []));
  };

  const resetCreateState = () => {
    form.reset(getDefaultFormValues());
    clearAssistantState();
    stopRecording(true);
  };

  useEffect(() => {
    if (editTransaction) {
      form.reset(getEditFormValues(editTransaction));
      clearAssistantState();
      stopRecording(true);
      return;
    }

    if (!createOpen) {
      resetCreateState();
    }
  }, [createOpen, editTransaction, form]);

  useEffect(() => {
    return () => stopRecording(true);
  }, []);

  useEffect(() => {
    if (!activeDraft || inputMode !== 'ai') {
      return;
    }

    const syncedDraft = buildDraftFromForm(form.getValues(), categories ?? [], activeDraft);
    if (isSameDraft(syncedDraft, activeDraft)) {
      return;
    }

    setAssistantDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (index === activeDraftIndex ? syncedDraft : draft))
    );
  }, [
    activeDraft,
    activeDraftIndex,
    categories,
    form,
    inputMode,
    watchedAmount,
    watchedCategoryId,
    watchedDate,
    watchedDescription,
    watchedNotes,
    watchedType,
  ]);

  useEffect(() => {
    if (!activeDraft || inputMode !== 'ai' || !categories?.length) {
      return;
    }

    const resolvedCategoryId = resolveDraftCategoryId(categories, activeDraft);
    if (!resolvedCategoryId || activeDraft.categoryId === resolvedCategoryId) {
      return;
    }

    setAssistantDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === activeDraftIndex ? { ...draft, categoryId: resolvedCategoryId } : draft
      )
    );

    if (!form.getValues('categoryId')) {
      form.setValue('categoryId', resolvedCategoryId, { shouldDirty: true, shouldValidate: true });
    }
  }, [activeDraft, activeDraftIndex, categories, form, inputMode]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isEditing) {
      if (!nextOpen) {
        stopRecording(true);
        onClose?.();
      }
      return;
    }

    setCreateOpen(nextOpen);

    if (!nextOpen) {
      resetCreateState();
    }
  };

  const handleTypeChange = (type: string) => {
    if (type !== 'income' && type !== 'expense' && type !== 'savings') {
      return;
    }

    const nextType = type as TransactionType;
    form.setValue('type', nextType, { shouldDirty: true, shouldValidate: true });

    const currentCategoryId = form.getValues('categoryId');
    const categoryStillValid = (categories ?? []).some(
      (category) => category.id === currentCategoryId && category.type === nextType
    );

    if (categoryStillValid) {
      return;
    }

    const nextCategoryId =
      (inputMode === 'ai' && activeDraft
        ? resolveDraftCategoryId(categories ?? [], { ...activeDraft, type: nextType })
        : null) ??
      (categories ?? []).find((category) => category.type === nextType)?.id ??
      '';

    form.setValue('categoryId', nextCategoryId, { shouldDirty: true, shouldValidate: true });
  };

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    form.setValue('amount', digits ? Number(digits) : 0, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const requestAssistantDrafts = async (
    prompt: string,
    sourceLabel: 'chat' | 'voice' | 'receipt' = 'chat'
  ) => {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 5) {
      toast({
        title: 'Prompt terlalu singkat',
        description: 'Tuliskan detail transaksi yang ingin dianalisis AI.',
        variant: 'destructive',
      });
      return;
    }

    setAssistantLoading(true);
    try {
      const response = await fetch('/api/ai/transaction-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt, sourceLabel }),
      });

      const data = (await response.json()) as AssistantResponse;
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menganalisis transaksi dengan AI.');
      }

      const nextDrafts = Array.isArray(data.drafts)
        ? data.drafts.map((draft) => toLocalAssistantDraft(draft, categories ?? []))
        : [];

      if (nextDrafts.length === 0) {
        throw new Error('AI belum mengembalikan draft transaksi yang bisa dipakai.');
      }

      setAssistantPrompt(trimmedPrompt);
      setAssistantSummary(data.summary ?? null);
      setAssistantDrafts(nextDrafts);
      setInputMode('ai');
      setActiveDraftIndex(0);
      form.reset(buildFormValuesFromDraft(nextDrafts[0], categories ?? []));

      toast({
        title: 'Draft AI siap',
        description:
          nextDrafts.length > 1
            ? `${nextDrafts.length} draft transaksi berhasil dipisahkan untuk Anda review.`
            : 'AI berhasil mengisi draft transaksi untuk direview.',
      });
    } catch (error) {
      toast({
        title: 'AI gagal menganalisis transaksi',
        description: error instanceof Error ? error.message : 'Coba lagi dengan detail yang lebih jelas.',
        variant: 'destructive',
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const file = new File([audioBlob], 'voice-note.webm', { type: audioBlob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mentranskrip suara.');
      }

      const transcript = typeof data.text === 'string' ? data.text.trim() : '';
      if (!transcript) {
        throw new Error('Transkrip suara kosong.');
      }

      setAssistantPrompt(transcript);
      await requestAssistantDrafts(transcript, 'voice');
    } catch (error) {
      toast({
        title: 'Transkripsi suara gagal',
        description: error instanceof Error ? error.message : 'Coba rekam ulang suara Anda.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      toast({
        title: 'Browser tidak mendukung rekaman',
        description: 'Gunakan browser modern yang mendukung input suara.',
        variant: 'destructive',
      });
      return;
    }

    try {
      cancelRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldDiscard = cancelRecordingRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        releaseRecorder();
        if (shouldDiscard || audioBlob.size === 0) {
          return;
        }

        await transcribeAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      releaseRecorder();
      toast({
        title: 'Gagal memulai rekaman',
        description: error instanceof Error ? error.message : 'Izinkan akses mikrofon lalu coba lagi.',
        variant: 'destructive',
      });
    }
  };

  const handleInputModeChange = (value: string) => {
    if (value !== 'manual' && value !== 'ai') {
      return;
    }

    setInputMode(value);
    if (value === 'ai' && assistantDrafts.length > 0) {
      const draftsSnapshot = syncAssistantDraftsFromForm();
      applyAssistantDraft(activeDraftIndex, draftsSnapshot);
    }
  };

  const handleDraftSelect = (index: number) => {
    const draftsSnapshot = syncAssistantDraftsFromForm();
    applyAssistantDraft(index, draftsSnapshot);
  };

  const handleSubmit = async (data: FormData) => {
    const payload = {
      amount: data.amount,
      description: data.description.trim(),
      categoryId: data.categoryId,
      type: data.type,
      date: formatDateInputValue(data.date),
      notes: data.notes?.trim() || undefined,
    };

    try {
      if (editTransaction) {
        await updateMutation.mutateAsync({
          id: editTransaction.id,
          ...payload,
        });

        toast({
          title: 'Transaksi diperbarui',
          description: 'Perubahan transaksi berhasil disimpan.',
        });
        onClose?.();
        return;
      }

      await createMutation.mutateAsync(payload);

      const draftsSnapshot = syncAssistantDraftsFromForm();
      if (inputMode === 'ai' && draftsSnapshot.length > 1) {
        const remainingDrafts = draftsSnapshot.filter((_, index) => index !== activeDraftIndex);
        setAssistantDrafts(remainingDrafts);
        const nextIndex = Math.min(activeDraftIndex, remainingDrafts.length - 1);

        if (remainingDrafts[nextIndex]) {
          setActiveDraftIndex(nextIndex);
          form.reset(buildFormValuesFromDraft(remainingDrafts[nextIndex], categories ?? []));
          toast({
            title: 'Draft tersimpan',
            description: `${remainingDrafts.length} draft AI masih menunggu review.`,
          });
          return;
        }
      }

      toast({
        title: 'Transaksi ditambahkan',
        description: 'Transaksi baru berhasil disimpan.',
      });
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: editTransaction ? 'Gagal memperbarui transaksi' : 'Gagal menambahkan transaksi',
        description: error instanceof Error ? error.message : 'Coba lagi setelah memeriksa data transaksi.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAllDrafts = async () => {
    const draftsSnapshot = syncAssistantDraftsFromForm();
    if (draftsSnapshot.length === 0) {
      return;
    }

    const preparedDrafts = draftsSnapshot.map((draft, index) => ({
      index,
      prepared: prepareTransactionPayload(draft, categories ?? []),
    }));

    const invalidDraft = preparedDrafts.find(
      (
        item
      ): item is {
        index: number;
        prepared: { error: string };
      } => 'error' in item.prepared
    );
    if (invalidDraft) {
      applyAssistantDraft(invalidDraft.index, draftsSnapshot);
      toast({
        title: `Draft ${invalidDraft.index + 1} perlu diperbaiki`,
        description: invalidDraft.prepared.error,
        variant: 'destructive',
      });
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;

    try {
      for (const item of preparedDrafts) {
        if ('error' in item.prepared) {
          continue;
        }

        await createMutation.mutateAsync(item.prepared.data);
        successCount += 1;
      }

      toast({
        title: 'Semua draft AI tersimpan',
        description: `${successCount} transaksi berhasil ditambahkan sekaligus.`,
      });
      handleOpenChange(false);
    } catch (error) {
      const remainingDrafts = draftsSnapshot.slice(successCount);
      setAssistantDrafts(remainingDrafts);
      setActiveDraftIndex(0);
      if (remainingDrafts[0]) {
        form.reset(buildFormValuesFromDraft(remainingDrafts[0], categories ?? []));
      }

      toast({
        title: successCount > 0 ? 'Sebagian draft sudah tersimpan' : 'Gagal menyimpan draft AI',
        description:
          successCount > 0
            ? `${successCount} transaksi sudah masuk. Periksa draft sisanya lalu coba lagi.`
            : error instanceof Error
              ? error.message
              : 'Terjadi kegagalan saat menambahkan draft AI.',
        variant: successCount > 0 ? 'default' : 'destructive',
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const amountDisplay = watchedAmount ? watchedAmount.toLocaleString('id-ID') : '';
  const canSubmit = Boolean(watchedAmount && watchedDescription?.trim() && watchedCategoryId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing ? (
        <DialogTrigger asChild>
          <Button
            className="h-11 w-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-105 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl hover:shadow-emerald-500/30 sm:w-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah Transaksi
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            {editTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
          {editTransaction ? (
            <DialogDescription>Perbarui detail transaksi yang sudah ada.</DialogDescription>
          ) : null}
        </DialogHeader>

        <form id="transaction-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {!isEditing ? (
              <Tabs value={inputMode} onValueChange={handleInputModeChange} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/80 p-1.5">
                  <TabsTrigger
                    value="manual"
                    className="rounded-xl data-[state=active]:border-sky-500/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
                  >
                    Input Manual
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="rounded-xl data-[state=active]:border-emerald-500/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
                  >
                    Chat / Suara AI
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="hidden" />

                <TabsContent value="ai" className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card/75 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BotMessageSquare className="h-4 w-4 text-emerald-500" />
                      Asisten Transaksi AI
                    </div>
                    <Textarea
                      value={assistantPrompt}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                      placeholder="Contoh: kemarin makan siang 45 ribu, lalu isi bensin 150 ribu, dan sisihkan 500 ribu ke dana darurat"
                      className="min-h-28 resize-none"
                    />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => requestAssistantDrafts(assistantPrompt, 'chat')}
                        disabled={assistantLoading || isTranscribing}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                      >
                        {assistantLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <WandSparkles className="mr-2 h-4 w-4" />
                        )}
                        Analisis Chat
                      </Button>
                      <Button
                        type="button"
                        variant={isRecording ? 'destructive' : 'outline'}
                        onClick={handleVoiceToggle}
                        disabled={assistantLoading || isTranscribing}
                        className="sm:w-[190px]"
                      >
                        {isRecording ? (
                          <MicOff className="mr-2 h-4 w-4" />
                        ) : isTranscribing ? (
                          <AudioLines className="mr-2 h-4 w-4 animate-pulse" />
                        ) : (
                          <Mic className="mr-2 h-4 w-4" />
                        )}
                        {isRecording
                          ? 'Selesai Rekam'
                          : isTranscribing
                            ? 'Memproses Suara'
                            : 'Rekam Suara'}
                      </Button>
                    </div>
                  </div>

                  {assistantSummary ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-foreground">
                      <div className="mb-1 flex items-center gap-2 font-semibold">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        Ringkasan AI
                      </div>
                      <p className="text-muted-foreground">{assistantSummary}</p>
                    </div>
                  ) : null}

                  {assistantDrafts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{assistantDrafts.length} draft AI</Badge>
                        <Badge variant="outline">
                          Draft aktif {activeDraftIndex + 1}/{assistantDrafts.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {assistantDrafts.map((draft, index) => {
                          const isActive = index === activeDraftIndex;
                          const draftTypeLabel =
                            draft.type === 'income'
                              ? 'Pemasukan'
                              : draft.type === 'savings'
                                ? 'Tabungan'
                                : 'Pengeluaran';

                          return (
                            <button
                              key={`${index}-${draft.description ?? draft.merchantName ?? 'draft'}`}
                              type="button"
                              onClick={() => handleDraftSelect(index)}
                              className={cn(
                                'rounded-2xl border p-3 text-left transition-colors',
                                isActive
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border bg-card/60 hover:border-primary/40'
                              )}
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <Badge variant={isActive ? 'default' : 'outline'}>{draftTypeLabel}</Badge>
                              </div>
                              <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                {draft.description ?? draft.merchantName ?? `Draft ${index + 1}`}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {draft.amount ? formatCurrency(draft.amount) : 'Nominal perlu dicek'}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {draft.categoryName ?? 'Kategori belum dipilih'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tipe Transaksi</Label>
                <ToggleGroup
                  type="single"
                  value={selectedType}
                  onValueChange={handleTypeChange}
                  className="w-full justify-start gap-1.5"
                >
                  <ToggleGroupItem
                    value="expense"
                    className={cn(
                      'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-rose-500 data-[state=on]:text-white',
                      'data-[state=off]:border-rose-200 data-[state=off]:hover:border-rose-300'
                    )}
                  >
                    <TrendingDown className="mr-1 h-3.5 w-3.5" />
                    Pengeluaran
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="income"
                    className={cn(
                      'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white',
                      'data-[state=off]:border-emerald-200 data-[state=off]:hover:border-emerald-300'
                    )}
                  >
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    Pemasukan
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="savings"
                    className={cn(
                      'flex-1 rounded-lg border-2 px-3 text-xs data-[state=on]:bg-amber-500 data-[state=on]:text-white',
                      'data-[state=off]:border-amber-200 data-[state=off]:hover:border-amber-300'
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
                    className="h-11 pl-10 text-base font-semibold"
                  />
                </div>
                {form.formState.errors.amount ? (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">
                  Deskripsi
                </Label>
                <Input
                  id="description"
                  placeholder="Contoh: makan siang di kafe"
                  className="h-11"
                  {...form.register('description')}
                />
                {form.formState.errors.description ? (
                  <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kategori</Label>
                {filteredCategories.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {filteredCategories.map((category) => {
                      const IconComponent = getCategoryIconComponent(category.icon);
                      const isSelected = watchedCategoryId === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            form.setValue('categoryId', category.id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card/60 hover:border-primary/30'
                          )}
                        >
                          <div
                            className="rounded-xl p-2"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                          </div>
                          <span className="w-full truncate text-center text-[11px] font-medium">
                            {category.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Belum ada kategori untuk tipe transaksi ini. Tambahkan kategori terlebih dahulu di halaman Pengaturan Kategori.
                  </div>
                )}
                {form.formState.errors.categoryId ? (
                  <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-sm font-medium">
                    Tanggal
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formatDateInputValue(watchedDate)}
                    onChange={(event) =>
                      form.setValue('date', parseDateInputValue(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Catatan
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Tambahkan catatan bila perlu"
                    className="min-h-[88px] resize-none sm:min-h-[44px]"
                    {...form.register('notes')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Batal
              </Button>

              <Button
                type="submit"
                className={cn(
                  'flex-1 transition-all duration-300',
                  !isEditing && inputMode === 'ai' && assistantDrafts.length > 1
                    ? 'border border-border bg-background text-foreground hover:bg-muted'
                    : selectedType === 'income'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-600 hover:to-teal-600'
                      : selectedType === 'savings'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:from-amber-600 hover:to-orange-600'
                        : 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg hover:from-rose-600 hover:to-red-600'
                )}
                disabled={isBusy || !canSubmit}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : !isEditing && inputMode === 'ai' && assistantDrafts.length > 1 ? (
                  <Sparkles className="mr-2 h-4 w-4" />
                ) : null}
                {editTransaction
                  ? 'Simpan Perubahan'
                  : inputMode === 'ai' && assistantDrafts.length > 1
                    ? 'Tambah Draft Aktif'
                    : 'Tambah Transaksi'}
              </Button>

              {!isEditing && inputMode === 'ai' && assistantDrafts.length > 1 ? (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
                  onClick={handleSaveAllDrafts}
                  disabled={isBusy}
                >
                  {isSavingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Tambah Semua Draft
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
