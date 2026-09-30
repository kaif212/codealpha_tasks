// =========================================================
// NexusSocial - Frontend SPA Application Engine
// =========================================================

const API_BASE = '/api';

// State Management
let currentUser = JSON.parse(localStorage.getItem('nexus_user')) || null;
let authToken = localStorage.getItem('nexus_token') || null;
let currentPosts = [];
let activePostForComments = null;

// DOM Elements
const authNavButtons = document.getElementById('authNavButtons');
const userProfileNav = document.getElementById('userProfileNav');
const navAvatar = document.getElementById('navAvatar');
const profileDropdown = document.getElementById('profileDropdown');
const dropdownName = document.getElementById('dropdownName');
const dropdownEmail = document.getElementById('dropdownEmail');
const sidebarUserCard = document.getElementById('sidebarUserCard');
const postsStream = document.getElementById('postsStream');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthState();
  loadPosts();
});

// Setup All Event Listeners
function setupEventListeners() {
  // Navigation & Dropdown
  navAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    profileDropdown.classList.remove('active');
  });

  // Auth Modal Controls
  document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('openSignupBtn').addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
  document.getElementById('switchToSignup').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthView('signup');
  });
  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthView('login');
  });

  // Auth Form Submissions
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Profile Views
  document.getElementById('navMyProfileBtn').addEventListener('click', () => openProfileModal(currentUser.id));
  document.getElementById('menuMyProfile').addEventListener('click', () => {
    if (!currentUser) return openAuthModal('login');
    openProfileModal(currentUser.id);
  });
  document.getElementById('closeProfileModal').addEventListener('click', () => {
    document.getElementById('profileModal').classList.remove('active');
  });

  // Create Post Modal Controls
  document.getElementById('openCreatePostBtn').addEventListener('click', openCreatePostModal);
  document.getElementById('quickPostInput').addEventListener('click', openCreatePostModal);
  document.getElementById('quickPostBtn').addEventListener('click', openCreatePostModal);
  document.getElementById('closeCreatePostModal').addEventListener('click', closeCreatePostModal);
  document.getElementById('cancelCreatePost').addEventListener('click', closeCreatePostModal);
  document.getElementById('createPostForm').addEventListener('submit', handleCreatePost);

  // Post Media Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Comments Modal Controls
  document.getElementById('closeCommentsModal').addEventListener('click', () => {
    document.getElementById('commentsModal').classList.remove('active');
  });
  document.getElementById('addCommentForm').addEventListener('submit', handleAddComment);

  // Search Filter
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = currentPosts.filter(p => 
      (p.content && p.content.toLowerCase().includes(query)) ||
      (p.author_name && p.author_name.toLowerCase().includes(query))
    );
    renderPosts(filtered);
  });
}

// Authentication State Verification
async function checkAuthState() {
  if (authToken && currentUser) {
    authNavButtons.classList.add('hidden');
    userProfileNav.classList.remove('hidden');
    sidebarUserCard.classList.remove('hidden');

    navAvatar.src = currentUser.avatar_url;
    dropdownName.textContent = currentUser.name;
    dropdownEmail.textContent = currentUser.email;

    // Sidebar User Info
    document.getElementById('sidebarAvatar').src = currentUser.avatar_url;
    document.getElementById('sidebarName').textContent = currentUser.name;
    document.getElementById('sidebarEmail').innerHTML = `<i class="fa-regular fa-envelope"></i> ${currentUser.email}`;
    document.getElementById('sidebarBio').textContent = currentUser.bio || 'Welcome to NexusSocial!';
    document.getElementById('composerAvatar').src = currentUser.avatar_url;

    // Fetch refreshed user profile details
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        document.getElementById('sidebarPostsCount').textContent = currentUser.postsCount || 0;
        document.getElementById('sidebarFollowersCount').textContent = currentUser.followersCount || 0;
        document.getElementById('sidebarFollowingCount').textContent = currentUser.followingCount || 0;
      }
    } catch (err) {
      console.warn('Could not refresh profile stats:', err);
    }
  } else {
    authNavButtons.classList.remove('hidden');
    userProfileNav.classList.add('hidden');
    sidebarUserCard.classList.add('hidden');
  }
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('nexus_token', authToken);
      localStorage.setItem('nexus_user', JSON.stringify(currentUser));
      
      closeAuthModal();
      checkAuthState();
      loadPosts();
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
    } else {
      showToast(data.message || 'Login failed', 'info');
    }
  } catch (err) {
    showToast('Error connecting to server', 'info');
  }
}

// Signup Handler
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const avatar_url = document.getElementById('signupAvatar').value;
  const bio = document.getElementById('signupBio').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, avatar_url, bio })
    });
    const data = await res.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('nexus_token', authToken);
      localStorage.setItem('nexus_user', JSON.stringify(currentUser));

      closeAuthModal();
      checkAuthState();
      loadPosts();
      showToast(`Account created successfully! Welcome ${currentUser.name}`, 'success');
    } else {
      showToast(data.message || 'Registration failed', 'info');
    }
  } catch (err) {
    showToast('Error connecting to server', 'info');
  }
}

// Logout Handler
function handleLogout() {
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('nexus_user');
  authToken = null;
  currentUser = null;
  checkAuthState();
  loadPosts();
  showToast('Logged out successfully', 'info');
}

// Fetch & Render Posts Stream
async function loadPosts() {
  postsStream.innerHTML = `
    <div class="loading-spinner" style="text-align: center; padding: 30px;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i>
      <p style="margin-top: 10px; color: var(--text-muted);">Loading community posts...</p>
    </div>
  `;

  try {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const res = await fetch(`${API_BASE}/posts`, { headers });
    const data = await res.json();

    if (data.success) {
      currentPosts = data.posts;
      renderPosts(currentPosts);
    }
  } catch (err) {
    postsStream.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--danger);">Failed to load posts.</p>`;
  }
}

// Render Posts List to DOM
function renderPosts(posts) {
  if (!posts || posts.length === 0) {
    postsStream.innerHTML = `
      <div class="card" style="text-align:center; padding: 40px;">
        <i class="fa-regular fa-folder-open" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
        <h3>No posts yet</h3>
        <p style="color: var(--text-muted);">Be the first one to share an update with text, image, or video!</p>
      </div>
    `;
    return;
  }

  postsStream.innerHTML = posts.map(post => {
    const isOwner = currentUser && currentUser.id === post.user_id;
    const timeAgo = formatTimeAgo(post.created_at);

    let mediaHtml = '';
    if (post.image_url) {
      mediaHtml = `
        <div class="post-media-container">
          <img src="${escapeHtml(post.image_url)}" alt="Post image" loading="lazy">
        </div>
      `;
    } else if (post.video_url) {
      mediaHtml = `
        <div class="post-media-container">
          <video controls preload="metadata">
            <source src="${escapeHtml(post.video_url)}">
            Your browser does not support video playback.
          </video>
        </div>
      `;
    }

    return `
      <article class="card post-card" data-id="${post.id}">
        <div class="post-header">
          <div class="post-author" onclick="openProfileModal(${post.user_id})">
            <img src="${escapeHtml(post.author_avatar)}" class="author-img" alt="${escapeHtml(post.author_name)}">
            <div class="author-info">
              <h4>${escapeHtml(post.author_name)}</h4>
              <span class="author-email"><i class="fa-regular fa-envelope"></i> ${escapeHtml(post.author_email)}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="post-time">${timeAgo}</span>
            ${isOwner ? `
              <button class="delete-post-btn" onclick="handleDeletePost(${post.id})" title="Delete Post">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </div>

        ${post.content ? `<p class="post-content">${escapeHtml(post.content)}</p>` : ''}
        ${mediaHtml}

        <div class="post-actions">
          <button class="action-btn ${post.is_liked ? 'liked' : ''}" onclick="handleToggleLike(${post.id}, this)">
            <i class="${post.is_liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            <span class="like-count">${post.likes_count}</span>
          </button>
          
          <button class="action-btn" onclick="openCommentsModal(${post.id})">
            <i class="fa-regular fa-comment"></i>
            <span>${post.comments_count}</span>
          </button>
          
          <button class="action-btn" onclick="handleSharePost(${post.id}, this)">
            <i class="fa-regular fa-share-from-square"></i>
            <span class="share-count">${post.shares_count || 0}</span>
          </button>
        </div>
      </article>
    `;
  }).join('');
}

// Create New Post Submission
async function handleCreatePost(e) {
  e.preventDefault();
  if (!currentUser) return openAuthModal('login');

  const content = document.getElementById('postContentInput').value;
  const image_url = document.getElementById('postImageUrl').value;
  const video_url = document.getElementById('postVideoUrl').value;

  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ content, image_url, video_url })
    });
    const data = await res.json();

    if (data.success) {
      closeCreatePostModal();
      loadPosts();
      checkAuthState();
      showToast('Post published successfully!', 'success');
    } else {
      showToast(data.message || 'Failed to publish post', 'info');
    }
  } catch (err) {
    showToast('Error publishing post', 'info');
  }
}

// Delete Post
async function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.success) {
      loadPosts();
      checkAuthState();
      showToast('Post deleted', 'info');
    } else {
      showToast(data.message || 'Failed to delete post', 'info');
    }
  } catch (err) {
    showToast('Error deleting post', 'info');
  }
}

// Toggle Like / Unlike
async function handleToggleLike(postId, btnElement) {
  if (!currentUser) return openAuthModal('login');

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.success) {
      const heartIcon = btnElement.querySelector('i');
      const countSpan = btnElement.querySelector('.like-count');

      countSpan.textContent = data.likes_count;
      if (data.is_liked) {
        btnElement.classList.add('liked');
        heartIcon.className = 'fa-solid fa-heart';
      } else {
        btnElement.classList.remove('liked');
        heartIcon.className = 'fa-regular fa-heart';
      }
    }
  } catch (err) {
    showToast('Could not process like action', 'info');
  }
}

// Share Post Action
async function handleSharePost(postId, btnElement) {
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/share`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      const shareSpan = btnElement.querySelector('.share-count');
      if (shareSpan) shareSpan.textContent = data.shares_count;

      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/#post-${postId}`;
      navigator.clipboard.writeText(shareUrl).catch(() => {});

      showToast('Post link copied to clipboard!', 'success');
    }
  } catch (err) {
    showToast('Link copied to clipboard!', 'info');
  }
}

// Profile Modal View
async function openProfileModal(userId) {
  const modal = document.getElementById('profileModal');
  modal.classList.add('active');

  try {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const res = await fetch(`${API_BASE}/users/${userId}`, { headers });
    const data = await res.json();

    if (data.success) {
      const user = data.user;
      document.getElementById('profileModalAvatar').src = user.avatar_url;
      document.getElementById('profileModalName').textContent = user.name;
      document.getElementById('profileModalEmail').textContent = user.email; // Gmail explicitly displayed
      document.getElementById('profileModalBio').textContent = user.bio || 'No bio provided.';
      document.getElementById('profileModalPostsCount').textContent = user.postsCount || 0;
      document.getElementById('profileModalFollowersCount').textContent = user.followersCount || 0;
      document.getElementById('profileModalFollowingCount').textContent = user.followingCount || 0;

      const actionsDiv = document.getElementById('profileModalActions');
      if (currentUser && currentUser.id === user.id) {
        actionsDiv.innerHTML = `<span class="badge" style="background: rgba(99, 102, 241, 0.2); color: var(--primary);">Your Account</span>`;
      } else {
        actionsDiv.innerHTML = `
          <button class="btn ${user.is_following ? 'btn-outline' : 'btn-primary'}" onclick="handleToggleFollow(${user.id}, this)">
            <i class="fa-solid ${user.is_following ? 'fa-user-check' : 'fa-user-plus'}"></i>
            <span>${user.is_following ? 'Following' : 'Follow Creator'}</span>
          </button>
        `;
      }

      // Render User's Specific Posts
      const userPosts = currentPosts.filter(p => p.user_id === user.id);
      const postsContainer = document.getElementById('profileUserPosts');
      if (userPosts.length === 0) {
        postsContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 15px;">No posts published yet.</p>`;
      } else {
        postsContainer.innerHTML = userPosts.map(p => `
          <div class="card" style="margin-bottom: 10px; padding: 14px; text-align: left;">
            <p>${escapeHtml(p.content || 'Media Post')}</p>
            <span style="font-size: 11px; color: var(--text-muted);">${formatTimeAgo(p.created_at)}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load user profile', 'info');
  }
}

// Toggle Follow / Unfollow Creator
async function handleToggleFollow(userId, btnElement) {
  if (!currentUser) return openAuthModal('login');

  try {
    const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('profileModalFollowersCount').textContent = data.followersCount;
      if (data.is_following) {
        btnElement.className = 'btn btn-outline';
        btnElement.innerHTML = `<i class="fa-solid fa-user-check"></i> Following`;
        showToast('You are now following this creator!', 'success');
      } else {
        btnElement.className = 'btn btn-primary';
        btnElement.innerHTML = `<i class="fa-solid fa-user-plus"></i> Follow Creator`;
        showToast('Unfollowed creator', 'info');
      }
      checkAuthState();
    }
  } catch (err) {
    showToast('Error toggling follow state', 'info');
  }
}

// Comments Modal & Drawer
async function openCommentsModal(postId) {
  activePostForComments = postId;
  const modal = document.getElementById('commentsModal');
  modal.classList.add('active');

  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = `<p style="text-align:center; padding: 15px;">Loading comments...</p>`;

  try {
    const res = await fetch(`${API_BASE}/comments/${postId}`);
    const data = await res.json();

    if (data.success) {
      if (data.comments.length === 0) {
        commentsList.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 15px;">No comments yet. Start the conversation!</p>`;
      } else {
        commentsList.innerHTML = data.comments.map(c => `
          <div class="comment-item">
            <img src="${escapeHtml(c.author_avatar)}" alt="Commenter">
            <div class="comment-body">
              <h5>${escapeHtml(c.author_name)} <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">• ${formatTimeAgo(c.created_at)}</span></h5>
              <p>${escapeHtml(c.comment_text)}</p>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    commentsList.innerHTML = `<p style="text-align:center; color: var(--danger);">Failed to load comments.</p>`;
  }
}

// Add Comment Handler
async function handleAddComment(e) {
  e.preventDefault();
  if (!currentUser) return openAuthModal('login');

  const input = document.getElementById('commentTextInput');
  const comment_text = input.value;

  try {
    const res = await fetch(`${API_BASE}/comments/${activePostForComments}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ comment_text })
    });
    const data = await res.json();

    if (data.success) {
      input.value = '';
      openCommentsModal(activePostForComments);
      loadPosts();
    } else {
      showToast(data.message || 'Failed to add comment', 'info');
    }
  } catch (err) {
    showToast('Error adding comment', 'info');
  }
}

// Modal Helpers
function openAuthModal(view = 'login') {
  toggleAuthView(view);
  document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

function toggleAuthView(view) {
  const loginView = document.getElementById('loginView');
  const signupView = document.getElementById('signupView');
  if (view === 'signup') {
    loginView.classList.add('hidden');
    signupView.classList.remove('hidden');
  } else {
    signupView.classList.add('hidden');
    loginView.classList.remove('hidden');
  }
}

function openCreatePostModal() {
  if (!currentUser) return openAuthModal('login');
  document.getElementById('createPostModal').classList.add('active');
}

function closeCreatePostModal() {
  document.getElementById('createPostForm').reset();
  document.getElementById('createPostModal').classList.remove('active');
}

// Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
