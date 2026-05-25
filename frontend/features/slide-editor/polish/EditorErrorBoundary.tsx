'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

// =============================================================================
//  EditorErrorBoundary (Phase 16)
//
//  Wraps the slide editor so a runtime error inside a renderer / inspector /
//  panel doesn't take down the whole route. Shows a recovery UI with:
//    - the error message
//    - "Reset editor" — re-mounts the children
//    - "Back to dashboard" — navigates away
// =============================================================================

interface Props {
  children: React.ReactNode;
  /** Optional context label (e.g. slide id) shown in the report */
  contextLabel?: string;
}

interface State {
  error:    Error | null;
  resetKey: number;
}

export class EditorErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to the console so the user can copy the stack from devtools.
    console.error('[EditorErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null, resetKey: this.state.resetKey + 1 });
  };

  render() {
    if (!this.state.error) {
      // Keying on resetKey makes React re-mount children on reset, which clears
      // any stuck state inside them (TipTap editors, dropdowns, etc.).
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#EDEBE6] p-6">
        <div className="max-w-md w-full bg-white border border-[#F7E3E3] rounded-xl shadow-xl overflow-hidden">
          <header className="px-5 py-4 bg-[#FCF1F1] border-b border-[#F7E3E3] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#9a3737] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-red-900">The editor hit an error</h2>
              <p className="text-[11px] text-[#7a2929] mt-0.5">Your work is auto-saved — refreshing usually restores it.</p>
            </div>
          </header>
          <div className="px-5 py-4">
            <pre className="text-[11px] bg-[#F1F0EC] border border-[#E3E1DA] rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {this.state.error.message || String(this.state.error)}
            </pre>
            {this.props.contextLabel && (
              <p className="text-[10px] text-[#9A9A9A] mt-2">Context: {this.props.contextLabel}</p>
            )}
          </div>
          <footer className="px-5 py-3 border-t border-[#E3E1DA] bg-[#EDEBE6] flex items-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded shadow-md shadow-green-500/30 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset editor
            </button>
            <a
              href="/dashboard"
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E3E1DA] hover:bg-[#F1F0EC] text-[#111111] rounded flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Dashboard
            </a>
          </footer>
        </div>
      </div>
    );
  }
}
