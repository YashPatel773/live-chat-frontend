// import axios from "axios";

// // 1. Create a custom instance pointed directly at our Laravel local host
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL, // The default port for PHP artisan serve
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // 2. Add an interceptor to automatically inject our JWT Bearer token before any request goes out
// api.interceptors.request.use(
//   (config) => {
//     // Read the token dynamically from browser localStorage
//     const token = localStorage.getItem("chat_token");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   },
// );

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("chat_token");

    if (token) {
      try {
        // Decode JWT payload
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        // Token expired
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem("chat_token");
          window.location.href = "/login";
          return Promise.reject(new Error("Token expired"));
        }

        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        localStorage.removeItem("chat_token");
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("chat_token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
