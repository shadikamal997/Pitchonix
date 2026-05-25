'use client';

import { motion } from 'framer-motion';
import StandardCard from '@/components/pdf-studio/StandardCard';
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
} from 'lucide-react';

export default function PdfStudioPage() {
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

      {/* Three Premium Cards Section */}
      <div className="relative py-16 lg:py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="pn-h1 mb-3">Three Ways to Create</h2>
            <p className="text-base text-[#6B6B6B] max-w-2xl mx-auto">
              From raw notes to professional business documents to visual marketing materials.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
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
