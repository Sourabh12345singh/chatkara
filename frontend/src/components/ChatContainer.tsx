import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    pagination,
  } =
    useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedUser) return;
    void getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {pagination?.hasMore && selectedUser && (
          <div className="flex justify-center">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={isMessagesLoading}
              onClick={() => void getMessages(selectedUser._id, true)}
            >
              Load more
            </button>
          </div>
        )}
        {messages.map((message, index) => {
          const isMe = authUser && message.senderId === authUser._id;
          const senderName =
            typeof message.senderId === "object" && "fullName" in message.senderId
              ? String(message.senderId.fullName)
              : isMe
                ? authUser?.fullName ?? "Me"
                : selectedUser?.fullName ?? "Unknown";

          const isMetaMessage = Boolean(message.metaInfo);
          return (
            <div
              key={message._id}
              className={`chat ${isMe ? "chat-end" : "chat-start"}`}
              ref={index === messages.length - 1 ? messageEndRef : null}
            >
              <div className="chat-header mb-1 flex items-center gap-2 text-xs opacity-70">
                <span>{senderName}</span>
                {isMetaMessage && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {message.metaInfo?.mode === "meta_pro" ? "Meta Pro" : "Meta"}
                  </span>
                )}
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="mb-2 rounded-md sm:max-w-[200px]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                {message.text && <p>{message.text}</p>}
                {isMetaMessage && (
                  <div className="mt-2 rounded-md border border-primary/20 bg-base-100/80 px-2 py-1 text-[11px] text-base-content/70">
                    {message.metaInfo?.vectorConfigured === false
                      ? "Vector lookup: unavailable (missing config)"
                      : message.metaInfo?.usedVector
                        ? `Vector lookup: used ${message.metaInfo.vectorMatches} match(es)`
                        : "Vector lookup: not used"}
                  </div>
                )}
              </div>
              <div className="chat-footer mt-1 text-xs opacity-50">
                {formatMessageTime(message.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
