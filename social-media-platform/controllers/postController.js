const { getPool, isMssqlConnected, memoryDb, sql } = require('../config/db');

// Create Post (Text, Image, Video)
exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, image_url, video_url } = req.body;

    if (!content && !image_url && !video_url) {
      return res.status(400).json({ success: false, message: 'Post must contain text, an image, or a video' });
    }

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('content', sql.NVarChar, content || null)
        .input('image_url', sql.NVarChar, image_url || null)
        .input('video_url', sql.NVarChar, video_url || null)
        .query(`
          INSERT INTO dbo.Posts (user_id, content, image_url, video_url)
          OUTPUT INSERTED.*
          VALUES (@userId, @content, @image_url, @video_url)
        `);

      const post = result.recordset[0];
      return res.status(201).json({ success: true, message: 'Post published!', post });
    } else {
      const newPost = {
        id: memoryDb.nextIds.posts++,
        user_id: userId,
        content: content || null,
        image_url: image_url || null,
        video_url: video_url || null,
        shares_count: 0,
        created_at: new Date()
      };
      memoryDb.posts.unshift(newPost);

      return res.status(201).json({ success: true, message: 'Post published!', post: newPost });
    }
  } catch (err) {
    console.error('Create Post Error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating post' });
  }
};

// Get All Posts (Feed)
exports.getPosts = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('currentUserId', sql.Int, currentUserId || 0)
        .query(`
          SELECT 
            p.id, p.content, p.image_url, p.video_url, p.shares_count, p.created_at,
            u.id AS user_id, u.name AS author_name, u.email AS author_email, u.avatar_url AS author_avatar,
            (SELECT COUNT(*) FROM dbo.Likes WHERE post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM dbo.Comments WHERE post_id = p.id) AS comments_count,
            CASE WHEN EXISTS (SELECT 1 FROM dbo.Likes WHERE post_id = p.id AND user_id = @currentUserId) THEN 1 ELSE 0 END AS is_liked
          FROM dbo.Posts p
          JOIN dbo.Users u ON p.user_id = u.id
          ORDER BY p.created_at DESC
        `);

      return res.json({ success: true, posts: result.recordset });
    } else {
      // Memory DB fallback
      const postsWithDetails = memoryDb.posts.map(post => {
        const author = memoryDb.users.find(u => u.id === post.user_id) || {};
        const likes = memoryDb.likes.filter(l => l.post_id === post.id);
        const comments = memoryDb.comments.filter(c => c.post_id === post.id);
        const is_liked = currentUserId ? memoryDb.likes.some(l => l.post_id === post.id && l.user_id === currentUserId) : false;

        return {
          id: post.id,
          content: post.content,
          image_url: post.image_url,
          video_url: post.video_url,
          shares_count: post.shares_count || 0,
          created_at: post.created_at,
          user_id: author.id,
          author_name: author.name || 'Anonymous',
          author_email: author.email || '',
          author_avatar: author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          likes_count: likes.length,
          comments_count: comments.length,
          is_liked: is_liked ? 1 : 0
        };
      });

      return res.json({ success: true, posts: postsWithDetails });
    }
  } catch (err) {
    console.error('Get Posts Error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching posts' });
  }
};

// Delete Post (Only post owner)
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);

    if (isMssqlConnected()) {
      const pool = getPool();
      
      // Check ownership
      const checkPost = await pool.request()
        .input('postId', sql.Int, postId)
        .query('SELECT user_id FROM dbo.Posts WHERE id = @postId');

      if (checkPost.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      if (checkPost.recordset[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this post' });
      }

      await pool.request()
        .input('postId', sql.Int, postId)
        .query('DELETE FROM dbo.Posts WHERE id = @postId');

      return res.json({ success: true, message: 'Post deleted successfully' });
    } else {
      const postIndex = memoryDb.posts.findIndex(p => p.id === postId);
      if (postIndex === -1) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      if (memoryDb.posts[postIndex].user_id !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this post' });
      }

      memoryDb.posts.splice(postIndex, 1);
      // Remove associated likes & comments
      memoryDb.likes = memoryDb.likes.filter(l => l.post_id !== postId);
      memoryDb.comments = memoryDb.comments.filter(c => c.post_id !== postId);

      return res.json({ success: true, message: 'Post deleted successfully' });
    }
  } catch (err) {
    console.error('Delete Post Error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting post' });
  }
};

// Toggle Like / Unlike
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);

    if (isMssqlConnected()) {
      const pool = getPool();
      const checkLike = await pool.request()
        .input('postId', sql.Int, postId)
        .input('userId', sql.Int, userId)
        .query('SELECT 1 FROM dbo.Likes WHERE post_id = @postId AND user_id = @userId');

      let isLiked = false;
      if (checkLike.recordset.length > 0) {
        // Unlike
        await pool.request()
          .input('postId', sql.Int, postId)
          .input('userId', sql.Int, userId)
          .query('DELETE FROM dbo.Likes WHERE post_id = @postId AND user_id = @userId');
        isLiked = false;
      } else {
        // Like
        await pool.request()
          .input('postId', sql.Int, postId)
          .input('userId', sql.Int, userId)
          .query('INSERT INTO dbo.Likes (post_id, user_id) VALUES (@postId, @userId)');
        isLiked = true;
      }

      const countRes = await pool.request()
        .input('postId', sql.Int, postId)
        .query('SELECT COUNT(*) AS count FROM dbo.Likes WHERE post_id = @postId');

      return res.json({ success: true, is_liked: isLiked, likes_count: countRes.recordset[0].count });

    } else {
      const existingIndex = memoryDb.likes.findIndex(l => l.post_id === postId && l.user_id === userId);
      let isLiked = false;

      if (existingIndex !== -1) {
        memoryDb.likes.splice(existingIndex, 1);
        isLiked = false;
      } else {
        memoryDb.likes.push({ post_id: postId, user_id: userId });
        isLiked = true;
      }

      const likesCount = memoryDb.likes.filter(l => l.post_id === postId).length;
      return res.json({ success: true, is_liked: isLiked, likes_count: likesCount });
    }
  } catch (err) {
    console.error('Toggle Like Error:', err);
    return res.status(500).json({ success: false, message: 'Server error toggling like' });
  }
};

// Share Post Count Increment
exports.sharePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    if (isMssqlConnected()) {
      const pool = getPool();
      await pool.request()
        .input('postId', sql.Int, postId)
        .query('UPDATE dbo.Posts SET shares_count = shares_count + 1 WHERE id = @postId');

      const result = await pool.request()
        .input('postId', sql.Int, postId)
        .query('SELECT shares_count FROM dbo.Posts WHERE id = @postId');

      return res.json({ success: true, shares_count: result.recordset[0]?.shares_count || 0 });
    } else {
      const post = memoryDb.posts.find(p => p.id === postId);
      if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

      post.shares_count = (post.shares_count || 0) + 1;
      return res.json({ success: true, shares_count: post.shares_count });
    }
  } catch (err) {
    console.error('Share Post Error:', err);
    return res.status(500).json({ success: false, message: 'Server error sharing post' });
  }
};
