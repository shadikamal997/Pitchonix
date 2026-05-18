'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuthStore } from '@/lib/store';
import { HelpCircle, BookOpen, MessageCircle, FileText, Zap, ExternalLink } from 'lucide-react';

const FAQ = [
  {
    q: 'How do I enable AI generation?',
    a: 'AI generation requires an OpenAI API key configured by your administrator. If generation is unavailable, contact your workspace owner.',
  },
  {
    q: 'What export formats are supported?',
    a: 'PowerPoint (PPTX) and PDF exports are both supported. Use the export button inside any project or PDF Studio document.',
  },
  {
    q: 'Can I customise brand colors?',
    a: 'Yes — create a Brand Kit under the Brand Kits section and apply it to any document for consistent logos, colors, and fonts.',
  },
  {
    q: 'How is the quality score calculated?',
    a: 'Quality scores evaluate seven dimensions: clarity, investor readiness, design quality, business logic, market strength, financial completeness, and story flow.',
  },
  {
    q: 'Can I edit a generated document?',
    a: 'Yes. Open any project and click "Edit" to re-enter the creation wizard, or use PDF Studio for detailed page-level editing.',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) router.push('/login');
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
            <p className="text-gray-600">Guides, FAQs, and contact options for the Pitchonix platform</p>
          </div>

          <div className="space-y-6">
            {/* Getting Started */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-lg p-3 flex-shrink-0">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Getting Started</h2>
                  <p className="text-gray-600 mb-4">
                    New to Pitchonix? Start by creating a project via the <strong>Create New</strong> button in the sidebar. Choose a document type, fill in your business details, and let the AI generate a polished document in seconds.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                    <li>Click <strong>Create New</strong> in the left sidebar</li>
                    <li>Pick a document type (Pitch Deck, Business Plan, etc.)</li>
                    <li>Complete the guided form with your information</li>
                    <li>Click <strong>Generate</strong> and review your document</li>
                    <li>Export as PDF or PowerPoint</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-cyan-100 rounded-lg p-3 flex-shrink-0">
                  <FileText className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Supported Document Types</h2>
                  <p className="text-gray-600 mb-3">Pitchonix supports a wide range of professional document types:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                    {['Pitch Decks', 'Business Plans', 'Sales Decks', 'Business Proposals', 'Marketing Plans', 'Case Studies', 'Executive Summaries', 'Company Profiles', 'Financial Projections', 'Partnership Proposals', 'Visual One-Pagers', 'Product Flyers'].map((t) => (
                      <div key={t} className="flex items-center gap-1.5">
                        <span className="text-green-500">•</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 rounded-lg p-3 flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact Support</h2>
                  <p className="text-gray-600 mb-4">Our support team is available to help with any issues.</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-28">Email</span>
                      <a href="mailto:support@pitchonix.com" className="text-orange-600 hover:underline flex items-center gap-1">
                        support@pitchonix.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-28">Response time</span>
                      <span className="text-gray-900">Within 24 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation — coming soon */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-lg p-3 flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">Full Documentation</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Coming Soon</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Detailed guides, API reference, and advanced tutorials are in development. In the meantime, refer to the FAQ below or contact support.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <HelpCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-5">
                {FAQ.map(({ q, a }) => (
                  <div key={q}>
                    <h3 className="font-semibold text-gray-900 mb-1">{q}</h3>
                    <p className="text-sm text-gray-600">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
