/**
 * ============================================================
 * BARANG.JS
 * Master Data Barang: list, CRUD, filter, search, export, QR/Barcode
 * ============================================================
 */

let barangCache = [];
let ruanganCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('barang.html');
  populateSelectOptions();
  await loadRuanganOptions();
  await loadBarang();

  document.getElementById('searchInput').addEventListener('input', debounce(loadBarang, 400));
  document.getElementById('filterKategori').addEventListener('change', loadBarang);
  document.getElementById('filterUnitKerja').addEventListener('change', loadBarang);
  document.getElementById('filterStatus').addEventListener('change', loadBarang);
  document.getElementById('filterKondisi').addEventListener('change', loadBarang);

  document.getElementById('formBarang').addEventListener('submit', submitBarang);
  document.getElementById('btnExportExcel').addEventListener('click', () => doExport('excel'));
  document.getElementById('btnExportPdf').addEventListener('click', () => doExport('pdf'));

  document.getElementById('btnTambahBarang').addEventListener('click', () => openBarangModal(null));
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function populateSelectOptions() {
  const kategoriSelects = document.querySelectorAll('.select-kategori');
  kategoriSelects.forEach(sel => {
    KATEGORI_BARANG_LIST_JS.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      sel.appendChild(opt);
    });
  });

  const unitSelects = document.querySelectorAll('.select-unit-kerja');
  unitSelects.forEach(sel => {
    UNIT_KERJA_LIST_JS.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = u;
      sel.appendChild(opt);
    });
  });

  const kondisiSelects = document.querySelectorAll('.select-kondisi');
  kondisiSelects.forEach(sel => {
    KONDISI_BARANG_LIST_JS.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      sel.appendChild(opt);
    });
  });

  const statusSelects = document.querySelectorAll('.select-status-barang');
  statusSelects.forEach(sel => {
    STATUS_BARANG_LIST_JS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  });
}

async function loadRuanganOptions() {
  const res = await callApi('getRuanganList', {});
  if (res.success) {
    ruanganCache = res.data;
    const selects = document.querySelectorAll('.select-ruangan');
    selects.forEach(sel => {
      ruanganCache.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.NamaRuangan; opt.textContent = r.NamaRuangan;
        sel.appendChild(opt);
      });
    });
  }
}

async function loadBarang() {
  const params = {
    search: document.getElementById('searchInput').value,
    kategori: document.getElementById('filterKategori').value,
    unitKerja: document.getElementById('filterUnitKerja').value,
    status: document.getElementById('filterStatus').value,
    kondisi: document.getElementById('filterKondisi').value
  };

  showLoading();
  const res = await callApi('getBarangList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  barangCache = res.data;
  renderBarangTable(barangCache);
}

function renderBarangTable(data) {
  const tbody = document.getElementById('barangTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data barang</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(b => `
    <tr>
      <td>${b.FotoURL ? `<img src="${b.FotoURL}" class="thumb-img">` : `<div class="thumb-img d-flex align-items-center justify-content-center"><i class="bi bi-image text-muted"></i></div>`}</td>
      <td><span class="fw-semibold">${b.KodeBarang}</span><br><small class="text-muted">${b.NomorInventaris || '-'}</small></td>
      <td>${b.NamaBarang}<br><small class="text-muted">${b.Merk || ''}</small></td>
      <td>${b.Kategori}</td>
      <td>${b.UnitKerja}</td>
      <td>${b.Ruangan}</td>
      <td><span class="badge ${statusBadgeClass(b.Kondisi)}">${b.Kondisi}</span></td>
      <td><span class="badge ${statusBadgeClass(b.Status)}">${b.Status}</span></td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" title="Lihat QR/Barcode" onclick="showQRBarcode('${b.ID}')"><i class="bi bi-qr-code"></i></button>
        <button class="btn btn-sm btn-outline-primary" title="Edit" onclick="openBarangModal('${b.ID}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="confirmDeleteBarang('${b.ID}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openBarangModal(id) {
  const form = document.getElementById('formBarang');
  form.reset();
  document.getElementById('barangId').value = '';
  document.getElementById('previewFoto').classList.add('d-none');

  if (id) {
    const b = barangCache.find(x => x.ID === id);
    if (!b) return;
    document.getElementById('barangModalTitle').textContent = 'Edit Barang';
    document.getElementById('barangId').value = b.ID;
    document.getElementById('namaBarang').value = b.NamaBarang;
    document.getElementById('kategori').value = b.Kategori;
    document.getElementById('merk').value = b.Merk;
    document.getElementById('spesifikasi').value = b.Spesifikasi;
    document.getElementById('nomorInventaris').value = b.NomorInventaris;
    document.getElementById('unitKerja').value = b.UnitKerja;
    document.getElementById('ruangan').value = b.Ruangan;
    document.getElementById('kondisi').value = b.Kondisi;
    document.getElementById('status').value = b.Status;
    document.getElementById('keterangan').value = b.Keterangan;

    if (b.FotoURL) {
      const img = document.getElementById('previewFoto');
      img.src = b.FotoURL;
      img.classList.remove('d-none');
    }
  } else {
    document.getElementById('barangModalTitle').textContent = 'Tambah Barang';
  }

  new bootstrap.Modal(document.getElementById('barangModal')).show();
}

async function submitBarang(e) {
  e.preventDefault();

  const id = document.getElementById('barangId').value;
  const fotoFile = document.getElementById('fotoBarang').files[0];
  let fotoBase64 = null;
  if (fotoFile) fotoBase64 = await fileToBase64(fotoFile);

  const payload = {
    namaBarang: document.getElementById('namaBarang').value,
    kategori: document.getElementById('kategori').value,
    merk: document.getElementById('merk').value,
    spesifikasi: document.getElementById('spesifikasi').value,
    nomorInventaris: document.getElementById('nomorInventaris').value,
    unitKerja: document.getElementById('unitKerja').value,
    ruangan: document.getElementById('ruangan').value,
    kondisi: document.getElementById('kondisi').value,
    status: document.getElementById('status').value,
    keterangan: document.getElementById('keterangan').value,
    fotoBase64: fotoBase64
  };

  showLoading();
  let res;
  if (id) {
    payload.id = id;
    res = await callApi('updateBarang', payload);
  } else {
    res = await callApi('createBarang', payload);
  }
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('barangModal')).hide();
    await loadBarang();
  } else {
    showToast(res.message, 'error');
  }
}

function confirmDeleteBarang(id) {
  const b = barangCache.find(x => x.ID === id);
  if (!b) return;

  if (confirm(`Hapus barang "${b.NamaBarang}" (${b.KodeBarang})? Tindakan ini tidak dapat dibatalkan.`)) {
    deleteBarang(id);
  }
}

async function deleteBarang(id) {
  showLoading();
  const res = await callApi('deleteBarang', { id });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    await loadBarang();
  } else {
    showToast(res.message, 'error');
  }
}

function showQRBarcode(id) {
  const b = barangCache.find(x => x.ID === id);
  if (!b) return;

  document.getElementById('qrModalTitle').textContent = `QR & Barcode - ${b.NamaBarang}`;
  document.getElementById('qrModalImage').src = b.QRCodeURL || '';
  document.getElementById('barcodeModalImage').src = b.Barcode || '';
  document.getElementById('qrModalKode').textContent = b.KodeBarang;

  new bootstrap.Modal(document.getElementById('qrModal')).show();
}

async function doExport(format) {
  showLoading();
  const res = await callApi('exportData', { modul: 'Barang', format });
  hideLoading();

  if (res.success) {
    window.open(res.data.downloadUrl, '_blank');
  } else {
    showToast(res.message, 'error');
  }
}
