/**
 * ============================================================
 * PEMINJAMAN.JS
 * Peminjaman Barang: pengajuan, approval, riwayat, BAST
 * ============================================================
 */

let peminjamanCache = [];
let barangTersediaCache = [];
let scanBarangStream = null;
let scanBarangInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('peminjaman.html');
  populateUnitKerjaOptions();
  await loadBarangTersedia();
  await loadPeminjaman();

  document.getElementById('filterStatus').addEventListener('change', loadPeminjaman);
  document.getElementById('searchInput').addEventListener('input', debounce(loadPeminjaman, 400));
  document.getElementById('formPeminjaman').addEventListener('submit', submitPeminjaman);
  document.getElementById('btnAjukanPinjam').addEventListener('click', openPeminjamanModal);
  document.getElementById('formApproval').addEventListener('submit', submitApproval);
  document.getElementById('btnScanBarangPinjam').addEventListener('click', openScanBarangModal);
  document.getElementById('btnManualScanBarang').addEventListener('click', () => {
    const val = document.getElementById('manualScanBarangInput').value.trim();
    if (val) processScanBarangContent(val);
  });
  document.getElementById('scanBarangModal').addEventListener('hidden.bs.modal', stopScanBarangCamera);
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function populateUnitKerjaOptions() {
  const sel = document.getElementById('unitKerjaPinjam');
  UNIT_KERJA_LIST_JS.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u; opt.textContent = u;
    sel.appendChild(opt);
  });
}

async function loadBarangTersedia() {
  const res = await callApi('getBarangList', { status: 'Tersedia' });
  if (res.success) {
    barangTersediaCache = res.data;
    const sel = document.getElementById('barangPinjam');
    sel.innerHTML = '<option value="">-- Pilih Barang --</option>';
    barangTersediaCache.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.ID;
      opt.textContent = `${b.NamaBarang} (${b.KodeBarang}) - ${b.Ruangan}`;
      sel.appendChild(opt);
    });
  }
}

async function loadPeminjaman() {
  const params = {
    status: document.getElementById('filterStatus').value,
    search: document.getElementById('searchInput').value
  };

  showLoading();
  const res = await callApi('getPeminjamanList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  peminjamanCache = res.data;
  renderPeminjamanTable(peminjamanCache);
}

function renderPeminjamanTable(data) {
  const tbody = document.getElementById('peminjamanTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data peminjaman</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="fw-semibold">${p.NomorTransaksi}</td>
      <td>${p.Peminjam}<br><small class="text-muted">${p.UnitKerja}</small></td>
      <td>${p.NamaBarang}</td>
      <td>${formatDateID(p.TanggalPinjam)}<br><small class="text-muted">${p.JamMulai}-${p.JamSelesai}</small></td>
      <td>${p.Keperluan || '-'}</td>
      <td><span class="badge ${statusBadgeClass(p.Status)}">${p.Status}</span></td>
      <td>${p.QRCodeURL ? `<img src="${p.QRCodeURL}" class="thumb-img" style="cursor:pointer" onclick="showQRPeminjaman('${p.ID}')">` : '-'}</td>
      <td class="text-nowrap">
        ${isAdmin() && p.Status === 'Pending' ? `<button class="btn btn-sm btn-rri-primary" onclick="openApprovalModal('${p.ID}')"><i class="bi bi-check2-square"></i> Proses</button>` : ''}
        ${isAdmin() && (p.Status === 'Dipinjam' || p.Status === 'Dikembalikan') ? `<button class="btn btn-sm btn-outline-secondary" onclick="generateBASTFor('${p.ID}')"><i class="bi bi-file-earmark-text"></i> BAST</button>` : ''}
        <button class="btn btn-sm btn-outline-info" onclick="showDetailPeminjaman('${p.ID}')"><i class="bi bi-eye"></i></button>
      </td>
    </tr>
  `).join('');
}

function openPeminjamanModal() {
  document.getElementById('formPeminjaman').reset();
  document.getElementById('previewFotoPinjam').classList.add('d-none');
  document.getElementById('barangPinjamScanInfo').innerHTML = '';

  const user = getCurrentUser();
  if (user) {
    document.getElementById('peminjamNama').value = user.nama;
    document.getElementById('unitKerjaPinjam').value = user.unitKerja;
  }

  new bootstrap.Modal(document.getElementById('peminjamanModal')).show();
}

async function submitPeminjaman(e) {
  e.preventDefault();

  const fotoFile = document.getElementById('fotoSebelumPinjam').files[0];
  let fotoBase64 = null;
  if (fotoFile) fotoBase64 = await fileToBase64(fotoFile);

  const payload = {
    peminjam: document.getElementById('peminjamNama').value,
    unitKerja: document.getElementById('unitKerjaPinjam').value,
    barangId: document.getElementById('barangPinjam').value,
    tanggalPinjam: document.getElementById('tanggalPinjam').value,
    jamMulai: document.getElementById('jamMulaiPinjam').value,
    jamSelesai: document.getElementById('jamSelesaiPinjam').value,
    keperluan: document.getElementById('keperluanPinjam').value,
    fotoBase64: fotoBase64
  };

  showLoading();
  const res = await callApi('createPeminjaman', payload);
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('peminjamanModal')).hide();
    await loadBarangTersedia();
    await loadPeminjaman();
  } else {
    showToast(res.message, 'error');
  }
}

function openApprovalModal(id) {
  const p = peminjamanCache.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('approvalPeminjamanId').value = p.ID;
  document.getElementById('approvalDetailText').innerHTML = `
    <strong>${p.NamaBarang}</strong><br>
    Peminjam: ${p.Peminjam} (${p.UnitKerja})<br>
    Tanggal: ${formatDateID(p.TanggalPinjam)} (${p.JamMulai}-${p.JamSelesai})<br>
    Keperluan: ${p.Keperluan || '-'}
  `;
  document.getElementById('catatanApproval').value = '';

  new bootstrap.Modal(document.getElementById('approvalModal')).show();
}

async function submitApproval(e) {
  e.preventDefault();
  const id = document.getElementById('approvalPeminjamanId').value;
  const decision = e.submitter.dataset.action;
  const catatan = document.getElementById('catatanApproval').value;

  showLoading();
  const res = await callApi('approvePeminjaman', { id, decision, catatan });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('approvalModal')).hide();
    await loadBarangTersedia();
    await loadPeminjaman();
  } else {
    showToast(res.message, 'error');
  }
}

function showQRPeminjaman(id) {
  const p = peminjamanCache.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('qrModalTitle').textContent = `QR Transaksi - ${p.NomorTransaksi}`;
  document.getElementById('qrModalImage').src = p.QRCodeURL || '';
  document.getElementById('barcodeModalImage').src = p.BarcodeURL || '';

  new bootstrap.Modal(document.getElementById('qrModal')).show();
}

function showDetailPeminjaman(id) {
  const p = peminjamanCache.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('detailModalBody').innerHTML = `
    <table class="table table-sm">
      <tr><td class="fw-semibold" style="width:160px">No. Transaksi</td><td>${p.NomorTransaksi}</td></tr>
      <tr><td class="fw-semibold">Peminjam</td><td>${p.Peminjam}</td></tr>
      <tr><td class="fw-semibold">Unit Kerja</td><td>${p.UnitKerja}</td></tr>
      <tr><td class="fw-semibold">Barang</td><td>${p.NamaBarang}</td></tr>
      <tr><td class="fw-semibold">Tanggal Pinjam</td><td>${formatDateID(p.TanggalPinjam)}</td></tr>
      <tr><td class="fw-semibold">Jam</td><td>${p.JamMulai} - ${p.JamSelesai}</td></tr>
      <tr><td class="fw-semibold">Keperluan</td><td>${p.Keperluan || '-'}</td></tr>
      <tr><td class="fw-semibold">Status</td><td><span class="badge ${statusBadgeClass(p.Status)}">${p.Status}</span></td></tr>
      <tr><td class="fw-semibold">Disetujui Oleh</td><td>${p.DisetujuiOleh || '-'}</td></tr>
      <tr><td class="fw-semibold">Catatan Approval</td><td>${p.CatatanApproval || '-'}</td></tr>
      ${p.FotoSebelumURL ? `<tr><td class="fw-semibold">Foto Sebelum</td><td><img src="${p.FotoSebelumURL}" class="qr-preview" style="width:120px;height:120px;"></td></tr>` : ''}
    </table>
  `;
  new bootstrap.Modal(document.getElementById('detailModal')).show();
}

async function generateBASTFor(id) {
  showLoading();
  const res = await callApi('generateBAST', { peminjamanId: id });
  hideLoading();

  if (res.success) {
    showToast('BAST berhasil dibuat', 'success');
    window.open(res.data.pdfUrl, '_blank');
  } else {
    showToast(res.message, 'error');
  }
}

/* ===== Scan Barcode/QR untuk auto-isi field Barang ===== */
async function openScanBarangModal() {
  document.getElementById('scanBarangCameraError').classList.add('d-none');
  document.getElementById('scanBarangNotSupported').classList.add('d-none');
  document.getElementById('manualScanBarangInput').value = '';
  new bootstrap.Modal(document.getElementById('scanBarangModal')).show();

  try {
    scanBarangStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('scanBarangPreview');
    video.srcObject = scanBarangStream;
    video.play();

    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128'] });
      scanBarangInterval = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            await processScanBarangContent(codes[0].rawValue);
          }
        } catch (e) { /* ignore */ }
      }, 800);
    } else {
      document.getElementById('scanBarangNotSupported').classList.remove('d-none');
    }
  } catch (e) {
    document.getElementById('scanBarangCameraError').classList.remove('d-none');
  }
}

function stopScanBarangCamera() {
  if (scanBarangInterval) clearInterval(scanBarangInterval);
  scanBarangInterval = null;
  if (scanBarangStream) {
    scanBarangStream.getTracks().forEach(t => t.stop());
    scanBarangStream = null;
  }
}

async function processScanBarangContent(rawValue) {
  // Coba parse sebagai JSON (hasil QR Code internal aplikasi: { type:'barang', id, kode })
  let barangId = null;
  let kodeBarang = null;
  try {
    const parsed = JSON.parse(rawValue);
    if (parsed.type === 'barang') {
      barangId = parsed.id;
      kodeBarang = parsed.kode;
    }
  } catch (e) {
    // Bukan JSON: kemungkinan hasil scan Barcode (Code128) berisi Kode Barang langsung
    kodeBarang = rawValue.trim();
  }

  let barang = null;
  if (barangId) {
    barang = barangTersediaCache.find(b => b.ID === barangId);
  }
  if (!barang && kodeBarang) {
    barang = barangTersediaCache.find(b => b.KodeBarang === kodeBarang);
  }

  if (!barang) {
    showToast('Barang tidak ditemukan atau sedang tidak tersedia untuk dipinjam', 'error');
    return;
  }

  stopScanBarangCamera();
  bootstrap.Modal.getInstance(document.getElementById('scanBarangModal'))?.hide();

  document.getElementById('barangPinjam').value = barang.ID;
  document.getElementById('barangPinjamScanInfo').innerHTML = `<i class="bi bi-check-circle text-success"></i> Terdeteksi: ${barang.NamaBarang} (${barang.KodeBarang})`;
  showToast('Barang berhasil terdeteksi: ' + barang.NamaBarang, 'success');
}
