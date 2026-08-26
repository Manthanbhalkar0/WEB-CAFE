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
function isAdmin() { const u = getUser(); return u && u.role === 'ADMIN'; }

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
