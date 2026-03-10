# Finku - Aplikasi Manajemen Keuangan Pribadi

![Finku](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)

Aplikasi manajemen keuangan pribadi yang modern untuk mencatat pemasukan, pengeluaran, dan mengatur anggaran bulanan.

---

## 📋 Daftar Isi

1. [Apa itu Finku?](#-apa-itu-finku)
2. [Fitur Aplikasi](#-fitur-aplikasi)
3. [Persiapan Sebelum Mulai](#-persiapan-sebelum-mulai)
4. [Cara Install Aplikasi](#-cara-install-aplikasi)
5. [Cara Menjalankan Aplikasi](#-cara-menjalankan-aplikasi)
6. [Cara Push ke GitHub](#-cara-push-ke-github)
7. [Cara Deploy ke Vercel](#-cara-deploy-ke-vercel)
8. [FAQ (Pertanyaan Umum)](#-faq-pertanyaan-umum)

---

## 🤔 Apa itu Finku?

Finku adalah aplikasi web untuk mengelola keuangan pribadi Anda. Dengan Finku, Anda bisa:
- Mencatat pemasukan dan pengeluaran harian
- Mengatur anggaran bulanan per kategori
- Melihat grafik dan statistik keuangan
- Import data dari file Excel

---

## ✨ Fitur Aplikasi

### 📊 Dashboard
- Ringkasan saldo, pemasukan, pengeluaran, dan tabungan
- Grafik tren keuangan 6 bulan terakhir
- Progress anggaran per kategori dengan ikon

### 💰 Manajemen Transaksi
- Tambah, edit, hapus transaksi
- Hapus multiple transaksi sekaligus
- Kategori dengan ikon dan warna

### 📁 Import Data
- Upload file Excel/CSV
- Preview data sebelum import

### 🎨 Tampilan
- Tema terang dan gelap
- Responsif untuk semua ukuran layar

### 👤 Admin
- Kelola pengguna (untuk role admin)

---

## 📦 Persiapan Sebelum Mulai

### ⚠️ PENTING: Install Semua Tools Terlebih Dahulu!

**Sebelum menjalankan perintah apapun, Anda HARUS menginstall tools berikut.** Jika tidak, Anda akan mendapat error seperti:
```
vercel: The term 'vercel' is not recognized...
bun: The term 'bun' is not recognized...
```

---

### Yang Perlu Diinstall (Urutannya Penting!)

#### 1. Install Node.js
Node.js adalah runtime untuk menjalankan JavaScript di komputer Anda.

**Cara Install:**
1. Buka website: https://nodejs.org
2. Download versi **LTS** (Long Term Support)
3. Jalankan file installer yang sudah di-download
4. Klik "Next" sampai selesai
5. **Restart PowerShell/Command Prompt** (SANGAT PENTING!)

**Cek apakah sudah terinstall:**
Buka Command Prompt / PowerShell BARU, ketik:
```bash
node --version
```
Jika muncul angka seperti `v20.x.x`, berarti sudah berhasil.

---

#### 2. Install Bun (Alternatif Node.js yang lebih cepat)
**Cara Install di Windows:**

1. Buka **PowerShell sebagai Administrator**:
   - Klik kanan pada Start menu
   - Pilih "Windows PowerShell (Admin)" atau "Terminal (Admin)"

2. Ketik perintah berikut:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

3. Jika ada error tentang execution policy, jalankan dulu:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Lalu ulangi perintah install Bun.

4. **TUTUP dan BUKA ULANG PowerShell** (SANGAT PENTING!)

**Cek instalasi:**
```bash
bun --version
```

**Jika masih error "bun not found":**
- Bun mungkin terinstall tapi belum di PATH
- Restart komputer Anda
- Atau gunakan `npm` sebagai alternatif:
  ```bash
  npm install   # sebagai ganti bun install
  npm run dev   # sebagai ganti bun run dev
  ```

---

#### 3. Install Git
Git adalah alat untuk mengelola versi kode dan upload ke GitHub.

**Cara Install:**
1. Buka website: https://git-scm.com/downloads
2. Download untuk Windows
3. Jalankan installer, klik "Next" sampai selesai
4. **Restart PowerShell**

**Cek instalasi:**
```bash
git --version
```

---

#### 4. Install Vercel CLI
Vercel CLI diperlukan untuk deploy dari terminal.

**Cara Install:**
```bash
npm install -g vercel
```

**Cek instalasi:**
```bash
vercel --version
```

---

#### 5. Install VS Code (Code Editor)
**Cara Install:**
1. Buka website: https://code.visualstudio.com
2. Download untuk Windows
3. Jalankan installer

---

#### 6. Buat Akun GitHub
GitHub adalah tempat menyimpan kode online.

1. Buka website: https://github.com
2. Klik "Sign Up"
3. Isi username, email, password
4. Verifikasi email

---

### ✅ Checklist Sebelum Mulai

Pastikan semua perintah berikut berhasil di PowerShell:

| Perintah | Expected Output | Status |
|----------|-----------------|--------|
| `node --version` | v20.x.x atau lebih baru | ☐ |
| `bun --version` | 1.x.x atau lebih baru | ☐ |
| `git --version` | git version 2.x.x | ☐ |
| `vercel --version` | Vercel CLI x.x.x | ☐ |

**Jika ada yang error, jangan lanjut dulu! Install tools yang missing.**

---

## 🚀 Cara Install Aplikasi

### Langkah 1: Download Kode dari GitHub

Buka Command Prompt/Terminal, lalu ketik:

```bash
# Pindah ke folder Documents (atau folder yang Anda inginkan)
cd Documents

# Clone/download kode dari GitHub
git clone https://github.com/rizqiwidi/finku.git

# Masuk ke folder project
cd finku
```

---

### Langkah 2: Buka di VS Code

```bash
# Buka folder project di VS Code
code .
```

Atau:
1. Buka VS Code
2. Klik File > Open Folder
3. Pilih folder `finku`

---

### Langkah 3: Install Dependencies

Dependencies adalah library/komponen yang dibutuhkan aplikasi.

Buka Terminal di VS Code (`Ctrl + ` `), ketik:

```bash
# Install semua dependencies
bun install
```

Tunggu sampai selesai (biasanya 1-2 menit).

---

### Langkah 4: Buat File Environment

File `.env` berisi konfigurasi penting untuk aplikasi.

**Cara Membuat:**
1. Di panel kiri VS Code, klik kanan pada area kosong
2. Pilih "New File"
3. Beri nama: `.env`
4. Copy-paste isi berikut:

```env
# Database - SQLite untuk development
DATABASE_URL="file:./db/custom.db"

# JWT Secret - untuk autentikasi
JWT_SECRET="finku-super-secret-jwt-key-change-in-production-2024"
```

5. Simpan (`Ctrl + S`)

---

### Langkah 5: Setup Database

Database menyimpan semua data transaksi, kategori, dll.

Ketik di Terminal:

```bash
# Generate Prisma Client (koneksi ke database)
bun run db:generate

# Push schema ke database (membuat tabel)
bun run db:push
```

---

### Langkah 6: Isi Data Contoh (Opsional)

Jika ingin mencoba dengan data contoh:

```bash
bun run db:seed
```

Ini akan membuat:
- User admin (username: `admin`, password: `94621732`)
- Kategori-kategori transaksi
- Beberapa transaksi contoh

---

## 🖥️ Cara Menjalankan Aplikasi

### Jalankan Development Server

Ketik di Terminal:

```bash
bun run dev
```

Anda akan melihat output seperti:
```
▲ Next.js 16.1.3
- Local:   http://localhost:3000
✓ Ready in 500ms
```

### Buka di Browser

Buka browser (Chrome/Edge/Firefox), ketik di address bar:
```
http://localhost:3000
```

### Login

Gunakan kredensial berikut:
- **Username:** `admin`
- **Password:** `94621732`

### Untuk Menghentikan Server

Tekan `Ctrl + C` di Terminal.

---

## 📤 Cara Push ke GitHub

### Langkah 1: Buat Repository Baru di GitHub

1. Login ke https://github.com
2. Klik tombol **"+"** di kanan atas > **"New repository"**
3. Isi:
   - Repository name: `finku`
   - Description: (opsional) "Aplikasi Keuangan Pribadi"
   - Pilih **Public** atau **Private**
   - **JANGAN** centang "Add a README file"
4. Klik **"Create repository"**

---

### Langkah 2: Inisialisasi Git di Komputer

Buka Terminal di VS Code, ketik:

```bash
# Inisialisasi git
git init

# Tambahkan semua file
git add .

# Commit (simpan perubahan)
git commit -m "Initial commit: Finku aplikasi keuangan"
```

---

### Langkah 3: Hubungkan ke GitHub

```bash
# Tambahkan remote repository
git remote add origin https://github.com/USERNAME/finku.git

# Ganti USERNAME dengan username GitHub Anda
# Contoh: git remote add origin https://github.com/rizqiwidi/finku.git
```

---

### Langkah 4: Push ke GitHub

```bash
# Ganti branch ke main
git branch -M main

# Push ke GitHub
git push -u origin main
```

**Jika error "Updates were rejected":**
```bash
git push -u origin main --force
```

---

### Langkah 5: Verifikasi

Buka repository Anda:
```
https://github.com/USERNAME/finku
```

Semua file harus sudah terlihat.

---

## 🌐 Cara Deploy ke Vercel

Vercel adalah platform hosting gratis untuk aplikasi web.

### Langkah 1: Buat Akun Vercel

1. Buka website: https://vercel.com
2. Klik **"Sign Up"**
3. Pilih **"Continue with GitHub"**
4. Autorisasi Vercel untuk mengakses GitHub

---

### Langkah 2: Import Project

1. Setelah login, klik **"Add New..."** > **"Project"**
2. Anda akan melihat daftar repository GitHub
3. Cari dan klik repository `finku`
4. Klik **"Import"**

---

### Langkah 3: Konfigurasi Project

Di halaman "Configure Project":

1. **Framework Preset:** Next.js (otomatis terdeteksi)
2. **Root Directory:** `./`
3. **Build Command:** (kosongkan, biarkan default)
4. **Output Directory:** (kosongkan, biarkan default)

---

### Langkah 4: Set Environment Variables

Klik **"Environment Variables"** dan tambahkan:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `file:./db/custom.db` |
| `JWT_SECRET` | `finku-super-secret-jwt-key-change-in-production-2024` |

> **Catatan:** Untuk production, sebaiknya gunakan database PostgreSQL (lihat bagian selanjutnya).

Klik **"Add"** untuk setiap variable.

---

### Langkah 5: Deploy

1. Klik tombol **"Deploy"**
2. Tunggu proses build (2-5 menit)
3. Jika berhasil, akan ada ucapan "Congratulations! 🎉"
4. Klik **"Continue to Dashboard"**
5. Klik URL yang diberikan (contoh: `https://finku-xxx.vercel.app`)

---

## 🗄️ Setup Database PostgreSQL (Untuk Production)

SQLite tidak cocok untuk production. Gunakan PostgreSQL dari Supabase.

### 🎯 Cara MUDAH: Setup via Supabase Dashboard (Tanpa CLI!)

Ini adalah cara paling mudah - **tidak perlu install apapun!**

---

### Langkah 1: Buat Project di Supabase

1. Buka website: https://supabase.com
2. Klik **"Start your project"**
3. Login dengan GitHub
4. Klik **"New Project"**
5. Isi:
   - Organization: pilih atau buat baru
   - Project name: `finku-db`
   - Database password: buat password yang kuat (simpan baik-baik!)
   - Region: pilih **Singapore** (terdekat dari Indonesia)
6. Klik **"Create new project"**
7. Tunggu 2-3 menit sampai project ready

---

### Langkah 2: Buat Tabel dengan SQL Editor

1. Di dashboard Supabase, klik **"SQL Editor"** di menu kiri
2. Klik **"New query"**
3. Buka file `supabase-schema.sql` dari folder project ini
4. Copy SEMUA isi file tersebut
5. Paste ke SQL Editor di Supabase
6. Klik **"Run"** (tombol di kanan bawah)
7. Jika berhasil, akan muncul pesan "Success. No rows returned"

Ini akan membuat:
- 5 tabel (User, UserSettings, Category, Transaction, Budget)
- Indexes untuk performa
- User admin default (username: `admin`, password: `94621732`)
- Kategori-kategori transaksi default

---

### Langkah 3: Ambil Connection String

1. Di dashboard Supabase, klik **"Project Settings"** (icon gear) di kiri bawah
2. Klik **"Database"** di menu kiri
3. Scroll ke bagian **"Connection string"**
4. Pilih tab **"URI"**
5. Copy dua URL berikut:

**Untuk `DATABASE_URL` (Connection Pooling):**
- Gunakan URL dengan port `6543`
- Ganti `[YOUR-PASSWORD]` dengan password database yang Anda buat

**Untuk `DIRECT_DATABASE_URL` (Direct Connection):**
- Gunakan URL dengan port `5432`
- Ganti `[YOUR-PASSWORD]` dengan password database yang Anda buat

Contoh:
```
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@db.xxxx.supabase.co:5432/postgres
```

---

### Langkah 4: Update Prisma Schema

Buka file `prisma/schema.prisma`, ubah bagian `datasource`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

> **Atau rename file `prisma/schema.postgresql.prisma` menjadi `prisma/schema.prisma`**

---

### Langkah 5: Set Environment Variables di Vercel

1. Buka dashboard Vercel project Anda
2. Klik **"Settings"** > **"Environment Variables"**
3. Tambahkan 3 variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | URL dari Supabase (port 6543) |
| `DIRECT_DATABASE_URL` | URL dari Supabase (port 5432) |
| `JWT_SECRET` | String random, contoh: `finku-super-secret-jwt-key-2024` |

4. Klik **"Save"**

---

### Langkah 6: Redeploy di Vercel

1. Buka tab **"Deployments"**
2. Klik titik tiga **"..."** di deployment terbaru
3. Pilih **"Redeploy"**

---

## 🔧 Cara CLI: Setup via Terminal (Untuk Pengguna Lanjutan)

Jika Anda sudah familiar dengan terminal, gunakan cara ini:

### Langkah 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Langkah 2: Login dan Pull Environment
```bash
vercel login
vercel env pull .env.local
```

### Langkah 3: Push Schema ke Database
```bash
bun run db:push
# atau
npm run db:push
```

### Langkah 4: Seed Data (Opsional)
```bash
bun run db:seed
# atau
npm run db:seed
```

---

## ❓ FAQ (Pertanyaan Umum)

### 1. Error: "module not found"
**Solusi:**
```bash
bun install
```

### 2. Error: "Prisma Client not initialized"
**Solusi:**
```bash
bun run db:generate
```

### 3. Error: "Database file not found"
**Solusi:**
```bash
bun run db:push
```

### 4. Tidak bisa login
**Pastikan:**
- Database sudah di-seed: `bun run db:seed`
- Username: `admin`, Password: `94621732`

### 5. Aplikasi tidak jalan di Vercel
**Cek:**
- Environment variables sudah benar
- Database PostgreSQL sudah dikonfigurasi
- Lihat logs di Vercel dashboard

### 6. Cara reset database?
```bash
bun run db:reset
bun run db:seed
```

### 7. Cara menghentikan server development?
Tekan `Ctrl + C` di Terminal.

### 8. Cara melihat logs di Vercel?
1. Buka dashboard Vercel
2. Klik project
3. Klik tab **"Logs"**

---

## 📞 Bantuan

Jika mengalami masalah:
1. Baca pesan error dengan teliti
2. Coba solusi di FAQ
3. Cari di Google dengan menyalin pesan error
4. Buat issue di GitHub repository

---

## 📄 Lisensi

MIT License - Bebas digunakan untuk keperluan pribadi maupun komersial.

---

Made with ❤️ by Finku Team
