const SidebarSkeleton = () => (
  <div className="flex h-full w-full flex-col gap-3 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-lg p-2">
        <div className="h-12 w-12 animate-pulse rounded-full bg-base-300" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-base-300" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-base-300" />
        </div>
      </div>
    ))}
  </div>
);

export default SidebarSkeleton;
