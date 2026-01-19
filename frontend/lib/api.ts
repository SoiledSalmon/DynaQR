/**
 * api.ts
 *
 * Centralized Axios instance for making HTTP requests to the backend.
 *
 * FEATURES:
 * - Base URL configuration.
 * - Request interceptor to automatically attach the JWT from localStorage.
 *
 * FUTURE MIGRATION:
 * - If switching to HttpOnly cookies, the request interceptor might be removed
 *   or modified, as cookies are sent automatically by the browser with `withCredentials: true`.
 */

import axios, { InternalAxiosRequestConfig } from 'axios';
import { getToken } from './auth';

// Create an Axios instance with default configuration
const api = axios.create({
  // Use environment variable for API URL or default to localhost backend port
  // Adjust this URL based on where your actual backend is running
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 *
 * Checks for a stored token and attaches it to the Authorization header
 * for every request.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();

    if (token) {
      // Ensure headers object exists before assigning
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

export default api;
