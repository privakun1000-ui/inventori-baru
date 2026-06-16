/**
 * ============================================================
 * COMMON.JS
 * Render sidebar, topbar, dan helper umum untuk semua halaman
 * (kecuali login)
 * ============================================================
 */

// Daftar konstanta (fallback default, akan disinkronkan dari backend via loadConstants())
let UNIT_KERJA_LIST_JS = ['Program 1', 'Program 2', 'Programa 4', 'Teknik', 'Tata Usaha', 'Pemberitaan', 'LPU'];
let KATEGORI_BARANG_LIST_JS = ['Elektronik', 'Furniture', 'Peralatan Studio', 'Peralatan Kantor', 'Kendaraan', 'Alat Komunikasi', 'Lainnya'];
let KONDISI_BARANG_LIST_JS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
let STATUS_BARANG_LIST_JS = ['Tersedia', 'Dipinjam', 'Maintenance', 'Rusak'];

/**
 * Ambil konstanta terbaru dari backend (dipanggil sekali saat layout dirender)
 */
async function loadConstants() {
  try {
    const res = await callApi('getConstants');
    if (res.success && res.data) {
      UNIT_KERJA_LIST_JS = res.data.unitKerja || UNIT_KERJA_LIST_JS;
      KATEGORI_BARANG_LIST_JS = res.data.kategoriBarang || KATEGORI_BARANG_LIST_JS;
      KONDISI_BARANG_LIST_JS = res.data.kondisiBarang || KONDISI_BARANG_LIST_JS;
      STATUS_BARANG_LIST_JS = res.data.statusBarang || STATUS_BARANG_LIST_JS;
    }
  } catch (e) {
    console.warn('Gagal memuat konstanta dari backend, menggunakan default.', e);
  }
}


const MENU_ITEMS = [
  { section: 'Utama', items: [
    { href: 'dashboard.html', icon: 'bi-speedometer2', label: 'Dashboard' }
  ]},
  { section: 'Master Data', items: [
    { href: 'barang.html', icon: 'bi-box-seam', label: 'Data Barang' },
    { href: 'ruangan.html', icon: 'bi-door-open', label: 'Data Ruangan' },
    { href: 'pengguna.html', icon: 'bi-people', label: 'Pengguna' }
  ]},
  { section: 'Transaksi', items: [
    { href: 'peminjaman.html', icon: 'bi-box-arrow-right', label: 'Peminjaman Barang' },
    { href: 'pemakaian-ruangan.html', icon: 'bi-calendar-check', label: 'Pemakaian Ruangan' },
    { href: 'pengembalian.html', icon: 'bi-box-arrow-in-left', label: 'Pengembalian' },
    { href: 'mutasi.html', icon: 'bi-arrow-left-right', label: 'Mutasi Barang' }
  ]},
  { section: 'Laporan', items: [
    { href: 'audit-trail.html', icon: 'bi-journal-text', label: 'Audit Trail' }
  ]},
  { section: 'Akun', items: [
    { href: 'ganti-password.html', icon: 'bi-key', label: 'Ganti Password' }
  ]}
];

async function renderLayout(activePage) {
  requireLogin();
  const user = getCurrentUser();
  await loadConstants();

  const sidebarHtml = `
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <aside class="app-sidebar" id="appSidebar">
      <div class="sidebar-header">
        <div class="title">RRI Purwokerto</div>
        <div class="subtitle">Sistem Inventori Aset</div>
      </div>
      <nav class="nav flex-column flex-grow-1 py-2" style="overflow-y:auto;">
        ${MENU_ITEMS.map(group => `
          <div class="nav-section-title">${group.section}</div>
          ${group.items.map(item => `
            <a href="${item.href}" class="nav-link ${activePage === item.href ? 'active' : ''}">
              <i class="bi ${item.icon}"></i> ${item.label}
            </a>
          `).join('')}
        `).join('')}
        <div class="px-3 pt-3 pb-2">
          <button class="btn btn-rri-accent w-100 btn-sm" onclick="doLogout()">
            <i class="bi bi-box-arrow-left"></i> Logout
          </button>
        </div>
      </nav>
    </aside>
  `;

  const topbarHtml = `
    <header class="app-topbar">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary sidebar-toggle-btn" id="sidebarToggleBtn">
          <i class="bi bi-list"></i>
        </button>
        <h5 class="mb-0 fw-bold text-navy" style="color:#0b3d6e">${getPageTitle(activePage)}</h5>
      </div>
      <div class="d-flex align-items-center gap-2">
        <div class="text-end d-none d-sm-block">
          <div class="fw-semibold" style="font-size:0.9rem">${user ? user.nama : ''}</div>
          <div class="text-muted" style="font-size:0.75rem">${user ? user.unitKerja + ' · ' + user.role : ''}</div>
        </div>
        <div class="rounded-circle bg-soft-navy d-flex align-items-center justify-content-center" style="width:38px;height:38px;">
          <i class="bi bi-person-fill"></i>
        </div>
      </div>
    </header>
  `;

  document.getElementById('sidebarContainer').innerHTML = sidebarHtml;
  document.getElementById('topbarContainer').innerHTML = topbarHtml;

  document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
    document.getElementById('appSidebar').classList.toggle('show');
    document.getElementById('sidebarBackdrop').classList.toggle('show');
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    document.getElementById('appSidebar').classList.remove('show');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  });
}

function getPageTitle(page) {
  for (const group of MENU_ITEMS) {
    for (const item of group.items) {
      if (item.href === page) return item.label;
    }
  }
  return 'Sistem Inventori RRI Purwokerto';
}

async function doLogout() {
  showLoading();
  await callApi('logout');
  hideLoading();
  clearSession();
  window.location.href = 'index.html';
}

/* ===== Helper Badge Status ===== */
function statusBadgeClass(status) {
  const map = {
    'Pending': 'bg-warning text-dark',
    'Disetujui': 'bg-success',
    'Dipinjam': 'bg-primary',
    'Ditolak': 'bg-danger',
    'Dikembalikan': 'bg-secondary',
    'Selesai': 'bg-secondary',
    'Tersedia': 'bg-success',
    'Maintenance': 'bg-warning text-dark',
    'Rusak': 'bg-danger',
    'Baik': 'bg-success',
    'Rusak Ringan': 'bg-warning text-dark',
    'Rusak Berat': 'bg-danger',
    'Menunggu Verifikasi': 'bg-warning text-dark',
    'Terverifikasi': 'bg-success',
    'Aktif': 'bg-success',
    'Nonaktif': 'bg-secondary'
  };
  return map[status] || 'bg-secondary';
}

function formatDateID(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function formatDateTimeID(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}
