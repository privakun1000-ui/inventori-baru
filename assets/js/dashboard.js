/**
 * ============================================================
 * DASHBOARD.JS
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('dashboard.html');
  await loadDashboard();
});

async function loadDashboard() {
  showLoading();
  const res = await callApi('getDashboardData');
  hideLoading();

  if (!res.success) {
    showToast(res.message || 'Gagal memuat dashboard', 'error');
    return;
  }

  const d = res.data;

  document.getElementById('statTotalBarang').textContent = d.totalBarang;
  document.getElementById('statTotalRuangan').textContent = d.totalRuangan;
  document.getElementById('statPeminjamanAktif').textContent = d.totalPeminjamanAktif;
  document.getElementById('statPengembalianHariIni').textContent = d.totalPengembalianHariIni;
  document.getElementById('statBarangRusak').textContent = d.totalBarangRusak;
  document.getElementById('statBarangDipinjam').textContent = d.totalBarangDipinjam;

  // Approval pending badge
  const badge = document.getElementById('approvalPendingBadge');
  const badgeText = badge.querySelector('span');
  if (d.totalApprovalPending > 0) {
    badgeText.textContent = d.totalApprovalPending + ' menunggu approval';
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }

  renderApprovalList(d.detailApprovalPending);
  renderJadwalHariIni(d.jadwalHariIni);
  renderChartPeminjaman(d.grafikPeminjaman);
  renderChartKondisi(d.grafikKondisi);
}

function renderApprovalList(detail) {
  const container = document.getElementById('approvalPendingList');
  const items = [];

  (detail.peminjaman || []).forEach(p => {
    items.push(`
      <a href="peminjaman.html" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">Peminjaman: ${p.NamaBarang}</div>
          <small class="text-muted">${p.Peminjam} · ${p.UnitKerja} · ${p.NomorTransaksi}</small>
        </div>
        <span class="badge bg-warning text-dark">Pending</span>
      </a>
    `);
  });

  (detail.pemakaianRuangan || []).forEach(p => {
    items.push(`
      <a href="pemakaian-ruangan.html" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">Pemakaian Ruangan: ${p.NamaRuangan}</div>
          <small class="text-muted">${p.PIC} · ${p.UnitKerja} · ${p.Tanggal} (${p.JamMulai}-${p.JamSelesai})</small>
        </div>
        <span class="badge bg-warning text-dark">Pending</span>
      </a>
    `);
  });

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="bi bi-check2-circle"></i>Tidak ada approval yang menunggu</div>`;
  } else {
    container.innerHTML = items.join('');
  }
}

function renderJadwalHariIni(jadwal) {
  const container = document.getElementById('jadwalHariIniList');
  if (!jadwal || jadwal.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i>Tidak ada jadwal penggunaan ruangan hari ini</div>`;
    return;
  }

  container.innerHTML = jadwal.map(j => `
    <div class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold">${j.NamaRuangan}</div>
        <small class="text-muted">${j.Kegiatan} · ${j.UnitKerja} · PIC: ${j.PIC}</small>
      </div>
      <div class="text-end">
        <div class="fw-semibold">${j.JamMulai} - ${j.JamSelesai}</div>
        <span class="badge ${statusBadgeClass(j.Status)}">${j.Status}</span>
      </div>
    </div>
  `).join('');
}

let chartPeminjamanInstance = null;
function renderChartPeminjaman(data) {
  const ctx = document.getElementById('chartPeminjaman');
  if (chartPeminjamanInstance) chartPeminjamanInstance.destroy();

  chartPeminjamanInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatDateID(d.tanggal)),
      datasets: [{
        label: 'Jumlah Peminjaman',
        data: data.map(d => d.jumlah),
        borderColor: '#0b3d6e',
        backgroundColor: 'rgba(11,61,110,0.1)',
        tension: 0.35,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

let chartKondisiInstance = null;
function renderChartKondisi(data) {
  const ctx = document.getElementById('chartKondisi');
  if (chartKondisiInstance) chartKondisiInstance.destroy();

  chartKondisiInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.kondisi),
      datasets: [{
        data: data.map(d => d.jumlah),
        backgroundColor: ['#198754', '#fd7e14', '#c8102e']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}
