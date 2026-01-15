export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="container py-12">
      <div className="flex items-center justify-center">
        <div className="animate-pulse text-[var(--foreground-muted)]">
          {message}
        </div>
      </div>
    </div>
  );
}
