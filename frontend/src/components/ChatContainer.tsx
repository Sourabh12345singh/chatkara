import { useEffect, useLayoutEffect, useRef } from "react";
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
    pagination,
  } =
    useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const pendingScrollAdjustRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!selectedUser) return;
    void getMessages(selectedUser._id);
  }, [selectedUser, getMessages]);

  useEffect(() => {
    if (pendingScrollAdjustRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        onScroll={(e) => {
          if (!pagination?.hasMore || !selectedUser) return;
          if (isMessagesLoading || isLoadingMoreRef.current) return;
          const target = e.currentTarget;
          const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 40;
          shouldAutoScrollRef.current = atBottom;
          if (target.scrollTop <= 0) {
            isLoadingMoreRef.current = true;
            prevScrollHeightRef.current = target.scrollHeight;
            prevScrollTopRef.current = target.scrollTop;
            pendingScrollAdjustRef.current = true;
            void getMessages(selectedUser._id, true);
          }
        }}
      >
        {messages.map((message, index) => {
          const senderId =
            typeof message.senderId === "object" && message.senderId
              ? message.senderId._id
              : message.senderId;
          const isMe = Boolean(authUser && senderId === authUser._id);
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
