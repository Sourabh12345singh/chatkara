export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  settings: "/settings",
  profile: "/profile",
  groups: "/groups",
  chat: (userId: string) => `/chat/${userId}`,
  groupChat: (groupId: string) => `/groups/${groupId}`,
} as const;

export const API_ROUTES = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    updateProfile: "/auth/update-profile",
    checkAuth: "/auth/check",
    google: "/auth/google",
    googleCallback: "/auth/google/callback",
  },
  messages: {
    getUsers: "/messages/users",
    getMessages: (userId: string) => `/messages/${userId}`,
    sendMessage: (userId: string) => `/messages/send/${userId}`,
  },
  groups: {
    create: "/groups",
    getAll: "/groups",
    getMessages: (groupId: string) => `/groups/${groupId}/messages`,
    sendMessage: (groupId: string) => `/groups/${groupId}/messages`,
    update: (groupId: string) => `/groups/${groupId}`,
    addMembers: (groupId: string) => `/groups/${groupId}/members`,
    removeMember: (groupId: string, userId: string) => `/groups/${groupId}/members/${userId}`,
    leave: (groupId: string) => `/groups/${groupId}/leave`,
    delete: (groupId: string) => `/groups/${groupId}`,
  },
} as const;

export const SOCKET_EVENTS = {
  getOnlineUsers: "getOnlineUsers",
  newMessage: "newMessage",
  newGroupMessage: "newGroupMessage",
  groupCreated: "groupCreated",
  groupUpdated: "groupUpdated",
  groupDeleted: "groupDeleted",
  removedFromGroup: "removedFromGroup",
} as const;
