/**
 * ============================================================
 * PEMAKAIAN-RUANGAN.JS
 * Pemakaian Ruangan: pengajuan, cek bentrok, approval, kalender
 * ============================================================
 */

let pemakaianCache = [];
let ruanganOptionsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('pemakaian-ruangan.html');
  populateUnitKerjaOptions();
  await loadRuanganOptions();
  await loadPemakaian();

  document.getElementById('filterStatus').addEventListener('change', loadPemakaian);
  document.getElementById('formPemakaian').addEventListener('submit', submitPemakaian);
  document.getElementById('btnAjukanPemakaian').addEventListener('click', openPemakaianModal);
  document.getElementById('formApproval').addEventListener('submit', submitApproval);
  document.getElementById('ruanganPemakaian').addEventListener('change', onRuanganChange);
});

function populateUnitKerjaOptions() {
  const sel = document.getElementById('unitKerjaPemakaian');
  UNIT_KERJA_LIST_JS.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u; opt.textContent = u;
    sel.appendChild(opt);
  });
}

async function loadRuanganOptions() {
  const res = await callApi('getRuanganList', {});
  if (res.success) {
    ruanganOptionsCache = res.data;
    const sel = document.getElementById('ruanganPemakaian');
    sel.innerHTML = '<option value="">-- Pilih Ruangan --</option>';
    ruanganOptionsCache.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.ID;
      opt.dataset.nama = r.NamaRuangan;
      opt.textContent = `${r.NamaRuangan} (Kapasitas: ${r.Kapasitas || '-'})`;
      sel.appendChild(opt);
    });
  }
}

async function loadPemakaian() {
  const params = { status: document.getElementById('filterStatus').value };

  showLoading();
  const res = await callApi('getPemakaianRuanganList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  pemakaianCache = res.data;
  renderPemakaianTable(pemakaianCache);
}

function renderPemakaianTable(data) {
  const tbody = document.getElementById('pemakaianTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data pemakaian ruangan</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="fw-semibold">${p.NomorTransaksi}</td>
      <td>${p.NamaRuangan}</td>
      <td>${formatDateID(p.Tanggal)}<br><small class="text-muted">${p.JamMulai}-${p.JamSelesai}</small></td>
      <td>${p.Kegiatan}</td>
      <td>${p.UnitKerja}<br><small class="text-muted">PIC: ${p.PIC}</small></td>
      <td><span class="badge ${statusBadgeClass(p.Status)}">${p.Status}</span></td>
      <td class="text-nowrap">
        ${isAdmin() && p.Status === 'Pending' ? `<button class="btn btn-sm btn-rri-primary" onclick="openApprovalModal('${p.ID}')"><i class="bi bi-check2-square"></i> Proses</button>` : '-'}
      </td>
    </tr>
  `).join('');
}

function openPemakaianModal() {
  document.getElementById('formPemakaian').reset();
  document.getElementById('bentrokWarning').classList.add('d-none');

  const user = getCurrentUser();
  if (user) {
    document.getElementById('picPemakaian').value = user.nama;
    document.getElementById('unitKerjaPemakaian').value = user.unitKerja;
  }

  new bootstrap.Modal(document.getElementById('pemakaianModal')).show();
}

async function onRuanganChange() {
  await checkBentrok();
}

async function checkBentrok() {
  const ruanganId = document.getElementById('ruanganPemakaian').value;
  const tanggal = document.getElementById('tanggalPemakaian').value;
  const jamMulai = document.getElementById('jamMulaiPemakaian').value;
  const jamSelesai = document.getElementById('jamSelesaiPemakaian').value;
  const warning = document.getElementById('bentrokWarning');

  if (!ruanganId || !tanggal || !jamMulai || !jamSelesai) {
    warning.classList.add('d-none');
    return;
  }

  const res = await callApi('getJadwalRuangan', { ruanganId, bulan: new Date(tanggal).getMonth() + 1, tahun: new Date(tanggal).getFullYear() });
  if (!res.success) return;

  const conflict = res.data.find(j =>
    String(j.Tanggal).substring(0, 10) === tanggal &&
    timeOverlap(j.JamMulai, j.JamSelesai, jamMulai, jamSelesai)
  );

  if (conflict) {
    warning.textContent = `⚠️ Bentrok dengan jadwal: ${conflict.Kegiatan} (${conflict.JamMulai}-${conflict.JamSelesai})`;
    warning.classList.remove('d-none');
  } else {
    warning.classList.add('d-none');
  }
}

function timeOverlap(s1, e1, s2, e2) {
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

['tanggalPemakaian', 'jamMulaiPemakaian', 'jamSelesaiPemakaian'].forEach(id => {
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', checkBentrok);
  });
});

async function submitPemakaian(e) {
  e.preventDefault();

  const ruanganSelect = document.getElementById('ruanganPemakaian');
  const selectedOption = ruanganSelect.options[ruanganSelect.selectedIndex];

  const payload = {
    namaRuangan: selectedOption.dataset.nama,
    ruanganId: ruanganSelect.value,
    tanggal: document.getElementById('tanggalPemakaian').value,
    jamMulai: document.getElementById('jamMulaiPemakaian').value,
    jamSelesai: document.getElementById('jamSelesaiPemakaian').value,
    unitKerja: document.getElementById('unitKerjaPemakaian').value,
    kegiatan: document.getElementById('kegiatanPemakaian').value,
    pic: document.getElementById('picPemakaian').value
  };

  showLoading();
  const res = await callApi('createPemakaianRuangan', payload);
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('pemakaianModal')).hide();
    await loadPemakaian();
  } else {
    showToast(res.message, 'error');
  }
}

function openApprovalModal(id) {
  const p = pemakaianCache.find(x => x.ID === id);
  if (!p) return;

  document.getElementById('approvalPemakaianId').value = p.ID;
  document.getElementById('approvalDetailText').innerHTML = `
    <strong>${p.NamaRuangan}</strong><br>
    Kegiatan: ${p.Kegiatan}<br>
    Unit Kerja: ${p.UnitKerja} (PIC: ${p.PIC})<br>
    Tanggal: ${formatDateID(p.Tanggal)} (${p.JamMulai}-${p.JamSelesai})
  `;
  document.getElementById('catatanApproval').value = '';

  new bootstrap.Modal(document.getElementById('approvalModal')).show();
}

async function submitApproval(e) {
  e.preventDefault();
  const id = document.getElementById('approvalPemakaianId').value;
  const action = e.submitter.dataset.action;
  const catatan = document.getElementById('catatanApproval').value;

  showLoading();
  const res = await callApi('approvePemakaianRuangan', { id, action, catatan });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('approvalModal')).hide();
    await loadPemakaian();
  } else {
    showToast(res.message, 'error');
  }
}
