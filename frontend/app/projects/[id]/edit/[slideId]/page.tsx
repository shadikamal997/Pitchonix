'use client';

import { SlideEditor } from '@/features/slide-editor/SlideEditor';

interface PageProps {
  params: { id: string; slideId: string };
}

export default function SlideEditorPage({ params }: PageProps) {
  return <SlideEditor projectId={params.id} slideId={params.slideId} />;
}
