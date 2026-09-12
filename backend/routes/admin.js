const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  isValidPhone,
  isValidPassword,
  PASSWORD_HINT,
  PHONE_HINT
} = require('../utils/validators');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/dashboard - quick stats for the admin home screen
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ totalOrders }]] = await pool.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[{ todayOrders }]] = await pool.query(
      'SELECT COUNT(*) AS todayOrders FROM orders WHERE DATE(order_date) = CURDATE()'
    );
    const [[{ todayRevenue }]] = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS todayRevenue FROM orders
       WHERE DATE(order_date) = CURDATE() AND payment_status = 'PAID'`
    );
    const [[{ pendingOrders }]] = await pool.query(
      `SELECT COUNT(*) AS pendingOrders FROM orders WHERE status IN ('RECEIVED','PREPARING')`
    );
    const [[{ totalCustomers }]] = await pool.query(
      `SELECT COUNT(*) AS totalCustomers FROM users WHERE role='CUSTOMER'`
    );
    const [[{ pendingBookings }]] = await pool.query(
      `SELECT COUNT(*) AS pendingBookings FROM bookings WHERE status='PENDING'`
    );
    const [[{ totalMenuItems }]] = await pool.query('SELECT COUNT(*) AS totalMenuItems FROM menu_items');

    res.json({ totalOrders, todayOrders, todayRevenue, pendingOrders, totalCustomers, pendingBookings, totalMenuItems });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Could not load dashboard stats.' });
  }
});

// GET /api/admin/customers - contact list (so admin can call/reach customers)
router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, address, created_at FROM users WHERE role='CUSTOMER' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load customers.' });
  }
});

// POST /api/admin/admins — only an existing admin can create another admin
router.post('/admins', async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    phone = (phone || '').trim();

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone and password are required.' });
    }
    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({ error: 'Name must be between 2 and 120 characters.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: PASSWORD_HINT });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: PHONE_HINT });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'ADMIN')`,
      [name, email, passwordHash, phone]
    );

    res.status(201).json({
      message: 'Admin account created successfully.',
      admin: { id: result.insertId, name, email, phone, role: 'ADMIN' }
    });
  } catch (err) {
    console.error('Create admin error:', err.message);
    res.status(500).json({ error: 'Could not create admin account.' });
  }
});

// GET /api/admin/reports?range=weekly|monthly|custom&from=&to=
// Generates a sales report: totals + a per-day breakdown + top-selling items
router.get('/reports', async (req, res) => {
  try {
    const { range = 'weekly', from, to } = req.query;
    let start, end;
    const now = new Date();

    if (range === 'custom' && from && to) {
      start = from;
      end = to;
    } else if (range === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else {
      // weekly - last 7 days including today
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      start = weekAgo.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    }

    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS orderCount, COALESCE(SUM(total),0) AS revenue,
              COALESCE(AVG(total),0) AS avgOrderValue
       FROM orders
       WHERE DATE(order_date) BETWEEN ? AND ? AND status != 'CANCELLED'`,
      [start, end]
    );

    const [daily] = await pool.query(
      `SELECT DATE(order_date) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders
       WHERE DATE(order_date) BETWEEN ? AND ? AND status != 'CANCELLED'
       GROUP BY DATE(order_date) ORDER BY day`,
      [start, end]
    );

    const [topItems] = await pool.query(
      `SELECT oi.item_name, SUM(oi.quantity) AS totalQty, SUM(oi.price * oi.quantity) AS totalRevenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE DATE(o.order_date) BETWEEN ? AND ? AND o.status != 'CANCELLED'
       GROUP BY oi.item_name
       ORDER BY totalQty DESC LIMIT 10`,
      [start, end]
    );

    const [paymentBreakdown] = await pool.query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE DATE(order_date) BETWEEN ? AND ? AND status != 'CANCELLED'
       GROUP BY payment_method`,
      [start, end]
    );

    res.json({
      range,
      period: { start, end },
      summary,
      daily,
      topItems,
      paymentBreakdown
    });
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ error: 'Could not generate the report.' });
  }
});

module.exports = router;
