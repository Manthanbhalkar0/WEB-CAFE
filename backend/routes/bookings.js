const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { isValidPhone, PHONE_HINT } = require('../utils/validators');

const router = express.Router();

// ---------------------------------------------------------------
// POST /api/bookings  (FR-006) - reserve a table
// ---------------------------------------------------------------
router.post('/', optionalAuth, async (req, res) => {
  try {
    let { name, phone, guests, date, time, notes } = req.body;
    name = (name || '').trim();
    phone = (phone || '').trim();
    notes = (notes || '').trim();

    if (!name || !phone || !guests || !date || !time) {
      return res.status(400).json({ error: 'Name, phone, guests, date and time are all required.' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: PHONE_HINT });
    }
    if (isNaN(guests) || Number(guests) < 1 || Number(guests) > 30) {
      return res.status(400).json({ error: 'Number of guests must be between 1 and 30.' });
    }
    const bookingDate = new Date(`${date}T${time}`);
    if (isNaN(bookingDate.getTime()) || bookingDate < new Date(Date.now() - 60 * 1000)) {
      return res.status(400).json({ error: 'Please choose a valid future date and time.' });
    }

    const userId = req.user ? req.user.id : null;
    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, name, phone, guests, date, time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [userId, name, phone, guests, date, time, notes]
    );

    res.status(201).json({
      message: 'Table booked successfully! We will contact you shortly to confirm.',
      bookingId: result.insertId
    });
  } catch (err) {
    console.error('Booking error:', err.message);
    res.status(500).json({ error: 'Could not complete the booking. Please try again.' });
  }
});

// GET /api/bookings/mine - logged-in customer's own bookings
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY date DESC, time DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load your bookings.' });
  }
});

// PUT /api/bookings/:id/cancel - customer cancels their own booking
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).json({ error: 'Invalid booking id.' });

    const [rows] = await pool.query(
      'SELECT id, status, user_id FROM bookings WHERE id = ? AND user_id = ?',
      [bookingId, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = rows[0];
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This booking is already cancelled.' });
    }

    await pool.query(
      `UPDATE bookings SET status = 'CANCELLED' WHERE id = ? AND user_id = ?`,
      [bookingId, req.user.id]
    );

    res.json({
      message: 'Your booking has been cancelled. We hope to see you another time!',
      status: 'CANCELLED'
    });
  } catch (err) {
    console.error('Cancel booking error:', err.message);
    res.status(500).json({ error: 'Could not cancel the booking. Please try again.' });
  }
});

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

// GET /api/bookings  (FR-009) - admin views all bookings
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY date DESC, time DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

// PUT /api/bookings/:id/status - admin confirms/cancels a booking
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }
    const [result] = await pool.query('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ message: 'Booking status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the booking.' });
  }
});

module.exports = router;
