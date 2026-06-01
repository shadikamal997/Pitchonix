'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StandardCard from '@/components/pdf-studio/StandardCard';
import api from '@/lib/api';
import {
  FileText,
  Sparkles,
  Book,
  FileCheck,
  Layout,
  Zap,
  Palette,
  Image as ImageIcon,
  Layers,
  TrendingUp,
  Target,
  BarChart3,
  CheckCircle,
  Eye,
  Wand2,
  Clock,
  ArrowRight,
  FilePlus2,
} from 'lucide-react';

type PdfHistoryItem = {
  id: string;
  title?: string | null;
  documentType?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  qualityScore?: number | null;
  exportReady?: boolean | null;
  _count?: {
    pages?: number;
    exports?: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function PdfStudioPage() {
  const [history, setHistory] = useState<PdfHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    api.get('/pdf-documents')
      .then(({ data }) => {
        if (!active) return;
        setHistory((Array.isArray(data) ? data : []).slice(0, 6));
        setHistoryError('');
      })
      .catch((error) => {
        if (!active) return;
        setHistory([]);
        setHistoryError(error?.response?.data?.message || 'Could not load recent PDF documents.');
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-full bg-[#EDEBE6]">
      {/* Hero Section — Phase Δ */}
      <div className="relative overflow-hidden bg-[#263F34] py-16 sm:py-20">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute -top-20 right-20 w-96 h-96 bg-[#4F7563] rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-20 w-96 h-96 bg-[#7A988A] rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#DDE8E1]" />
              <span className="text-[12px] font-semibold tracking-wide uppercase text-[#DDE8E1]">AI-Powered Document Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-[1.05] tracking-[-0.03em]">
              PDF Studio
            </h1>
            <p className="text-lg md:text-xl text-[#DDE8E1] max-w-3xl mx-auto leading-relaxed">
              Transform any content into professional documents. Choose your creation mode.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Recent Documents / History */}
      <div className="relative py-10 bg-[#F7F6F2] border-b border-[#E3E0D8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-[#4F7563] mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Document History
                </div>
                <h2 className="pn-h1 mb-1">Recent PDF Studio documents</h2>
                <p className="text-sm text-[#6B6B6B]">
                  Continue editing, review page counts, and reopen export-ready documents.
                </p>
              </div>
              <Link
                href="/pdf-studio/smart-builder"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#263F34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E332A] transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                New PDF
              </Link>
            </div>

            <div className="pn-card overflow-hidden">
              {historyLoading ? (
                <div className="grid md:grid-cols-3 gap-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-lg bg-[#EDEBE6] animate-pulse" />
                  ))}
                </div>
              ) : historyError ? (
                <div className="p-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#111111]">History unavailable</h3>
                    <p className="text-sm text-[#6B6B6B] mt-1">{historyError}</p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1]"
                  >
                    Retry
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#111111]">No PDF documents yet</h3>
                    <p className="text-sm text-[#6B6B6B] mt-1">
                      Create your first document and it will appear here automatically.
                    </p>
                  </div>
                  <Link
                    href="/pdf-studio/smart-builder"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1]"
                  >
                    Start building
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#E3E0D8]">
                  {history.map((doc) => {
                    const pages = doc._count?.pages ?? 0;
                    const exports = doc._count?.exports ?? 0;
                    return (
                      <Link
                        key={doc.id}
                        href={`/pdf-studio/editor/${doc.id}`}
                        className="group grid md:grid-cols-[1fr_auto] gap-4 p-4 hover:bg-[#FBFAF7] transition-colors"
                      >
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="w-11 h-11 rounded-lg bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#111111] truncate group-hover:text-[#355846]">
                              {doc.title || 'Untitled PDF document'}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
                              <span>{doc.documentType || 'PDF document'}</span>
                              <span className="w-1 h-1 rounded-full bg-[#C9C6BD]" />
                              <span>{pages} page{pages === 1 ? '' : 's'}</span>
                              <span className="w-1 h-1 rounded-full bg-[#C9C6BD]" />
                              <span>{exports} export{exports === 1 ? '' : 's'}</span>
                              <span className="w-1 h-1 rounded-full bg-[#C9C6BD]" />
                              <span>Updated {formatDate(doc.updatedAt || doc.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 md:justify-end">
                          {typeof doc.qualityScore === 'number' && (
                            <span className="rounded-full bg-white border border-[#E3E0D8] px-3 py-1 text-xs font-bold text-[#355846]">
                              {Math.round(doc.qualityScore)} quality
                            </span>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            doc.exportReady
                              ? 'bg-[#DDE8E1] text-[#355846]'
                              : 'bg-[#F2EEE6] text-[#6B6B6B]'
                          }`}>
                            {doc.exportReady ? 'Export ready' : doc.status || 'Draft'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-[#355846]" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Three Premium Cards Section */}
      <div className="relative py-10 lg:py-12">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="pn-h1 mb-2">Three Ways to Create</h2>
            <p className="text-sm text-[#6B6B6B] max-w-2xl mx-auto">
              From raw notes to professional business documents to visual marketing materials.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <StandardCard
              href="/pdf-studio/smart-builder"
              icon={Sparkles}
              title="Smart PDF Builder"
              subtitle="Transform ANY raw content into professional PDFs. Works with business notes, school notes, research, articles, or mixed content."
              features={[
                { icon: Zap,         title: 'Universal Content Support', subtitle: 'Works with any text format' },
                { icon: Target,      title: 'Auto-Detects Structure',    subtitle: 'Intelligent content analysis' },
                { icon: CheckCircle, title: 'Improves Writing',          subtitle: 'Grammar & style enhancement' },
              ]}
              ctaText="Start Building"
              badge={{ text: 'POPULAR' }}
              delay={0.1}
            />

            <StandardCard
              href="/pdf-studio/structured"
              icon={FileText}
              title="Structured Documents"
              subtitle="Professional business templates with guided creation"
              features={[
                { icon: Book,      title: 'Business Templates',  subtitle: 'Proposals, reports & profiles' },
                { icon: Layout,    title: 'Guided Creation',     subtitle: 'Step-by-step process' },
                { icon: BarChart3, title: 'Executive Documents', subtitle: 'Charts, tables & data' },
              ]}
              ctaText="Browse Templates"
              delay={0.2}
            />

            <StandardCard
              href="/pdf-studio/visual-studio"
              icon={Palette}
              title="Visual Design Studio"
              subtitle="Professional flyers, one-pagers, brochures, and marketing materials with image-driven layouts"
              features={[
                { icon: Wand2,     title: 'Canva-Style Templates',    subtitle: 'Professional visual designs' },
                { icon: ImageIcon, title: 'Image-Driven Layouts',     subtitle: 'Flyers & brochures' },
                { icon: Layers,    title: 'Marketing Compositions',   subtitle: 'Brand-aware styling' },
              ]}
              ctaText="Explore Visual Templates"
              badge={{ text: 'NEW' }}
              delay={0.3}
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-16 lg:py-20 bg-[#F7F6F2]">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="pn-h1 mb-3">Why Choose PDF Studio?</h3>
            <p className="text-base text-[#6B6B6B] max-w-2xl mx-auto">
              Enterprise-grade document creation with AI-powered intelligence
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Sparkles,    title: 'Smart Analysis',  desc: 'Automatic content detection and structure enhancement' },
              { icon: TrendingUp,  title: 'Quality Scoring', desc: 'Real-time quality metrics and improvement suggestions' },
              { icon: Eye,         title: 'Visual Design',   desc: 'Professional layouts with Canva-quality composition' },
              { icon: FileCheck,   title: 'Export Ready',    desc: 'PDF, PPTX, and DOCX formats with perfect formatting' },
            ].map((b, i) => {
              const BIcon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * (i + 1) }}
                  className="pn-card p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mx-auto mb-4">
                    <BIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-[#111111] mb-1.5">{b.title}</h4>
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">{b.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
