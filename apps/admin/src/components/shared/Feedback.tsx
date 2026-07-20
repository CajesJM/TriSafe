export function ErrorMessage({ message }: { message: string }) { return <div className="error" role="alert">API connection error: {message}</div>; }
export function SuccessMessage({ message }: { message: string }) { return <div className="success" role="status"><span>✓</span>{message}</div>; }
export function EmptyState({ text }: { text: string }) { return <div className="empty">{text}</div>; }
