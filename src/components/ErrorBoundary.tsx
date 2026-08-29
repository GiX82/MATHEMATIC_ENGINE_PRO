import { Component, type ReactNode } from 'react';
import { withTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  t: (key: string) => string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-[#050812] p-8 text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">{this.props.t('error_rendering')}</p>
              <p className="mt-3 text-sm text-zinc-400">
                {this.props.t('error_rendering_desc')}
              </p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/15"
              >
                {this.props.t('retry')}
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
