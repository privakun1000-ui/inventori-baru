/**
 * ============================================================
 * PENGEMBALIAN.JS
 * Pengembalian Barang: scan QR (kamera), upload foto, verifikasi
 * ============================================================
 */

let pengembalianCache = [];
let scannedPeminjaman = null;
let qrStream = null;
let scanInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('pengembalian.html');
  await loadPengembalian();

  document.getElementById('filterStatus').addEventListener('change', loadPengembalian);
  document.getElementById('btnScanQR').addEventListener('click', openScanModal);
  document.getElementById('formPengembalian').addEventListener('submit', submitPengembalian);
  document.getElementById('formVerifikasi').addEventListener('submit', submitVerifikasi);
  document.getElementById('qrModal2Close')?.addEventListener('click', stopScanner);

  const scanModalEl = document.getElementById('scanModal');
  scanModalEl.addEventListener('hidden.bs.modal', stopScanner);
});

async function loadPengembalian() {
  const params = { statusVerifikasi: document.getElementById('filterStatus').value };

  showLoading();
  const res = await callApi('getPengembalianList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  pengembalianCache = res.data;
  renderPengembalianTable(pengembalianCache);
}

function renderPengembalianTable(data) {
  const tbody = document.getElementById('pengembalianTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data pengembalian</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="fw-semibold">${p.NomorTransaksi}</td>
      <td>${formatDateTimeID(p.TanggalKembali)}</td>
      <td>${p.FotoSetelahURL ? `<img src="${p.FotoSetelahURL}" class="thumb-img">` : '-'}</td>
      <td><span class="badge ${statusBadgeClass(p.KondisiBarang)}">${p.KondisiBarang}</span></td>
      <td>${p.CatatanKerusakan || '-'}</td>
      <td><span class="badge ${statusBadgeClass(p.StatusVerifikasi)}">${p.StatusVerifikasi}</span></td>
      <td class="text-nowrap">
        ${isAdmin() && p.StatusVerifikasi === 'Menunggu Verifikasi' ? `<button class="btn btn-sm btn-rri-primary" onclick="openVerifikasiModal('${p.ID}')"><i class="bi bi-check2-square"></i> Verifikasi</button>` : '-'}
      </td>
    </tr>
  `).join('');
}

/* ===== Scan QR via kamera ===== */
async function openScanModal() {
  document.getElementById('cameraError').classList.add('d-none');
  document.getElementById('scanNotSupported').classList.add('d-none');
  document.getElementById('manualQrInput').value = '';
  new bootstrap.Modal(document.getElementById('scanModal')).show();

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('qrScanPreview');
    video.srcObject = qrStream;
    video.play();

    // Gunakan BarcodeDetector jika didukung browser
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      scanInterval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            await processQRContent(barcodes[0].rawValue);
          }
        } catch (e) { /* ignore */ }
      }, 800);
    } else {
      document.getElementById('scanNotSupported').classList.remove('d-none');
    }
  } catch (e) {
    document.getElementById('cameraError').classList.remove('d-none');
  }
}

function stopScanner() {
  if (scanInterval) clearInterval(scanInterval);
  scanInterval = null;
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnManualScan')?.addEventListener('click', () => {
    const val = document.getElementById('manualQrInput').value.trim();
    if (val) processQRContent(val);
  });
});

async function processQRContent(qrContent) {
  showLoading();
  const res = await callApi('scanQRPengembalian', { qrContent });
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  stopScanner();
  scannedPeminjaman = res.data;
  bootstrap.Modal.getInstance(document.getElementById('scanModal'))?.hide();
  openPengembalianModal();
}

function openPengembalianModal() {
  if (!scannedPeminjaman) return;

  document.getElementById('formPengembalian').reset();
  document.getElementById('previewFotoPengembalian').classList.add('d-none');
  document.getElementById('infoPeminjamanText').innerHTML = `
    <strong>${scannedPeminjaman.NamaBarang}</strong><br>
    No. Transaksi: ${scannedPeminjaman.NomorTransaksi}<br>
    Peminjam: ${scannedPeminjaman.Peminjam} (${scannedPeminjaman.UnitKerja})
  `;

  new bootstrap.Modal(document.getElementById('pengembalianModal')).show();
}

async function submitPengembalian(e) {
  e.preventDefault();

  const fotoFile = document.getElementById('fotoPengembalian').files[0];
  let fotoBase64 = null;
  if (fotoFile) fotoBase64 = await fileToBase64(fotoFile);

  const payload = {
    peminjamanId: scannedPeminjaman.ID,
    fotoBase64: fotoBase64,
    kondisiBarang: document.getElementById('kondisiPengembalian').value,
    catatanKerusakan: document.getElementById('catatanKerusakan').value
  };

  showLoading();
  const res = await callApi('createPengembalian', payload);
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('pengembalianModal')).hide();
    scannedPeminjaman = null;
    await loadPengembalian();
  } else {
    showToast(res.message, 'error');
  }
}

function openVerifikasiModal(id) {
  const p = pengembalianCache.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('verifikasiId').value = p.ID;
  document.getElementById('kondisiAkhirVerifikasi').value = p.KondisiBarang;
  document.getElementById('verifikasiDetail').innerHTML = `
    No. Transaksi: ${p.NomorTransaksi}<br>
    Tanggal Kembali: ${formatDateTimeID(p.TanggalKembali)}<br>
    Kondisi dilaporkan: <span class="badge ${statusBadgeClass(p.KondisiBarang)}">${p.KondisiBarang}</span><br>
    ${p.CatatanKerusakan ? 'Catatan: ' + p.CatatanKerusakan : ''}
    ${p.FotoSetelahURL ? `<br><img src="${p.FotoSetelahURL}" class="qr-preview mt-2" style="width:120px;height:120px;">` : ''}
  `;

  new bootstrap.Modal(document.getElementById('verifikasiModal')).show();
}

async function submitVerifikasi(e) {
  e.preventDefault();
  const id = document.getElementById('verifikasiId').value;
  const kondisiAkhir = document.getElementById('kondisiAkhirVerifikasi').value;

  showLoading();
  const res = await callApi('verifikasiPengembalian', { id, kondisiAkhir });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('verifikasiModal')).hide();
    await loadPengembalian();
  } else {
    showToast(res.message, 'error');
  }
}
