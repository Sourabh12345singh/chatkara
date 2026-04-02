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
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  createdAt: string;
  updatedAt?: string;
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
