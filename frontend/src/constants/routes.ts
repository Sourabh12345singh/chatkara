export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  settings: "/settings",
  profile: "/profile",
  chat: (userId: string) => `/chat/${userId}`,
} as const;

// NOTE: baseURL already includes /api, so routes here are relative to /api
export const API_ROUTES = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    updateProfile: "/auth/update-profile",
    checkAuth: "/auth/check",
    // ============================================
    // GOOGLE OAUTH ROUTES
    // ============================================
    google: "/auth/google",
    googleCallback: "/auth/google/callback",
  },
  messages: {
    getUsers: "/messages/users",
    getMessages: (userId: string) => `/messages/${userId}`,
    sendMessage: (userId: string) => `/messages/send/${userId}`,
  },
} as const;

export const SOCKET_EVENTS = {
  getOnlineUsers: "getOnlineUsers",
  newMessage: "newMessage",
} as const;
