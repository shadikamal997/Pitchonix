'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PdfEditorRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/pdf-studio/editor/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#EDEBE6]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F7563]" />
    </div>
  );
}
