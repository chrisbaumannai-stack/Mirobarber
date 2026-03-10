/* ============================================
   MIRO Barber Shop – Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar scroll effect ---
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- Mobile menu toggle ---
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
    document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu on link click
  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // --- Active nav link on scroll ---
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

  const observerNav = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

  sections.forEach(section => observerNav.observe(section));

  // --- Fade-in animations on scroll ---
  const fadeElements = document.querySelectorAll('.fade-in');

  const observerFade = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observerFade.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  fadeElements.forEach(el => observerFade.observe(el));

  // --- Set minimum date for booking ---
  const dateInput = document.getElementById('bookingDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    dateInput.value = today;
  }

  // --- WhatsApp booking form ---
  const bookingForm = document.getElementById('bookingForm');

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('bookingName').value.trim();
    const service = document.getElementById('bookingService').value;
    const date = document.getElementById('bookingDate').value;
    const time = document.getElementById('bookingTime').value;

    if (!name || !service || !date || !time) return;

    // Format date nicely
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const message =
      `Hallo! Ich möchte gerne einen Termin vereinbaren.\n\n` +
      `Name: ${name}\n` +
      `Service: ${service}\n` +
      `Wunschtermin: ${formattedDate}\n` +
      `Wunschzeit: ${time} Uhr\n\n` +
      `Vielen Dank!`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/4901627482992?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener');
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Hero entrance animations ---
  const heroElements = document.querySelectorAll('.hero-logo, .hero-title, .hero-divider, .hero-subtitle, .hero-tagline, .hero-cta-group');
  heroElements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.7s ease ${i * 0.15}s, transform 0.7s ease ${i * 0.15}s`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });

});
