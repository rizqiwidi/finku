# PRD: Finku Hardening Roadmap (Single Database, Per-User Data Isolation)

## 1. Metadata
- Product: Finku
- Document Type: Execution PRD
- Version: 1.2 (revisi klarifikasi)
- Date: 2026-03-10
- Status: Active
- Owner: Engineering

## 2. Klarifikasi Requirement (Final)
1. Gunakan 1 database Supabase saja (bukan database terpisah per user).
2. Setiap user wajib hanya melihat dan mengubah datanya sendiri.
3. Prioritas non-fungsional: server tidak terbebani dan data cepat ter-load.
4. UI wajib:
- Popup tombol "Atur" harus terbaca jelas di mode terang.
- Header kanan: hapus tombol Dashboard, ganti tombol Logout di pojok kanan.

## 3. Tujuan
1. Isolasi data per user pada satu database shared.
2. Menutup gap security auth/password/JWT.
3. Konsistensi angka finansial antar API dan UI.
4. Performa query dan mutasi bulk lebih cepat.
5. UI konsisten pada light/dark mode.

## 4. Arsitektur Target (Single DB, Logical Multi-Tenant)
1. Satu database Postgres di Supabase, tabel shared.
2. Semua tabel domain wajib punya `userId` (FK ke `User.id`) jika data bersifat private user.
3. Semua endpoint private wajib:
- validasi auth token
- resolve user login
- query/filter by `userId`
- ownership check untuk operasi detail by ID
4. Index wajib untuk performa:
- `Transaction(userId, date)`
- `Transaction(userId, type, date)`
- `Budget(userId, month, year)` bila budget dibuat per user
- `Category(userId, type)` jika category custom per user
5. Optimasi data load:
- Hindari N+1 query
- Gunakan aggregate/groupBy
- Gunakan pagination untuk list panjang
- Hindari full page reload; pakai invalidasi cache query

## 5. Scope
## In Scope
1. API auth/users/transactions/categories/budgets/charts/summary/settings.
2. Prisma schema dan SQL schema yang relevan.
3. UI fixes yang diminta user.
4. Quality gate dasar (lint/build/test kritis).

## Out of Scope
1. Redesign visual total.
2. Fitur bisnis baru di luar backlog perbaikan.

## 6. Backlog Permasalahan + Solusi + Path File

| ID | Priority | Problem | Solution | Path File Yang Harus Diubah |
|---|---|---|---|---|
| P0-01 | Critical | Data user masih bercampur pada endpoint finansial | Terapkan filter `userId` di semua query/mutasi private + ownership check by ID | `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`, `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/budgets/bulk/route.ts`, `src/app/api/charts/route.ts`, `src/app/api/summary/route.ts`, `src/app/api/settings/route.ts`, `src/lib/auth-server.ts` (new), `src/lib/db.ts`, `supabase-schema.sql` |
| P0-02 | Critical | Password bisa tersimpan plaintext dan login masih fallback plaintext | Hash password di create/update user, hapus fallback plaintext login | `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`, `src/app/api/auth/login/route.ts`, `scripts/migrate-password-hash.ts` (new) |
| P0-03 | Critical | JWT secret memiliki fallback hardcoded | Fail-fast jika env JWT tidak valid | `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`, `src/app/api/settings/route.ts`, `src/lib/env.ts` (new), `.env.example`, `env.example`, `README.md` |
| P0-04 | Critical | Kredensial admin default terekspos di seed/sql | Hapus kredensial statis, gunakan bootstrap aman via env | `prisma/seed.ts`, `supabase-schema.sql`, `README.md`, `scripts/bootstrap-admin.ts` (new) |
| P0-05 | High | User biasa tidak bisa update profil (endpoint admin-only) | Tambah endpoint self profile update | `src/app/api/users/me/route.ts` (new), `src/components/settings/settings-dialog.tsx`, `src/contexts/auth-context.tsx` |
| P1-01 | High | Popup "Atur" sulit dibaca di mode terang | Ganti style hardcoded gelap ke token theme (`bg-card`, `text-foreground`, `border-border`, dll) | `src/components/finance/budget-allocation-dialog.tsx`, `src/app/globals.css` |
| P1-02 | High | Header kanan masih ada tombol Dashboard | Hapus tombol Dashboard kanan, tampilkan tombol Logout di pojok kanan | `src/app/page.tsx` |
| P1-03 | High | Status alokasi >100% salah label | Perbaiki kondisi: `>100`, `===100`, `<100` | `src/components/finance/budget-allocation-dialog.tsx` |
| P1-04 | High | Budgets endpoint belum filter `month/year` saat ambil budget rows | Tambah filter period langsung di query budget | `src/app/api/budgets/route.ts` |
| P1-05 | High | Formula saldo tidak konsisten antar tempat | Tetapkan satu formula resmi dan sinkronkan API + UI | `src/app/api/summary/route.ts`, `src/components/finance/summary-cards.tsx`, `src/components/transactions/transactions-table.tsx`, `src/types/index.ts`, `README.md` |
| P1-06 | Medium | N+1 query pada charts/budgets, bulk delete serial | Refactor aggregate query + endpoint bulk delete | `src/app/api/charts/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/transactions/bulk/route.ts` (new), `src/components/finance/transaction-list.tsx`, `src/components/transactions/transactions-table.tsx`, `src/hooks/use-api.ts` |
| P1-07 | Medium | Import Excel memakai full reload | Ganti ke invalidate query cache | `src/components/finance/excel-upload.tsx`, `src/hooks/use-api.ts` |
| P1-08 | Medium | Endpoint active users masih random demo | Feature flag atau real metric | `src/app/api/users/active/route.ts`, `.env.example`, `README.md` |
| P2-01 | Medium | Dependency `xlsx` punya advisory high | Upgrade/ganti parser + hard validation input | `package.json`, `bun.lock`, `src/components/finance/excel-upload.tsx`, `README.md` |
| P2-02 | Medium | Lint rules terlalu longgar, testing minim | Naikkan quality gate bertahap + tambah test kritis | `eslint.config.mjs`, `package.json`, `src/**/__tests__/*`, `vitest.config.ts` atau `jest.config.ts` |
| P2-03 | Low | Dead code/artefak lama masih ada | Bersihkan file tidak terpakai | `src/store/finance-store.ts`, `src/components/finance/header.tsx`, `src/components/finance/footer.tsx`, `worklog.md` |
| P2-04 | Low | Dokumentasi env/setup belum konsisten | Konsolidasi env docs satu sumber kebenaran | `README.md`, `.env.example`, `env.example` |

## 7. Path File Per Requirement User (Quick Reference)

## Requirement A - Data tiap user terpisah, tetap 1 database Supabase
```text
prisma/schema.prisma
prisma/schema.postgresql.prisma
supabase-schema.sql
src/lib/auth-server.ts (new)
src/app/api/transactions/route.ts
src/app/api/transactions/[id]/route.ts
src/app/api/categories/route.ts
src/app/api/categories/[id]/route.ts
src/app/api/budgets/route.ts
src/app/api/budgets/bulk/route.ts
src/app/api/charts/route.ts
src/app/api/summary/route.ts
src/app/api/settings/route.ts
```

## Requirement B - Popup "Atur" terbaca di mode terang
```text
src/components/finance/budget-allocation-dialog.tsx
src/app/globals.css
```

## Requirement C - Header kanan jadi Logout
```text
src/app/page.tsx
```

## 8. Delivery Plan

## Phase 0 (Blocking)
1. P0-01 Isolasi data userId pada single DB.
2. P0-02 Password hardening.
3. P0-03 JWT hardening.
4. P0-04 Hapus default credentials.
5. P0-05 Endpoint self-profile.

## Phase 1 (User-visible + correctness)
1. P1-01 Popup "Atur" light mode readability.
2. P1-02 Header kanan Logout.
3. P1-03 Fix logic alokasi >100%.
4. P1-04 Budget filter period.
5. P1-05 Konsistensi formula saldo.
6. P1-06 Query/performance optimization.
7. P1-07 Import tanpa reload.
8. P1-08 Active users endpoint cleanup.

## Phase 2 (Quality)
1. P2-01 Dependency vulnerability.
2. P2-02 Lint + tests.
3. P2-03 Cleanup dead code.
4. P2-04 Documentation finalization.

## 9. Acceptance Criteria Global
1. User A tidak bisa melihat/mengubah data User B dari API mana pun.
2. Semua data private query by `userId`.
3. Popup "Atur" jelas terbaca pada light mode.
4. Header kanan menampilkan tombol Logout (Dashboard button kanan dihapus).
5. `npm run lint` dan `npm run build` sukses.

## 10. Definition of Done
1. Semua item Phase 0 selesai.
2. Requirement UI user (popup light mode + header logout) selesai.
3. Checklist PRD diperbarui setelah tiap task selesai.
4. Tidak ada isu critical terbuka.

## 11. Checklist Progress

## Phase 0 (Blocking)
- [x] P0-01 Isolasi data `userId` pada single DB shared Supabase, termasuk parity bootstrap SQL terhadap schema relasi private.
- [x] P0-02 Password hardening: create/update hash bcrypt, login plaintext fallback dihapus, script migrasi ditambahkan.
- [x] P0-03 JWT hardening: env wajib valid, placeholder/fallback hardcoded dihapus dari runtime path.
- [x] P0-04 Hapus kredensial admin default statis, ganti bootstrap aman via env.
- [x] P0-05 Tambah endpoint self-profile update untuk user login.

## Phase 1 (User-visible + correctness)
- [x] P1-01 Popup "Atur" light mode readability.
- [x] P1-02 Header kanan Logout.
- [x] P1-03 Fix logic alokasi >100%.
- [x] P1-04 Budget filter period.
- [x] P1-05 Konsistensi formula saldo.
- [x] P1-06 Query/performance optimization.
- [x] P1-07 Import tanpa reload.
- [x] P1-08 Active users endpoint cleanup.

## Phase 2 (Quality)
- [x] P2-01 Dependency vulnerability: parser impor diganti ke CSV-only dengan validasi ketat, dependency `xlsx` dihapus.
- [x] P2-02 Lint + tests: quality gate diperketat, test kritis summary/env ditambahkan, lint/build/test diverifikasi hijau.
- [x] P2-03 Cleanup dead code: artefak store/header/footer lama dihapus dari codebase.
- [x] P2-04 Documentation finalization: README, env examples, dan worklog diselaraskan dengan flow hardening terbaru.

## Post-PRD Follow-up
- [x] Template data per-user (kategori, budget, transaksi contoh) kini otomatis diprovision untuk bootstrap admin, user baru buatan admin, dan tersedia script backfill untuk user existing.
- [x] Sidebar desktop dibuat sticky/persistent sampai tombol tutup diklik, teks chart dark mode diperjelas, dan halaman kategori baru ditambahkan sebagai pusat kontrol kategori user.
- [x] Pengaturan akun kini punya aksi reset data transaksi dan reset alokasi anggaran dengan verifikasi password login di server-side.
- [x] Dialog settings dan import kini memakai layout header tetap + body scroll, import mendukung CSV/XLSX/XLSM tervalidasi, dan background dashboard/login state diperkuat untuk mode terang maupun gelap.
- [x] Summary cards frontend dipindahkan ke card solid tanpa gradient, responsivitas mobile diperketat agar nominal/aksi tidak terpotong, axis chart dark mode diperjelas, dan chart kategori kini bisa di-switch antara pengeluaran dan pemasukan.
- [x] Sidebar desktop dipisah ke layer fixed agar tidak tertinggal saat scroll, dashboard diberi filter bulan/tahun untuk summary+chart+list, tinggi chart dikunci agar switch kategori tidak membuat card membesar, dan kartu `Total Tabungan` memakai akumulasi tabungan all-time.
- [x] Sidebar kini memiliki tombol tutup yang jelas di dalam panel, quick actions ditambah scan struk OCR dengan tahap review/edit sebelum simpan, dan popup transaksi mendukung mode manual atau AI (chat/suara) melalui service eksternal berbasis env secret.
- [x] Dialog transaksi AI kini mempertahankan tab AI setelah hasil muncul, mendukung multi-draft lintas kategori dengan review/simpan per item atau bulk, dan upload struk dioptimasi lebih dulu di client melalui grayscale + kompresi sebelum request OCR.
- [x] Daftar transaksi dashboard dan halaman riwayat kini punya layout mobile yang tidak terpotong, dialog kategori kustom diberi body scroll aman di layar kecil, dan chart tren keuangan mendukung mode jam/hari/bulan.
- [x] Flow scan struk kini punya fallback otomatis ke file asli jika versi kompresi gagal dibaca OCR, dan error dari OCR.Space diteruskan lebih jelas ke UI agar troubleshooting tidak lagi generik.
- [x] Route OCR kini menambah retry `base64Image` untuk file gambar jika upload multipart pertama gagal/kosong, dan dialog scan struk dilengkapi description yang valid agar warning aksesibilitas hilang.

## 12. Session Handover Prompt
Gunakan ini di sesi baru:

```text
Ikuti PRD di PRD_FINKU_HARDENING_ROADMAP.md versi 1.2.
Arsitektur wajib: 1 database Supabase shared, isolasi data by userId.
Task aktif: [isi ID task, contoh: P1-01 + P1-02].
Wajib update checklist dan decision log PRD setelah implementasi.
```

## 13. Decision Log
- 2026-03-10: PRD v1.0 dibuat.
- 2026-03-10: PRD v1.1 sempat menuliskan model database-per-user fisik.
- 2026-03-10: PRD v1.2 dikoreksi: model final adalah single database Supabase, isolasi data logical per user (`userId`).
- 2026-03-10: Phase 0 diimplementasikan dengan model multi-tenant logical pada 1 database shared; `Transaction`, `Category`, `Budget`, dan `UserSettings` di-scope oleh `userId`.
- 2026-03-10: Bootstrap admin dipindahkan ke flow berbasis env (`ADMIN_BOOTSTRAP_*`); seed dibuat idempotent dan tidak lagi menghapus data atau menyimpan kredensial statis.
- 2026-03-10: Runtime auth kini fail-fast untuk `JWT_SECRET` yang invalid/placeholder, dan login tidak lagi menerima password plaintext.
- 2026-03-10: Formula summary resmi diseragamkan menjadi `balance = income - expenses - savings` dan `savingsRate = savings / income * 100`, dipakai bersama di API dan UI.
- 2026-03-10: Phase 1 diselesaikan dengan penghapusan hardcoded dark style di dialog alokasi, tombol Logout di header kanan, optimasi aggregate query charts/budgets, bulk delete transaksi, dan invalidate cache tanpa full reload pada import.
- 2026-03-10: Endpoint `/api/users/active` tidak lagi mengembalikan angka acak demo; output kini dikendalikan feature flag `ENABLE_ACTIVE_USERS_METRIC`.
- 2026-03-10: Import batch diperkeras menjadi CSV-only dengan validasi header, ukuran file, jumlah baris, nilai numerik, tanggal, dan blokir formula injection; dependency `xlsx` dihapus dari dependency tree aplikasi.
- 2026-03-10: Phase 2 quality gate ditutup dengan ESLint yang lebih ketat, test kritis untuk env dan formula summary, serta script test yang dibersihkan dari warning `MODULE_TYPELESS_PACKAGE_JSON`.
- 2026-03-10: Dead code lama (`finance-store`, `finance/header`, `finance/footer`) dibersihkan dan dokumentasi setup/env di README serta env examples diselaraskan dengan arsitektur hardening terbaru.
- 2026-03-10: `supabase-schema.sql` diselaraskan dengan schema Prisma/runtime: `updatedAt` kini auto-update via trigger, relasi delete dibuat eksplisit, dan bootstrap SQL mengasumsikan `id` disuplai Prisma (`cuid`) alih-alih UUID fallback database.
- 2026-03-10: Provisioning user dipusatkan agar setiap user mendapat template data privat miliknya sendiri (`UserSettings`, kategori default, budget bulan berjalan, dan transaksi contoh); admin bootstrap, create-user oleh admin, dan script backfill kini memakai flow yang sama dengan sifat idempotent/non-destruktif untuk data existing.
- 2026-03-10: Runtime login issue pada Supabase pooler ditelusuri ke Prisma prepared statement conflict; template env/README diperjelas bahwa `DATABASE_URL` pooler harus memakai `?pgbouncer=true&connection_limit=1`.
- 2026-03-11: Layout desktop di halaman utama dipecah menjadi sidebar sticky terpisah dari konten utama agar navigasi tetap terlihat saat scroll; drawer mobile dipertahankan terpisah untuk perilaku responsif.
- 2026-03-11: Daftar icon kategori dipusatkan ke registry valid berbasis `lucide-react`, ditambah halaman kategori baru dengan katalog preset besar agar kategori yang dibuat user aman dipakai di transaksi, budget, dan alokasi tanpa error deploy.
- 2026-03-11: Settings dialog menambah aksi reset transaksi dan reset alokasi anggaran yang mewajibkan password login aktif sebagai verifikasi sebelum eksekusi server-side.
- 2026-03-11: Dialog settings/import dirapikan menjadi modal dengan header tetap dan area konten scroll internal; import dibuka kembali untuk file CSV/XLSX/XLSM memakai parser `read-excel-file` agar tetap menghindari dependensi `xlsx` lama, dan background halaman utama diperkuat dengan layer gradient yang lebih terbaca pada light/dark mode.
- 2026-03-11: Summary cards dashboard/riwayat diganti ke background solid dengan aksen warna agar tidak menyatu dengan gradient halaman, grid dan tombol aksi dipadatkan ulang untuk mobile, axis chart bulanan menggunakan warna CSS variable yang valid di dark mode, dan chart kategori diberi switch pengeluaran/pemasukan yang memicu query server sesuai tipe transaksi.
- 2026-03-11: Sidebar desktop diubah menjadi panel fixed independen dari scroll halaman agar menu tidak tertinggal; dashboard kini memiliki filter bulan/tahun yang mengalir ke summary, budget, transaksi terbaru, tren 6 bulan, dan pie chart kategori, sementara `Total Tabungan` dipisah ke aggregate all-time agar tidak lagi terikat filter tanggal bulanan.
- 2026-03-11: Flow input transaksi diperluas dengan dua jalur baru: scan struk via OCR.Space yang menghasilkan draft editable sebelum create, dan asisten AI transaksi via Groq yang menerima prompt chat atau transkrip suara untuk mengisi form. Secret OCR/Groq diperlakukan sebagai env runtime, bukan hardcoded di repo.
- 2026-03-11: Dialog tambah transaksi ditata ulang agar mode AI tetap aktif saat hasil datang, beberapa transaksi dari chat/suara dipertahankan sebagai draft terpisah dengan kategori yang bisa berbeda per item, dan gambar struk kini diperkecil/grayscale di client sebelum upload ke OCR untuk mengurangi beban server.
- 2026-03-11: Responsivitas mobile diperdalam pada daftar transaksi dashboard, riwayat transaksi, dan dialog kategori kustom; chart tren keuangan juga diperluas ke agregasi jam, hari, dan bulan agar perilakunya lebih mirip chart trading tanpa meninggalkan filter periode dashboard.
- 2026-03-11: Scan struk diperkeras dengan dua fallback: client otomatis mundur ke file asli bila optimasi gambar gagal/kurang cocok untuk OCR, dan route OCR kini meneruskan pesan error OCR.Space yang relevan agar kegagalan lebih mudah didiagnosis.
- 2026-03-11: Integrasi OCR.Space ditambah retry sisi server lewat `base64Image` untuk kasus upload file multipart yang gagal atau kosong; dialog scan struk juga diberi description eksplisit untuk menghilangkan warning `aria-describedby` pada modal.
