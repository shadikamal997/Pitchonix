'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  Phase Ω.3 — Legacy /editor/[id] route → canonical /projects/[projectId]/edit/[slideId].
//
//  Background:
//    Pitchonix shipped two editor implementations historically — a simple
//    /editor/[id] page (this file) and the full-featured slide editor at
//    /projects/[projectId]/edit/[slideId]. Bookmarks, share links and a few
//    internal callers (PPTX import, ExportReadinessIndicator) still reach
//    the legacy URL. To preserve those links AND eliminate the duplicate
//    implementation, this route now performs a one-shot client-side
//    redirect to the modern editor.
//
//  Behaviour:
//    /editor/<deckId>
//      → fetch deck → project + first slide id
//      → router.replace('/projects/<projectId>/edit/<slideId>')
//    If the deck has no slides yet → fall back to /projects/<projectId>.
//    If the fetch fails with 401 → bounce through /login with redirect.
//    If the fetch fails otherwise → show a clean inline error.
// =============================================================================

export default function LegacyEditorRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const deckId = params?.id;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: deck } = await api.get(`/decks/${deckId}`);
        if (cancelled) return;
        const projectId = deck?.project?.id || deck?.projectId;
        if (!projectId) {
          setError('Cannot resolve project for this deck.');
          return;
        }
        const firstSlideId = deck?.slides?.[0]?.id;
        const target = firstSlideId
          ? `/projects/${projectId}/edit/${firstSlideId}`
          : `/projects/${projectId}`;
        router.replace(target);
      } catch (e: any) {
        if (cancelled) return;
        const status = e?.response?.status;
        if (status === 401) {
          router.replace(`/login?redirect=/editor/${deckId}`);
          return;
        }
        setError(e?.response?.data?.message || e?.message || 'Deck not found.');
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Couldn't open this deck</h1>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/projects')}
            className="h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Opening editor…
    </div>
  );
}
