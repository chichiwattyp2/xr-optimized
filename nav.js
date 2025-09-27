// nav.js - Handles navigation interactions

document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.menu-button');
  const navLinks = document.querySelector('.md-nav-links');

  // Toggle mobile menu
  if (menuButton && navLinks) {
    menuButton.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Close dropdowns when link clicked (mobile)
  document.querySelectorAll('.menu-dropdown .dropdown-content a').forEach(link => {
    link.addEventListener('click', e => {
      const dropdown = e.target.closest('.menu-dropdown');
      if (dropdown) {
        dropdown.querySelector('.dropdown-content').style.display = 'none';
      }

      // Close mobile menu after navigation
      if (navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
      }
    });
  });
});
