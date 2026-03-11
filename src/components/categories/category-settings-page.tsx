'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories, invalidateFinanceQueries } from '@/hooks/use-api';
import { CATEGORY_ICON_OPTIONS, getCategoryIconComponent } from '@/lib/category-icons';
import { CATEGORY_PRESET_LIBRARY } from '@/lib/category-presets';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Category, TransactionType } from '@/types';

interface CategoryFormState {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget: string;
  allocationPercentage: string;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  savings: 'Tabungan',
};

function getEmptyForm(type: TransactionType): CategoryFormState {
  const defaultPreset = CATEGORY_PRESET_LIBRARY.find((preset) => preset.type === type);

  return {
    name: '',
    icon: defaultPreset?.icon ?? 'MoreHorizontal',
    color: defaultPreset?.color ?? '#0d9488',
    type,
    budget: '',
    allocationPercentage: type === 'income' ? '0' : '',
  };
}

function mapCategoryToForm(category: Category): CategoryFormState {
  return {
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    budget: category.budget?.toString() ?? '',
    allocationPercentage: category.allocationPercentage?.toString() ?? '',
  };
}

export function CategorySettingsPage() {
  const { data: categories, isLoading } = useCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeType, setActiveType] = React.useState<TransactionType>('expense');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [form, setForm] = React.useState<CategoryFormState>(getEmptyForm('expense'));
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [addingPresetKey, setAddingPresetKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dialogOpen && !editingCategory) {
      setForm(getEmptyForm(activeType));
    }
  }, [activeType, dialogOpen, editingCategory]);

  const filteredCategories = (categories ?? []).filter((category) => category.type === activeType);
  const existingCategoryKeys = new Set(
    (categories ?? []).map((category) => `${category.name}:${category.type}`)
  );
  const availablePresets = CATEGORY_PRESET_LIBRARY.filter(
    (preset) => preset.type === activeType && !existingCategoryKeys.has(`${preset.name}:${preset.type}`)
  );

  const openCreateDialog = (type: TransactionType) => {
    setEditingCategory(null);
    setForm(getEmptyForm(type));
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm(mapCategoryToForm(category));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setForm(getEmptyForm(activeType));
  };

  const syncQueries = async () => {
    await invalidateFinanceQueries(queryClient);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        icon: form.icon,
        color: form.color,
        type: form.type,
        budget: form.type === 'expense' ? form.budget : null,
        allocationPercentage:
          form.type === 'income' ? 0 : form.allocationPercentage || 0,
      };

      const response = await fetch(
        editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories',
        {
          method: editingCategory ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan kategori');
      }

      await syncQueries();
      setActiveType(form.type);
      closeDialog();

      toast({
        title: 'Berhasil',
        description: editingCategory
          ? 'Kategori berhasil diperbarui'
          : 'Kategori berhasil ditambahkan',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Gagal menyimpan kategori',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus kategori');
      }

      await syncQueries();
      toast({
        title: 'Berhasil',
        description: `Kategori ${category.name} dihapus`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Gagal menghapus kategori',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPreset = async (presetName: string) => {
    const preset = CATEGORY_PRESET_LIBRARY.find(
      (item) => item.name === presetName && item.type === activeType
    );

    if (!preset) {
      return;
    }

    setAddingPresetKey(`${preset.name}:${preset.type}`);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          icon: preset.icon,
          color: preset.color,
          type: preset.type,
          budget: preset.budget ?? null,
          allocationPercentage: preset.allocationPercentage ?? 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menambah template kategori');
      }

      await syncQueries();
      toast({
        title: 'Berhasil',
        description: `${preset.name} ditambahkan ke kategori Anda`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Gagal menambahkan template kategori',
        variant: 'destructive',
      });
    } finally {
      setAddingPresetKey(null);
    }
  };

  const renderCategoryCards = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (filteredCategories.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-8 text-center text-muted-foreground">
          <LayoutGrid className="mx-auto mb-3 h-8 w-8 opacity-60" />
          <p className="text-sm">Belum ada kategori untuk tipe ini.</p>
          <p className="mt-1 text-xs">
            Tambahkan template atau buat kategori kustom sebagai acuan transaksi dan anggaran.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredCategories.map((category, index) => {
          const IconComponent = getCategoryIconComponent(category.icon);
          const isDeleting = deletingId === category.id;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="h-full border-border/80 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-2xl p-3 shadow-sm"
                        style={{ backgroundColor: `${category.color}18` }}
                      >
                        <IconComponent
                          className="h-5 w-5"
                          style={{ color: category.color }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {TYPE_LABELS[category.type]}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                        disabled={isDeleting}
                        onClick={() => handleDelete(category)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {category.type === 'expense' && category.budget ? (
                      <Badge variant="secondary">
                        Budget {formatCurrency(category.budget)}
                      </Badge>
                    ) : null}
                    {category.type !== 'income' ? (
                      <Badge variant="outline">
                        Alokasi {(category.allocationPercentage ?? 0).toFixed(0)}%
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Card className="border-0 bg-card/95 shadow-lg">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Pengaturan Kategori
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  Kategori di halaman ini menjadi acuan utama untuk tambah transaksi,
                  anggaran bulan ini, dan alokasi bulan ini. Pilih template yang Anda
                  butuhkan atau buat kategori kustom sendiri.
                </CardDescription>
              </div>

              <Button
                onClick={() => openCreateDialog(activeType)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kategori Kustom
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs
          value={activeType}
          onValueChange={(value) => setActiveType(value as TransactionType)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/80 p-1.5 md:w-[440px]">
            <TabsTrigger
              value="expense"
              className="rounded-xl data-[state=active]:border-rose-500/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
            >
              Pengeluaran
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="rounded-xl data-[state=active]:border-emerald-500/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
            >
              Pemasukan
            </TabsTrigger>
            <TabsTrigger
              value="savings"
              className="rounded-xl data-[state=active]:border-amber-500/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white dark:data-[state=active]:text-white"
            >
              Tabungan
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeType} className="space-y-4">
            <Card className="border-0 bg-card/95 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Kategori Aktif
                </CardTitle>
                <CardDescription>
                  Kategori yang sudah dipakai oleh akun Anda saat ini.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderCategoryCards()}</CardContent>
            </Card>

            <Card className="border-0 bg-card/95 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Template Rekomendasi
                </CardTitle>
                <CardDescription>
                  Tambahkan kategori siap pakai dengan icon yang sudah divalidasi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availablePresets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                    Semua template untuk tipe ini sudah Anda tambahkan.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {availablePresets.map((preset) => {
                      const IconComponent = getCategoryIconComponent(preset.icon);
                      const presetKey = `${preset.name}:${preset.type}`;
                      const isAdding = addingPresetKey === presetKey;

                      return (
                        <div
                          key={presetKey}
                          className="rounded-2xl border border-border/80 bg-muted/30 p-4"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div
                              className="rounded-2xl p-3 shadow-sm"
                              style={{ backgroundColor: `${preset.color}18` }}
                            >
                              <IconComponent
                                className="h-5 w-5"
                                style={{ color: preset.color }}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{preset.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {preset.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {preset.budget ? (
                              <Badge variant="secondary">
                                Budget {formatCurrency(preset.budget)}
                              </Badge>
                            ) : null}
                            {preset.type !== 'income' ? (
                              <Badge variant="outline">
                                Alokasi {(preset.allocationPercentage ?? 0).toFixed(0)}%
                              </Badge>
                            ) : null}
                          </div>
                          <Button
                            className="mt-4 w-full"
                            variant="outline"
                            disabled={isAdding}
                            onClick={() => handleAddPreset(preset.name)}
                          >
                            {isAdding ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Tambahkan
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-border p-5 pb-4">
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Kustom'}
            </DialogTitle>
            <DialogDescription>
              Pilih icon valid, warna, dan pengaturan kategori yang akan dipakai di
              transaksi serta anggaran.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="category-name">Nama Kategori</Label>
                  <Input
                    id="category-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Contoh: Dana Liburan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        type: value as TransactionType,
                        budget:
                          value === 'expense' ? current.budget : '',
                        allocationPercentage:
                          value === 'income'
                            ? '0'
                            : current.allocationPercentage,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="savings">Tabungan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-color">Warna</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="category-color"
                      type="color"
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, color: event.target.value }))
                      }
                      className="h-11 w-16 p-1"
                    />
                    <Input
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, color: event.target.value }))
                      }
                    />
                  </div>
                </div>

                {form.type === 'expense' ? (
                  <div className="space-y-2">
                    <Label htmlFor="category-budget">Budget Bulan Ini</Label>
                    <Input
                      id="category-budget"
                      inputMode="numeric"
                      value={form.budget}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, budget: event.target.value }))
                      }
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="category-budget-disabled">Budget Bulan Ini</Label>
                    <Input
                      id="category-budget-disabled"
                      disabled
                      value="Hanya untuk kategori pengeluaran"
                    />
                  </div>
                )}

                {form.type !== 'income' ? (
                  <div className="space-y-2">
                    <Label htmlFor="category-allocation">Alokasi (%)</Label>
                    <Input
                      id="category-allocation"
                      inputMode="decimal"
                      value={form.allocationPercentage}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allocationPercentage: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 10"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="category-allocation-disabled">Alokasi (%)</Label>
                    <Input
                      id="category-allocation-disabled"
                      disabled
                      value="Tidak dipakai untuk kategori pemasukan"
                    />
                  </div>
                )}
              </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-2xl p-3 shadow-sm"
                      style={{ backgroundColor: `${form.color}18` }}
                    >
                      {React.createElement(getCategoryIconComponent(form.icon), {
                        className: 'h-5 w-5',
                        style: { color: form.color },
                      })}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {form.name || 'Nama kategori'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[form.type]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Pilih Icon</Label>
                <ScrollArea className="h-[240px] rounded-2xl border border-border bg-muted/30 p-3 sm:h-[320px]">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {CATEGORY_ICON_OPTIONS.map((option) => (
                      <Button
                        key={option.name}
                        type="button"
                        variant="ghost"
                        className={cn(
                          'h-auto flex-col gap-2 rounded-xl border px-2 py-3 text-center',
                          form.icon === option.name
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background/70'
                        )}
                        onClick={() =>
                          setForm((current) => ({ ...current, icon: option.name }))
                        }
                      >
                        <option.Icon className="h-4 w-4" />
                        <span className="text-[10px] leading-tight">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background p-5 pt-4">
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
