const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, isMssqlConnected, memoryDb, sql } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Helper to format user response (excluding password)
const formatUser = (user, followersCount = 0, followingCount = 0, postsCount = 0) => ({
  id: user.id,
  name: user.name,
  email: user.email, // Gmail/Email displayed in profile
  avatar_url: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  bio: user.bio || '',
  created_at: user.created_at,
  followersCount,
  followingCount,
  postsCount
});

// Signup / Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, avatar_url, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultAvatar = avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    const defaultBio = bio || 'Hello! I am using SocialApp.';

    if (isMssqlConnected()) {
      const pool = getPool();
      
      // Check if user exists
      const checkUser = await pool.request()
        .input('email', sql.NVarChar, trimmedEmail)
        .query('SELECT id FROM dbo.Users WHERE email = @email');

      if (checkUser.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      // Insert new user into MSSQL
      const result = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('email', sql.NVarChar, trimmedEmail)
        .input('password', sql.NVarChar, hashedPassword)
        .input('avatar_url', sql.NVarChar, defaultAvatar)
        .input('bio', sql.NVarChar, defaultBio)
        .query(`
          INSERT INTO dbo.Users (name, email, password, avatar_url, bio)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.avatar_url, INSERTED.bio, INSERTED.created_at
          VALUES (@name, @email, @password, @avatar_url, @bio)
        `);

      const newUser = result.recordset[0];
      const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: formatUser(newUser, 0, 0, 0)
      });

    } else {
      // Memory DB fallback
      const existingUser = memoryDb.users.find(u => u.email.toLowerCase() === trimmedEmail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const newUser = {
        id: memoryDb.nextIds.users++,
        name: name.trim(),
        email: trimmedEmail,
        password: hashedPassword,
        avatar_url: defaultAvatar,
        bio: defaultBio,
        created_at: new Date()
      };

      memoryDb.users.push(newUser);
      const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: formatUser(newUser, 0, 0, 0)
      });
    }
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('email', sql.NVarChar, trimmedEmail)
        .query('SELECT * FROM dbo.Users WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = result.recordset[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // Fetch stats
      const stats = await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM dbo.Followers WHERE following_id = @userId) AS followersCount,
            (SELECT COUNT(*) FROM dbo.Followers WHERE follower_id = @userId) AS followingCount,
            (SELECT COUNT(*) FROM dbo.Posts WHERE user_id = @userId) AS postsCount
        `);

      const { followersCount, followingCount, postsCount } = stats.recordset[0];
      const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: formatUser(user, followersCount, followingCount, postsCount)
      });

    } else {
      // Memory DB fallback
      const user = memoryDb.users.find(u => u.email.toLowerCase() === trimmedEmail);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const followersCount = memoryDb.followers.filter(f => f.following_id === user.id).length;
      const followingCount = memoryDb.followers.filter(f => f.follower_id === user.id).length;
      const postsCount = memoryDb.posts.filter(p => p.user_id === user.id).length;

      const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: formatUser(user, followersCount, followingCount, postsCount)
      });
    }
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Get Current Logged-In User Profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT id, name, email, avatar_url, bio, created_at FROM dbo.Users WHERE id = @userId');

      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = result.recordset[0];
      const stats = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM dbo.Followers WHERE following_id = @userId) AS followersCount,
            (SELECT COUNT(*) FROM dbo.Followers WHERE follower_id = @userId) AS followingCount,
            (SELECT COUNT(*) FROM dbo.Posts WHERE user_id = @userId) AS postsCount
        `);

      const { followersCount, followingCount, postsCount } = stats.recordset[0];

      return res.json({
        success: true,
        user: formatUser(user, followersCount, followingCount, postsCount)
      });
    } else {
      const user = memoryDb.users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const followersCount = memoryDb.followers.filter(f => f.following_id === user.id).length;
      const followingCount = memoryDb.followers.filter(f => f.follower_id === user.id).length;
      const postsCount = memoryDb.posts.filter(p => p.user_id === user.id).length;

      return res.json({
        success: true,
        user: formatUser(user, followersCount, followingCount, postsCount)
      });
    }
  } catch (err) {
    console.error('Get Current User Error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, avatar_url } = req.body;

    if (isMssqlConnected()) {
      const pool = getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar, name || null)
        .input('bio', sql.NVarChar, bio || null)
        .input('avatar_url', sql.NVarChar, avatar_url || null)
        .query(`
          UPDATE dbo.Users 
          SET 
            name = COALESCE(@name, name),
            bio = COALESCE(@bio, bio),
            avatar_url = COALESCE(@avatar_url, avatar_url)
          WHERE id = @userId
        `);
      return res.json({ success: true, message: 'Profile updated successfully' });
    } else {
      const user = memoryDb.users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (name) user.name = name;
      if (bio !== undefined) user.bio = bio;
      if (avatar_url) user.avatar_url = avatar_url;

      return res.json({ success: true, message: 'Profile updated successfully', user: formatUser(user) });
    }
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};
