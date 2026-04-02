const API_ENDPOINTS = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    updateProfile: "/auth/update-profile",
    checkAuth: "/auth/check",
  },
  messages: {
    getUsers: "/messages/users",
    getMessages: (userId: string) => `/messages/${userId}`,
    sendMessage: (userId: string) => `/messages/send/${userId}`,
  },
};

export const BACKEND_URL = import.meta.env.MODE === "development" 
  ? "http://localhost:5001" 
  : "/";

export const API_BASE_URL = import.meta.env.MODE === "development" 
  ? "http://localhost:5001/api" 
  : "/api";

export default API_ENDPOINTS;