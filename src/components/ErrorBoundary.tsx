import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFBF9] text-[#352336] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#EADCE4] rounded-2xl p-8 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-[#9D174D] mb-2">
              Cotton Candy Sticker
            </p>
            <h1 className="text-2xl font-semibold text-[#352336] mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-[#6D586E] leading-relaxed mb-6">
              We hit an unexpected issue while loading this view. Your cart and saved items remain safe.
            </p>
            <div className="bg-[#FDF4F7] border border-[#F3DCE5] rounded-xl p-3 text-xs font-mono text-[#6D586E] break-words mb-6">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.hash = '#/';
              }}
              className="px-5 py-2.5 rounded-xl bg-[#D93D7A] text-white text-sm font-semibold hover:bg-[#BE2F68] transition-colors cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
