'use client';

import Link from 'next/link';
import { ArrowLeft, Presentation, Bell, Zap, LayoutTemplate } from 'lucide-react';

const UPCOMING = [
  { icon: Presentation, label: 'One-click export to Google Slides' },
  { icon: LayoutTemplate, label: 'Preserve all layouts and fonts' },
  { icon: Zap, label: 'Sync edits back from Google Slides' },
  { icon: Bell, label: 'Get notified when it ships' },
];

export default function GoogleSlidesPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 mb-12 self-start ml-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to dashboard
      </Link>

      <div className="max-w-md mx-auto">
        {/* Google Slides colour dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['#4285F4', '#34A853', '#FBBC05', '#EA4335'].map((c) => (
            <div key={c} className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Coming soon
        </div>

        <h1 className="text-3xl font-bold text-black mb-4 leading-tight">
          Google Slides export
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Export any Pitchonix presentation directly to Google Slides — with all layouts, fonts, and styles preserved. We're building this now.
        </p>

        <ul className="space-y-3 mb-10 text-left">
          {UPCOMING.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              {label}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center bg-black text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition-colors text-sm"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
