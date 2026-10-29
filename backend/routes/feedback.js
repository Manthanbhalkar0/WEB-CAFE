const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'feedback');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed (JPG, PNG, WEBP).'));
    }
    cb(null, true);
  }
});

function feedbackUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large. Please use a file under 3 MB.'
        : (err.message || 'Could not upload the image.');
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

// POST /api/feedback - anyone can leave feedback about the cafe / product
router.post('/', optionalAuth, feedbackUpload, async (req, res) => {
  try {
    let { name, email, rating, message, feedback_type: feedbackType } = req.body;
    name = (name || '').trim();
    message = (message || '').trim();
    rating = Number(rating) || 5;
    feedbackType = String(feedbackType || 'CAFE').toUpperCase();
    if (!['CAFE', 'PRODUCT', 'BOTH'].includes(feedbackType)) feedbackType = 'CAFE';

    if (!name || !message) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Please enter your name and a short message.' });
    }
    if (rating < 1 || rating > 5) rating = 5;

    const imagePath = req.file ? `/uploads/feedback/${req.file.filename}` : null;
    let userId = req.user ? req.user.id : null;
    const emailValue = (email || '').trim();

    try {
      await pool.query(
        `INSERT INTO feedback (user_id, name, email, rating, message, feedback_type, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, emailValue, rating, message, feedbackType, imagePath]
      );
    } catch (insertErr) {
      // Stale / deleted account in JWT — still accept the feedback as a guest
      if (userId && insertErr.code === 'ER_NO_REFERENCED_ROW_2') {
        userId = null;
        await pool.query(
          `INSERT INTO feedback (user_id, name, email, rating, message, feedback_type, image)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, name, emailValue, rating, message, feedbackType, imagePath]
        );
      } else {
        throw insertErr;
      }
    }
    res.status(201).json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('Feedback error:', err.code || '', err.message);
    res.status(500).json({ error: 'Could not submit feedback right now.' });
  }
});

// GET /api/feedback - public: show recent feedback (latest 12) for the homepage
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT name, rating, message, feedback_type, image, created_at
       FROM feedback ORDER BY created_at DESC LIMIT 12`
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
