/* ============================================================
   Cafe Point — API helper
   Talks to the backend at /api/*  (same origin, served by Express)
   ============================================================ */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('cp_token');
}
function setSession(token, user) {
  localStorage.setItem('cp_token', token);
  localStorage.setItem('cp_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('cp_token');
  localStorage.removeItem('cp_user');
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('cp_user')); } catch (e) { return null; }
}
function isLoggedIn() { return !!getToken(); }
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

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Please check your connection and that the backend is running.');
  }

  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearSession();
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
