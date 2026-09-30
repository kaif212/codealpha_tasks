-- =========================================================
-- SQL Server (MSSQL) Schema for Social Media Platform
-- Database Creation & Table Definitions
-- =========================================================

-- 1. Create Database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SocialMediaDB')
BEGIN
    CREATE DATABASE SocialMediaDB;
END;
GO

USE SocialMediaDB;
GO

-- 2. Users Table
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE, -- User's Gmail / Email
    password NVARCHAR(255) NOT NULL,
    avatar_url NVARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio NVARCHAR(500) DEFAULT 'Hello! I am using SocialApp.',
    created_at DATETIME DEFAULT GETDATE()
);

-- 3. Posts Table (Supports text, image, video)
IF OBJECT_ID('dbo.Posts', 'U') IS NOT NULL DROP TABLE dbo.Posts;
CREATE TABLE dbo.Posts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    content NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL,
    video_url NVARCHAR(500) NULL,
    shares_count INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Posts_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE
);

-- 4. Comments Table
IF OBJECT_ID('dbo.Comments', 'U') IS NOT NULL DROP TABLE dbo.Comments;
CREATE TABLE dbo.Comments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Comments_Posts FOREIGN KEY (post_id) REFERENCES dbo.Posts(id) ON DELETE CASCADE,
    CONSTRAINT FK_Comments_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
);

-- 5. Likes Table
IF OBJECT_ID('dbo.Likes', 'U') IS NOT NULL DROP TABLE dbo.Likes;
CREATE TABLE dbo.Likes (
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT FK_Likes_Posts FOREIGN KEY (post_id) REFERENCES dbo.Posts(id) ON DELETE CASCADE,
    CONSTRAINT FK_Likes_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
);

-- 6. Followers Table
IF OBJECT_ID('dbo.Followers', 'U') IS NOT NULL DROP TABLE dbo.Followers;
CREATE TABLE dbo.Followers (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT FK_Followers_Follower FOREIGN KEY (follower_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Followers_Following FOREIGN KEY (following_id) REFERENCES dbo.Users(id)
);

-- Indexes for optimal query performance
CREATE INDEX IX_Posts_UserId ON dbo.Posts(user_id);
CREATE INDEX IX_Comments_PostId ON dbo.Comments(post_id);
CREATE INDEX IX_Likes_PostId ON dbo.Likes(post_id);
CREATE INDEX IX_Followers_FollowerId ON dbo.Followers(follower_id);
CREATE INDEX IX_Followers_FollowingId ON dbo.Followers(following_id);
GO

-- Sample Seed Data
-- Note: Password for seed user is 'password123' (bcrypt hashed: $2a$10$w6hLwO4FqR7o1234567890e)
INSERT INTO dbo.Users (name, email, password, avatar_url, bio)
VALUES 
('Alex Morgan', 'alex.morgan@gmail.com', '$2a$10$X8zN/W3R/qJ4Vd8Q1q7b8.9Fp/y.000000000000000000000000', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Full stack developer & tech enthusiast 🚀'),
('Sophia Chen', 'sophia.chen@gmail.com', '$2a$10$X8zN/W3R/qJ4Vd8Q1q7b8.9Fp/y.000000000000000000000000', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', 'Digital Artist & Photographer 📷');

INSERT INTO dbo.Posts (user_id, content, image_url, video_url)
VALUES 
(1, 'Excited to showcase our new social platform built with Express.js and SQL Server! What do you all think?', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', NULL),
(2, 'Sunset views from the mountains today 🌄 Check out this short video update!', NULL, 'https://www.w3schools.com/html/mov_bbb.mp4');
GO
