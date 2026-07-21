// assets/js/notifications/notification-toast.js
(function() {
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  function show(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  window.toastManager = { show };
})();
