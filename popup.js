document.addEventListener('DOMContentLoaded', function () {
  localizeHtmlPage();
  document.querySelector('#config').addEventListener('click', function() {
    window.open(chrome.runtime.getURL("options.html"));
  });
  
  document.querySelector('#about').addEventListener('click', function() {
    window.open("https://chrome.google.com/webstore/detail/movie-cut/cchdbnepfilcfokfngamfpdkhbkkfilo");
  });

 document.querySelector('#moviecut').addEventListener('click', function() {
    window.open("https://moviecut.online");
  });

  document.querySelector('#feedback').addEventListener('click', function() {
    window.open("https://github.com/vslaykovsky/moviecut/issues");
  });
});
