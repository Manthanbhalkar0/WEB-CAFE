/* ============================================================
   Cafe Point — API helper
   Talks to the backend at /api/*  (same origin, served by Express)
   ============================================================ */

const API_BASE = '/api';

/* Admin and customer sessions are stored separately so you can stay
   logged in as both at once (e.g. admin dashboard in one tab, shop in another). */
const SESSION_KEYS = {
  admin: { token: 'cp_admin_token', user: 'cp_admin_user' },
  customer: { token: 'cp_customer_token', user: 'cp_customer_user' }
};

function isAdminPage() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();
  return page === 'admin.html';
}

function roleFromUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN' ? 'admin' : 'customer';
}

/** Which session this page should use (admin.html → admin, everything else → customer). */
function activeSessionRole() {
  return isAdminPage() ? 'admin' : 'customer';
}

function migrateLegacySession() {
  const oldToken = localStorage.getItem('cp_token');
  const oldUserRaw = localStorage.getItem('cp_user');
  if (!oldToken && !oldUserRaw) return;
  try {
    const user = oldUserRaw ? JSON.parse(oldUserRaw) : null;
    const role = roleFromUser(user);
    const keys = SESSION_KEYS[role];
    if (oldToken && !localStorage.getItem(keys.token)) {
      localStorage.setItem(keys.token, oldToken);
    }
    if (oldUserRaw && !localStorage.getItem(keys.user)) {
      localStorage.setItem(keys.user, oldUserRaw);
    }
  } catch (e) { /* ignore corrupt legacy data */ }
  localStorage.removeItem('cp_token');
  localStorage.removeItem('cp_user');
}
migrateLegacySession();

function getToken(role = activeSessionRole()) {
  return localStorage.getItem(SESSION_KEYS[role].token);
}
function setSession(token, user) {
  const role = roleFromUser(user);
  const keys = SESSION_KEYS[role];
  localStorage.setItem(keys.token, token);
  localStorage.setItem(keys.user, JSON.stringify(user));
}
function clearSession(role = activeSessionRole()) {
  const keys = SESSION_KEYS[role];
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.user);
}
function getUser(role = activeSessionRole()) {
  try { return JSON.parse(localStorage.getItem(SESSION_KEYS[role].user)); } catch (e) { return null; }
}
function isLoggedIn(role = activeSessionRole()) { return !!getToken(role); }
function isAdmin() {
  const u = getUser();
  return !!(u && String(u.role || '').toUpperCase() === 'ADMIN');
}

/* Remember email only on this device — never store passwords in localStorage */
function saveRememberedEmail(email) {
  localStorage.setItem('cp_remember_email', email || '');
  localStorage.removeItem('cp_remember_password'); // migrate away from old plaintext storage
}
function clearRememberedEmail() {
  localStorage.removeItem('cp_remember_email');
  localStorage.removeItem('cp_remember_password');
}
function getRememberedEmail() {
  localStorage.removeItem('cp_remember_password'); // clear any leftover plaintext password
  return localStorage.getItem('cp_remember_email') || '';
}

/* Shared client-side auth validation (mirrors backend/utils/validators.js) */
const AUTH_PASSWORD_HINT =
  'Password must be at least 8 characters and include at least one letter, one number and one special character.';
const AUTH_PHONE_HINT = 'Please enter a valid contact number (10 digits, optional country code).';

function isValidEmailClient(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
function isValidPhoneClient(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  if (!/^\+?[0-9]{10,13}$/.test(cleaned)) return false;
  const digitsOnly = cleaned.replace(/^\+/, '');
  if (/^(\d)\1+$/.test(digitsOnly)) return false;
  return true;
}
function isValidPasswordClient(password) {
  return typeof password === 'string' && /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}
function validateRegisterForm({ name, email, phone, password, confirmPassword }) {
  name = (name || '').trim();
  email = (email || '').trim().toLowerCase();
  phone = (phone || '').trim();

  if (!name || name.length < 2) return 'Please enter your full name (at least 2 characters).';
  if (!isValidEmailClient(email)) return 'Please enter a valid email address.';
  if (!isValidPhoneClient(phone)) return AUTH_PHONE_HINT;
  if (!isValidPasswordClient(password)) return AUTH_PASSWORD_HINT;
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}
function validateLoginForm({ email, password }) {
  email = (email || '').trim().toLowerCase();
  if (!email || !password) return 'Email and password are required.';
  if (!isValidEmailClient(email)) return 'Please enter a valid email address.';
  return null;
}

async function api(path, { method = 'GET', body, auth = false, formData = null } = {}) {
  const headers = {};
  // Let the browser set multipart boundary when sending FormData
  if (!formData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData || (body ? JSON.stringify(body) : undefined)
    });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Please check your connection and that the backend is running.');
  }

  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearSession(activeSessionRole());
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

/* -------------------- Toast notifications -------------------- */
function toast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function formatMoney(n) {
  return `₹${Number(n).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
