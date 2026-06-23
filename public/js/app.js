// Aether - Application JavaScript Logic

let currentUser = null;
let activeView = 'home';
let activeProfileUser = null;
let feedFilter = 'explore'; // 'explore' or 'feed' (following)
let selectedPostForComment = null;

// Temporary states for media upload
let quickPostImage = '';
let modalPostImage = '';
let editProfileAvatar = '';
let editProfileBanner = '';

// Toast Notification Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Animate in
  setTimeout(() => toast.classList.add('active'), 10);

  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Switch Auth Tabs (Login / Register)
function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('tab-login-btn');
  const regTabBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (tab === 'login') {
    loginTabBtn.classList.add('active');
    regTabBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    regTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

// Handle login submission
async function handleLogin(e) {
  e.preventDefault();
  const usernameVal = document.getElementById('login-username').value;
  const passwordVal = document.getElementById('login-password').value;

  try {
    const user = await api.login(usernameVal, passwordVal);
    currentUser = user;
    showToast(`Welcome back, ${user.displayName}!`, 'success');
    bootApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle registration submission
async function handleRegister(e) {
  e.preventDefault();
  const usernameVal = document.getElementById('reg-username').value;
  const displayNameVal = document.getElementById('reg-displayname').value;
  const passwordVal = document.getElementById('reg-password').value;

  try {
    const user = await api.register(usernameVal, passwordVal, displayNameVal);
    currentUser = user;
    showToast(`Account successfully created! Welcome, ${user.displayName}!`, 'success');
    bootApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Logout
async function handleLogout() {
  try {
    await api.logout();
    currentUser = null;
    document.getElementById('app-layout').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    showToast('Logged out successfully');
  } catch (err) {
    showToast('Logout failed', 'error');
  }
}

// Check session on start
async function checkSession() {
  try {
    const user = await api.getMe();
    if (user) {
      currentUser = user;
      bootApp();
    } else {
      document.getElementById('auth-screen').classList.add('active');
      document.getElementById('app-layout').classList.remove('active');
    }
  } catch (err) {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('app-layout').classList.remove('active');
  }
}

// Initialize and transition to authenticated app state
function bootApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-layout').classList.add('active');
  
  // Setup sidebar user info
  document.getElementById('sidebar-avatar').src = currentUser.avatar;
  document.getElementById('sidebar-displayname').textContent = currentUser.displayName;
  document.getElementById('sidebar-username').textContent = `@${currentUser.username}`;
  
  // Setup all user avatars in feed/inputs
  document.querySelectorAll('.my-avatar-img').forEach(img => {
    img.src = currentUser.avatar;
  });

  navigateTo('home');
  loadWhoToFollow();
  loadStats();
  
  // Clear forms
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
}

// Navigation Router
function navigateTo(viewName) {
  activeView = viewName;
  
  // Toggle Active views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Toggle active nav menu highlights
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNav) activeNav.classList.add('active');

  const titleEl = document.getElementById('view-title');
  const filterTabs = document.getElementById('feed-filter-tabs');

  if (viewName === 'home') {
    document.getElementById('view-home').classList.add('active');
    titleEl.textContent = 'Home Feed';
    filterTabs.classList.remove('hidden');
    loadFeed();
  } else if (viewName === 'explore') {
    document.getElementById('view-home').classList.add('active');
    titleEl.textContent = 'Explore';
    filterTabs.classList.add('hidden');
    // Set tab to active and load explore feed
    feedFilter = 'explore';
    loadFeed();
  }
}

// Navigation to profile view (either current user or other)
async function navigateToProfile(username) {
  // Toggle Views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const profileView = document.getElementById('view-profile');
  profileView.classList.add('active');
  
  // Highlight navigation item if it's the current user profile
  const targetUsername = username || currentUser.username;
  if (targetUsername === currentUser.username) {
    document.getElementById('nav-my-profile').classList.add('active');
    document.getElementById('view-title').textContent = 'My Profile';
  } else {
    document.getElementById('view-title').textContent = `${targetUsername}'s Profile`;
  }
  
  document.getElementById('feed-filter-tabs').classList.add('hidden');

  try {
    const data = await api.getUserProfile(targetUsername);
    activeProfileUser = data.user;
    
    // Render profile details
    document.getElementById('profile-avatar-img').src = data.user.avatar;
    document.getElementById('profile-banner-img').src = data.user.banner;
    document.getElementById('profile-display-name').textContent = data.user.displayName;
    document.getElementById('profile-username-lbl').textContent = `@${data.user.username}`;
    document.getElementById('profile-bio-text').textContent = data.user.bio || 'No bio provided yet.';
    document.getElementById('profile-followers-count').textContent = data.user.followersCount;
    document.getElementById('profile-following-count').textContent = data.user.followingCount;

    // Toggle button visibility based on self profile vs other
    const editBtn = document.getElementById('btn-edit-profile');
    const followBtn = document.getElementById('btn-follow-user');

    if (data.user.id === currentUser.id) {
      editBtn.classList.remove('hidden');
      followBtn.classList.add('hidden');
    } else {
      editBtn.classList.add('hidden');
      followBtn.classList.remove('hidden');
      
      // Update follow button text
      if (data.user.isFollowing) {
        followBtn.textContent = 'Unfollow';
        followBtn.className = 'btn btn-secondary';
      } else {
        followBtn.textContent = 'Follow';
        followBtn.className = 'btn btn-primary';
      }
    }

    // Render User's posts
    renderPosts(data.posts, '#profile-posts-container');

  } catch (err) {
    showToast('Error loading profile: ' + err.message, 'error');
    navigateTo('home');
  }
}

// Change Feed Filters
function changeFeedFilter(filterType) {
  feedFilter = filterType;
  
  const exploreTab = document.getElementById('feed-tab-all');
  const followingTab = document.getElementById('feed-tab-following');

  if (filterType === 'feed') {
    followingTab.classList.add('active');
    exploreTab.classList.remove('active');
  } else {
    exploreTab.classList.add('active');
    followingTab.classList.remove('active');
  }

  loadFeed();
}

// Fetch and Render Posts
async function loadFeed() {
  const container = document.getElementById('posts-container');
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <div class="logo-icon animate-spin" style="margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; height: 36px; width: 36px;">
        <i data-lucide="loader"></i>
      </div>
      <span>Loading feed...</span>
    </div>
  `;
  lucide.createIcons();

  try {
    const posts = await api.getPosts(feedFilter);
    renderPosts(posts, '#posts-container');
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="alert-circle" style="width:36px; height:36px; margin-bottom:12px; color: var(--color-like);"></i>
        <p>Failed to load feed: ${err.message}</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// Base post rendering logic
function renderPosts(posts, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="post-card" style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
        <i data-lucide="sparkles" style="width: 32px; height: 32px; color: var(--color-primary); margin-bottom: 12px; opacity: 0.5;"></i>
        <p style="font-weight:600; font-size:1.1rem; margin-bottom: 4px;">Nothing here yet</p>
        <p style="font-size:0.9rem;">Be the first to share your thoughts on this platform!</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(post => {
    const isOwnPost = post.userId === currentUser.id;
    const dateStr = new Date(post.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-header">
          <div class="post-author-info" onclick="navigateToProfile('${post.author.username}')">
            <img src="${post.author.avatar}" alt="Avatar" class="avatar-small">
            <div class="post-author-names">
              <span class="display-name">${post.author.displayName}</span>
              <span class="username">@${post.author.username}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="post-time">${dateStr}</span>
            ${isOwnPost ? `
              <button class="btn-delete-post" onclick="handleDeletePost('${post.id}')" title="Delete Post">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="post-content">${escapeHtml(post.content)}</div>

        ${post.image ? `<img src="${post.image}" class="post-image" alt="Post Image">` : ''}

        <div class="post-actions">
          <button class="post-action ${post.isLiked ? 'liked' : ''}" onclick="handleLike('${post.id}', this)">
            <i data-lucide="heart"></i>
            <span class="like-count">${post.likesCount}</span>
          </button>
          <button class="post-action" onclick="openCommentsModal('${post.id}')">
            <i data-lucide="message-square"></i>
            <span>${post.commentsCount}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  lucide.createIcons();
}

// Escape HTML utility helper to avoid CSS/XSS breakages
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Handle liking / unliking
async function handleLike(postId, btn) {
  try {
    const data = await api.toggleLike(postId);
    const likeCountSpan = btn.querySelector('.like-count');
    
    // Toggle active classes
    if (data.isLiked) {
      btn.classList.add('liked');
      // Dynamic bubble pulse animation
      btn.style.transform = 'scale(1.25)';
      setTimeout(() => btn.style.transform = '', 150);
    } else {
      btn.classList.remove('liked');
    }
    
    likeCountSpan.textContent = data.likesCount;
  } catch (err) {
    showToast('Liking failed: ' + err.message, 'error');
  }
}

// Handle deleting post
async function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  try {
    await api.deletePost(postId);
    showToast('Post removed successfully');
    
    // Animate item exit out of feed
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
      postEl.style.opacity = '0';
      postEl.style.transform = 'scale(0.9) translateY(-10px)';
      postEl.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        postEl.remove();
        loadStats(); // refresh counts
      }, 300);
    }
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// Image Select Handling
function handleImageSelect(event, source) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size cannot exceed 2MB', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const result = e.target.result;
    if (source === 'quick') {
      quickPostImage = result;
      document.getElementById('quick-post-preview').src = result;
      document.getElementById('quick-post-preview-container').classList.remove('hidden');
    } else if (source === 'modal') {
      modalPostImage = result;
      document.getElementById('modal-post-preview').src = result;
      document.getElementById('modal-post-preview-container').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function clearQuickPostImage() {
  quickPostImage = '';
  document.getElementById('quick-post-image-file').value = '';
  document.getElementById('quick-post-preview-container').classList.add('hidden');
}

function clearModalPostImage() {
  modalPostImage = '';
  document.getElementById('modal-post-image-file').value = '';
  document.getElementById('modal-post-preview-container').classList.add('hidden');
}

// Submit quick post
async function submitQuickPost() {
  const contentEl = document.getElementById('quick-post-content');
  const content = contentEl.value.trim();

  if (!content && !quickPostImage) {
    showToast('You must enter some text or attach an image!', 'error');
    return;
  }

  try {
    await api.createPost(content, quickPostImage);
    showToast('Post published successfully!');
    contentEl.value = '';
    clearQuickPostImage();
    loadFeed();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Submit modal post
async function submitModalPost() {
  const contentEl = document.getElementById('modal-post-content');
  const content = contentEl.value.trim();

  if (!content && !modalPostImage) {
    showToast('You must enter some text or attach an image!', 'error');
    return;
  }

  try {
    await api.createPost(content, modalPostImage);
    showToast('Post published successfully!');
    contentEl.value = '';
    clearModalPostImage();
    closeModal('modal-create-post');
    loadFeed();
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modals Trigger Helper
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openCreatePostModal() {
  document.getElementById('modal-post-content').value = '';
  clearModalPostImage();
  openModal('modal-create-post');
}

// --- COMMENTS FUNCTIONALITIES ---

async function openCommentsModal(postId) {
  selectedPostForComment = postId;
  openModal('modal-comments');
  
  const listEl = document.getElementById('comments-list');
  const postContainer = document.getElementById('comment-view-post-container');
  
  listEl.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Loading comments...</p>';
  postContainer.innerHTML = '';
  
  try {
    // 1. Fetch Post Details
    const post = await api.getPostDetails(postId);
    const dateStr = new Date(post.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    postContainer.innerHTML = `
      <div class="post-card" style="margin-bottom: 0; border: none; background: transparent; padding: 0;">
        <div class="post-header">
          <div class="post-author-info">
            <img src="${post.author.avatar}" alt="Avatar" class="avatar-small">
            <div class="post-author-names">
              <span class="display-name">${post.author.displayName}</span>
              <span class="username">@${post.author.username}</span>
            </div>
          </div>
          <span class="post-time">${dateStr}</span>
        </div>
        <div class="post-content" style="font-size:1.05rem; margin-top:8px;">${escapeHtml(post.content)}</div>
        ${post.image ? `<img src="${post.image}" class="post-image" alt="Post Image" style="max-height:280px;">` : ''}
      </div>
    `;

    // 2. Fetch and render Comments list
    const comments = await api.getComments(postId);
    renderCommentsList(comments);

  } catch (err) {
    showToast('Failed to load post details: ' + err.message, 'error');
    closeModal('modal-comments');
  }
}

function renderCommentsList(comments) {
  const listEl = document.getElementById('comments-list');
  
  if (comments.length === 0) {
    listEl.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.9rem;">No comments yet. Share your thoughts below!</p>';
    return;
  }

  listEl.innerHTML = comments.map(comment => {
    const commentDate = new Date(comment.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return `
      <div class="comment-item">
        <img src="${comment.author.avatar}" class="avatar-small" alt="Avatar">
        <div class="comment-bubble">
          <span class="comment-author">${comment.author.displayName} <span style="font-weight:400; color:var(--text-muted); font-size:0.75rem;">@${comment.author.username}</span></span>
          <p class="comment-text">${escapeHtml(comment.content)}</p>
          <span class="comment-time">${commentDate}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Auto-scroll to bottom of modal-body on comments load
  const modalBody = document.querySelector('#modal-comments .modal-body');
  setTimeout(() => {
    modalBody.scrollTop = modalBody.scrollHeight;
  }, 100);
}

async function submitComment() {
  const inputEl = document.getElementById('new-comment-input');
  const content = inputEl.value.trim();
  if (!content) return;

  try {
    const newComment = await api.createComment(selectedPostForComment, content);
    inputEl.value = '';
    
    // Re-fetch comments and update counter dynamically on feed post card if it exists
    const comments = await api.getComments(selectedPostForComment);
    renderCommentsList(comments);
    
    // Update the counter on the background feed cards
    const feedCard = document.getElementById(`post-${selectedPostForComment}`);
    if (feedCard) {
      const commBtn = feedCard.querySelectorAll('.post-action')[1];
      if (commBtn) commBtn.querySelector('span').textContent = comments.length;
    }
    
    showToast('Comment posted!');
  } catch (err) {
    showToast('Failed to comment: ' + err.message, 'error');
  }
}

function handleCommentSubmitKey(e) {
  if (e.key === 'Enter') {
    submitComment();
  }
}

// --- PROFILE EDITING FUNCTIONALITIES ---

function openEditProfileModal() {
  document.getElementById('edit-display-name').value = currentUser.displayName;
  document.getElementById('edit-bio').value = currentUser.bio || '';
  
  document.getElementById('edit-avatar-preview').src = currentUser.avatar;
  document.getElementById('edit-banner-preview').src = currentUser.banner;
  
  editProfileAvatar = currentUser.avatar;
  editProfileBanner = currentUser.banner;

  openModal('modal-edit-profile');
}

// Encode file upload to Base64
function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 1.5 * 1024 * 1024) {
    showToast('Avatar image cannot exceed 1.5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    editProfileAvatar = e.target.result;
    document.getElementById('edit-avatar-preview').src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleBannerUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Banner image cannot exceed 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    editProfileBanner = e.target.result;
    document.getElementById('edit-banner-preview').src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Preset randomizations using Dicebear avatars
function randomizeAvatar() {
  const seed = Math.random().toString(36).substring(7);
  editProfileAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  document.getElementById('edit-avatar-preview').src = editProfileAvatar;
}

function randomizeBanner() {
  const seed = Math.random().toString(36).substring(7);
  editProfileBanner = `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}banner`;
  document.getElementById('edit-banner-preview').src = editProfileBanner;
}

async function submitEditProfile() {
  const dispName = document.getElementById('edit-display-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();

  if (!dispName) {
    showToast('Display name cannot be empty', 'error');
    return;
  }

  try {
    const updated = await api.updateProfile({
      displayName: dispName,
      bio: bio,
      avatar: editProfileAvatar,
      banner: editProfileBanner
    });

    currentUser = updated;
    
    // Refresh Sidebar card and page views
    document.getElementById('sidebar-avatar').src = currentUser.avatar;
    document.getElementById('sidebar-displayname').textContent = currentUser.displayName;
    
    document.querySelectorAll('.my-avatar-img').forEach(img => {
      img.src = currentUser.avatar;
    });

    closeModal('modal-edit-profile');
    showToast('Profile updated successfully!');

    // If currently viewing self profile, refresh page
    if (activeProfileUser && activeProfileUser.id === currentUser.id) {
      navigateToProfile(currentUser.username);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- FOLLOW / UNFOLLOW INTERACTIVE TRIGGERS ---

async function toggleFollowProfile() {
  if (!activeProfileUser) return;

  try {
    const status = await api.toggleFollow(activeProfileUser.id);
    activeProfileUser.isFollowing = status.isFollowing;
    
    // Refresh counts and follow button states
    document.getElementById('profile-followers-count').textContent = status.followersCount;
    
    const followBtn = document.getElementById('btn-follow-user');
    if (status.isFollowing) {
      followBtn.textContent = 'Unfollow';
      followBtn.className = 'btn btn-secondary';
      showToast(`Now following @${activeProfileUser.username}`);
    } else {
      followBtn.textContent = 'Follow';
      followBtn.className = 'btn btn-primary';
      showToast(`Unfollowed @${activeProfileUser.username}`);
    }

    loadWhoToFollow();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function followUserFromWidget(userId, btn) {
  try {
    const status = await api.toggleFollow(userId);
    
    // Toggle follow button styling
    if (status.isFollowing) {
      btn.textContent = 'Following';
      btn.classList.add('following');
      showToast('User followed!');
    } else {
      btn.textContent = 'Follow';
      btn.classList.remove('following');
      showToast('User unfollowed!');
    }

    // Refresh profile stats if viewing it
    if (activeProfileUser && activeProfileUser.id === userId) {
      navigateToProfile(activeProfileUser.username);
    } else {
      // Refresh recommendation list shortly after to pull new profiles
      setTimeout(() => loadWhoToFollow(), 800);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- RIGHT WIDGETS DYNAMIC LOADS ---

async function loadWhoToFollow() {
  const container = document.getElementById('who-to-follow-container');
  if (!container) return;

  try {
    const users = await api.getWhoToFollow();
    if (users.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No other users to follow.</p>';
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="widget-user-item">
        <div class="widget-user-info" onclick="navigateToProfile('${user.username}')">
          <img src="${user.avatar}" class="avatar-small" alt="${user.displayName}">
          <div class="widget-user-names">
            <span class="display-name">${user.displayName}</span>
            <span class="username">@${user.username}</span>
          </div>
        </div>
        <button class="btn-follow-small" onclick="followUserFromWidget('${user.id}', this)">Follow</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Failed to find other users.</p>';
  }
}

async function loadStats() {
  const totalPostsEl = document.getElementById('stats-total-posts');
  const totalUsersEl = document.getElementById('stats-total-users');
  
  if (!totalPostsEl || !totalUsersEl) return;

  try {
    const stats = await api.request('/stats');
    totalPostsEl.textContent = stats.totalPosts;
    totalUsersEl.textContent = stats.totalUsers;
  } catch (err) {
    // If stats endpoint fails or is not implemented, search client side metadata
    totalPostsEl.textContent = '...';
    totalUsersEl.textContent = '...';
  }
}

// --- SEARCH USERS FILTER TRIGGER ---

let searchTimeout = null;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  const resultsEl = document.getElementById('search-results');

  if (!query.trim()) {
    resultsEl.classList.add('hidden');
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      // In a real application, we would call an API search. Here we fetch the recommended users
      // and do a quick fuzzy search on user profile display/username names for simplicity.
      // Fetching profile by exact match is available in API.
      const match = await api.getUserProfile(query.trim()).catch(() => null);
      
      resultsEl.innerHTML = '';
      resultsEl.classList.remove('hidden');

      if (match && match.user) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <img src="${match.user.avatar}" class="avatar-small" alt="">
          <div class="search-result-info">
            <span class="display-name">${match.user.displayName}</span>
            <span class="username">@${match.user.username}</span>
          </div>
        `;
        item.onclick = () => {
          navigateToProfile(match.user.username);
          resultsEl.classList.add('hidden');
          document.querySelector('.search-box input').value = '';
        };
        resultsEl.appendChild(item);
      } else {
        resultsEl.innerHTML = '<div style="padding:12px; color:var(--text-muted); font-size:0.85rem;">No user found matching this query.</div>';
      }
    } catch (err) {
      resultsEl.innerHTML = '<div style="padding:12px; color:var(--text-muted); font-size:0.85rem;">Error searching for users.</div>';
    }
  }, 300);
}

// Check session tokens on page initial boots
window.addEventListener('DOMContentLoaded', () => {
  checkSession();
  
  // Close modal when clicking outside contents
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
});
