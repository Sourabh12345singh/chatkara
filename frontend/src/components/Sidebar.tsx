import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Search, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupChatStore } from "../store/useGroupChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading, createGroup } = useGroupChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const hasFetchedInitialData = useRef(false);

  useEffect(() => {
    if (hasFetchedInitialData.current) return;
    hasFetchedInitialData.current = true;
    void getUsers();
    void getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users;
  const displayItems = showGroups ? groups : filteredUsers;
  const isLoading = showGroups ? isGroupsLoading : isUsersLoading;
  const visibleUsers = users.filter((user) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }
    await createGroup({ name: groupName.trim(), members: selectedMembers });
    setShowCreateGroupModal(false);
    setGroupName("");
    setSelectedMembers([]);
    setMemberSearch("");
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  };

  if (isLoading) return <SidebarSkeleton />;

  return (
    <aside className="flex h-full w-20 flex-col border-r border-base-300 transition-all duration-200 lg:w-72">
      <div className="w-full border-b border-base-300 p-5">
        <div className="flex items-center gap-2">
          {showGroups ? <MessageSquare className="size-6" /> : <Users className="size-6" />}
          <span className="hidden font-medium lg:block">{showGroups ? "Groups" : "Contacts"}</span>
        </div>
        <div className="mt-3 hidden flex-wrap items-center gap-2 lg:flex">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showGroups} onChange={(e) => setShowGroups(e.target.checked)} className="checkbox checkbox-sm" />
            <span className="text-sm">Show groups</span>
          </label>
          {!showGroups && (
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={showOnlineOnly} onChange={(e) => setShowOnlineOnly(e.target.checked)} className="checkbox checkbox-sm" />
              <span className="text-sm">Show online only</span>
            </label>
          )}
          <span className="text-xs text-zinc-500">{showGroups ? `(${groups.length} groups)` : `(${onlineUsers.length} online)`}</span>
        </div>
      </div>
      <div className="w-full overflow-y-auto py-3">
        {showGroups && (
          <div className="px-3 pb-2">
            <button type="button" onClick={() => setShowCreateGroupModal(true)} className="flex w-full items-center gap-2 rounded-lg bg-base-300 p-2 transition-colors hover:bg-base-400">
              <Plus className="size-5" />
              <span className="hidden text-sm lg:block">Create Group</span>
            </button>
          </div>
        )}
        {displayItems.map((item) => (
          <button
            key={item._id}
            type="button"
            onClick={() => (showGroups ? setSelectedGroup(item) : setSelectedUser(item))}
            className={`w-full flex items-center gap-3 p-3 transition-colors hover:bg-base-300 ${
              (showGroups && selectedGroup?._id === item._id) || (!showGroups && selectedUser?._id === item._id)
                ? "bg-base-300 ring-1 ring-base-300"
                : ""
            }`}
          >
            <div className="relative">
              <img
                src={item.profilePic || "/avatar.png"}
                alt={showGroups ? item.name : item.fullName}
                className="size-12 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/avatar.png";
                }}
              />
              {!showGroups && onlineUsers.includes(item._id) && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-zinc-900" />}
            </div>
            <div className="hidden min-w-0 flex-1 text-left lg:block">
              <div className="truncate font-medium">{showGroups ? item.name : item.fullName}</div>
              <div className="text-sm text-zinc-400">{showGroups ? "Group" : onlineUsers.includes(item._id) ? "Online" : "Offline"}</div>
            </div>
          </button>
        ))}
        {displayItems.length === 0 && <div className="py-4 text-center text-zinc-500">{showGroups ? "No groups available" : "No online users"}</div>}
      </div>
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-base-200 p-6">
            <h2 className="mb-4 text-lg font-medium">Create New Group</h2>
            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" className="input input-bordered mb-4 w-full" />
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2">
              <Search className="size-4 text-base-content/50" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members"
                className="w-full bg-transparent outline-none"
              />
              {memberSearch && (
                <button type="button" onClick={() => setMemberSearch("")} className="text-base-content/50 hover:text-base-content">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="mb-4 max-h-56 overflow-y-auto rounded-lg border border-base-300 bg-base-100">
              {visibleUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-base-content/60">No members found</div>
              ) : (
                visibleUsers.map((user) => {
                  const selected = selectedMembers.includes(user._id);
                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleMember(user._id)}
                      className={`flex w-full items-center gap-3 border-b border-base-300 px-4 py-3 text-left last:border-b-0 ${
                        selected ? "bg-primary/10" : "hover:bg-base-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        className="checkbox checkbox-primary"
                      />
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-9 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{user.fullName}</div>
                        <div className="truncate text-xs text-zinc-500">{user.email}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateGroupModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={handleCreateGroup} className="btn btn-primary" disabled={selectedMembers.length === 0}>Create</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
