const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Place order: { items: [{productId, quantity}], address }
router.post('/', auth, async (req, res, next) => {
  const { items, address } = req.body;
  if (!Array.isArray(items) || !items.length || !address)
    return res.status(400).json({ message: 'Cart is empty or address missing' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    const lines = [];
    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      const [rows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [it.productId]);
      const p = rows[0];
      if (!p || qty < 1) throw { status: 400, message: 'Invalid product' };
      if (p.stock < qty) throw { status: 400, message: `Only ${p.stock} left of ${p.name}` };
      total += Number(p.price) * qty;
      lines.push({ p, qty });
    }
    const [o] = await conn.query('INSERT INTO orders (user_id, total, address) VALUES (?, ?, ?)', [req.user.id, total, address]);
    for (const { p, qty } of lines) {
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o.insertId, p.id, qty, p.price]);
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, p.id]);
    }
    await conn.commit();
    res.status(201).json({ orderId: o.insertId, total });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  } finally {
    conn.release();
  }
});

// My orders with items
router.get('/', auth, async (req, res, next) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    for (const o of orders) {
      const [items] = await db.query(
        `SELECT oi.quantity, oi.price, p.name, p.image FROM order_items oi
         JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`, [o.id]);
      o.items = items;
    }
    res.json(orders);
  } catch (e) { next(e); }
});

module.exports = router;
