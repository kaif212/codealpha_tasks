-- Social Media Platform MySQL Schema
CREATE DATABASE IF NOT EXISTS social_db;
USE social_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Likes Table
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Follows Table
CREATE TABLE IF NOT EXISTS follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Data for Users & Posts
INSERT INTO users (username, email, password, bio, avatar_url) VALUES
('alex_tech', 'alex@example.com', '$2a$10$Wp83GZlhP8tBwF9N1X8e/.E8qLg0H9R8yv9s3k1K3B0v.', 'Full-stack developer building cool apps with Node.js & React 🚀', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80'),
('sarah_design', 'sarah@example.com', '$2a$10$Wp83GZlhP8tBwF9N1X8e/.E8qLg0H9R8yv9s3k1K3B0v.', 'UI/UX Designer crafting smooth digital experiences 🎨✨', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80');

INSERT INTO posts (user_id, content, image_url) VALUES
(1, 'Just shipped our new full-stack Express & MySQL API! Feels awesome to write clean database queries.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80'),
(2, 'Working on vibrant glassmorphic UI cards today. Dark mode gradients always look stunning!', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80');
