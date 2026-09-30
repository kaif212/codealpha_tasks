const { getPool, isMssqlConnected, memoryDb, sql } = require('../config/db');

// Add Comment to Post
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);
    const { comment_text } = req.body;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty' });
    }

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('postId', sql.Int, postId)
        .input('userId', sql.Int, userId)
        .input('commentText', sql.NVarChar, comment_text.trim())
        .query(`
          INSERT INTO dbo.Comments (post_id, user_id, comment_text)
          OUTPUT INSERTED.*
          VALUES (@postId, @userId, @commentText)
        `);

      const comment = result.recordset[0];
      
      // Get author details
      const userRes = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT name, email, avatar_url FROM dbo.Users WHERE id = @userId');

      const user = userRes.recordset[0];

      return res.status(201).json({
        success: true,
        message: 'Comment added',
        comment: {
          ...comment,
          author_name: user.name,
          author_email: user.email,
          author_avatar: user.avatar_url
        }
      });
    } else {
      const user = memoryDb.users.find(u => u.id === userId) || {};
      const newComment = {
        id: memoryDb.nextIds.comments++,
        post_id: postId,
        user_id: userId,
        comment_text: comment_text.trim(),
        created_at: new Date()
      };

      memoryDb.comments.push(newComment);

      return res.status(201).json({
        success: true,
        message: 'Comment added',
        comment: {
          ...newComment,
          author_name: user.name || 'User',
          author_email: user.email || '',
          author_avatar: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        }
      });
    }
  } catch (err) {
    console.error('Add Comment Error:', err);
    return res.status(500).json({ success: false, message: 'Server error adding comment' });
  }
};

// Get Comments for Post
exports.getComments = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (isMssqlConnected()) {
      const pool = getPool();
      const result = await pool.request()
        .input('postId', sql.Int, postId)
        .query(`
          SELECT 
            c.id, c.post_id, c.user_id, c.comment_text, c.created_at,
            u.name AS author_name, u.email AS author_email, u.avatar_url AS author_avatar
          FROM dbo.Comments c
          JOIN dbo.Users u ON c.user_id = u.id
          WHERE c.post_id = @postId
          ORDER BY c.created_at ASC
        `);

      return res.json({ success: true, comments: result.recordset });
    } else {
      const comments = memoryDb.comments
        .filter(c => c.post_id === postId)
        .map(c => {
          const user = memoryDb.users.find(u => u.id === c.user_id) || {};
          return {
            ...c,
            author_name: user.name || 'User',
            author_email: user.email || '',
            author_avatar: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };
        });

      return res.json({ success: true, comments });
    }
  } catch (err) {
    console.error('Get Comments Error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching comments' });
  }
};
