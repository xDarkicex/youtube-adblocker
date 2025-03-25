chrome.storage.local.get(['adCount'], (data) => {
    document.getElementById('count').textContent = data.adCount || '0';
  });