import axios from "axios";

// 1. Create a custom instance pointed directly at our Laravel local host
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // The default port for PHP artisan serve
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Add an interceptor to automatically inject our JWT Bearer token before any request goes out
api.interceptors.request.use(
  (config) => {
    // Read the token dynamically from browser localStorage
    const token = localStorage.getItem("chat_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
