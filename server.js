const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads
app.use(express.static(path.join(__dirname, 'public')));

// Session Store (In-Memory)
const sessions = {};

// Helper to create a session
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = userId;
  return token;
}

// Authentication Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const userId = sessions[token];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session' });
  }
  req.userId = userId;
  next();
}

// Optional Authentication Middleware
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    req.userId = sessions[token] || null;
  } else {
    req.userId = null;
  }
  next();
}

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be at least 3 chars, password 6 chars' });
  }

  try {
    const user = db.createUser(username, password, displayName);
    const token = createSession(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = createSession(user.id);
  res.json({ token, user });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  delete sessions[token];
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// --- USER & PROFILE ENDPOINTS ---

app.get('/api/users/:username', optionalAuthenticate, (req, res) => {
  const targetUser = db.getUserByUsername(req.params.username);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const stats = db.getProfileStats(targetUser.id, req.userId);
  const posts = db.getPostsByUser(targetUser.id, req.userId);

  res.json({ user: stats, posts });
});

app.put('/api/users/profile', authenticate, (req, res) => {
  const { displayName, bio, avatar, banner } = req.body;
  try {
    const updatedUser = db.updateProfile(req.userId, { displayName, bio, avatar, banner });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/who-to-follow', authenticate, (req, res) => {
  const recommendations = db.getWhoToFollow(req.userId);
  res.json(recommendations);
});

app.post('/api/users/:userId/follow', authenticate, (req, res) => {
  try {
    const followStatus = db.toggleFollow(req.userId, req.params.userId);
    res.json(followStatus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- POST ENDPOINTS ---

app.get('/api/posts', optionalAuthenticate, (req, res) => {
  const { filter } = req.query; // 'feed' or 'explore'
  
  if (filter === 'feed' && req.userId) {
    res.json(db.getFeedPosts(req.userId));
  } else {
    res.json(db.getPosts(req.userId));
  }
});

app.post('/api/posts', authenticate, (req, res) => {
  const { content, image } = req.body;
  if (!content && !image) {
    return res.status(400).json({ error: 'Post must contain content or an image' });
  }

  try {
    const newPost = db.createPost(req.userId, content, image);
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/posts/:id', optionalAuthenticate, (req, res) => {
  const post = db.getPostById(req.params.id, req.userId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
});

app.delete('/api/posts/:id', authenticate, (req, res) => {
  try {
    db.deletePost(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', authenticate, (req, res) => {
  try {
    const status = db.toggleLike(req.userId, req.params.id);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- COMMENT ENDPOINTS ---

app.get('/api/posts/:id/comments', (req, res) => {
  res.json(db.getComments(req.params.id));
});

app.post('/api/posts/:id/comments', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  try {
    const newComment = db.createComment(req.userId, req.params.id, content);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- STATS ENDPOINT ---
app.get('/api/stats', (req, res) => {
  res.json({
    totalPosts: db.data.posts.length,
    totalUsers: db.data.users.length
  });
});

// Catch-all route to serve the SPA (handles client-side routing)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
