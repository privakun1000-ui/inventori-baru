/**
 * ============================================================
 * AUDIT.JS
 * Audit Trail: tampilkan log aktivitas + export
 * ============================================================
 */

let auditCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('audit-trail.html');
  if (!isAdmin()) {
    document.getElementById('btnExportExcel').classList.add('d-none');
    document.getElementById('btnExportPdf').classList.add('d-none');
  }
  await loadAudit();

  document.getElementById('btnFilter').addEventListener('click', loadAudit);
  document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('filterModul').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadAudit();
  });
  document.getElementById('btnExportExcel').addEventListener('click', () => doExport('excel'));
  document.getElementById('btnExportPdf').addEventListener('click', () => doExport('pdf'));
});

async function loadAudit() {
  const params = {
    modul: document.getElementById('filterModul').value,
    startDate: document.getElementById('filterStartDate').value,
    endDate: document.getElementById('filterEndDate').value
  };

  showLoading();
  const res = await callApi('getAuditTrail', params);
  hideLoading();

  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  auditCache = res.data;
  renderAuditTable(auditCache);
}

function renderAuditTable(data) {
  const tbody = document.getElementById('auditTableBody');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada log aktivitas</div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => `
    <tr>
      <td class="text-nowrap">${formatDateTimeID(a.Waktu)}</td>
      <td>${a.User}</td>
      <td><span class="badge bg-soft-navy">${a.Modul}</span> ${a.Aktivitas}</td>
      <td>${a.Detail || '-'}</td>
    </tr>
  `).join('');
}

async function doExport(format) {
  showLoading();
  const res = await callApi('exportData', { modul: 'AuditTrail', format });
  hideLoading();

  if (res.success) {
    window.open(res.data.downloadUrl, '_blank');
  } else {
    showToast(res.message, 'error');
  }
}
