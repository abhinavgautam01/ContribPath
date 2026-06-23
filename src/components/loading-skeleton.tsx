export function LoadingSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="shimmer h-4 w-32 rounded-full" />
      <div className="shimmer h-7 w-3/4 rounded-lg" />
      <div className="shimmer h-4 w-full rounded-full" />
      <div className="shimmer h-4 w-2/3 rounded-full" />
    </div>
  );
}
