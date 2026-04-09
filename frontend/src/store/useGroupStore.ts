import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import type { Group, Message } from "../types";
import { SOCKET_EVENTS } from "../constants/routes";

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

const isLikelySameOptimistic = (optimistic: Message, actual: Message) => {
  if (!optimistic._id.startsWith("temp-")) return false;
  const optimisticSender =
    typeof optimistic.senderId === "object" ? optimistic.senderId._id : optimistic.senderId;
  const actualSender =
    typeof actual.senderId === "object" ? actual.senderId._id : actual.senderId;
  if (!optimisticSender || !actualSender || optimisticSender !== actualSender) return false;
  if ((optimistic.text ?? "") !== (actual.text ?? "")) return false;
  if ((optimistic.image ?? "") !== (actual.image ?? "")) return false;
  const optimisticTime = new Date(optimistic.createdAt).getTime();
  const actualTime = new Date(actual.createdAt).getTime();
  return Math.abs(actualTime - optimisticTime) < 10000;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type GroupState = {
  groups: Group[];
  selectedGroup: Group | null;
  groupMessages: Message[];
  isGroupsLoading: boolean;
  isMessagesLoading: boolean;
  isCreatingGroup: boolean;
  socketListenersSetup: boolean;
  groupPagination: PaginationInfo | null;
  getGroups: () => Promise<void>;
  createGroup: (data: { name: string; members: string[]; groupPic?: string }) => Promise<void>;
  getGroupMessages: (groupId: string, loadMore?: boolean) => Promise<void>;
  sendGroupMessage: (messageData: { text: string; image?: string }) => Promise<void>;
  updateGroup: (groupId: string, data: { name?: string; groupPic?: string }) => Promise<void>;
  addMembers: (groupId: string, members: string[]) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  setSelectedGroup: (group: Group | null) => void;
  setupSocketListeners: () => void;
};

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,
  socketListenersSetup: false,
  groupPagination: null,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get<Group[]>("/groups");
      const sorted = [...res.data].sort((a, b) => {
        const aTime = typeof a.lastMessage === "object" && a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const bTime = typeof b.lastMessage === "object" && b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return bTime - aTime;
      });
      set({ groups: sorted });
    } catch {
      toast.error("Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (data) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post<Group>("/groups", data);
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created successfully");
    } catch {
      toast.error("Failed to create group");
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  getGroupMessages: async (groupId, loadMore = false) => {
    if (loadMore) {
      const { groupPagination } = get();
      if (!groupPagination?.hasMore) return;
    }

    set({ isMessagesLoading: true });
    try {
      // Fetch single group
      const groupRes = await axiosInstance.get<Group>(`/groups/${groupId}`);
      set({ selectedGroup: groupRes.data });

      // Fetch messages with pagination
      const page = loadMore ? (get().groupPagination?.page ?? 1) + 1 : 1;
      const res = await axiosInstance.get<{ messages: Message[]; pagination: PaginationInfo }>(
        `/groups/${groupId}/messages`,
        { params: { page } }
      );

      const newMessages = res.data.messages;
      const reversedMessages = [...newMessages].reverse();

      if (loadMore) {
        // Prepend older messages to beginning (chronological order)
        set({ groupMessages: mergeUniqueMessages(reversedMessages, get().groupMessages) });
      } else {
        set({ groupMessages: reversedMessages });
      }

      set({ groupPagination: res.data.pagination });
    } catch {
      toast.error("Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },


  //why api calling...whynot not socket
  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    if (!selectedGroup) return;
    try {
      const authUser = useAuthStore.getState().authUser;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage: Message = {
        _id: tempId,
        senderId: authUser
          ? { _id: authUser._id, fullName: authUser.fullName, profilePic: authUser.profilePic }
          : "",
        groupId: selectedGroup._id,
        text: messageData.text ?? "",
        image: messageData.image ?? "",
        createdAt: new Date().toISOString(),
      };

      set({ groupMessages: mergeUniqueMessages(groupMessages, [optimisticMessage]) });

      const res = await axiosInstance.post<Message>(`/groups/${selectedGroup._id}/messages`, messageData);
      set((state) => {
        const withoutDupTemp = state.groupMessages.filter(
          (msg) => !(msg._id.startsWith("temp-") && isLikelySameOptimistic(msg, res.data))
        );
        return {
          groupMessages: mergeUniqueMessages(withoutDupTemp, [res.data]),
        };
      });
    } catch {
      const authUserId = useAuthStore.getState().authUser?._id;
      set((state) => ({
        groupMessages: state.groupMessages.filter((msg) => {
          if (!msg._id.startsWith("temp-")) return true;
          if (msg.groupId !== selectedGroup._id) return true;
          const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
          return senderId !== authUserId;
        }),
      }));
      toast.error("Failed to send message");
    }
  },

  updateGroup: async (groupId, data) => {
    try {
      const res = await axiosInstance.put<Group>(`/groups/${groupId}`, data);
      set({
        groups: get().groups.map(g => g._id === groupId ? res.data : g),
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup,
      });
      toast.success("Group updated successfully");
    } catch {
      toast.error("Failed to update group");
    }
  },

  addMembers: async (groupId, members) => {
    try {
      const res = await axiosInstance.post<Group>(`/groups/${groupId}/members`, { members });
      set({ groups: get().groups.map(g => g._id === groupId ? res.data : g) });
      toast.success("Members added successfully");
    } catch {
      toast.error("Failed to add members");
    }
  },

  removeMember: async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete<Group>(`/groups/${groupId}/members/${userId}`);
      set({ groups: get().groups.map(g => g._id === groupId ? res.data : g) });
      toast.success("Member removed successfully");
    } catch {
      toast.error("Failed to remove member");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set({
        groups: get().groups.filter(g => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast.success("Left group successfully");
    } catch {
      toast.error("Failed to leave group");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set({
        groups: get().groups.filter(g => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast.success("Group deleted successfully");
    } catch {
      toast.error("Failed to delete group");
    }
  },

  setSelectedGroup: (group) => set({ selectedGroup: group, groupMessages: [], groupPagination: null }),

  setupSocketListeners: () => {
    const { socketListenersSetup } = get();
    if (socketListenersSetup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    set({ socketListenersSetup: true });

    socket.on(SOCKET_EVENTS.groupCreated, (group: Group) => {
      const { groups } = get();
      if (!groups.find(g => g._id === group._id)) {
        set({ groups: [group, ...groups] });
        toast.success(`You were added to group: ${group.name}`);
      }
    });

    socket.on(SOCKET_EVENTS.groupUpdated, (group: Group) => {
      const { groups, selectedGroup } = get();
      set({
        groups: groups.map(g => g._id === group._id ? group : g),
        selectedGroup: selectedGroup?._id === group._id ? group : selectedGroup,
      });
    });

    socket.on(SOCKET_EVENTS.newGroupMessage, (message: Message) => {
      const { selectedGroup, groupMessages } = get();
      if (selectedGroup?._id === message.groupId) {
        const withoutDupTemp = groupMessages.filter(
          (msg) => !(msg._id.startsWith("temp-") && isLikelySameOptimistic(msg, message))
        );
        set({ groupMessages: mergeUniqueMessages(withoutDupTemp, [message]) });
      }
    });

    socket.on("removedFromGroup", (data: { groupId: string }) => {
      const { groups, selectedGroup } = get();
      set({
        groups: groups.filter(g => g._id !== data.groupId),
        selectedGroup: selectedGroup?._id === data.groupId ? null : selectedGroup,
      });
      toast.error("You were removed from the group");
    });

    socket.on("groupDeleted", (data: { groupId: string }) => {
      const { groups, selectedGroup } = get();
      set({
        groups: groups.filter(g => g._id !== data.groupId),
        selectedGroup: selectedGroup?._id === data.groupId ? null : selectedGroup,
      });
      toast.error("Group was deleted");
    });
  },
}));
