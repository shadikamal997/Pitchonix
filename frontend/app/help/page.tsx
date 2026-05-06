'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuthStore } from '@/lib/store';
import { HelpCircle, BookOpen, MessageCircle, FileText, Zap } from 'lucide-react';

export default function HelpPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
    }
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Documentation</h1>
            <p className="text-gray-600">Everything you need to create amazing presentations and PDFs</p>
          </div>
          
          <div className="space-y-6">
            {/* Getting Started */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-violet-100 rounded-lg p-3">
                  <Zap className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Getting Started</h2>
                  <p className="text-gray-600 mb-4">
                    Learn how to create your first presentation or PDF document in minutes.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-violet-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>Quick start guide</span>
                    </div>
                    <div className="flex items-center gap-2 text-violet-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>Video tutorials</span>
                    </div>
                    <div className="flex items-center gap-2 text-violet-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>Best practices</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-cyan-100 rounded-lg p-3">
                  <FileText className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Document Types</h2>
                  <p className="text-gray-600 mb-4">
                    Explore all 16 document types and learn when to use each one.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-700">• Pitch Decks</div>
                    <div className="text-gray-700">• Business Plans</div>
                    <div className="text-gray-700">• Sales Decks</div>
                    <div className="text-gray-700">• Proposals</div>
                    <div className="text-gray-700">• Marketing Plans</div>
                    <div className="text-gray-700">• Case Studies</div>
                    <div className="text-gray-700">• And 10 more...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-lg p-3">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Documentation</h2>
                  <p className="text-gray-600 mb-4">
                    Detailed guides and API documentation for advanced users.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>Read PITCHONIX_COMPLETE_FEATURES.md</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>View API documentation</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 hover:underline cursor-pointer">
                      <span>→</span>
                      <span>Troubleshooting guide</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 rounded-lg p-3">
                  <MessageCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact Support</h2>
                  <p className="text-gray-600 mb-4">
                    Need help? Our support team is here for you.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Email:</span>
                      <a href="mailto:support@pitchonix.com" className="text-orange-600 hover:underline">
                        support@pitchonix.com
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Response time:</span>
                      <span className="text-sm text-gray-900">Within 24 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="h-6 w-6 text-violet-600" />
                <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">How do I enable AI generation?</h3>
                  <p className="text-sm text-gray-600">
                    AI generation requires an OpenAI API key. Contact your administrator to configure the OPENAI_API_KEY environment variable.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">What export formats are supported?</h3>
                  <p className="text-sm text-gray-600">
                    Currently, PowerPoint (PPTX) export is supported. PDF export is coming soon.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Can I customize brand colors?</h3>
                  <p className="text-sm text-gray-600">
                    Yes! Use the Brand Kits feature to create custom color palettes, logos, and fonts for your organization.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">How is quality score calculated?</h3>
                  <p className="text-sm text-gray-600">
                    Quality scores are based on 7 dimensions: clarity, investor readiness, design quality, business logic, market strength, financial completeness, and story flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
