import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { Loader2, Plus, Search, Users, X } from "lucide-react";

const GroupsPage = () => {
  const navigate = useNavigate();
  const { users, getUsers } = useChatStore();
  const { groups, getGroups, createGroup, isGroupsLoading, isCreatingGroup, setupSocketListeners } = useGroupStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupPic, setGroupPic] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    void getGroups();
    void getUsers();
    setupSocketListeners();
  }, [getGroups, getUsers, setupSocketListeners]);

  const visibleUsers = users.filter((user) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  const selectedCount = selectedMembers.length;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    await createGroup({ name: groupName.trim(), members: selectedMembers, groupPic: groupPic || undefined });
    setShowCreateModal(false);
    setGroupName("");
    setGroupPic("");
    setSelectedMembers([]);
    setMemberSearch("");
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Groups Sidebar */}
      <div className="w-80 border-r border-base-300 flex flex-col">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-xl font-bold">My Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="size-4" />
            New Group
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isGroupsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center p-4 text-base-content/60">
              No groups yet. Create one to start chatting!
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group._id}
                onClick={() => navigate(`/groups/${group._id}`)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer"
              >
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-12">
                    {group.groupPic ? (
                      <img src={group.groupPic} alt={group.name} />
                    ) : (
                      <Users className="size-6" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{group.name}</p>
                  <p className="text-sm text-base-content/60">
                    {group.members.length} members
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-base-content/60">
          <Users className="size-16 mx-auto mb-4 opacity-50" />
          <p>Select a group to start chatting</p>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              {/* Group Pic */}
              <div className="mb-4 flex justify-center">
                <div className="avatar online">
                  <div className="w-24 rounded-full bg-base-200">
                    {groupPic ? (
                      <img src={groupPic} alt="Group pic" className="object-cover" />
                    ) : (
                      <Users className="size-12 text-base-content/50" />
                    )}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="btn btn-sm btn-outline">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  Add Group Photo
                </label>
              </div>

              {/* Group Name */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Group Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              {/* Members Selection with Checkboxes */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="label p-0">
                    <span className="label-text">Select Members</span>
                  </label>
                  <span className="text-xs text-base-content/60">{selectedCount} selected</span>
                </div>

                <div className="mb-3 flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-2">
                  <Search className="size-4 text-base-content/50" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full bg-transparent outline-none"
                  />
                  {memberSearch && (
                    <button type="button" onClick={() => setMemberSearch("")} className="text-base-content/50 hover:text-base-content">
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto rounded-lg border border-base-300 bg-base-100">
                  {visibleUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-base-content/60">No users found</div>
                  ) : (
                    visibleUsers.map((user) => {
                      const selected = selectedMembers.includes(user._id);
                      return (
                        <label
                          key={user._id}
                          className={`flex w-full cursor-pointer items-center gap-3 border-b border-base-300 px-4 py-3 last:border-b-0 ${
                            selected ? "bg-primary/10" : "hover:bg-base-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMember(user._id)}
                            className="checkbox checkbox-primary"
                          />
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullName}
                            className="size-10 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/avatar.png";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{user.fullName}</p>
                            <p className="truncate text-sm text-base-content/60">{user.email}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreatingGroup || selectedMembers.length === 0}
                >
                  {isCreatingGroup ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Create Group"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
