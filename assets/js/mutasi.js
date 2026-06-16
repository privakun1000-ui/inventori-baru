/**
 * ============================================================
 * MUTASI.JS
 * Tracking Perpindahan Barang Antar Ruangan
 * ============================================================
 */

let barangAllCache = [];
let ruanganAllCache = [];
let mutasiCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('mutasi.html');
  await loadBarangOptions();
  await loadRuanganOptions();
  await loadMutasi();

  document.getElementById('formMutasi').addEventListener('submit', submitMutasi);
  document.getElementById('btnTambahMutasi').addEventListener('click', openMutasiModal);
  document.getElementById('barangMutasi').addEventListener('change', onBarangChange);
});

async function loadBarangOptions() {
  const res = await callApi('getBarangList', {});
  if (res.success) {
    barangAllCache = res.data;
    const sel = document.getElementById('barangMutasi');
    sel.innerHTML = '<option value="">-- Pilih Barang --</option>';
    barangAllCache.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.ID;
      opt.textContent = `${b.NamaBarang} (${b.KodeBarang}) - saat ini di ${b.Ruangan}`;
      sel.appendChild(opt);
    });
  }
}

async function loadRuanganOptions() {
  const res = await callApi('getRuanganList', {});
  if (res.success) {
    ruanganAllCache = res.data;
    const sel = document.getElementById('ruanganTujuanMutasi');
    sel.innerHTML = '<option value="">-- Pilih Ruangan Tujuan --</option>';
    ruanganAllCache.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.NamaRuangan;
      opt.textContent = r.NamaRuangan;
      sel.appendChild(opt);
    });
  }
}

function onBarangChange() {
  const barangId = document.getElementById('barangMutasi').value;
  const barang = barangAllCache.find(b => b.ID === barangId);
  document.getElementById('ruanganAsalMutasi').value = barang ? barang.Ruangan : '';
}

async function loadMutasi() {
  showLoading();
  const res = await callApi('getMutasiList', {});
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  mutasiCache = res.data;
  renderMutasiTable(mutasiCache);
}

function renderMutasiTable(data) {
  const tbody = document.getElementById('mutasiTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="bi bi-inbox"></i>Belum ada riwayat mutasi barang</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${formatDateTimeID(m.Tanggal)}</td>
      <td class="fw-semibold">${m.NamaBarang}</td>
      <td><span class="badge bg-secondary">${m.DariRuangan}</span> <i class="bi bi-arrow-right"></i> <span class="badge bg-soft-navy">${m.KeRuangan}</span></td>
      <td>${m.Petugas}</td>
      <td>${m.Keterangan || '-'}</td>
    </tr>
  `).join('');
}

function openMutasiModal() {
  document.getElementById('formMutasi').reset();
  document.getElementById('ruanganAsalMutasi').value = '';
  new bootstrap.Modal(document.getElementById('mutasiModal')).show();
}

async function submitMutasi(e) {
  e.preventDefault();

  const payload = {
    barangId: document.getElementById('barangMutasi').value,
    keRuangan: document.getElementById('ruanganTujuanMutasi').value,
    keterangan: document.getElementById('keteranganMutasi').value
  };

  if (!payload.barangId || !payload.keRuangan) {
    showToast('Pilih barang dan ruangan tujuan', 'error');
    return;
  }

  showLoading();
  const res = await callApi('mutasiBarang', payload);
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('mutasiModal')).hide();
    await loadBarangOptions();
    await loadMutasi();
  } else {
    showToast(res.message, 'error');
  }
}
