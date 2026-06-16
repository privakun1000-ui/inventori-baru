/**
 * ============================================================
 * RUANGAN.JS
 * Master Data Ruangan: CRUD + Jadwal Kalender
 * ============================================================
 */

let ruanganListCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('ruangan.html');
  await loadRuangan();

  document.getElementById('searchInput').addEventListener('input', debounce(loadRuangan, 400));
  document.getElementById('filterStatus').addEventListener('change', loadRuangan);
  document.getElementById('formRuangan').addEventListener('submit', submitRuangan);
  document.getElementById('btnTambahRuangan').addEventListener('click', () => openRuanganModal(null));
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function loadRuangan() {
  const params = {
    search: document.getElementById('searchInput').value,
    status: document.getElementById('filterStatus').value
  };

  showLoading();
  const res = await callApi('getRuanganList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  ruanganListCache = res.data;
  renderRuanganTable(ruanganListCache);
}

function renderRuanganTable(data) {
  const tbody = document.getElementById('ruanganTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data ruangan</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.FotoURL ? `<img src="${r.FotoURL}" class="thumb-img">` : `<div class="thumb-img d-flex align-items-center justify-content-center"><i class="bi bi-image text-muted"></i></div>`}</td>
      <td class="fw-semibold">${r.KodeRuangan}</td>
      <td>${r.NamaRuangan}</td>
      <td>${r.Lokasi || '-'}</td>
      <td>${r.Kapasitas || '-'}</td>
      <td><span class="badge ${statusBadgeClass(r.Status)}">${r.Status}</span></td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" title="QR Ruangan" onclick="showQRRuangan('${r.ID}')"><i class="bi bi-qr-code"></i></button>
        <button class="btn btn-sm btn-outline-info" title="Jadwal" onclick="showJadwalRuangan('${r.ID}')"><i class="bi bi-calendar3"></i></button>
        <button class="btn btn-sm btn-outline-primary" title="Edit" onclick="openRuanganModal('${r.ID}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="confirmDeleteRuangan('${r.ID}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openRuanganModal(id) {
  const form = document.getElementById('formRuangan');
  form.reset();
  document.getElementById('ruanganId').value = '';
  document.getElementById('previewFotoRuangan').classList.add('d-none');

  if (id) {
    const r = ruanganListCache.find(x => x.ID === id);
    if (!r) return;
    document.getElementById('ruanganModalTitle').textContent = 'Edit Ruangan';
    document.getElementById('ruanganId').value = r.ID;
    document.getElementById('namaRuangan').value = r.NamaRuangan;
    document.getElementById('lokasi').value = r.Lokasi;
    document.getElementById('kapasitas').value = r.Kapasitas;
    document.getElementById('fasilitas').value = r.Fasilitas;
    document.getElementById('statusRuangan').value = r.Status;

    if (r.FotoURL) {
      const img = document.getElementById('previewFotoRuangan');
      img.src = r.FotoURL;
      img.classList.remove('d-none');
    }
  } else {
    document.getElementById('ruanganModalTitle').textContent = 'Tambah Ruangan';
  }

  new bootstrap.Modal(document.getElementById('ruanganModal')).show();
}

async function submitRuangan(e) {
  e.preventDefault();

  const id = document.getElementById('ruanganId').value;
  const fotoFile = document.getElementById('fotoRuangan').files[0];
  let fotoBase64 = null;
  if (fotoFile) fotoBase64 = await fileToBase64(fotoFile);

  const payload = {
    namaRuangan: document.getElementById('namaRuangan').value,
    lokasi: document.getElementById('lokasi').value,
    kapasitas: document.getElementById('kapasitas').value,
    fasilitas: document.getElementById('fasilitas').value,
    status: document.getElementById('statusRuangan').value,
    fotoBase64: fotoBase64
  };

  showLoading();
  let res;
  if (id) {
    payload.id = id;
    res = await callApi('updateRuangan', payload);
  } else {
    res = await callApi('createRuangan', payload);
  }
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('ruanganModal')).hide();
    await loadRuangan();
  } else {
    showToast(res.message, 'error');
  }
}

function confirmDeleteRuangan(id) {
  const r = ruanganListCache.find(x => x.ID === id);
  if (!r) return;
  if (confirm(`Hapus ruangan "${r.NamaRuangan}" (${r.KodeRuangan})?`)) {
    deleteRuangan(id);
  }
}

async function deleteRuangan(id) {
  showLoading();
  const res = await callApi('deleteRuangan', { id });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    await loadRuangan();
  } else {
    showToast(res.message, 'error');
  }
}

function showQRRuangan(id) {
  const r = ruanganListCache.find(x => x.ID === id);
  if (!r) return;

  document.getElementById('qrModalTitle').textContent = `QR Ruangan - ${r.NamaRuangan}`;
  document.getElementById('qrModalImage').src = r.QRCodeURL || '';
  document.getElementById('qrModalKode').textContent = r.KodeRuangan;

  new bootstrap.Modal(document.getElementById('qrModal')).show();
}

async function showJadwalRuangan(id) {
  const r = ruanganListCache.find(x => x.ID === id);
  if (!r) return;

  showLoading();
  const res = await callApi('getJadwalRuangan', { ruanganId: id });
  hideLoading();

  document.getElementById('jadwalModalTitle').textContent = `Jadwal Penggunaan - ${r.NamaRuangan}`;
  const container = document.getElementById('jadwalModalBody');

  if (!res.success || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i>Belum ada jadwal penggunaan</div>`;
  } else {
    const sorted = res.data.sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));
    container.innerHTML = `
      <div class="list-group list-group-flush">
        ${sorted.map(j => `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold">${formatDateID(j.Tanggal)} · ${j.JamMulai}-${j.JamSelesai}</div>
              <small class="text-muted">${j.Kegiatan} · ${j.UnitKerja} · PIC: ${j.PIC}</small>
            </div>
            <span class="badge ${statusBadgeClass(j.Status)}">${j.Status}</span>
          </div>
        `).join('')}
      </div>`;
  }

  new bootstrap.Modal(document.getElementById('jadwalModal')).show();
}
