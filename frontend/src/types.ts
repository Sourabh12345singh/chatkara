export type User = {
  _id: string;
  fullName: string;
  email: string;
  profilePic: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Message = {
  _id: string;
  senderId: string | { _id: string; fullName: string; profilePic: string };
  receiverId?: string;
  groupId?: string;
  conversationId?: string;
  text?: string;
  image?: string;
  createdAt: string;
  updatedAt?: string;
  metaInfo?: {
    source: "metaAI";
    mode: "meta" | "meta_pro";
    vectorMatches: number;
    usedVector: boolean;
    vectorConfigured?: boolean;
  };
};

export type Group = {
  _id: string;
  name: string;
  groupPic: string;
  admin: User;
  members: User[];
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthForm = {
  fullName?: string;
  email: string;
  password: string;
};

export type ChatMessageInput = {
  text: string;
  image?: string | null;
};
