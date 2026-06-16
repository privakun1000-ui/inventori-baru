# Panduan Instalasi - Sistem Inventori RRI Purwokerto

## 1. Setup Spreadsheet (Database)

1. Buat Google Spreadsheet baru, beri nama misalnya **"DB Inventori RRI Purwokerto"**.
2. Salin **Spreadsheet ID** dari URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_DISINI/edit`
3. Sheet/tab akan dibuat **otomatis** oleh script saat pertama kali dijalankan (`setupDatabase`). Anda tidak perlu membuat sheet manual.

## 2. Setup Google Drive (Folder Penyimpanan)

Buat folder utama di Drive, lalu buat sub-folder berikut, dan catat **Folder ID** masing-masing (dari URL folder):

- `Foto Barang`
- `Foto Peminjaman`
- `Foto Pengembalian`
- `BAST & Export`
- `QR & Barcode`

## 3. Setup Backend (Google Apps Script)

1. Buka spreadsheet database Anda → menu **Extensions / Ekstensi → Apps Script**.
2. **PENTING — Hindari error "Identifier ... has already been declared":**
   Apps Script menggabungkan SEMUA file `.gs` dalam satu project ke dalam satu lingkup global.
   Artinya, setiap `const`/`let`/`var` di level atas (misalnya `SPREADSHEET_ID`, `SHEET_NAMES`, dll.)
   **hanya boleh dideklarasikan SATU KALI di SATU file saja** — yaitu di `Config.gs`.
   - Jangan menyalin isi `Config.gs` ke file lain.
   - Jangan membuat dua file dengan nama berbeda yang isinya sama.
   - Jika project Apps Script Anda default sudah memiliki file `Code.gs` kosong bawaan,
     **hapus isinya** sebelum menempelkan isi `Code.gs` dari paket ini, jangan buat file baru bernama `Code2.gs` dsb.
   - Daftar file `.gs` akhir yang seharusnya ada di project Anda (TIDAK LEBIH, TIDAK KURANG):
     - `Code.gs`
     - `Config.gs`
     - `Utils.gs`
     - `Auth.gs`
     - `Dashboard.gs`
     - `BarangService.gs`
     - `RuanganService.gs`
     - `PenggunaService.gs`
     - `PeminjamanService.gs`
     - `PemakaianRuanganService.gs`
     - `PengembalianService.gs`
     - `AuditService.gs`
     - `NotificationService.gs`
     - `ReminderService.gs`
     - `BASTService.gs`
     - `ExportService.gs`
3. Untuk setiap file di atas: buat file baru (ikon `+` → Script) dengan nama yang **sama persis** (tanpa ekstensi `.gs`, Apps Script menambahkannya otomatis), lalu salin-tempel isi file `.gs` yang sesuai dari folder `backend/`.
4. Buka `Config.gs`, isi:
   - `SPREADSHEET_ID` dengan ID spreadsheet dari langkah 1.
   - `DRIVE_FOLDER_ID`, `DRIVE_FOLDER_FOTO_BARANG`, dst dengan Folder ID dari langkah 2.
   - `FONNTE_API_TOKEN` (untuk WhatsApp), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_GROUP_ID`, `EMAIL_ADMIN` sesuai kebutuhan. Boleh dikosongkan dulu, fitur notifikasi akan otomatis nonaktif jika masih `PASTE_...`.
5. Jalankan fungsi `setupDatabase` sekali (pilih fungsi di dropdown atas, klik **Run** ▶).
   - Berikan izin akses (Spreadsheet, Drive, Gmail) saat diminta.
   - Ini akan membuat semua sheet otomatis + 1 user admin default:
     - **Username:** `admin`
     - **Password:** `admin123`
   - **Segera ganti password ini setelah login pertama kali.**
6. (Opsional) Jalankan fungsi `setupDailyTrigger` sekali untuk mengaktifkan reminder harian otomatis jam 07:00.

## 4. Deploy sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. Isi:
   - **Execute as:** Me (akun Anda)
   - **Who has access:** Anyone
4. Klik **Deploy**, salin **Web app URL** yang dihasilkan (format: `https://script.google.com/macros/s/XXXXXXXX/exec`).

> Setiap kali Anda mengubah kode backend, Anda harus membuat **deployment baru** (Manage deployments → Edit → New version) agar perubahan terlihat di Web App URL yang sama.

## 5. Setup Frontend (GitHub Pages)

1. Buka file `frontend/assets/js/api.js`.
2. Ganti baris:
   ```js
   const API_BASE_URL = 'https://script.google.com/macros/s/PASTE_DEPLOYMENT_ID_DISINI/exec';
   ```
   dengan Web App URL dari langkah 4.
3. Upload seluruh folder `frontend/` ke repository GitHub.
4. Aktifkan **GitHub Pages**: Settings → Pages → pilih branch & folder `frontend` (atau root jika isi `frontend/` dipindah ke root).
5. Akses melalui URL GitHub Pages, login dengan `admin` / `admin123`.

## 6. Verifikasi Koneksi

Buka URL Web App langsung di browser (tanpa parameter). Jika muncul JSON:
```json
{"success":true,"message":"Inventori RRI Purwokerto API","data":{"app":"Sistem Inventori RRI Purwokerto","status":"running"}}
```
berarti backend sudah berjalan dengan benar.

## Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| `SyntaxError: Identifier 'X' has already been declared` | Ada deklarasi `const/let/var X` di lebih dari satu file `.gs`. Cari & hapus duplikatnya — pastikan struktur file sesuai daftar di langkah 3.2. |
| Frontend menampilkan "Gagal terhubung ke server" | Pastikan `API_BASE_URL` di `api.js` sudah benar dan deployment Web App aktif (Access: Anyone). |
| Login gagal terus walau username/password benar | Pastikan `setupDatabase` sudah dijalankan dan sheet `Users` memiliki data admin. |
| Foto/QR tidak tampil | Pastikan Folder ID di `Config.gs` benar dan file di Drive memiliki sharing "Anyone with link". |
| Notifikasi WA/Telegram tidak terkirim | Isi token Fonnte/Telegram di `Config.gs`. Tanpa token, fitur ini otomatis dilewati tanpa error. |
