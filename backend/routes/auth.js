const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ---------------------------------------------------------------
// POST /api/auth/register  (FR-002)
// Customer must register with contact details before ordering,
// so the admin can reach them about their order.
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, phone, address } = req.body;

    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim();
    address = (address || '').trim();

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone and password are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!/^[0-9+\-\s]{7,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid contact number.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, address, role) VALUES (?, ?, ?, ?, ?, "CUSTOMER")',
      [name, email, passwordHash, phone, address]
    );

    const user = { id: result.insertId, name, email, role: 'CUSTOMER' };
    const token = signToken(user);

    res.status(201).json({ message: 'Registration successful!', token, user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Something went wrong while registering. Please try again.' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/login  (FR-003) - works for both customers and admin
// ---------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
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
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong while logging in. Please try again.' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/me - current logged-in user's profile + order history
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
