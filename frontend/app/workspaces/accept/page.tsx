'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';
import { acceptWorkspaceInvite } from '@/features/workspaces/useWorkspaces';
import { useWorkspaceContext } from '@/features/workspaces/WorkspaceContext';

// =============================================================================
//  Phase 39 — Accept Invite page
//
//  URL: /workspaces/accept?token=…
//
//  Calls POST /workspace-invites/accept under the user's JWT. The backend
//  enforces that the JWT email matches the invited email. If the user isn't
//  logged in, we send them to /login and they come back after authenticating.
// =============================================================================

type State =
  | { kind: 'pending' }
  | { kind: 'success'; workspaceId: string }
  | { kind: 'error';   message: string }
  | { kind: 'auth-required' };

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>({ kind: 'pending' });
  const { refresh, setCurrentWorkspaceId } = useWorkspaceContext();

  useEffect(() => {
    if (!token) { setState({ kind: 'error', message: 'Missing invitation token.' }); return; }
    let cancelled = false;
    (async () => {
      try {
        const { workspaceId } = await acceptWorkspaceInvite(token);
        if (cancelled) return;
        await refresh();
        setCurrentWorkspaceId(workspaceId);
        setState({ kind: 'success', workspaceId });
      } catch (e: any) {
        if (cancelled) return;
        const status = e?.response?.status;
        if (status === 401) {
          // Stash the token so login can come back to it.
          try { window.localStorage.setItem('pitchonix.pendingInvite', token); } catch { /* ignore */ }
          setState({ kind: 'auth-required' });
        } else {
          setState({
            kind: 'error',
            message: e?.response?.data?.message || e?.message || 'Failed to accept invitation.',
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token, refresh, setCurrentWorkspaceId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-6 text-center">
        <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
        {state.kind === 'pending' && (
          <>
            <h1 className="text-base font-bold text-slate-900 mb-2">Accepting invitation…</h1>
            <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
          </>
        )}
        {state.kind === 'success' && (
          <>
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <h1 className="text-base font-bold text-slate-900 mb-2">You're in!</h1>
            <p className="text-sm text-slate-600 mb-4">You've joined the workspace.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Go to dashboard
            </button>
          </>
        )}
        {state.kind === 'auth-required' && (
          <>
            <h1 className="text-base font-bold text-slate-900 mb-2">Sign in to continue</h1>
            <p className="text-sm text-slate-600 mb-4">You need to be logged in to accept this invitation.</p>
            <Link
              href="/login"
              className="inline-block px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Sign in
            </Link>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <h1 className="text-base font-bold text-slate-900 mb-2">Invitation problem</h1>
            <p className="text-sm text-slate-600 mb-4">{state.message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-3 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded"
            >
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
