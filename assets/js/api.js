/**
 * ============================================================
 * API.JS
 * Wrapper untuk memanggil Google Apps Script Web App backend
 * ============================================================
 *
 * PENTING: Ganti API_BASE_URL dengan URL Web App Apps Script Anda
 * setelah deploy (Deploy > New deployment > Web app).
 */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzn2eiA-857LFQjLwdd6tLYJNqZCqDWeC0d-xYv_CduzinfnIQfzwxiI9_9GDfjpAhJ/exec';

/**
 * Panggil backend Apps Script.
 * Selalu menggunakan POST dengan Content-Type: text/plain
 * agar tidak memicu CORS preflight (Apps Script tidak mendukung OPTIONS).
 *
 * @param {string} action - nama action di backend (Code.gs routeAction)
 * @param {object} payload - parameter tambahan
 * @returns {Promise<{success:boolean, message:string, data:any}>}
 */
async function callApi(action, payload = {}) {
  const token = getToken();
  // Payload tidak boleh menimpa nama endpoint 'action' utama;
  // gunakan 'decision' atau nama lain untuk parameter bisnis serupa.
  const safePayload = Object.assign({}, payload);
  delete safePayload.action;
  const body = Object.assign({ token: token || '' }, safePayload, { action: action });

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const result = await response.json();

    // Jika sesi tidak valid, redirect ke login
    if (!result.success && result.message && result.message.toLowerCase().indexOf('sesi tidak valid') > -1) {
      clearSession();
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
        window.location.href = 'index.html';
      }
    }

    return result;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.', data: null };
  }
}

/* ===== Session Helpers ===== */
function getToken() {
  return localStorage.getItem('rri_token');
}

function setSession(data) {
  localStorage.setItem('rri_token', data.token);
  localStorage.setItem('rri_user', JSON.stringify({
    nama: data.nama,
    username: data.username,
    role: data.role,
    unitKerja: data.unitKerja,
    email: data.email
  }));
}

function getCurrentUser() {
  const raw = localStorage.getItem('rri_user');
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem('rri_token');
  localStorage.removeItem('rri_user');
}

/**
 * Guard: panggil di setiap halaman selain login
 */
function requireLogin() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

/* ===== Konversi file ke Base64 ===== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ===== Toast Helper (Bootstrap 5) ===== */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = 2050;
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/* ===== Loading overlay ===== */
function showLoading() {
  if (document.getElementById('globalLoading')) return;
  const div = document.createElement('div');
  div.id = 'globalLoading';
  div.className = 'loading-overlay';
  div.innerHTML = '<div class="spinner-border text-primary" style="width:3rem;height:3rem" role="status"></div>';
  document.body.appendChild(div);
}

function hideLoading() {
  const el = document.getElementById('globalLoading');
  if (el) el.remove();
}
