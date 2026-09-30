CREATE DATABASE IF NOT EXISTS shopease;
USE shopease;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(60),
  image VARCHAR(500),
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  address VARCHAR(500) NOT NULL,
  status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (name, description, price, category, image, stock) VALUES
('Wireless Headphones', 'Noise-cancelling over-ear headphones with 30-hour battery life and deep bass.', 2999.00, 'Electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 25),
('Smart Watch', 'Fitness tracking, heart-rate monitor, notifications and 7-day battery.', 4499.00, 'Electronics', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', 40),
('Running Shoes', 'Lightweight breathable running shoes with cushioned sole.', 3299.00, 'Fashion', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 30),
('Leather Backpack', 'Premium leather backpack with laptop sleeve, fits 15-inch laptops.', 2499.00, 'Fashion', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', 15),
('Sunglasses', 'UV400 polarized sunglasses with a classic frame.', 999.00, 'Fashion', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600', 50),
('Bluetooth Speaker', 'Portable waterproof speaker with 360-degree sound.', 1799.00, 'Electronics', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', 35),
('Coffee Mug Set', 'Set of 4 ceramic mugs, microwave and dishwasher safe.', 699.00, 'Home', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600', 60),
('Desk Lamp', 'LED desk lamp with 3 brightness levels and USB charging port.', 1299.00, 'Home', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', 20);
