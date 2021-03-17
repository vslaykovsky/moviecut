var inject_script = document.createElement('script');
inject_script.src = chrome.extension.getURL('netflix-inject.js');
inject_script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(inject_script);

