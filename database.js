const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'db.json');
const TEMP_DB_FILE = path.join(__dirname, 'db.json.tmp');

class Database {
  constructor() {
    this.data = {
      users: [],
      posts: [],
      comments: [],
      likes: [],
      follows: []
    };
    this.init();
  }

  init() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(rawData);
        // Ensure all collections exist
        this.data.users = this.data.users || [];
        this.data.posts = this.data.posts || [];
        this.data.comments = this.data.comments || [];
        this.data.likes = this.data.likes || [];
        this.data.follows = this.data.follows || [];
      } catch (err) {
        console.error('Error reading database file, resetting to empty:', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      const stringData = JSON.stringify(this.data, null, 2);
      // Atomic write: write to tmp file, then rename to avoid corruption
      fs.writeFileSync(TEMP_DB_FILE, stringData, 'utf8');
      fs.renameSync(TEMP_DB_FILE, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
    }
  }

  // --- CRYPTO HELPERS ---
  hashPassword(password, salt) {
    const hash = crypto.createHmac('sha256', salt);
    hash.update(password);
    return hash.digest('hex');
  }

  generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  // --- USER OPERATIONS ---
  createUser(username, password, displayName, bio = '', avatar = '', banner = '') {
    if (this.getUserByUsername(username)) {
      throw new Error('Username already exists');
    }
    const id = crypto.randomUUID();
    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);
    
    const newUser = {
      id,
      username: username.toLowerCase().trim(),
      passwordHash,
      salt,
      displayName: displayName || username,
      bio,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      banner: banner || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}banner`,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    return this.sanitizeUser(newUser);
  }

  getUserById(id) {
    const user = this.data.users.find(u => u.id === id);
    return user ? this.sanitizeUser(user) : null;
  }

  getUserByUsername(username) {
    const user = this.data.users.find(u => u.username === username.toLowerCase().trim());
    return user ? this.sanitizeUser(user) : null;
  }

  authenticateUser(username, password) {
    const user = this.data.users.find(u => u.username === username.toLowerCase().trim());
    if (!user) return null;
    const computedHash = this.hashPassword(password, user.salt);
    if (computedHash === user.passwordHash) {
      return this.sanitizeUser(user);
    }
    return null;
  }

  updateProfile(userId, { displayName, bio, avatar, banner }) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (displayName !== undefined) user.displayName = displayName.trim() || user.username;
    if (bio !== undefined) user.bio = bio.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (banner !== undefined) user.banner = banner;

    this.save();
    return this.sanitizeUser(user);
  }

  sanitizeUser(user) {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  // --- POST OPERATIONS ---
  createPost(userId, content, image = '') {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const newPost = {
      id: crypto.randomUUID(),
      userId,
      content,
      image,
      createdAt: new Date().toISOString()
    };

    this.data.posts.unshift(newPost); // New posts first
    this.save();
    return this.enrichPost(newPost);
  }

  getPosts(currentUserId = null) {
    return this.data.posts.map(post => this.enrichPost(post, currentUserId));
  }

  getPostsByUser(userId, currentUserId = null) {
    return this.data.posts
      .filter(post => post.userId === userId)
      .map(post => this.enrichPost(post, currentUserId));
  }

  getFeedPosts(userId) {
    // Get list of followed user IDs
    const followedIds = this.data.follows
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);
    
    // Include user's own posts
    followedIds.push(userId);

    return this.data.posts
      .filter(post => followedIds.includes(post.userId))
      .map(post => this.enrichPost(post, userId));
  }

  getPostById(id, currentUserId = null) {
    const post = this.data.posts.find(p => p.id === id);
    return post ? this.enrichPost(post, currentUserId) : null;
  }

  deletePost(id, userId) {
    const postIndex = this.data.posts.findIndex(p => p.id === id);
    if (postIndex === -1) throw new Error('Post not found');
    
    const post = this.data.posts[postIndex];
    if (post.userId !== userId) throw new Error('Unauthorized');

    this.data.posts.splice(postIndex, 1);
    
    // Cleanup related comments and likes
    this.data.comments = this.data.comments.filter(c => c.postId !== id);
    this.data.likes = this.data.likes.filter(l => l.postId !== id);

    this.save();
    return true;
  }

  enrichPost(post, currentUserId = null) {
    const author = this.getUserById(post.userId);
    const likes = this.data.likes.filter(l => l.postId === post.id);
    const comments = this.data.comments.filter(c => c.postId === post.id);
    
    return {
      ...post,
      author: author ? {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatar: author.avatar
      } : null,
      likesCount: likes.length,
      commentsCount: comments.length,
      isLiked: currentUserId ? likes.some(l => l.userId === currentUserId) : false
    };
  }

  // --- COMMENT OPERATIONS ---
  createComment(userId, postId, content) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const post = this.getPostById(postId);
    if (!post) throw new Error('Post not found');

    const newComment = {
      id: crypto.randomUUID(),
      postId,
      userId,
      content,
      createdAt: new Date().toISOString()
    };

    this.data.comments.push(newComment);
    this.save();
    return this.enrichComment(newComment);
  }

  getComments(postId) {
    return this.data.comments
      .filter(c => c.postId === postId)
      .map(c => this.enrichComment(c))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  enrichComment(comment) {
    const author = this.getUserById(comment.userId);
    return {
      ...comment,
      author: author ? {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatar: author.avatar
      } : null
    };
  }

  // --- LIKE OPERATIONS ---
  toggleLike(userId, postId) {
    const likeIndex = this.data.likes.findIndex(l => l.userId === userId && l.postId === postId);
    let isLiked = false;

    if (likeIndex > -1) {
      this.data.likes.splice(likeIndex, 1);
    } else {
      this.data.likes.push({
        userId,
        postId,
        createdAt: new Date().toISOString()
      });
      isLiked = true;
    }

    this.save();
    return { isLiked, likesCount: this.data.likes.filter(l => l.postId === postId).length };
  }

  // --- FOLLOW OPERATIONS ---
  toggleFollow(followerId, followingId) {
    if (followerId === followingId) throw new Error('Cannot follow yourself');
    
    const follower = this.getUserById(followerId);
    const following = this.getUserById(followingId);
    if (!follower || !following) throw new Error('User not found');

    const followIndex = this.data.follows.findIndex(
      f => f.followerId === followerId && f.followingId === followingId
    );
    let isFollowing = false;

    if (followIndex > -1) {
      this.data.follows.splice(followIndex, 1);
    } else {
      this.data.follows.push({
        followerId,
        followingId,
        createdAt: new Date().toISOString()
      });
      isFollowing = true;
    }

    this.save();
    return {
      isFollowing,
      followersCount: this.getFollowersCount(followingId),
      followingCount: this.getFollowingCount(followerId)
    };
  }

  isFollowing(followerId, followingId) {
    return this.data.follows.some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  getFollowersCount(userId) {
    return this.data.follows.filter(f => f.followingId === userId).length;
  }

  getFollowingCount(userId) {
    return this.data.follows.filter(f => f.followerId === userId).length;
  }

  getWhoToFollow(userId, limit = 5) {
    // Recommend users that are not the current user and not currently followed
    const followedIds = this.data.follows
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);

    return this.data.users
      .filter(user => user.id !== userId && !followedIds.includes(user.id))
      .slice(0, limit)
      .map(u => this.sanitizeUser(u));
  }

  getProfileStats(userId, currentUserId = null) {
    const user = this.getUserById(userId);
    if (!user) return null;

    return {
      ...user,
      followersCount: this.getFollowersCount(userId),
      followingCount: this.getFollowingCount(userId),
      isFollowing: currentUserId ? this.isFollowing(currentUserId, userId) : false
    };
  }
}

module.exports = new Database();
