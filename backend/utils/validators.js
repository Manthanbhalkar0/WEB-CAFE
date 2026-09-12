/* ============================================================
   Cafe Point — Shared backend validators
   Used by auth.js, orders.js and bookings.js so every endpoint
   enforces the exact same rules.
   ============================================================ */

// Contact number: optional leading "+", optional country code, then
// exactly 10 digits (spaces/dashes are allowed for readability but are
// stripped before checking). Rejects junk like "-------" or "0000000".
function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  if (!/^\+?[0-9]{10,13}$/.test(cleaned)) return false;
  const digitsOnly = cleaned.replace(/^\+/, '');
  // Guard against obviously fake numbers like all the same digit
  if (/^(\d)\1+$/.test(digitsOnly)) return false;
  return true;
}

// Password: at least 8 characters, at least one letter, one number and
// one special character.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

function isValidPassword(password) {
  return typeof password === 'string' && PASSWORD_PATTERN.test(password);
}

const PASSWORD_HINT =
  'Password must be at least 8 characters and include at least one letter, one number and one special character.';
const PHONE_HINT = 'Please enter a valid contact number (10 digits, optional country code).';

module.exports = { isValidPhone, isValidPassword, PASSWORD_HINT, PHONE_HINT };
