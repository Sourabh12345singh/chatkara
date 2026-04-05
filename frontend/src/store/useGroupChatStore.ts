import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

type Group = {
  _id: string;
  name: string;
  profilePic?: string;
};

type GroupState = {
  groups: Group[];
  selectedGroup: Group | null;
  groupMessages: Array<Record<string, unknown>>;
  isGroupsLoading: boolean;
  isGroupMessagesLoading: boolean;
  getGroups: () => Promise<void>;
  createGroup: (groupData: { name: string; members: string[]; groupPic?: string }) => Promise<void>;
  getGroupMessages: (groupId: string) => Promise<void>;
  sendGroupMessage: (messageData: { text?: string; image?: string }) => Promise<void>;
  subscribeToGroupMessages: () => void;
  unsubscribeFromGroupMessages: () => void;
  setSelectedGroup: (selectedGroup: Group | null) => void;
};

export const useGroupChatStore = create<GroupState>((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get<Group[]>("/groups");
      set({ groups: res.data });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        set({ groups: [] });
        return;
      }
      toast.error("Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post<Group>("/groups", groupData);
      set({ groups: [...get().groups, res.data] });
      toast.success("Group created successfully");
    } catch {
      toast.error("Failed to create group");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get<Array<Record<string, unknown>>>(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch {
      toast.error("Failed to fetch group messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    if (!selectedGroup) return;
    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch {
      toast.error("Failed to send group message");
    }
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;
    if (!selectedGroup || !socket) return;

    socket.on("newGroupMessage", (newMessage: { groupId: string }) => {
      if (newMessage.groupId !== selectedGroup._id) return;
      set({ groupMessages: [...get().groupMessages, newMessage] });
    });
  },

  unsubscribeFromGroupMessages: () => {
    useAuthStore.getState().socket?.off("newGroupMessage");
  },

  setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
}));
