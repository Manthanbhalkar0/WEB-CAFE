/* ============================================================
   Cafe Point — Global site behavior
   Navbar scroll state, mobile menu, scroll-reveal animations,
   parallax background drift, and auth-aware nav area.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAuthArea();
  initScrollReveal();
  initParallax();
  updateCartBadge();
});

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
}

function initAuthArea() {
  const area = document.getElementById('authArea');
  if (!area) return;
  const user = getUser();

  if (!user) {
    area.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
    return;
  }

  if (String(user.role || '').toUpperCase() === 'ADMIN') {
    area.innerHTML = `
      <a href="admin.html" class="btn btn-primary btn-sm">Admin Panel</a>
      <button class="btn btn-outline btn-sm" id="logoutBtn">Logout</button>
    `;
  } else {
    area.innerHTML = `
      <a href="my-orders.html" class="btn btn-outline btn-sm">My Orders</a>
      <button class="btn btn-primary btn-sm" id="logoutBtn">Logout</button>
    `;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      toast('Logged out successfully', 'success');
      setTimeout(() => (window.location.href = 'index.html'), 600);
    });
  }
}

function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(el => observer.observe(el));
}

function initParallax() {
  const orbs = document.querySelectorAll('.hero-bg-orb');
  const layers = document.querySelectorAll('.parallax-layer');
  if (!orbs.length && !layers.length) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    orbs.forEach((orb, i) => {
      orb.style.transform = `translateY(${y * (0.08 + i * 0.05)}px)`;
    });
    layers.forEach((layer, i) => {
      layer.style.transform = `translateY(${y * (0.04 + i * 0.03)}px)`;
    });
  }, { passive: true });

  // subtle mouse-follow drift on the hero orbs (desktop only)
  const hero = document.querySelector('.hero');
  if (hero && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const yMove = (e.clientY / window.innerHeight - 0.5) * 24;
      orbs.forEach((orb, i) => {
        orb.style.marginLeft = `${x * (i + 1) * 0.5}px`;
        orb.style.marginTop = `${yMove * (i + 1) * 0.5}px`;
      });
    });
  }
}

function requireLoginRedirect(message = 'Please log in to continue.') {
  if (!isLoggedIn()) {
    toast(message, 'error');
    const page = (location.pathname.split('/').pop() || 'index.html');
    setTimeout(() => (window.location.href = `login.html?next=${encodeURIComponent(page)}`), 900);
    return true;
  }
  return false;
}
