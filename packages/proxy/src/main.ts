function injectScript(src: string) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(src);
  s.onload = () => s.remove();
  (document.head || document.documentElement).append(s);
}

injectScript('inject.js');
