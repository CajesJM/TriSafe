export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <strong>Something went wrong</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}
export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="success" role="status">
      <span>✓</span>
      {message}
    </div>
  );
}
export function EmptyState({
  text,
  title = "No records found",
}: {
  text: string;
  title?: string;
}) {
  return (
    <div className="empty">
      <span aria-hidden="true">⌕</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function LoadingState({
  label = "Loading live data…",
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </div>
  );
}
