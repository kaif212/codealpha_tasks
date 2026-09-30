# ShopEase – Simple E-commerce Store

Frontend: HTML, CSS, JavaScript · Backend: Express.js (Node.js) · Database: MySQL

## Features
- Product listing with search + category filter
- Product details page
- Shopping cart (add / update quantity / remove)
- User registration & login (bcrypt + JWT)
- Order processing (MySQL transaction, stock check) + "My Orders" page
- Fully responsive

## Setup
1. Install Node.js (v18+) and MySQL.
2. Create database + sample products:
   ```
   mysql -u root -p < schema.sql
   ```
3. Copy `.env.example` to `.env` and fill in your MySQL password.
4. Install and run:
   ```
   npm install
   npm start
   ```
5. Open http://localhost:3000

## Folder structure
```
server.js            Express app
db.js                MySQL connection pool
schema.sql           Tables + sample data
middleware/auth.js   JWT check
routes/              auth, products, orders APIs
public/              HTML, CSS, JS frontend
```

## API
| Method | URL | Auth |
|---|---|---|
| POST | /api/auth/register | - |
| POST | /api/auth/login | - |
| GET | /api/products?search=&category= | - |
| GET | /api/products/:id | - |
| POST | /api/orders | Bearer token |
| GET | /api/orders | Bearer token |
