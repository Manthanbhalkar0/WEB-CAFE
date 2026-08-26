const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/feedback - anyone can leave feedback about the cafe
router.post('/', optionalAuth, async (req, res) => {
  try {
    let { name, email, rating, message } = req.body;
    name = (name || '').trim();
    message = (message || '').trim();
    rating = Number(rating) || 5;

    if (!name || !message) {
      return res.status(400).json({ error: 'Please enter your name and a short message.' });
    }
    if (rating < 1 || rating > 5) rating = 5;

    const userId = req.user ? req.user.id : null;
    await pool.query(
      'INSERT INTO feedback (user_id, name, email, rating, message) VALUES (?, ?, ?, ?, ?)',
      [userId, name, (email || '').trim(), rating, message]
    );
    res.status(201).json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback error:', err.message);
    res.status(500).json({ error: 'Could not submit feedback right now.' });
  }
});

// GET /api/feedback - public: show recent approved-style feedback (latest 12) for the homepage
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT name, rating, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 12'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load feedback.' });
  }
});

// GET /api/feedback/all - admin: full feedback list
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load feedback.' });
  }
});

module.exports = router;
