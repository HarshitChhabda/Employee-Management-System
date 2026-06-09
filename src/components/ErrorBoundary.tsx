// ============================================================
// Error Boundary Component
// Catches React rendering errors with fallback UI
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[300px] p-8">
          <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">
              कुछ गलत हो गया / Something Went Wrong
            </h3>
            <p className="text-sm text-[var(--text-secondary)] font-bold mb-6">
              {this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer font-black text-sm mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>पुनः प्रयास करें / Retry</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
