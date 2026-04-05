import { useEffect, useRef, useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const navigate = useNavigate();
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, unreadCounts, subscribeToGlobalMessages, unsubscribeFromGlobalMessages } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const hasFetchedInitialData = useRef(false);

  useEffect(() => {
    if (hasFetchedInitialData.current) return;
    hasFetchedInitialData.current = true;
    void getUsers();
  }, [getUsers]);

  useEffect(() => {
    subscribeToGlobalMessages();
    return () => unsubscribeFromGlobalMessages();
  }, [subscribeToGlobalMessages, unsubscribeFromGlobalMessages]);

  const filteredUsers = showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users;
  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="flex h-full w-20 flex-col border-r border-base-300 transition-all duration-200 lg:w-72">
      <div className="w-full border-b border-base-300 p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="hidden font-medium lg:block">Contacts</span>
        </div>
        <div className="mt-3 hidden flex-wrap items-center gap-2 lg:flex">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showOnlineOnly} onChange={(e) => setShowOnlineOnly(e.target.checked)} className="checkbox checkbox-sm" />
            <span className="text-sm">Show online only</span>
          </label>
          <button type="button" onClick={() => navigate("/groups")} className="btn btn-ghost btn-xs">
            <MessageSquare className="size-4" />
            Groups
          </button>
          <span className="text-xs text-zinc-500">({onlineUsers.length} online)</span>
        </div>
      </div>
      <div className="w-full overflow-y-auto py-3">
        {filteredUsers.map((item) => {
          const lastMessageAt = item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).getTime() : 0;
          const lastReadAt = item.lastRead ? new Date(item.lastRead).getTime() : 0;
          const isUnread = Boolean(
            authUser?._id &&
            item.lastMessage?.senderId &&
            item.lastMessage.senderId !== authUser._id &&
            lastMessageAt > lastReadAt
          );
          return (
          <button
            key={item._id}
            type="button"
            onClick={() => setSelectedUser(item)}
            className={`w-full flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-base-300 ${
              selectedUser?._id === item._id
                ? "bg-base-300 ring-1 ring-base-300"
                : isUnread
                  ? "bg-blue-100"
                  : "bg-transparent"
            }`}
          >
            <div className="relative">
              <img
                src={item.profilePic || "/avatar.png"}
                alt={item.fullName}
                className="size-12 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/avatar.png";
                }}
              />
              {onlineUsers.includes(item._id) && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-zinc-900" />}
            </div>
            <div className="hidden min-w-0 flex-1 text-left lg:block">
              <div className="truncate font-medium">{item.fullName}</div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span>{onlineUsers.includes(item._id) ? "Online" : "Offline"}</span>
                {unreadCounts[item._id] > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-content">
                    {unreadCounts[item._id]}
                  </span>
                )}
              </div>
            </div>
          </button>
          );
        })}
        {filteredUsers.length === 0 && <div className="py-4 text-center text-zinc-500">No users available</div>}
      </div>
    </aside>
  );
};

export default Sidebar;
