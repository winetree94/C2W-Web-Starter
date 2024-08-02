import '@picocss/pico/css/pico.min.css';

const checkbox = document.getElementById('enabled') as HTMLInputElement;

chrome.storage.local.get('enabled', (data) => {
  checkbox.checked = !!data.enabled;
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      checkbox.checked = !!changes.enabled.newValue;
    }
  });
});

checkbox.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: checkbox.checked });
});
