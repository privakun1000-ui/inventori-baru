/**
 * ============================================================
 * AUTH.JS
 * Logika halaman Login
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Jika sudah login, redirect ke dashboard
  if (getToken()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnLogin');
    const errorBox = document.getElementById('loginError');

    errorBox.classList.add('d-none');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';

    const res = await callApi('login', { username, password });

    btn.disabled = false;
    btn.innerHTML = 'Masuk';

    if (res.success) {
      setSession(res.data);
      window.location.href = 'dashboard.html';
    } else {
      errorBox.textContent = res.message || 'Login gagal';
      errorBox.classList.remove('d-none');
    }
  });

  // Toggle show/hide password
  const togglePw = document.getElementById('togglePassword');
  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const input = document.getElementById('password');
      const icon = togglePw.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
      }
    });
  }
});
