# Finku - Personal Finance Manager

Aplikasi manajemen keuangan pribadi yang modern dengan fitur tracking pemasukan, pengeluaran, dan anggaran.

## 📖 Daftar Isi

- [Fitur](#-fitur)
- [Tech Stack](#️-tech-stack)
- [Instalasi Lokal](#-instalasi-lokal)
- [Environment Variables](#-environment-variables)
- [Deploy ke Vercel](#-deploy-ke-vercel)
- [Struktur Project](#-struktur-project)
- [API Endpoints](#-api-endpoints)
- [Scripts](#-scripts)

## 🚀 Fitur

### Dashboard
- **Ringkasan Keuangan** - Lihat total pemasukan, pengeluaran, saldo, dan tabungan bulanan
- **Grafik Tren 6 Bulan** - Visualisasi tren keuangan dengan line chart interaktif
- **Pie Chart Kategori** - Breakdown pengeluaran per kategori dengan persentase
- **Budget Progress** - Tracking anggaran dengan progress bar dan icon kategori

### Manajemen Transaksi
- **CRUD Transaksi** - Tambah, edit, dan hapus transaksi dengan mudah
- **Bulk Delete** - Pilih dan hapus multiple transaksi sekaligus
- **Kategorisasi Otomatis** - Pilih kategori dengan ikon dan warna
- **Format Rupiah Otomatis** - Input nominal dengan pemisah ribuan otomatis

### Import Data
- **Excel/CSV Upload** - Import transaksi secara batch dari file Excel atau CSV
- **Deteksi Kolom Cerdas** - Otomatis mendeteksi kolom tanggal, deskripsi, jumlah
- **Preview Data** - Lihat data sebelum import dengan contoh format

### Budget & Alokasi
- **Alokasi Anggaran** - Atur persentase alokasi dari pemasukan bulanan
- **Slider Interaktif** - Geser untuk mengatur alokasi dengan mudah
- **Sorting Otomatis** - Budget ditampilkan dari nominal terbesar

### Tema & UI
- **Dark/Light Mode** - Tema gelap dan terang dengan transisi halus
- **Warna Tematis** - Emerald/teal untuk pemasukan, rose untuk pengeluaran, amber untuk tabungan
- **Responsive Design** - Optimal di semua ukuran layar (mobile-first)
- **Sidebar Sticky** - Navigasi tetap terlihat saat scroll

### Admin
- **Kelola User** - Admin dapat mengelola pengguna (CRUD)
- **Role-based Access** - Akses berdasarkan role (admin/user)

## 🛠️ Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **State Management** | Zustand, TanStack Query |
| **Database** | Prisma ORM (SQLite/PostgreSQL) |
| **Authentication** | Custom JWT (jose library) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Excel Parser** | xlsx (SheetJS) |

## 📦 Instalasi Lokal

### Prasyarat
- Node.js 18+ atau Bun
- Git

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd finku

# 2. Install dependencies
bun install

# 3. Generate Prisma Client
bun run db:generate

# 4. Push database schema
bun run db:push

# 5. (Opsional) Seed database dengan data contoh
bun run db:seed

# 6. Jalankan development server
bun run dev
```

Buka http://localhost:3000 di browser.

### Default Login (setelah seed)

| Username | Password | Role |
|----------|----------|------|
| admin | 94621732 | Admin |

## 🔧 Environment Variables

### Development (.env)

```env
# Database - SQLite untuk development lokal
DATABASE_URL="file:./db/custom.db"

# JWT Secret untuk authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

### Production (Supabase/Vercel)

```env
# Database - PostgreSQL via Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres"

# JWT Secret (generate yang kuat untuk production)
JWT_SECRET="your-production-jwt-secret-min-32-characters"
```

## 🚀 Deploy ke Vercel

### Step 1: Setup Supabase Database

1. Buat akun Supabase gratis di [supabase.com](https://supabase.com)
2. Buat project baru dengan region terdekat (Singapore untuk Indonesia)
3. Ambil Connection Strings dari **Project Settings > Database**

### Step 2: Import ke Vercel

1. Login ke [Vercel](https://vercel.com) dengan akun GitHub
2. Import repository ini
3. Set Environment Variables:
   - `DATABASE_URL` - Connection pooling URL (port 6543)
   - `DIRECT_DATABASE_URL` - Direct connection URL (port 5432)
   - `JWT_SECRET` - Secret 32+ karakter acak

### Step 3: Setup Database

Setelah deploy, jalankan migration via Vercel CLI:

```bash
vercel login
vercel env pull .env.local
bun run db:push
bun run db:seed
```

## 📁 Struktur Project

```
finku/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeder
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Authentication
│   │   │   ├── budgets/       # Budget endpoints
│   │   │   ├── categories/    # Category CRUD
│   │   │   ├── charts/        # Chart data
│   │   │   ├── summary/       # Financial summary
│   │   │   ├── transactions/  # Transaction CRUD
│   │   │   └── users/         # User management
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main page
│   ├── components/
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Authentication
│   │   ├── finance/           # Finance components
│   │   ├── providers/         # React Query provider
│   │   ├── settings/          # Settings components
│   │   ├── transactions/      # Transaction table
│   │   ├── ui/                # shadcn/ui components
│   │   └── theme-toggle.tsx   # Theme toggle
│   ├── contexts/
│   │   └── auth-context.tsx   # Auth context
│   ├── hooks/
│   │   ├── use-api.ts         # API hooks
│   │   ├── use-mobile.ts      # Mobile detection
│   │   └── use-toast.ts       # Toast notifications
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   └── utils.ts           # Utilities
│   ├── store/
│   │   └── finance-store.ts   # Zustand store
│   └── types/
│       └── index.ts           # TypeScript types
├── .env                       # Environment variables
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/[id]` | Update transaction |
| DELETE | `/api/transactions/[id]` | Delete transaction |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/[id]` | Update category |
| DELETE | `/api/categories/[id]` | Delete category |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | Get budgets with progress |
| POST | `/api/budgets/bulk` | Bulk update budgets |

### Charts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/charts?type=monthly` | Get 6-month trend |
| GET | `/api/charts?type=category` | Get category breakdown |

### Others
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summary` | Financial summary |
| GET/PUT | `/api/settings` | User settings |
| GET/POST/PUT/DELETE | `/api/users` | User management (admin) |

## 📝 Scripts

```bash
# Development
bun run dev           # Start dev server

# Build
bun run build         # Build for production
bun run start         # Start production server

# Database
bun run db:push       # Push schema to database
bun run db:generate   # Generate Prisma client
bun run db:migrate    # Run migrations
bun run db:reset      # Reset database
bun run db:seed       # Seed sample data

# Linting
bun run lint          # Run ESLint
```

## 📄 License

MIT License - feel free to use for personal or commercial purposes.

---

Made with ❤️ by Finku Team
