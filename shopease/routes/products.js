const router = require('express').Router();
const db = require('../db');

// GET /api/products?search=&category=
router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '' } = req.query;
    let sql = 'SELECT * FROM products WHERE name LIKE ?';
    const params = [`%${search}%`];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    const [rows] = await db.query(sql + ' ORDER BY id DESC', params);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
