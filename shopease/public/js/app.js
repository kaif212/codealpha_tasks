// ===== Shared helpers for all pages =====
const API = '/api';
const $ = (s) => document.querySelector(s);
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

const Auth = {
  get token() { return localStorage.getItem('token'); },
  get user() { return JSON.parse(localStorage.getItem('user') || 'null'); },
  save(d) { localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user)); },
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = 'index.html'; },
};

const Cart = {
  get items() { return JSON.parse(localStorage.getItem('cart') || '[]'); },
  set(items) { localStorage.setItem('cart', JSON.stringify(items)); renderHeader(); },
  add(p, qty = 1) {
    const items = this.items;
    const f = items.find((i) => i.id === p.id);
    if (f) f.quantity += qty;
    else items.push({ id: p.id, name: p.name, price: Number(p.price), image: p.image, quantity: qty });
    this.set(items);
    toast(`${p.name} added to cart`);
  },
  update(id, qty) { this.set(this.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))); },
  remove(id) { this.set(this.items.filter((i) => i.id !== id)); },
  clear() { this.set([]); },
  get count() { return this.items.reduce((s, i) => s + i.quantity, 0); },
  get total() { return this.items.reduce((s, i) => s + i.price * i.quantity, 0); },
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

function renderHeader() {
  const u = Auth.user;
  const h = document.querySelector('header');
  if (!h) return;
  h.innerHTML = `
  <div class="container nav">
    <a href="index.html" class="logo">Shop<span>Ease</span></a>
    <button class="menu-btn" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
    <nav class="nav-links">
      <a href="index.html">Shop</a>
      <a href="cart.html">Cart <span class="badge">${Cart.count}</span></a>
      ${u ? `<a href="orders.html">My Orders</a><a href="#" onclick="Auth.logout()">Logout (${u.name.split(' ')[0]})</a>`
          : `<a href="login.html">Login</a><a href="register.html" class="btn">Sign up</a>`}
    </nav>
  </div>`;
}
document.addEventListener('DOMContentLoaded', renderHeader);
