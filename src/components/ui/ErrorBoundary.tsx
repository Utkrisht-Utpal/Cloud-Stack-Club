import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    sessionStorage.removeItem('csc_page_force_refreshed');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="max-w-md space-y-4 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">New Update Available</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              An updated version of Cloud Stack Club has been deployed. Please refresh to load the latest dashboard components.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Refresh Page Now</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
