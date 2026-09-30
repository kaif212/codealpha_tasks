const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const sign = (user) =>
  jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: 'Name, email and password (min 6 chars) required' });
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
    const user = { id: r.insertId, name, email };
    res.status(201).json({ token: sign(user), user });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});

module.exports = router;
