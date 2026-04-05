import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import type { ChatMessageInput, Message, User } from "../types";
import { API_ROUTES, SOCKET_EVENTS } from "../constants/routes";

const sortUsersByLastInteraction = (users: User[], lastInteraction: Record<string, number>) => {
  return [...users].sort((a, b) => (lastInteraction[b._id] ?? 0) - (lastInteraction[a._id] ?? 0));
};

const mergeUniqueMessages = (existing: Message[], incoming: Message[]) => {
  const seen = new Set(existing.map((message) => message._id));
  const merged = [...existing];
  for (const message of incoming) {
    if (seen.has(message._id)) continue;
    seen.add(message._id);
    merged.push(message);
  }
  return merged;
};

const getConversationId = (userId1: string, userId2: string) => {
  const sorted = [userId1, userId2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type ChatState = {
  messages: Message[];
  users: User[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  lastInteraction: Record<string, number>;
  pagination: PaginationInfo | null;
  getConversationIdForSelected: () => string | null;
  getUsers: () => Promise<void>;
  getMessages: (userId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (messageData: ChatMessageInput) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setSelectedUser: (selectedUser: User | null) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  lastInteraction: {},
  pagination: null,

  getConversationIdForSelected: () => {
    const { selectedUser } = get();
    const authUser = useAuthStore.getState().authUser;
    if (!selectedUser || !authUser?._id) return null;
    return getConversationId(authUser._id, selectedUser._id);
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get<User[]>(API_ROUTES.messages.getUsers);
      set({ users: sortUsersByLastInteraction(res.data, get().lastInteraction) });
    } catch {
      toast.error("Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId: string, loadMore = false) => {
    if (loadMore) {
      const { pagination } = get();
      if (!pagination?.hasMore) return;
    }

    set({ isMessagesLoading: true });
    try {
      const page = loadMore ? (get().pagination?.page ?? 1) + 1 : 1;
      const res = await axiosInstance.get<{ messages: Message[]; pagination: PaginationInfo }>(
        API_ROUTES.messages.getMessages(userId),
        { params: { page } }
      );

      const newMessages = res.data.messages;
      const reversedMessages = [...newMessages].reverse();
      
      if (loadMore) {
        // Prepend older messages to beginning (chronological order)
        set({ messages: mergeUniqueMessages(reversedMessages, get().messages) });
      } else {
        set({ messages: reversedMessages });
      }
      
      set({ pagination: res.data.pagination });

      // Update last interaction time for this chat
      if (!loadMore && newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage) {
          const lastInteraction = new Date(lastMessage.createdAt).getTime();
          set((state) => ({
            lastInteraction: { ...state.lastInteraction, [userId]: lastInteraction },
            users: sortUsersByLastInteraction(state.users, { ...state.lastInteraction, [userId]: lastInteraction }),
          }));
        }
      }
    } catch {
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;
    try {
      const res = await axiosInstance.post<Message>(API_ROUTES.messages.sendMessage(selectedUser._id), messageData);
      
      // Add new message at the end (most recent)
      set({ messages: mergeUniqueMessages(messages, [res.data]) });
      
      const timestamp = new Date(res.data.createdAt).getTime();
      set((state) => ({
        lastInteraction: { ...state.lastInteraction, [selectedUser._id]: timestamp },
        users: sortUsersByLastInteraction(state.users, { ...state.lastInteraction, [selectedUser._id]: timestamp }),
      }));
    } catch {
      toast.error("Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!selectedUser || !socket || !authUser?._id) return;
    const activeConversationId = getConversationId(authUser._id, selectedUser._id);

    socket.on(SOCKET_EVENTS.newMessage, (newMessage: Message) => {
      const senderId = typeof newMessage.senderId === "object" ? newMessage.senderId._id : newMessage.senderId;
      const sameConversation = newMessage.conversationId
        ? newMessage.conversationId === activeConversationId
        : senderId === selectedUser._id;
      if (!sameConversation) return;
      
      set({ messages: mergeUniqueMessages(get().messages, [newMessage]) });
      const timestamp = new Date(newMessage.createdAt).getTime();
      set((state) => ({
        lastInteraction: { ...state.lastInteraction, [selectedUser._id]: timestamp },
        users: sortUsersByLastInteraction(state.users, { ...state.lastInteraction, [selectedUser._id]: timestamp }),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    useAuthStore.getState().socket?.off(SOCKET_EVENTS.newMessage);
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, messages: [], pagination: null }),
}));
