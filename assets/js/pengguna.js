/**
 * ============================================================
 * PENGGUNA.JS
 * Master Data Pengguna: CRUD + Reset Password
 * ============================================================
 */

let penggunaCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('pengguna.html');
  populateUnitKerjaOptions();
  populateRoleOptions();
  await loadPengguna();

  document.getElementById('searchInput').addEventListener('input', debounce(loadPengguna, 400));
  document.getElementById('formPengguna').addEventListener('submit', submitPengguna);
  document.getElementById('btnTambahPengguna').addEventListener('click', () => openPenggunaModal(null));
  document.getElementById('formResetPassword').addEventListener('submit', submitResetPassword);
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function populateUnitKerjaOptions() {
  const sel = document.getElementById('unitKerjaPengguna');
  UNIT_KERJA_LIST_JS.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u; opt.textContent = u;
    sel.appendChild(opt);
  });
}

function populateRoleOptions() {
  const sel = document.getElementById('rolePengguna');
  ROLE_LIST_JS.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r; opt.textContent = r;
    sel.appendChild(opt);
  });
}

async function loadPengguna() {
  const params = { search: document.getElementById('searchInput').value };

  showLoading();
  const res = await callApi('getPenggunaList', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  penggunaCache = res.data;
  renderPenggunaTable(penggunaCache);
}

function renderPenggunaTable(data) {
  const tbody = document.getElementById('penggunaTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada data pengguna</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(u => `
    <tr>
      <td class="fw-semibold">${u.Nama}</td>
      <td>${u.Username}</td>
      <td>${u.Email || '-'}</td>
      <td>${u.NomorWhatsApp || '-'}</td>
      <td>${u.UnitKerja}</td>
      <td><span class="badge ${u.Role === 'Admin' ? 'bg-soft-navy' : 'bg-secondary'}">${u.Role}</span></td>
      <td><span class="badge ${statusBadgeClass(u.Status)}">${u.Status}</span></td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-warning" title="Reset Password" onclick="openResetPassword('${u.ID}')"><i class="bi bi-key"></i></button>
        <button class="btn btn-sm btn-outline-primary" title="Edit" onclick="openPenggunaModal('${u.ID}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="confirmDeletePengguna('${u.ID}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openPenggunaModal(id) {
  const form = document.getElementById('formPengguna');
  form.reset();
  document.getElementById('penggunaId').value = '';
  const pwField = document.getElementById('passwordPenggunaWrapper');

  if (id) {
    const u = penggunaCache.find(x => x.ID === id);
    if (!u) return;
    document.getElementById('penggunaModalTitle').textContent = 'Edit Pengguna';
    document.getElementById('penggunaId').value = u.ID;
    document.getElementById('namaPengguna').value = u.Nama;
    document.getElementById('usernamePengguna').value = u.Username;
    document.getElementById('emailPengguna').value = u.Email;
    document.getElementById('whatsappPengguna').value = u.NomorWhatsApp;
    document.getElementById('unitKerjaPengguna').value = u.UnitKerja;
    document.getElementById('rolePengguna').value = u.Role || 'Admin';
    document.getElementById('statusPengguna').value = u.Status;
    pwField.classList.add('d-none');
  } else {
    document.getElementById('penggunaModalTitle').textContent = 'Tambah Pengguna';
    document.getElementById('rolePengguna').value = 'Admin';
    pwField.classList.remove('d-none');
  }

  new bootstrap.Modal(document.getElementById('penggunaModal')).show();
}

async function submitPengguna(e) {
  e.preventDefault();

  const id = document.getElementById('penggunaId').value;
  const payload = {
    nama: document.getElementById('namaPengguna').value,
    username: document.getElementById('usernamePengguna').value,
    email: document.getElementById('emailPengguna').value,
    nomorWhatsApp: document.getElementById('whatsappPengguna').value,
    unitKerja: document.getElementById('unitKerjaPengguna').value,
    status: document.getElementById('statusPengguna').value,
    role: document.getElementById('rolePengguna').value
  };

  showLoading();
  let res;
  if (id) {
    payload.id = id;
    res = await callApi('updatePengguna', payload);
  } else {
    payload.password = document.getElementById('passwordPengguna').value || '12345678';
    res = await callApi('createPengguna', payload);
  }
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('penggunaModal')).hide();
    await loadPengguna();
  } else {
    showToast(res.message, 'error');
  }
}

function confirmDeletePengguna(id) {
  const u = penggunaCache.find(x => x.ID === id);
  if (!u) return;
  if (confirm(`Hapus pengguna "${u.Nama}" (${u.Username})?`)) {
    deletePengguna(id);
  }
}

async function deletePengguna(id) {
  showLoading();
  const res = await callApi('deletePengguna', { id });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    await loadPengguna();
  } else {
    showToast(res.message, 'error');
  }
}

function openResetPassword(id) {
  const u = penggunaCache.find(x => x.ID === id);
  if (!u) return;
  document.getElementById('resetPasswordUserId').value = u.ID;
  document.getElementById('resetPasswordUserName').textContent = `${u.Nama} (${u.Username})`;
  document.getElementById('newPasswordReset').value = '';
  new bootstrap.Modal(document.getElementById('resetPasswordModal')).show();
}

async function submitResetPassword(e) {
  e.preventDefault();
  const userId = document.getElementById('resetPasswordUserId').value;
  const newPassword = document.getElementById('newPasswordReset').value;

  showLoading();
  const res = await callApi('resetPassword', { userId, newPassword });
  hideLoading();

  if (res.success) {
    showToast(res.message, 'success');
    bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal')).hide();
  } else {
    showToast(res.message, 'error');
  }
}
