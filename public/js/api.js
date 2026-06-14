// Aether - API Client Wrapper

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.tokenKey = 'aether_session_token';
  }

  // Get token from storage
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Save token to storage
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  // Clear token from storage
  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  // Helper request builder
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Attach token if present
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // --- AUTH ENDPOINTS ---
  
  async register(username, password, displayName) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName })
    });
    this.setToken(data.token);
    return data.user;
  }

  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.token);
    return data.user;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout request failed, cleaning local session anyway.');
    }
    this.clearToken();
  }

  async getMe() {
    if (!this.getToken()) return null;
    return await this.request('/auth/me');
  }

  // --- USER ENDPOINTS ---

  async getUserProfile(username) {
    return await this.request(`/users/${username}`);
  }

  async updateProfile(profileData) {
    return await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getWhoToFollow() {
    if (!this.getToken()) return [];
    return await this.request('/who-to-follow');
  }

  async toggleFollow(userId) {
    return await this.request(`/users/${userId}/follow`, {
      method: 'POST'
    });
  }

  // --- POST ENDPOINTS ---

  async getPosts(filter = 'explore') {
    return await this.request(`/posts?filter=${filter}`);
  }

  async getPostDetails(id) {
    return await this.request(`/posts/${id}`);
  }

  async createPost(content, image = '') {
    return await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image })
    });
  }

  async deletePost(id) {
    return await this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleLike(postId) {
    return await this.request(`/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  // --- COMMENT ENDPOINTS ---

  async getComments(postId) {
    return await this.request(`/posts/${postId}/comments`);
  }

  async createComment(postId, content) {
    return await this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }
}

const api = new ApiClient();
