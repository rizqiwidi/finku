# PRD: Finku Hardening Roadmap (Single Database, Per-User Data Isolation)

## 1. Metadata
- Product: Finku
- Document Type: Execution PRD
- Version: 1.3 (hardening complete + resource efficiency extension)
- Date: 2026-03-12
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
- [x] Route OCR kini dipaksa ke runtime `nodejs` dengan durasi lebih longgar untuk deployment Vercel, plus client mampu membaca fallback error non-JSON jika function crash sebelum sempat membalas JSON.
- [x] Schema draft OCR/AI kini men-sanitize field panjang sebelum validasi Zod, sehingga teks struk yang sangat panjang tidak lagi memicu `500` hanya karena `description` melebihi batas.
- [x] Riwayat transaksi kini memakai pagination server-side untuk list panjang; filter tetap diproses di API, export/hapus semua tetap bekerja untuk seluruh hasil filter melalui fetch on-demand agar UX tidak turun saat dataset membesar.

## 12. Session Handover Prompt
Gunakan ini di sesi baru:

```text
Ikuti PRD di PRD_FINKU_HARDENING_ROADMAP.md versi 1.3.
Arsitektur wajib: 1 database Supabase shared, isolasi data by userId.
Task aktif: [isi ID task, contoh: P1-01 + P1-02].
Wajib update checklist dan decision log PRD setelah implementasi.
```

Untuk optimasi resource tanpa menurunkan UX, gunakan prompt berikut:

```text
Ikuti section "PRD Tambahan: Resource Efficiency Without UX Regression" di PRD_FINKU_HARDENING_ROADMAP.md.
Fokus hanya pada optimasi yang tidak menurunkan kecepatan, ketepatan data, keamanan, dan UX user.
Kerjakan task aktif: [isi ID task, contoh: R1 + R2].
Wajib update checklist resource efficiency dan decision log setelah implementasi.
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
- 2026-03-11: Untuk stabilitas deployment, route OCR diekspilisitkan memakai runtime `nodejs` dan `maxDuration` lebih besar; client scan struk juga menangani respons 500 non-JSON agar kegagalan function di Vercel bisa dibedakan dari error OCR biasa.
- 2026-03-11: Draft OCR/AI kini disanitasi sebelum parse schema, termasuk pemotongan otomatis field seperti `description`, `merchantName`, `reasoning`, dan `summary`, agar respons OCR/Groq yang panjang tidak menjatuhkan route dengan `ZodError`.

## 14. PRD Tambahan: Resource Efficiency Without UX Regression

### 14.1 Metadata
- Scope Type: Execution PRD Extension
- Date: 2026-03-12
- Status: Active
- Owner: Engineering
- Trigger: Penggunaan hosting menunjukkan tekanan utama pada `Edge Requests` dan `Function Invocations`, sementara CPU, bandwidth, image optimization, dan memory masih longgar.

### 14.2 Objective
1. Menurunkan jumlah request dan function invocation tanpa mengorbankan kecepatan UI.
2. Menjaga akurasi data, invalidasi mutasi, dan guard security tetap utuh.
3. Memprioritaskan optimasi yang langsung terasa oleh user pada dashboard dan flow harian.

### 14.3 Resource Reading
1. Tekanan tertinggi saat ini: `Edge Requests` dan `Function Invocations`.
2. Tekanan menengah-rendah: `Blob Data Storage`, `Fast Origin Transfer`, `Fast Data Transfer`.
3. Masih aman: `Fluid Active CPU`, `Fluid Provisioned Memory`, `Edge Request CPU Duration`, `Image Optimization`, `ISR Reads`.
4. Kesimpulan: prioritas optimasi harus menurunkan jumlah hit route/function per aksi user, bukan memangkas UX visual atau validasi keamanan.

### 14.4 User-Facing Principle
1. Dashboard tetap harus terasa instan saat dibuka.
2. Data tetap harus akurat setelah create/edit/delete/import/OCR/AI.
3. Session security tidak boleh dikendurkan demi hemat request.
4. Fitur berat boleh ditunda load-nya, tetapi tidak boleh terasa rusak atau lambat saat benar-benar dipakai.

### 14.5 Backlog Resource Efficiency

| ID | Priority | Problem | User Impact Target | Solution | Path File Yang Terkait |
|---|---|---|---|---|---|
| R1 | Critical | Dashboard memanggil banyak endpoint terpisah pada first load (`summary`, `budgets`, `charts`, `transactions`) | Dashboard lebih cepat terbuka dan invocation per kunjungan turun tajam | Buat endpoint agregat `GET /api/dashboard?month=&year=` untuk ringkasan, budget progress, chart preview, dan transaksi terbaru; client dashboard pindah memakai query agregat | `src/app/api/dashboard/route.ts` (new), `src/app/page.tsx`, `src/components/finance/summary-cards.tsx`, `src/components/finance/budget-progress.tsx`, `src/components/finance/charts.tsx`, `src/components/finance/transaction-list.tsx`, `src/hooks/use-api.ts` |
| R2 | High | Cache query masih terlalu pendek/global sehingga route baca terlalu sering dipanggil ulang | User tetap melihat data cepat tanpa request berulang saat navigasi ringan | Pecah kebijakan cache per jenis data: kategori/settings lebih lama, dashboard reads moderat; mutasi tetap invalidate/refetch yang relevan | `src/components/providers/query-provider.tsx`, `src/hooks/use-api.ts` |
| R3 | High | Refresh session berjalan periodik di background | User tidak kehilangan keamanan, tetapi request auth background berkurang | Refresh session hanya saat tab kembali aktif/visible, bukan interval periodik; idle timeout tetap berlaku | `src/contexts/auth-context.tsx` |
| R4 | Medium | Fitur berat seperti OCR, AI transaction assist, dan Excel import ikut membebani initial JS/render | First load dashboard lebih ringan tanpa menghilangkan fitur | Dynamic import untuk dialog/fitur berat dan load hanya saat user membuka fitur | `src/app/page.tsx`, `src/components/finance/receipt-scan-dialog.tsx`, `src/components/finance/add-transaction-dialog.tsx`, `src/components/finance/excel-upload.tsx` |
| R5 | Medium | Data baca privat belum dioptimasi dengan strategi cache yang lebih cermat di jalur user | User tetap dapat data akurat dengan latency baca lebih rendah pada repeat visit | Terapkan private read caching pendek dan prefetch hanya untuk data yang aman serta sering dipakai, tanpa public cache untuk data sensitif | `src/hooks/use-api.ts`, `src/app/api/summary/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/charts/route.ts`, `src/app/api/transactions/route.ts` |
| R6 | High | Route finance user-scoped masih terlalu sering lookup tabel `User` padahal kebanyakan hanya butuh `userId` dari JWT | Request auth tetap aman, tetapi query `User` per request turun signifikan | Tambah helper auth claims-only untuk route baca/tulis finance biasa; pertahankan lookup DB penuh hanya untuk route yang memang butuh data user/role terbaru | `src/lib/auth-server.ts`, route `src/app/api/**/route.ts` yang hanya butuh `userId` |
| R7 | High | Import Excel masih melakukan fan-out request per baris untuk kategori dan transaksi | Import file besar tetap terasa cepat tanpa ribuan request client-server | Ubah alur import menjadi bulk endpoint: fetch kategori sekali, buat kategori baru yang perlu, lalu insert transaksi dalam satu transaction server-side | `src/components/finance/excel-upload.tsx`, `src/app/api/categories/route.ts`, `src/app/api/transactions/**` |
| R8 | High | Simpan alokasi anggaran masih memicu banyak request dan write budget ganda lintas endpoint | Save alokasi tetap akurat, tetapi round-trip dan write amplification turun tajam | Satukan save allocation ke satu endpoint bulk yang meng-update settings, category allocation, dan budget bulanan dalam satu `$transaction` | `src/components/finance/budget-allocation-dialog.tsx`, `src/app/api/categories/[id]/route.ts`, `src/app/api/budgets/bulk/route.ts`, route bulk baru bila diperlukan |
| R9 | Medium | Halaman riwayat transaksi bisa overfetch karena filter type/date masih diselesaikan di client | Histori tetap cepat saat data user membesar dan payload tidak meledak | Pindahkan filter `type`, rentang tanggal, dan scope bulan/tahun ke API/DB; client hanya render hasil yang sudah terfilter | `src/components/transactions/transactions-table.tsx`, `src/hooks/use-api.ts`, `src/app/api/transactions/route.ts` |
| R10 | Medium | Endpoint dashboard agregat masih mengirim seluruh transaksi bulan berjalan walau UI hanya perlu preview terbaru | Dashboard tetap instan, tetapi payload first load lebih kecil untuk user dengan transaksi bulanan besar | Tambahkan preview transaksi terbatas di payload dashboard; halaman histori/detail tetap fetch dataset penuh di jalur terpisah | `src/app/api/dashboard/route.ts`, `src/components/finance/transaction-list.tsx`, `src/types/index.ts` |
| R11 | Medium | Invalidasi cache finance masih terlalu lebar untuk sebagian mutasi | Data tetap fresh, tetapi refetch lanjutan yang tidak relevan berkurang | Pecah invalidator per domain (`transactions`, `allocations`, `categories/settings`, `charts`) tanpa menghapus invalidasi kritikal yang dibutuhkan UX | `src/hooks/use-api.ts`, caller mutasi di `src/components/**` |

### 14.6 Delivery Sequence
1. `R1` Dashboard aggregate endpoint.
2. `R2` Query cache tuning per resource type.
3. `R3` Auth refresh on visible tab only.
4. `R4` Dynamic import untuk fitur berat opsional.
5. `R5` Private read caching & targeted prefetch.
6. `R6` Claims-only auth helper untuk route finance user-scoped.
7. `R7` Bulk Excel import pipeline.
8. `R8` Bulk allocation save transaction.
9. `R9` Server-side filtering untuk histori transaksi.
10. `R10` Dashboard payload trimming untuk preview transaksi.
11. `R11` Targeted cache invalidation per domain mutasi.

### 14.7 Acceptance Criteria
1. First load dashboard user tidak lagi memerlukan 4-5 endpoint baca utama terpisah untuk data yang bisa diagregasi.
2. Navigasi ringan atau reopen dialog tidak memicu fetch ulang yang tidak perlu.
3. Session refresh background periodik dihapus; refresh hanya terjadi saat tab kembali aktif dan masih memenuhi guard keamanan.
4. Semua mutasi penting tetap membuat data user terlihat fresh sesudah aksi.
5. `npm run lint` dan `npm run build` tetap hijau setelah tiap fase.
6. Pengurangan query/read harus datang dari berkurangnya fan-out request atau lookup yang redundant, bukan dari pengurangan ownership check atau validasi server-side.
7. Import massal dan save allocation massal tidak boleh mengorbankan atomicity, akurasi angka, atau isolasi `userId`.

### 14.8 Checklist Progress
- [x] R1 Dashboard aggregate endpoint dan client adoption.
- [x] R2 Cache tuning per jenis data.
- [x] R3 Refresh session hanya saat tab aktif kembali.
- [x] R4 Dynamic import fitur berat opsional.
- [x] R5 Private read caching & targeted prefetch.
- [x] R6 Claims-only auth helper untuk route finance user-scoped.
- [x] R7 Bulk Excel import pipeline.
- [x] R8 Bulk allocation save transaction.
- [x] R9 Server-side filtering histori transaksi.
- [x] R10 Dashboard payload trimming untuk preview transaksi.
- [x] R11 Targeted cache invalidation per domain mutasi.

### 14.9 Notes for Next Session
1. Target utama penghematan ada di `Function Invocations` dan `Edge Requests`, jadi implementasi harus mengurangi jumlah request, bukan memangkas UX.
2. Jangan menurunkan validasi server-side, ownership check, atau invalidasi cache mutasi demi efisiensi semu.
3. Jika harus memilih, prioritaskan optimasi dashboard dan auth background sebelum fitur sekunder.
4. Untuk fase lanjutan, fokus berikutnya harus murni pada workload app: lookup auth redundant, fan-out import/save, dan overfetch histori; abaikan query katalog internal Supabase karena itu bukan bottleneck produk.
5. Urutan implementasi yang direkomendasikan: `R6`, `R7`, `R8`, `R9`, lalu `R10` dan `R11` sesudah baseline request count baru terukur.

### 14.10 Resource Efficiency Decision Log
- 2026-03-12: Dokumen PRD diperluas ke v1.3 dengan extension resource efficiency yang memprioritaskan penghematan `Edge Requests` dan `Function Invocations` tanpa menurunkan UX, akurasi, atau security.
- 2026-03-12: Task `R3` diimplementasikan; refresh session periodik background dihapus dan refresh auth kini hanya dipicu saat tab kembali visible/aktif dengan guard cooldown yang sudah ada.
- 2026-03-12: Task `R1` diimplementasikan dengan endpoint agregat privat `GET /api/dashboard?month=&year=`; dashboard first load kini memakai satu query untuk summary, budget progress, preview chart default, dan daftar transaksi bulan terpilih, sementara mode chart non-default tetap fetch on-demand agar UX tidak melambat.
- 2026-03-12: Task `R2` diimplementasikan dengan cache policy React Query per resource (`categories/settings` lebih lama, dashboard/read moderat) dan invalidasi mutasi diperluas ke query `dashboard`; dialog alokasi anggaran juga dipindah ke query cache aktif-saat-dibuka untuk mengurangi refetch berulang saat reopen tanpa mengendurkan ownership check atau freshness sesudah mutasi.
- 2026-03-12: Task `R4` diimplementasikan dengan wrapper lazy untuk `AddTransactionDialog`, `ReceiptScanDialog`, dan `ExcelUpload`; chunk fitur berat kini baru dimuat saat ada intent user (hover/focus/click atau edit), tetapi dialog tetap auto-open pada klik pertama agar UX tidak terasa tertahan.
- 2026-03-12: Task `R5` diimplementasikan dengan private read response headers pendek (`Cache-Control: private`) pada route baca utama, versioned read cache key/query param client-side yang dibump setiap mutasi agar hasil baru tidak tertahan browser cache, serta targeted cache seeding dari `useDashboard` ke cache `summary`, `budgets`, `transactions`, dan chart default untuk repeat navigation yang lebih cepat.
- 2026-03-12: Risiko stale dari browser-level fresh cache dihapus dengan mengubah response header read privat menjadi `private, no-cache, must-revalidate`; query finansial yang sudah stale juga kini revalidate saat tab kembali fokus, sehingga repeat visit tetap cepat dari cache internal tetapi response privat tidak lagi dianggap fresh lintas device/tab hanya karena TTL browser.
- 2026-03-12: Backlog resource efficiency diperluas untuk fase app-only berikutnya (`R6`-`R11`) berdasarkan pembacaan workload aplikasi: query finance utama sudah lebih efisien, tetapi masih ada peluang besar di lookup `User` yang redundant, fan-out request pada import Excel dan save allocation, overfetch histori transaksi, payload dashboard yang masih membawa seluruh transaksi bulan berjalan, dan invalidasi cache yang terlalu lebar untuk sebagian mutasi.
- 2026-03-12: Task `R6` diimplementasikan dengan helper auth claims-only di `src/lib/auth-server.ts`; route finance user-scoped standar kini cukup memverifikasi JWT dan memakai `userId` claim untuk ownership filter, sementara route profil/admin yang memerlukan data user/role terbaru tetap memakai lookup `User` penuh.
- 2026-03-12: Task `R7` diimplementasikan dengan `POST /api/transactions/bulk`; import Excel kini mengirim satu batch ke server, kategori existing dibaca sekali, kategori yang hilang dibuat satu kali per nama+tipe di dalam transaction yang sama, lalu transaksi di-insert via `createMany` sehingga request client-server dan write amplification turun tanpa melepas validasi server-side.
- 2026-03-12: Task `R8` diimplementasikan dengan bulk allocation save satu endpoint di `POST /api/budgets/bulk`; update `monthlyIncome`, `allocationPercentage` kategori, dan budget bulanan kini dieksekusi dalam satu `$transaction`, dengan nominal budget dihitung ulang di server untuk menjaga akurasi, ownership check, dan atomicity write sambil mengurangi fan-out request dari dialog alokasi.
- 2026-03-12: Task `R9` diimplementasikan dengan memindahkan filter histori transaksi (`month`, `year`, `type`, `dateFrom`, `dateTo`) ke `GET /api/transactions`; hook client kini membawa filter tersebut ke query key/query param sehingga tabel histori merender hasil yang sudah difilter dari server tanpa overfetch dataset bulanan penuh lalu menyaring ulang di browser.
- 2026-03-12: Task `R10` diimplementasikan dengan memangkas payload `GET /api/dashboard` menjadi preview transaksi terbaru terbatas (`transactionPreviewLimit`) plus `transactionCount`; dashboard tetap menampilkan daftar terbaru dan total bulan berjalan, sementara seed cache query histori penuh hanya dilakukan bila payload dashboard memang belum terpotong agar cache histori tidak terkontaminasi preview subset.
- 2026-03-12: Task `R11` diimplementasikan dengan invalidator cache per domain mutasi di `src/hooks/use-api.ts` (`transactions`, `allocations`, `categories`); mutasi transaksi kini hanya menyegarkan domain read yang benar-benar terdampak, save alokasi fokus ke `dashboard`/`budgets`/`categories`/`settings`, dan mutasi kategori fokus ke `dashboard`/`transactions`/`budgets`/`charts`/`categories` tanpa menghapus refresh kritikal sesudah aksi user.
- 2026-03-12: Setelah seluruh backlog resource efficiency selesai, histori transaksi ditambah pagination server-side sebagai follow-up performa list panjang; API transaksi kini mendukung mode paginated dan mode `fields=ids` untuk aksi bulk/export, sehingga payload histori harian turun tanpa mengubah perilaku user-facing pada export CSV atau hapus semua hasil filter.
