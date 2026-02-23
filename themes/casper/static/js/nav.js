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
})();
