const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------
// GET /api/menu  (FR-001) - public, everyone can browse the menu
// Optional query params: ?category=Coffee  ?veg=1  ?search=latte
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category, veg, search } = req.query;
    let sql = 'SELECT * FROM menu_items WHERE is_available = 1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (veg === '1') {
      sql += ' AND is_veg = 1';
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY category, name';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Menu fetch error:', err.message);
    res.status(500).json({ error: 'Could not load the menu right now.' });
  }
});

// GET /api/menu/categories - distinct categories for building the nav/filter
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM menu_items WHERE is_available = 1 ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Could not load categories.' });
  }
});

// ---------------------------------------------------------------
// ADMIN: manage menu items (add / edit / change price / remove)
// ---------------------------------------------------------------

// POST /api/menu  - admin adds a new product
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    let { category, name, description, price, is_veg, image } = req.body;
    if (!category || !name || price === undefined) {
      return res.status(400).json({ error: 'Category, name and price are required.' });
    }
    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    const [result] = await pool.query(
      `INSERT INTO menu_items (category, name, description, price, is_veg, image, is_available)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [category, name, description || '', price, is_veg ? 1 : 0, image || '☕']
    );
    res.status(201).json({ message: 'Product added successfully.', id: result.insertId });
  } catch (err) {
    console.error('Add menu item error:', err.message);
    res.status(500).json({ error: 'Could not add the product.' });
  }
});

// PUT /api/menu/:id - admin edits a product (name, description, price, veg, image, availability)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, description, price, is_veg, image, is_available } = req.body;

    const [existing] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });
    const item = existing[0];

    await pool.query(
      `UPDATE menu_items SET category=?, name=?, description=?, price=?, is_veg=?, image=?, is_available=?
       WHERE id=?`,
      [
        category ?? item.category,
        name ?? item.name,
        description ?? item.description,
        price ?? item.price,
        is_veg === undefined ? item.is_veg : (is_veg ? 1 : 0),
        image ?? item.image,
        is_available === undefined ? item.is_available : (is_available ? 1 : 0),
        id
      ]
    );
    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Update menu item error:', err.message);
    res.status(500).json({ error: 'Could not update the product.' });
  }
});

// PATCH /api/menu/:id/price - quick price-only update
router.patch('/:id/price', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { price } = req.body;
    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    const [result] = await pool.query('UPDATE menu_items SET price=? WHERE id=?', [price, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Price updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the price.' });
  }
});

// DELETE /api/menu/:id - admin removes a product
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove the product.' });
  }
});

// GET /api/menu/admin/all - admin view including unavailable items
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

module.exports = router;
