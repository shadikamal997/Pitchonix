'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PdfEditorRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const target = `/pdf-studio/editor/${params.id}${qs ? `?${qs}` : ''}`;
    router.replace(target);
  }, [params.id, router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#EDEBE6]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F7563]" />
    </div>
  );
}
