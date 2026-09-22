# ⏱️ SCV TimeHub & Task Management

> Platform pencatatan waktu kerja developer (*Developer Time Tracker*), timesheet bulanan, integrasi import/export CSV Teamwork, dan manajemen tiket tim berbasis Next.js 16 App Router dengan database cloud **Turso libSQL**.

---

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Prasyarat Sistem](#-prasyarat-sistem)
3. [Panduan Instalasi & Setup](#-panduan-instalasi--setup)
   - [Langkah 1: Setup Next.js](#langkah-1-setup-project-nextjs)
   - [Langkah 2: Setup Database Turso](#langkah-2-setup-database-turso-libsql)
   - [Langkah 3: Setup Cloudinary](#langkah-3-setup-cloudinary-media-storage)
   - [Langkah 4: Konfigurasi Environment Variables](#langkah-4-konfigurasi-environment-variables-envlocal)
   - [Langkah 5: Membuat Akun Master User](#langkah-5-membuat-akun-master-user-pertama)
4. [Menjalankan Aplikasi](#-menjalankan-aplikasi)
5. [Panduan Deployment ke Vercel](#-panduan-deployment-ke-vercel)
6. [Struktur Folder Proyek](#-struktur-folder-proyek)
7. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🚀 Fitur Utama

- **⏱️ Smart Time Tracker & Monthly Kanban**: 
  - Catat jam kerja per tugas harian dengan cepat (*1-click quick log modal*).
  - Tampilan Kanban bulanan dengan navigasi stepper bulan (*Prev / Next Month*) dan pencarian instan.
  - Pembatasan tinggi kolom dengan *internal scrollbar* agar tampilan tetap rapi.
- **☁️ Turso libSQL Cloud Database**:
  - Penyimpanan permanen di cloud (tanpa risiko data hilang di browser / multi-device).
  - Indikator sinkronisasi otomatis *real-time* (`Turso DB Synced` / `Syncing...` / `Retry`).
- **📁 Integrasi CSV Teamwork & SCV**:
  - Impor berkas log Teamwork dan SCV sekali klik dengan *loading feedback*.
  - Ekspor timesheet berformat Teamwork CSV yang siap diserahkan ke klien/manajemen.
- **📊 Visual Monthly Analytics**:
  - Diagram batang bulanan (*Monthly Bar Chart*) dengan lebar proporsional seragam.
  - Perhitungan rasio *billable* vs *non-billable* dan deteksi otomatis log waktu tumpang tindih (*conflict detection*).
- **👥 Multi-Role & Master User Approval**:
  - Registrasi anggota tim baru melalui persetujuan (*approval*) Master User di menu `/users`.
  - Kemudahan promosi peran antar `Member` dan `Master User`.

---

## 📦 Prasyarat Sistem

Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `18.18.0` atau `20.x` ke atas
- **npm** (atau `pnpm` / `yarn`)
- **Turso CLI** (opsional tapi direkomendasikan): [Dokumentasi Turso CLI](https://docs.turso.tech/cli/introduction)

---

## 🛠️ Panduan Instalasi & Setup

### Langkah 1: Setup Project Next.js

1. **Clone repositori:**
   ```bash
   git clone <url-repository-anda>
   cd miniapp-scv
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

---

### Langkah 2: Setup Database Turso (libSQL)

Aplikasi ini menggunakan **Turso** (SQLite serverless di edge) sebagai database cloud.

1. **Daftar Akun Turso:**
   - Kunjungi [https://turso.tech](https://turso.tech) dan buat akun gratis.

2. **Install Turso CLI di komputer:**
   - **macOS / Linux:**
     ```bash
     curl -sSfL https://get.tur.so/install.sh | bash
     ```
   - **Windows (PowerShell):**
     ```powershell
     irm https://get.tur.so/install.ps1 | iex
     ```

3. **Login dan Buat Database:**
   ```bash
   # Login ke akun Turso
   turso auth login

   # Buat database baru (misal diberi nama: scv-timehub)
   turso db create scv-timehub
   ```

4. **Dapatkan Database URL & Auth Token:**
   ```bash
   # 1. Ambil URL database (format: libsql://scv-timehub-[username].turso.io)
   turso db show scv-timehub --url

   # 2. Buat token autentikasi rahasia
   turso db tokens create scv-timehub
   ```

> 💡 **Info Otomatisasi Tabel:** Anda **TIDAK PERLU** menjalankan skrip SQL manual untuk membuat tabel (`users`, `sessions`, `tasks`, `time_tracker_tasks`, `time_logs`). Aplikasi akan secara otomatis mengeksekusi *auto-migration* dan membuat tabel yang dibutuhkan saat server pertama kali dijalankan.

---

### Langkah 3: Setup Cloudinary (Media Storage)

Cloudinary digunakan untuk mengunggah gambar bukti pengerjaan tiket dan avatar profil secara gratis (25 GB free tier).

1. Kunjungi [https://cloudinary.com](https://cloudinary.com) dan buat akun baru.
2. Masuk ke **Cloudinary Dashboard / Console**: [https://console.cloudinary.com/pm](https://console.cloudinary.com/pm).
3. Salin 3 kredensial berikut dari kartu **Product Environment Credentials**:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

### Langkah 4: Konfigurasi Environment Variables (`.env.local`)

1. Salin template `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Buka `.env.local` dan masukkan nilai yang telah didapatkan:
   ```env
   # ------------------------------------------------------------------------------
   # 1. TURSO DATABASE (libSQL Cloud)
   # ------------------------------------------------------------------------------
   TURSO_DATABASE_URL="libsql://scv-timehub-username.turso.io"
   TURSO_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

   # ------------------------------------------------------------------------------
   # 2. CLOUDINARY (Media & Attachment Storage)
   # ------------------------------------------------------------------------------
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="123456789012345"
   CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz12345"
   ```

---

### Langkah 5: Membuat Akun Master User Pertama

Aplikasi memiliki sistem proteksi registrasi di mana anggota baru berstatus `pending` dan harus disetujui oleh **Master User**.

#### Cara Termudah (Auto-Master Pertama Kali):
1. Jalankan aplikasi dengan `npm run dev`.
2. Buka browser ke alamat `http://localhost:3000/register`.
3. Daftarkan akun pertama Anda (Nama, Email, Password).
4. **Sistem secara otomatis mendeteksi pendaftar pertama sebagai `Master User` dengan status `Approved`** dan langsung melakukan auto-login ke dalam sistem.
5. Pendaftar ke-2 dan seterusnya akan masuk sebagai `Member` dengan status `Pending` yang dapat Anda setujui di menu **Kelola User (`/users`)**.

#### Alternatif: Promosi User via Turso CLI
Jika akun sudah terdaftar dan Anda ingin menjadikannya Master User langsung dari database:
```bash
turso db shell scv-timehub "UPDATE users SET role = 'master', status = 'approved' WHERE email = 'email-anda@example.com';"
```

---

## 💻 Menjalankan Aplikasi

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server development di `http://localhost:3000` |
| `npm run build` | Melakukan compile dan build produksi (Next.js Turbopack) |
| `npm run start` | Menjalankan build produksi secara lokal |
| `npm run lint` | Menjalankan ESLint code analysis |

---

## 🌐 Panduan Deployment ke Vercel

Aplikasi ini dapat di-deploy ke **Vercel** dengan sangat mudah:

### 1. Push Kode ke Git Repository
Pastikan seluruh source code proyek Anda telah di-commit dan di-push ke GitHub, GitLab, atau Bitbucket:
```bash
git add .
git commit -m "feat: complete time tracker and turso cloud setup"
git push origin main
```

### 2. Import Project di Vercel
1. Masuk ke [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik tombol **Add New...** > **Project**.
3. Pilih repositori `miniapp-scv` yang baru saja Anda push, lalu klik **Import**.

### 3. Konfigurasi Environment Variables di Vercel
Pada halaman konfigurasi proyek (*Configure Project*), buka bagian **Environment Variables** dan tambahkan variabel-variabel berikut (sesuaikan dengan nilai akun Anda):

| Key / Variable Name | Value | Deskripsi |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | `libsql://scv-timehub-username.turso.io` | URL database Turso Cloud |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` | Token autentikasi rahasia Turso |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloud name dari dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | `123456789012345` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | `abcdefghijklmnopqrstuvwxyz` | API secret Cloudinary |

> 🔒 **Tips Keamanan:** Pilih opsi centang untuk ketiga target environment: **Production**, **Preview**, dan **Development**.

### 4. Deploy Proyek
1. Klik tombol **Deploy**.
2. Tunggu proses build selesai (~1 menit). Vercel akan menghasilkan URL live (misal: `https://miniapp-scv.vercel.app`).

### 5. Inisialisasi Akun Master Pertama di Production
1. Buka URL domain Vercel Anda di browser dan akses halaman registrasi: `https://<domain-vercel-anda>/register`.
2. Daftarkan akun pertama Anda.
3. Karena database diakses untuk pertama kalinya, akun pertama ini **otomatis menjadi Master User** di lingkungan live production.

---

## 📂 Struktur Folder Proyek

```text
miniapp-scv/
├── app/
│   ├── api/                    # REST API Endpoints (Auth, Users, Time Tracker, Tasks, Upload)
│   │   ├── auth/               # Login, Register, Logout, Profile, Me
│   │   ├── time-tracker/       # Tasks, Logs, Sync API to Turso DB
│   │   ├── upload/             # Cloudinary upload handler
│   │   └── users/              # Master User management API
│   ├── components/             # Reusable UI Components (AppNav, BarChart, etc.)
│   ├── dashboard/              # Halaman Dasbor & Metrik Ringkasan
│   ├── lib/                    # Core business logic & database services
│   │   ├── auth.ts             # Session & Password hashing
│   │   ├── cloudinary.ts       # Cloudinary client
│   │   ├── import-csv.ts       # Teamwork & SCV CSV parser
│   │   ├── store/              # Zustand state store with Turso sync
│   │   ├── time-tracker-store.ts # Turso DB operations for time logs
│   │   ├── turso.ts            # libSQL client & auto-migration schemas
│   │   └── users.ts            # User database operations
│   ├── timelogs/               # Halaman Time Tracker & Monthly Kanban Board
│   ├── users/                  # Panel Manajemen Pengguna (Master User)
│   ├── globals.css             # Tailwind CSS & custom scrollbar
│   └── page.tsx                # Landing Page aplikasi
├── .env.example                # Template variabel konfigurasi
├── README.md                   # Dokumentasi lengkap proyek
└── package.json                # Dependensi proyek
```

---

## ❓ Troubleshooting & FAQ

### 1. `Error: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing`
- Pastikan file `.env.local` sudah dibuat dan variabel `TURSO_DATABASE_URL` serta `TURSO_AUTH_TOKEN` terisi dengan benar tanpa tanda kutip ganda berlebih.
- Restart dev server setelah mengedit file `.env.local`.

### 2. Gagal Upload Gambar / Attachment
- Periksa kembali nilai `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` di `.env.local`.
- Pastikan akun Cloudinary dalam keadaan aktif.

### 3. Akun Member Baru Tidak Bisa Login
- Anggota baru yang mendaftar setelah Master User pertama memerlukan persetujuan.
- Login sebagai akun Master User, buka menu **Kelola User (`/users`)**, lalu klik tombol **Approve** pada anggota terkait.

---

© 2026 **SCV TimeHub** - Internal Developer Productivity & Time Tracking.
