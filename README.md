# Sistem Inventori Barang & Ruangan RRI Purwokerto

## Struktur Proyek

```
rri-inventory/
├── backend/                    # Google Apps Script (deploy sebagai Web App)
│   ├── Code.gs                 # Entry point (doGet, doPost, routing)
│   ├── Config.gs               # Konfigurasi (Spreadsheet ID, Folder Drive, API Keys)
│   ├── Auth.gs                 # Login, logout, ganti password, session
│   ├── Dashboard.gs            # Statistik dashboard
│   ├── BarangService.gs        # CRUD Master Barang + QR/Barcode
│   ├── RuanganService.gs       # CRUD Master Ruangan + jadwal
│   ├── PenggunaService.gs      # CRUD Pengguna
│   ├── PeminjamanService.gs    # Peminjaman barang + approval
│   ├── PemakaianRuanganService.gs # Pemakaian ruangan + cek bentrok
│   ├── PengembalianService.gs  # Pengembalian + verifikasi
│   ├── MutasiService.gs        # Tracking perpindahan barang
│   ├── BASTService.gs          # Generate PDF Berita Acara
│   ├── AuditService.gs         # Audit trail
│   ├── NotificationService.gs  # WhatsApp (Fonnte), Email, Telegram
│   ├── ReminderService.gs      # Trigger harian reminder
│   ├── ExportService.gs        # Export Excel & PDF
│   └── Utils.gs                # Helper functions
│
├── frontend/                    # Static site (GitHub Pages)
│   ├── index.html               # Login page
│   ├── dashboard.html
│   ├── barang.html
│   ├── ruangan.html
│   ├── pengguna.html
│   ├── peminjaman.html
│   ├── pemakaian-ruangan.html
│   ├── pengembalian.html
│   ├── mutasi.html
│   ├── audit-trail.html
│   ├── ganti-password.html
│   └── assets/
│       ├── css/style.css
│       └── js/
│           ├── api.js           # Wrapper fetch ke Apps Script Web App
│           ├── auth.js
│           ├── dashboard.js
│           ├── barang.js
│           ├── ruangan.js
│           ├── pengguna.js
│           ├── peminjaman.js
│           ├── pemakaian-ruangan.js
│           ├── pengembalian.js
│           ├── mutasi.js
│           ├── audit.js
│           └── common.js        # Navbar, sidebar, session guard
│
└── SETUP.md                      # Panduan instalasi lengkap
```

## Cara Kerja

1. **Backend** di-deploy sebagai **Google Apps Script Web App** (Execute as: Me, Access: Anyone),
   menghasilkan URL endpoint `https://script.google.com/macros/s/XXXX/exec`.
2. Semua file `.gs` digabung menjadi 1 project Apps Script (multi-file diperbolehkan, akan dibundle otomatis oleh Apps Script).
3. **Frontend** adalah static HTML/CSS/JS yang di-hosting di **GitHub Pages**, memanggil backend via `fetch()` (JSONP-free, menggunakan `doPost`/`doGet` dengan parameter `action`).
4. **Spreadsheet** sebagai database, dengan sheet-sheet: `Users`, `Barang`, `Ruangan`, `Peminjaman`, `PemakaianRuangan`, `Pengembalian`, `Mutasi`, `AuditTrail`, `Settings`.
5. **Google Drive** sebagai penyimpanan foto & PDF BAST.

Lihat **SETUP.md** untuk langkah instalasi lengkap.
