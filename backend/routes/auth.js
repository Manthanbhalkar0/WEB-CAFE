const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  isValidPhone,
  isValidPassword,
  PASSWORD_HINT,
  PHONE_HINT
} = require('../utils/validators');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function validateRegistrationFields({ name, email, password, phone }) {
  if (!name || !email || !password || !phone) {
    return 'Name, email, phone and password are required.';
  }
  if (name.length < 2 || name.length > 120) {
    return 'Name must be between 2 and 120 characters.';
  }
  if (!validator.isEmail(email)) {
    return 'Please enter a valid email address.';
  }
  if (!isValidPassword(password)) {
    return PASSWORD_HINT;
  }
  if (!isValidPhone(phone)) {
    return PHONE_HINT;
  }
  return null;
}

// ---------------------------------------------------------------
// POST /api/auth/register  — customer signup only
// Admin accounts are created via seed or by an existing admin.
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, phone, address } = req.body;

    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim();
    address = (address || '').trim();

    const fieldError = validateRegistrationFields({ name, email, password, phone });
    if (fieldError) {
      return res.status(400).json({ error: fieldError });
    }

    // Never allow the configured admin email to become a customer account
    const reservedAdminEmail = (process.env.ADMIN_EMAIL || 'admin@cafepoint.com').toLowerCase();
    if (email === reservedAdminEmail) {
      return res.status(403).json({
        error: 'This email is reserved for the admin account. Please log in instead.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, address, role) VALUES (?, ?, ?, ?, ?, "CUSTOMER")',
      [name, email, passwordHash, phone, address || null]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      phone,
      address: address || null,
      role: 'CUSTOMER'
    };
    const token = signToken(user);

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Something went wrong while registering. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/login  — customers and admin
// ---------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong while logging in. Please try again.' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/me - current logged-in user's profile
// ---------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

module.exports = router;
