export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  settings: "/settings",
  profile: "/profile",
  chat: (userId: string) => `/chat/${userId}`,
} as const;

export const API_ROUTES = {
  auth: {
    base: "/auth",
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    updateProfile: "/auth/update-profile",
    checkAuth: "/auth/check",
  },
  messages: {
    base: "/messages",
    getUsers: "/messages/users",
    getMessages: (userId: string) => `/messages/${userId}`,
    sendMessage: (userId: string) => `/messages/send/${userId}`,
  },
} as const;

export const SOCKET_EVENTS = {
  getOnlineUsers: "getOnlineUsers",
  newMessage: "newMessage",
} as const;
