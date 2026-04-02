const MessageSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
        <div className="h-16 w-48 animate-pulse rounded-2xl bg-base-300" />
      </div>
    ))}
  </div>
);

export default MessageSkeleton;
