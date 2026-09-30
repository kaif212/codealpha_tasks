const sql = require('mssql');
require('dotenv').config();

// SQL Server Configuration
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrong@Password123',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SocialMediaDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // true for azure, false for local
    trustServerCertificate: true, // for local dev with self-signed certs
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;
let isMssqlConnected = false;

// In-Memory database store for offline dev fallback (so server works 100% out of the box)
const memoryDb = {
  users: [
    {
      id: 1,
      name: 'Alex Morgan',
      email: 'alex.morgan@gmail.com',
      password: '$2a$10$w6hLwO4FqR7oE/KSm2AWOeeZpGH3y8yOaK.zRKGc8E/S10p4jVrmm', // bcrypt hash for 'password123'
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Full stack developer & tech enthusiast 🚀',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Sophia Chen',
      email: 'sophia.chen@gmail.com',
      password: '$2a$10$w6hLwO4FqR7oE/KSm2AWOeeZpGH3y8yOaK.zRKGc8E/S10p4jVrmm',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      bio: 'Digital Artist & Photographer 📷',
      created_at: new Date()
    }
  ],
  posts: [
    {
      id: 1,
      user_id: 1,
      content: 'Excited to showcase our new social platform built with Express.js and SQL Server! What do you all think? 🚀',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      video_url: null,
      shares_count: 5,
      created_at: new Date(Date.now() - 3600000)
    },
    {
      id: 2,
      user_id: 2,
      content: 'Sunset views from the mountains today 🌄 Check out this short video update!',
      image_url: null,
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      shares_count: 2,
      created_at: new Date(Date.now() - 7200000)
    }
  ],
  comments: [
    {
      id: 1,
      post_id: 1,
      user_id: 2,
      comment_text: 'Awesome project Alex! Loving the modern UI aesthetics! 🔥',
      created_at: new Date(Date.now() - 1800000)
    }
  ],
  likes: [
    { post_id: 1, user_id: 2 },
    { post_id: 2, user_id: 1 }
  ],
  followers: [
    { follower_id: 1, following_id: 2 },
    { follower_id: 2, following_id: 1 }
  ],
  nextIds: { users: 3, posts: 3, comments: 2 }
};

// Initialize MSSQL connection
async function connectDB() {
  try {
    pool = await sql.connect(dbConfig);
    isMssqlConnected = true;
    console.log('✅ Connected to SQL Server (MSSQL) successfully.');
  } catch (err) {
    console.log('⚠️ Could not connect to SQL Server (MSSQL). Defaulting to embedded fallback mode for local testing.');
    console.log('   Error info:', err.message);
    isMssqlConnected = false;
  }
}

// Get pool or MSSQL object
function getPool() {
  return pool;
}

module.exports = {
  connectDB,
  getPool,
  isMssqlConnected: () => isMssqlConnected,
  memoryDb,
  sql
};
