const { getPool, isMssqlConnected, memoryDb, sql } = require('../config/db');

// Get User Profile by ID
exports.getUserById = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user ? req.user.id : null;

    if (isMssqlConnected()) {
      const pool = getPool();
      const userRes = await pool.request()
        .input('targetUserId', sql.Int, targetUserId)
        .query('SELECT id, name, email, avatar_url, bio, created_at FROM dbo.Users WHERE id = @targetUserId');

      if (userRes.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userRes.recordset[0];
      const statsRes = await pool.request()
        .input('targetUserId', sql.Int, targetUserId)
        .input('currentUserId', sql.Int, currentUserId || 0)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM dbo.Followers WHERE following_id = @targetUserId) AS followersCount,
            (SELECT COUNT(*) FROM dbo.Followers WHERE follower_id = @targetUserId) AS followingCount,
            (SELECT COUNT(*) FROM dbo.Posts WHERE user_id = @targetUserId) AS postsCount,
            CASE WHEN EXISTS (SELECT 1 FROM dbo.Followers WHERE follower_id = @currentUserId AND following_id = @targetUserId) THEN 1 ELSE 0 END AS is_following
        `);

      const stats = statsRes.recordset[0];

      return res.json({
        success: true,
        user: {
          ...user,
          followersCount: stats.followersCount,
          followingCount: stats.followingCount,
          postsCount: stats.postsCount,
          is_following: stats.is_following === 1
        }
      });
    } else {
      const user = memoryDb.users.find(u => u.id === targetUserId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const followersCount = memoryDb.followers.filter(f => f.following_id === targetUserId).length;
      const followingCount = memoryDb.followers.filter(f => f.follower_id === targetUserId).length;
      const postsCount = memoryDb.posts.filter(p => p.user_id === targetUserId).length;
      const is_following = currentUserId ? memoryDb.followers.some(f => f.follower_id === currentUserId && f.following_id === targetUserId) : false;

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: user.created_at,
          followersCount,
          followingCount,
          postsCount,
          is_following
        }
      });
    }
  } catch (err) {
    console.error('Get User By ID Error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

// Toggle Follow / Unfollow User
exports.toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.id);

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    if (isMssqlConnected()) {
      const pool = getPool();
      const checkRes = await pool.request()
        .input('followerId', sql.Int, followerId)
        .input('followingId', sql.Int, followingId)
        .query('SELECT 1 FROM dbo.Followers WHERE follower_id = @followerId AND following_id = @followingId');

      let isFollowing = false;
      if (checkRes.recordset.length > 0) {
        // Unfollow
        await pool.request()
          .input('followerId', sql.Int, followerId)
          .input('followingId', sql.Int, followingId)
          .query('DELETE FROM dbo.Followers WHERE follower_id = @followerId AND following_id = @followingId');
        isFollowing = false;
      } else {
        // Follow
        await pool.request()
          .input('followerId', sql.Int, followerId)
          .input('followingId', sql.Int, followingId)
          .query('INSERT INTO dbo.Followers (follower_id, following_id) VALUES (@followerId, @followingId)');
        isFollowing = true;
      }

      const countRes = await pool.request()
        .input('followingId', sql.Int, followingId)
        .query('SELECT COUNT(*) AS count FROM dbo.Followers WHERE following_id = @followingId');

      return res.json({
        success: true,
        is_following: isFollowing,
        followersCount: countRes.recordset[0].count
      });
    } else {
      const existingIndex = memoryDb.followers.findIndex(f => f.follower_id === followerId && f.following_id === followingId);
      let isFollowing = false;

      if (existingIndex !== -1) {
        memoryDb.followers.splice(existingIndex, 1);
        isFollowing = false;
      } else {
        memoryDb.followers.push({ follower_id: followerId, following_id: followingId });
        isFollowing = true;
      }

      const followersCount = memoryDb.followers.filter(f => f.following_id === followingId).length;

      return res.json({
        success: true,
        is_following: isFollowing,
        followersCount
      });
    }
  } catch (err) {
    console.error('Toggle Follow Error:', err);
    return res.status(500).json({ success: false, message: 'Server error toggling follow state' });
  }
};
