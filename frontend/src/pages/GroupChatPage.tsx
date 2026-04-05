import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  MoreVertical,
  Users,
  UserMinus,
  Trash2,
  Edit,
  Loader2,
  UserPlus,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";

const GroupChatPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { users, getUsers } = useChatStore();
  const {
    selectedGroup,
    groupMessages,
    setSelectedGroup,
    getGroupMessages,
    getGroups,
    sendGroupMessage,
    updateGroup,
    addMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    isMessagesLoading,
    groupPagination,
    setupSocketListeners,
  } = useGroupStore();

  const [messageText, setMessageText] = useState("");
  const [messageImage, setMessageImage] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPic, setEditPic] = useState("");
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const pendingScrollAdjustRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // Setup socket listeners once
  useEffect(() => {
    setupSocketListeners();
  }, []);

  // Join group socket room when entering, leave when exiting
  useEffect(() => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !groupId) return;

    // Join the group room
    socket.emit("joinGroup", groupId);

    // Leave the group room on cleanup
    return () => {
      socket.emit("leaveGroup", groupId);
    };
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      setSelectedGroup(null);
      void getGroupMessages(groupId);
    }
    return () => setSelectedGroup(null);
  }, [groupId, setSelectedGroup, getGroupMessages]);

  useEffect(() => {
    if (pendingScrollAdjustRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  useEffect(() => {
    if (!isMessagesLoading) {
      isLoadingMoreRef.current = false;
    }
  }, [isMessagesLoading]);

  useLayoutEffect(() => {
    if (!pendingScrollAdjustRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const newScrollTop = container.scrollHeight - prevScrollHeightRef.current + prevScrollTopRef.current;
    container.scrollTop = newScrollTop;
    pendingScrollAdjustRef.current = false;
  }, [groupMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !messageImage) return;
    await sendGroupMessage({ text: messageText, image: messageImage || undefined });
    setMessageText("");
    setMessageImage("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMessageImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupId || !editName.trim()) return;
    await updateGroup(groupId, { name: editName, groupPic: editPic || undefined });
    setShowEditModal(false);
    setEditPic("");
  };

  const handleAddMembers = async () => {
    if (!groupId || newMembers.length === 0) return;
    await addMembers(groupId, newMembers);
    setShowAddMemberModal(false);
    setNewMembers([]);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    await removeMember(groupId, userId);
  };

  const handleLeave = async () => {
    if (!groupId) return;
    await leaveGroup(groupId);
    navigate("/groups");
  };

  const handleDelete = async () => {
    if (!groupId) return;
    await deleteGroup(groupId);
    navigate("/groups");
  };

  const isAdmin = selectedGroup?.admin._id === authUser?._id;

  const availableUsers = users.filter(
    (u) => !selectedGroup?.members.some((m) => m._id === u._id)
  );

  const filteredUsers = availableUsers.filter((user) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  if (!selectedGroup) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/groups")} className="btn btn-ghost btn-sm">
              <ArrowLeft className="size-5" />
            </button>
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-10">
                {selectedGroup.groupPic ? (
                  <img src={selectedGroup.groupPic} alt={selectedGroup.name} />
                ) : (
                  <Users className="size-5" />
                )}
              </div>
            </div>
            <div>
              <h2 className="font-bold">{selectedGroup.name}</h2>
              <p className="text-xs text-base-content/60">
                {selectedGroup.members.length} members
              </p>
            </div>
          </div>
          <button onClick={() => setShowInfo((current) => !current)} className="btn btn-ghost btn-sm">
            <MoreVertical className="size-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={(e) => {
            if (!groupPagination?.hasMore || !groupId) return;
            if (isMessagesLoading || isLoadingMoreRef.current) return;
            const target = e.currentTarget;
            const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 40;
            shouldAutoScrollRef.current = atBottom;
            if (target.scrollTop <= 0) {
              isLoadingMoreRef.current = true;
              prevScrollHeightRef.current = target.scrollHeight;
              prevScrollTopRef.current = target.scrollTop;
              pendingScrollAdjustRef.current = true;
              void getGroupMessages(groupId, true);
            }
          }}
        >
          {isMessagesLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            groupMessages.map((msg) => {
              const sender =
                typeof msg.senderId === "object" ? msg.senderId : null;
              const isMe = sender
                ? sender._id === authUser?._id
                : msg.senderId === authUser?._id;
              const isMetaMessage = Boolean(msg.metaInfo);

              return (
                <div
                  key={msg._id}
                  className={`chat ${isMe ? "chat-end" : "chat-start"}`}
                >
                  <div className="chat-header flex items-center gap-2 opacity-50 text-xs">
                    <span>{sender?.fullName || "Unknown"}</span>
                    {isMetaMessage && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {msg.metaInfo?.mode === "meta_pro" ? "Meta Pro" : "Meta"}
                      </span>
                    )}
                  </div>
                  <div
                    className={`chat-bubble ${
                      isMe ? "chat-bubble-primary" : ""
                    }`}
                  >
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="sent"
                        className="rounded-lg mb-2 max-w-[200px]"
                      />
                    )}
                    {msg.text}
                    {isMetaMessage && (
                      <div className="mt-2 rounded-md border border-primary/20 bg-base-100/80 px-2 py-1 text-[11px] text-base-content/70">
                        {msg.metaInfo?.vectorConfigured === false
                          ? "Vector lookup: unavailable (missing config)"
                          : msg.metaInfo?.usedVector
                            ? `Vector lookup: used ${msg.metaInfo.vectorMatches} match(es)`
                            : "Vector lookup: not used"}
                      </div>
                    )}
                  </div>
                  <div className="chat-footer opacity-50 text-xs">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input with Image */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-base-300">
          {messageImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={messageImage}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setMessageImage("")}
                className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="btn btn-ghost btn-sm"
            >
              <ImageIcon className="size-5" />
            </button>
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!messageText.trim() && !messageImage}
            >
              <Send className="size-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Group Info Sidebar */}
      {showInfo && (
        <div className="w-72 border-l border-base-300 p-4 overflow-y-auto">
          <h3 className="font-bold mb-4">Group Info</h3>

          {/* Group Pic - Click to change */}
          <div className="flex justify-center mb-4">
            <div className="avatar online">
              <div className="w-24 rounded-full bg-base-200">
                {selectedGroup.groupPic ? (
                  <img
                    src={selectedGroup.groupPic}
                    alt={selectedGroup.name}
                    className="object-cover"
                  />
                ) : (
                  <Users className="size-12 text-base-content/50" />
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditName(selectedGroup.name);
                setEditPic(selectedGroup.groupPic || "");
                setShowEditModal(true);
              }}
              className="btn btn-outline btn-sm w-full mb-4"
            >
              <Camera className="size-4" />
              Change Group Photo
            </button>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div className="space-y-2 mb-4">
              <button
                onClick={() => {
                  setEditName(selectedGroup.name);
                  setEditPic(selectedGroup.groupPic || "");
                  setShowEditModal(true);
                }}
                className="btn btn-outline btn-sm w-full"
              >
                <Edit className="size-4" />
                Edit Group Name
              </button>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="btn btn-outline btn-sm w-full"
              >
                <UserPlus className="size-4" />
                Add Members
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-error btn-sm w-full"
              >
                <Trash2 className="size-4" />
                Delete Group
              </button>
            </div>
          )}

          {!isAdmin && (
            <button
              onClick={handleLeave}
              className="btn btn-outline btn-sm w-full mb-4"
            >
              Leave Group
            </button>
          )}

          {/* Members list */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">
              Members ({selectedGroup.members.length})
            </h4>
            <div className="space-y-2">
              {selectedGroup.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2 rounded hover:bg-base-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img
                          src={member.profilePic || "/avatar.png"}
                          alt={member.fullName}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.fullName}</p>
                      {member._id === selectedGroup.admin._id && (
                        <span className="text-xs text-primary">Admin</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && member._id !== selectedGroup.admin._id && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Group</h3>

            {/* Group Pic */}
            <div className="flex justify-center mb-4">
              <div className="avatar online">
                <div className="w-24 rounded-full bg-base-200">
                  {editPic ? (
                    <img src={editPic} alt="Group pic" className="object-cover" />
                  ) : (
                    <Users className="size-12 text-base-content/50" />
                  )}
                </div>
              </div>
            </div>
            <label className="btn btn-sm btn-outline mb-4">
              <input
                type="file"
                accept="image/*"
                ref={editImageInputRef}
                onChange={handleEditImageSelect}
                className="hidden"
              />
              Change Photo
            </label>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleUpdateGroup} className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Members</h3>

            <div className="mb-4">
              <div className="text-xs text-base-content/60 mb-2">
                {newMembers.length} selected
              </div>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-base-300 bg-base-100">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-base-content/60">
                      No users to add
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const selected = newMembers.includes(user._id);
                      return (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => {
                            setNewMembers((prev) =>
                              prev.includes(user._id)
                                ? prev.filter((id) => id !== user._id)
                                : [...prev, user._id]
                            );
                          }}
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
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullName}
                            className="size-10 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{user.fullName}</p>
                            <p className="truncate text-sm text-base-content/60">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setNewMembers([]);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                className="btn btn-primary"
                disabled={newMembers.length === 0}
              >
                Add Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;
