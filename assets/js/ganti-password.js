/**
 * ============================================================
 * GANTI-PASSWORD.JS
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await renderLayout('ganti-password.html');

  const user = getCurrentUser();
  if (user) {
    document.getElementById('infoNama').textContent = user.nama;
    document.getElementById('infoUsername').textContent = user.username;
  }

  document.getElementById('formGantiPassword').addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorBox = document.getElementById('passwordError');
    errorBox.classList.add('d-none');

    if (newPassword !== confirmPassword) {
      errorBox.textContent = 'Konfirmasi password baru tidak cocok';
      errorBox.classList.remove('d-none');
      return;
    }
    if (newPassword.length < 6) {
      errorBox.textContent = 'Password baru minimal 6 karakter';
      errorBox.classList.remove('d-none');
      return;
    }

    showLoading();
    const res = await callApi('changePassword', { oldPassword, newPassword });
    hideLoading();

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('formGantiPassword').reset();
    } else {
      errorBox.textContent = res.message;
      errorBox.classList.remove('d-none');
    }
  });
});
