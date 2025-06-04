// ===========================
// ENIT Campus Navigation - APP
// General Helpers and Version
// ===========================

// === Show error/info banner ===
function showBanner(msg) {
  const banner = $('errorBanner');
  banner.textContent = msg;
  banner.style.display = 'block';

  clearTimeout(banner._t);
  banner._t = setTimeout(() => {
    banner.style.display = 'none';
  }, 3000);
}

// === Debounce function ===
function debounce(fn, delay = 100) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// === Fetch version from version.txt ===
fetch('version.txt')
  .then(response => response.text())
  .then(version => {
    $('versionCounter').textContent = version.trim();
  })
  .catch(error => {
    console.error('Could not load version:', error);
  });
