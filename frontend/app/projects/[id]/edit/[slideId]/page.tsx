'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import api from '@/lib/api';
// Use the default export which wraps the editor in an error boundary.
import SlideEditor from '@/features/slide-editor/SlideEditor';

interface PageProps {
  params: { id: string; slideId: string };
}

// =============================================================================
//  Slide editor entry route.
//
//  The URL segment can be either a slideId OR (when launched from the project
//  page on an empty deck) a deckId with `?new=1`. The resolver below figures
//  out which it is, and for empty decks auto-creates the first slide so the
//  user lands in a usable editor.
// =============================================================================

type Resolved =
  | { state: 'loading' }
  | { state: 'ready';   slideId: string }
  | { state: 'empty';   deckId: string }      // valid deck with no slides
  | { state: 'error';   message: string };

export default function SlideEditorPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resolved, setResolved] = useState<Resolved>({ state: 'loading' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // Try slide first — the common case.
      try {
        const { data: slide } = await api.get(`/slides/${params.slideId}`);
        if (cancelled) return;
        if (slide?.id) { setResolved({ state: 'ready', slideId: slide.id }); return; }
      } catch { /* fall through */ }

      if (cancelled) return;

      // Fall back: maybe the URL segment is actually a deckId.
      try {
        const { data: deck } = await api.get(`/decks/${params.slideId}`);
        if (cancelled) return;
        if (deck?.id) {
          const slides = await api.get(`/slides/deck/${deck.id}`);
          const list = Array.isArray(slides.data) ? slides.data : [];
          if (list.length > 0) {
            const first = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
            router.replace(`/projects/${params.id}/edit/${first.id}`);
            return;
          }
          setResolved({ state: 'empty', deckId: deck.id });
          return;
        }
      } catch { /* fall through */ }

      if (!cancelled) setResolved({ state: 'error', message: 'Slide not found and the URL is not a known deck.' });
    };

    resolve();
    return () => { cancelled = true; };
  }, [params.id, params.slideId, router]);

  // Auto-create the first slide if the user reached an empty deck via ?new=1.
  useEffect(() => {
    if (resolved.state !== 'empty' || creating) return;
    if (searchParams?.get('new') !== '1') return;
    setCreating(true);
    (async () => {
      try {
        const { data: slide } = await api.post(`/slides/deck/${resolved.deckId}/insert`, {
          title: 'Untitled slide',
          type: 'cover',
        });
        router.replace(`/projects/${params.id}/edit/${slide.id}`);
      } catch (err: any) {
        setResolved({ state: 'error', message: err?.response?.data?.message || err?.message || 'Could not create slide' });
      }
    })();
  }, [resolved, searchParams, creating, router, params.id]);

  if (resolved.state === 'loading' || creating) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-green-600" />
          <span className="text-sm">{creating ? 'Creating your first slide…' : 'Loading editor…'}</span>
        </div>
      </div>
    );
  }

  if (resolved.state === 'error') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-red-900">Couldn't open the editor</h2>
              <p className="text-xs text-red-700 mt-1">{resolved.message}</p>
              <a href={`/projects/${params.id}`} className="inline-block mt-3 text-xs font-semibold text-green-700 hover:underline">
                ← Back to project
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resolved.state === 'empty') {
    // Empty deck and no auto-create flag: present a clear call-to-action.
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-white p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <Plus className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900">This deck has no slides yet</h2>
          <p className="text-xs text-slate-500 mt-1">Create your first slide to start editing.</p>
          <button
            type="button"
            onClick={async () => {
              setCreating(true);
              try {
                const { data: slide } = await api.post(`/slides/deck/${resolved.deckId}/insert`, {
                  title: 'Untitled slide',
                  type: 'cover',
                });
                router.replace(`/projects/${params.id}/edit/${slide.id}`);
              } catch (err: any) {
                setResolved({ state: 'error', message: err?.response?.data?.message || err?.message || 'Could not create slide' });
              }
            }}
            disabled={creating}
            className="mt-5 w-full h-9 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-lg shadow-md shadow-green-500/30 disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create first slide
          </button>
          <a href={`/projects/${params.id}`} className="inline-block mt-3 text-[11px] text-slate-500 hover:text-slate-800">
            ← Back to project
          </a>
        </div>
      </div>
    );
  }

  return <SlideEditor projectId={params.id} slideId={resolved.slideId} />;
}
