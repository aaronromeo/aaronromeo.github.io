(function() {
  var body = document.body;
  var menuButton = document.querySelector('.menu-button');
  var navClose = document.querySelector('.nav-close');
  var navCover = document.querySelector('.nav-cover');

  function openNav() {
    body.classList.add('nav-opened');
    body.classList.remove('nav-closed');
  }

  function closeNav() {
    body.classList.remove('nav-opened');
    body.classList.add('nav-closed');
  }

  if (menuButton) {
    menuButton.addEventListener('click', function(e) {
      e.preventDefault();
      openNav();
    });
  }

  if (navClose) {
    navClose.addEventListener('click', function(e) {
      e.preventDefault();
      closeNav();
    });
  }

  if (navCover) {
    navCover.addEventListener('click', function(e) {
      e.preventDefault();
      closeNav();
    });
  }

  // Close nav on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeNav();
    }
  });

  // Handle social share links
  document.querySelectorAll('.share-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var width = parseInt(this.getAttribute('data-width'), 10);
      var height = parseInt(this.getAttribute('data-height'), 10);
      var left = (screen.width - width) / 2;
      var top = (screen.height - height) / 2;
      window.open(this.href, 'share-window', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top);
    });
  });
})();
