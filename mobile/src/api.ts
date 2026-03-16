import { storage } from './storage';
import { Platform } from 'react-native';

// Use actual local IP address when running on device/emulator, or production URL:
// Replace this with your actual Render backend URL once deployed:
const PRODUCTION_URL = 'https://swift-rollcall-api.onrender.com/api'; 

const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api'
  : PRODUCTION_URL;

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = await storage.get('parentToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    if (__DEV__) console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body || '');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(error.error || `Error ${response.status}`);
    }

    return response.json();
  },

  async verifyStudents(identifier: string) {
    return this.request('/mobile/auth/verify-students', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async signup(data: { name: string; email?: string; phone?: string; password: string }) {
    return this.request('/mobile/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(identifier: string, password: string) {
    return this.request('/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  async getDashboard() {
    return this.request('/mobile/dashboard', {
      method: 'GET',
    });
  },

  async logout() {
    await storage.delete('parentToken');
    await storage.delete('parentUser');
  }
};
