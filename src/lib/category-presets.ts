import type { TransactionType } from '../types';

export interface CategoryPresetTemplate {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget?: number;
  allocationPercentage?: number;
  description?: string;
  defaultSelected?: boolean;
}

export const CATEGORY_PRESET_LIBRARY: CategoryPresetTemplate[] = [
  { name: 'Gaji', icon: 'Wallet', color: '#10b981', type: 'income', description: 'Gaji bulanan atau payroll', defaultSelected: true },
  { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income', description: 'Project sampingan dan jasa', defaultSelected: true },
  { name: 'Investasi', icon: 'TrendingUp', color: '#8b5cf6', type: 'income', description: 'Capital gain atau hasil investasi', defaultSelected: true },
  { name: 'Bonus', icon: 'Gift', color: '#f59e0b', type: 'income', description: 'Bonus kerja atau reward' },
  { name: 'Dividen', icon: 'ChartNoAxesCombined', color: '#7c3aed', type: 'income', description: 'Dividen saham atau reksa dana' },
  { name: 'Komisi', icon: 'CircleDollarSign', color: '#22c55e', type: 'income', description: 'Komisi penjualan' },
  { name: 'Penjualan', icon: 'ShoppingCart', color: '#14b8a6', type: 'income', description: 'Pendapatan dari jual barang' },
  { name: 'Sewa', icon: 'HousePlus', color: '#3b82f6', type: 'income', description: 'Pemasukan dari properti' },
  { name: 'Bisnis', icon: 'BriefcaseBusiness', color: '#6366f1', type: 'income', description: 'Pendapatan usaha' },
  { name: 'Refund', icon: 'Receipt', color: '#0ea5e9', type: 'income', description: 'Pengembalian dana' },
  { name: 'Hadiah', icon: 'PartyPopper', color: '#ec4899', type: 'income', description: 'Hadiah atau pemberian' },
  { name: 'Lainnya', icon: 'Plus', color: '#6b7280', type: 'income', description: 'Pemasukan umum lain', defaultSelected: true },

  { name: 'Makanan', icon: 'Utensils', color: '#f97316', type: 'expense', budget: 3000000, allocationPercentage: 15, description: 'Makan harian', defaultSelected: true },
  { name: 'Transportasi', icon: 'Car', color: '#3b82f6', type: 'expense', budget: 1500000, allocationPercentage: 10, description: 'Transport dan perjalanan', defaultSelected: true },
  { name: 'Belanja', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', budget: 2000000, allocationPercentage: 12, description: 'Belanja pribadi', defaultSelected: true },
  { name: 'Hiburan', icon: 'Gamepad2', color: '#14b8a6', type: 'expense', budget: 1000000, allocationPercentage: 8, description: 'Game, film, konser', defaultSelected: true },
  { name: 'Tagihan', icon: 'Receipt', color: '#ef4444', type: 'expense', budget: 2500000, allocationPercentage: 15, description: 'Tagihan rumah tangga', defaultSelected: true },
  { name: 'Kesehatan', icon: 'Heart', color: '#f43f5e', type: 'expense', budget: 500000, allocationPercentage: 5, description: 'Obat dan konsultasi', defaultSelected: true },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#6366f1', type: 'expense', budget: 1000000, allocationPercentage: 10, description: 'Buku, kursus, sekolah', defaultSelected: true },
  { name: 'Groceries', icon: 'Apple', color: '#22c55e', type: 'expense', budget: 1200000, allocationPercentage: 7, description: 'Belanja bahan makanan' },
  { name: 'Kopi & Nongkrong', icon: 'Coffee', color: '#a16207', type: 'expense', budget: 600000, allocationPercentage: 3, description: 'Coffee shop dan hangout' },
  { name: 'Internet', icon: 'Wifi', color: '#0891b2', type: 'expense', budget: 450000, allocationPercentage: 2, description: 'Internet rumah dan data' },
  { name: 'Listrik & Air', icon: 'Droplets', color: '#0f766e', type: 'expense', budget: 700000, allocationPercentage: 4, description: 'Utilitas rumah' },
  { name: 'Bensin', icon: 'Fuel', color: '#f59e0b', type: 'expense', budget: 800000, allocationPercentage: 4, description: 'Bahan bakar' },
  { name: 'Pulsa & Gadget', icon: 'Smartphone', color: '#8b5cf6', type: 'expense', budget: 500000, allocationPercentage: 2, description: 'Paket data dan gadget' },
  { name: 'Sewa Rumah', icon: 'Home', color: '#2563eb', type: 'expense', budget: 3000000, allocationPercentage: 18, description: 'Kos, kontrakan, apartemen' },
  { name: 'Asuransi', icon: 'Shield', color: '#0ea5e9', type: 'expense', budget: 1000000, allocationPercentage: 5, description: 'Proteksi jiwa dan kesehatan' },
  { name: 'Liburan', icon: 'Plane', color: '#0d9488', type: 'expense', budget: 1000000, allocationPercentage: 4, description: 'Travel dan staycation' },
  { name: 'Olahraga', icon: 'Dumbbell', color: '#059669', type: 'expense', budget: 400000, allocationPercentage: 2, description: 'Gym dan kebugaran' },
  { name: 'Hewan Peliharaan', icon: 'PawPrint', color: '#92400e', type: 'expense', budget: 400000, allocationPercentage: 2, description: 'Makanan dan perawatan hewan' },
  { name: 'Perawatan Rumah', icon: 'Wrench', color: '#4b5563', type: 'expense', budget: 500000, allocationPercentage: 2, description: 'Servis rumah dan peralatan' },
  { name: 'Pakaian', icon: 'Shirt', color: '#db2777', type: 'expense', budget: 600000, allocationPercentage: 3, description: 'Fashion dan aksesori' },
  { name: 'Anak & Keluarga', icon: 'Baby', color: '#f97316', type: 'expense', budget: 900000, allocationPercentage: 4, description: 'Kebutuhan anak dan keluarga' },
  { name: 'Pajak & Administrasi', icon: 'Calculator', color: '#475569', type: 'expense', budget: 500000, allocationPercentage: 2, description: 'Pajak dan biaya admin' },
  { name: 'Langganan Digital', icon: 'Cloud', color: '#0ea5e9', type: 'expense', budget: 250000, allocationPercentage: 1, description: 'Netflix, Spotify, SaaS' },
  { name: 'Hadiah & Donasi', icon: 'Gift', color: '#e11d48', type: 'expense', budget: 400000, allocationPercentage: 2, description: 'Beri hadiah dan donasi' },
  { name: 'Lainnya', icon: 'MoreHorizontal', color: '#9ca3af', type: 'expense', budget: 500000, allocationPercentage: 5, description: 'Pengeluaran umum lain', defaultSelected: true },

  { name: 'Dana Darurat', icon: 'Shield', color: '#0ea5e9', type: 'savings', allocationPercentage: 10, description: 'Cadangan kas darurat', defaultSelected: true },
  { name: 'Investasi', icon: 'TrendingUp', color: '#22c55e', type: 'savings', allocationPercentage: 10, description: 'Investasi rutin', defaultSelected: true },
  { name: 'Tabungan Rumah', icon: 'HousePlus', color: '#3b82f6', type: 'savings', allocationPercentage: 8, description: 'Target beli atau renovasi rumah' },
  { name: 'Tabungan Liburan', icon: 'Sun', color: '#f59e0b', type: 'savings', allocationPercentage: 5, description: 'Dana liburan' },
  { name: 'Tabungan Pendidikan', icon: 'BookOpen', color: '#6366f1', type: 'savings', allocationPercentage: 5, description: 'Dana sekolah atau kursus' },
  { name: 'Tabungan Kendaraan', icon: 'Car', color: '#1d4ed8', type: 'savings', allocationPercentage: 5, description: 'Beli atau servis kendaraan' },
  { name: 'Dana Pensiun', icon: 'Medal', color: '#7c3aed', type: 'savings', allocationPercentage: 7, description: 'Persiapan pensiun' },
  { name: 'Dana Bisnis', icon: 'BriefcaseBusiness', color: '#0f766e', type: 'savings', allocationPercentage: 5, description: 'Modal usaha' },
  { name: 'Gadget Impian', icon: 'Smartphone', color: '#8b5cf6', type: 'savings', allocationPercentage: 3, description: 'Beli gadget baru' },
  { name: 'Haji / Umrah', icon: 'Landmark', color: '#14b8a6', type: 'savings', allocationPercentage: 5, description: 'Target perjalanan ibadah' },
];

export const DEFAULT_CATEGORY_TEMPLATES = CATEGORY_PRESET_LIBRARY.filter(
  (preset) => preset.defaultSelected
).map(({ defaultSelected, description, ...category }) => category);
