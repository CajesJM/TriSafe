import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TriSafe admin interface error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error">
        <section className="card">
          <span aria-hidden="true">!</span>
          <h1>TriSafe could not display this page</h1>
          <p>
            The interface received unexpected data. Restart the API, then reload
            the admin portal.
          </p>
          <details>
            <summary>Technical details</summary>
            <code>{this.state.error.message}</code>
          </details>
          <button
            className="primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload admin portal
          </button>
        </section>
      </main>
    );
  }
}
