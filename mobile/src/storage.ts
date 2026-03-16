import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  async save(key: string, value: string) {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn(`Storage save error for key ${key}:`, e);
      // Fallback for web if localStorage fails
      if (isWeb) {
        try {
          sessionStorage.setItem(key, value);
        } catch (inner) {}
      }
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.warn(`Storage get error for key ${key}:`, e);
      if (isWeb) {
        return sessionStorage.getItem(key);
      }
      return null;
    }
  },

  async delete(key: string) {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn(`Storage delete error for key ${key}:`, e);
    }
  }
};
