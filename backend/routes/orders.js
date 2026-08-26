const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../config/db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------
// POST /api/orders  (FR-005) - place an order
// Order + order_items are written in a single DB transaction (NFR 4.3)
// so they are either both saved or neither is.
// ---------------------------------------------------------------
router.post('/', optionalAuth, async (req, res) => {
  const { customer_name, phone, address, items, payment_method, special_instructions } = req.body;

  if (!customer_name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer name, phone and at least one item are required.' });
  }
  if (!/^[0-9+\-\s]{7,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Please enter a valid contact number so we can reach you.' });
  }
  const method = ['UPI', 'CARD', 'COD'].includes(payment_method) ? payment_method : 'COD';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Re-price every item server-side from the DB - never trust the client's price
    let total = 0;
    const priced = [];
    for (const it of items) {
      if (!it.menu_item_id || !it.quantity || it.quantity < 1) {
        throw { status: 400, message: 'Each item needs a valid product and quantity.' };
      }
      const [rows] = await connection.query(
        'SELECT * FROM menu_items WHERE id = ? AND is_available = 1',
        [it.menu_item_id]
      );
      if (rows.length === 0) {
        throw { status: 400, message: `One of the items in your cart is no longer available.` };
      }
      const menuItem = rows[0];
      const lineTotal = Number(menuItem.price) * Number(it.quantity);
      total += lineTotal;
      priced.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: it.quantity,
        note: (it.note || '').trim()
      });
    }
    total = Math.round(total * 100) / 100;

    const userId = req.user ? req.user.id : null;
    // Cash on Delivery is considered PENDING until collected; UPI/CARD start PENDING until admin confirms receipt
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, customer_name, phone, address, total, payment_method, payment_status, status, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'RECEIVED', ?)`,
      [userId, customer_name.trim(), phone.trim(), (address || '').trim(), total, method, (special_instructions || '').trim()]
    );
    const orderId = orderResult.insertId;

    for (const p of priced) {
      await connection.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, price, quantity, item_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, p.menu_item_id, p.name, p.price, p.quantity, p.note]
      );
    }

    await connection.commit();

    // Build UPI payment info to show on the confirmation screen
    const upiId = process.env.UPI_ID || '8459662016@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=CafePoint&am=${total}&cu=INR&tn=Order${orderId}`;

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      total,
      payment: {
        method,
        upiId,
        upiNumber: process.env.UPI_NUMBER || '8459662016',
        upiLink
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Order creation error:', err.message || err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Could not place the order. Please try again.' });
  } finally {
    connection.release();
  }
});

// GET /api/orders/mine - logged-in customer's own order history
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [req.user.id]
    );
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Could not load your orders.' });
  }
});

// GET /api/orders/:id - order confirmation / status lookup (public by id, used right after checkout)
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orders[0];
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Could not load the order.' });
  }
});

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

// GET /api/orders  (FR-008) - admin views all orders (with items)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND order_date >= ?'; params.push(from); }
    if (to) { sql += ' AND order_date <= ?'; params.push(to); }
    sql += ' ORDER BY order_date DESC';

    const [orders] = await pool.query(sql, params);
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// PUT /api/orders/:id/status  (FR-010) - RECEIVED -> PREPARING -> READY -> COMPLETED (or CANCELLED)
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }
    const [result] = await pool.query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found.' });
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update order status.' });
  }
});

// PUT /api/orders/:id/payment - admin marks a manual UPI/COD payment as received
router.put('/:id/payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { payment_status, transaction_ref } = req.body;
    if (!['PENDING', 'PAID', 'FAILED'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }
    const [result] = await pool.query(
      'UPDATE orders SET payment_status=?, transaction_ref=? WHERE id=?',
      [payment_status, transaction_ref || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found.' });
    res.json({ message: 'Payment status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update payment status.' });
  }
});

// GET /api/orders/:id/bill - generate a printable PDF bill for an order (admin)
router.get('/:id/bill', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orders[0];
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=CafePoint_Bill_${order.id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#6b3f2a').text('Cafe Point', { align: 'center' });
    doc.fontSize(10).fillColor('#333').text('Cafe Management & Online Ordering', { align: 'center' });
    doc.moveDown(1.2);
    doc.fontSize(14).fillColor('#000').text(`Bill / Receipt - Order #${order.id}`);
    doc.fontSize(10).fillColor('#555')
      .text(`Date: ${new Date(order.order_date).toLocaleString('en-IN')}`)
      .text(`Customer: ${order.customer_name}`)
      .text(`Phone: ${order.phone}`)
      .text(`Payment: ${order.payment_method} (${order.payment_status})`)
      .text(`Order Status: ${order.status}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#000');
    const startY = doc.y;
    doc.text('Item', 50, startY, { width: 220 });
    doc.text('Qty', 280, startY, { width: 60 });
    doc.text('Price', 350, startY, { width: 80 });
    doc.text('Amount', 450, startY, { width: 80 });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    items.forEach((item) => {
      const y = doc.y;
      doc.fontSize(10).fillColor('#000');
      doc.text(item.item_name + (item.item_note ? ` (${item.item_note})` : ''), 50, y, { width: 220 });
      doc.text(String(item.quantity), 280, y, { width: 60 });
      doc.text(`₹${Number(item.price).toFixed(2)}`, 350, y, { width: 80 });
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, y, { width: 80 });
      doc.moveDown(0.6);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#000').text(`Total: ₹${Number(order.total).toFixed(2)}`, { align: 'right' });
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#888').text('Thank you for ordering with Cafe Point!', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Bill generation error:', err.message);
    res.status(500).json({ error: 'Could not generate the bill.' });
  }
});

module.exports = router;
