import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.fallbackTitle || 'Section'} crashed:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-center">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {this.props.fallbackTitle || 'Something went wrong'}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-2 text-xs px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
