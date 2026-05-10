'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import StandardCard from '@/components/pdf-studio/StandardCard';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
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
  Wand2
} from 'lucide-react';

export default function PdfStudioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 py-24">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-700/25 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-sm font-semibold text-white">AI-Powered Document Platform</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              PDF Studio
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Transform any content into professional documents. Choose your creation mode.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Three Premium Cards Section */}
      <div className="relative py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-slate-900 mb-6">
              Three Ways to Create
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From raw notes to professional business documents to visual marketing materials.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* CARD 1: Smart PDF Builder */}
            <StandardCard
              href="/pdf-studio/smart-builder"
              icon={Sparkles}
              iconGradient="from-blue-500 to-purple-600"
              title="Smart PDF Builder"
              subtitle="Transform ANY raw content into professional PDFs. Works with business notes, school notes, research, articles, or mixed content."
              features={[
                {
                  icon: Zap,
                  title: 'Universal Content Support',
                  subtitle: 'Works with any text format',
                  iconColor: 'text-blue-600',
                  iconBg: 'bg-blue-100',
                },
                {
                  icon: Target,
                  title: 'Auto-Detects Structure',
                  subtitle: 'Intelligent content analysis',
                  iconColor: 'text-purple-600',
                  iconBg: 'bg-purple-100',
                },
                {
                  icon: CheckCircle,
                  title: 'Improves Writing',
                  subtitle: 'Grammar & style enhancement',
                  iconColor: 'text-green-600',
                  iconBg: 'bg-green-100',
                },
              ]}
              ctaText="Start Building"
              ctaColor="blue"
              badge={{
                text: 'POPULAR',
                gradient: 'from-blue-500 to-purple-600',
              }}
              delay={0.1}
            />

            {/* CARD 2: Structured Documents */}
            <StandardCard
              href="/pdf-studio/structured"
              icon={FileText}
              iconGradient="from-emerald-500 to-teal-600"
              title="Structured Documents"
              subtitle="Professional business templates with guided creation"
              features={[
                {
                  icon: Book,
                  title: 'Business Templates',
                  subtitle: 'Proposals, reports & profiles',
                  iconColor: 'text-emerald-600',
                  iconBg: 'bg-emerald-100',
                },
                {
                  icon: Layout,
                  title: 'Guided Creation',
                  subtitle: 'Step-by-step process',
                  iconColor: 'text-teal-600',
                  iconBg: 'bg-teal-100',
                },
                {
                  icon: BarChart3,
                  title: 'Executive Documents',
                  subtitle: 'Charts, tables & data',
                  iconColor: 'text-cyan-600',
                  iconBg: 'bg-cyan-100',
                },
              ]}
              ctaText="Browse Templates"
              ctaColor="emerald"
              delay={0.2}
            />

            {/* CARD 3: Visual Design Studio */}
            <StandardCard
              href="/pdf-studio/visual-studio"
              icon={Palette}
              iconGradient="from-orange-500 to-pink-600"
              title="Visual Design Studio"
              subtitle="Professional flyers, one-pagers, brochures, and marketing materials with image-driven layouts"
              features={[
                {
                  icon: Wand2,
                  title: 'Canva-Style Templates',
                  subtitle: 'Professional visual designs',
                  iconColor: 'text-orange-600',
                  iconBg: 'bg-orange-100',
                },
                {
                  icon: ImageIcon,
                  title: 'Image-Driven Layouts',
                  subtitle: 'Flyers & brochures',
                  iconColor: 'text-pink-600',
                  iconBg: 'bg-pink-100',
                },
                {
                  icon: Layers,
                  title: 'Marketing Compositions',
                  subtitle: 'Brand-aware styling',
                  iconColor: 'text-purple-600',
                  iconBg: 'bg-purple-100',
                },
              ]}
              ctaText="Explore Visual Templates"
              ctaColor="orange"
              badge={{
                text: 'NEW',
                gradient: 'from-orange-500 to-pink-600',
              }}
              delay={0.3}
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose PDF Studio?
            </h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise-grade document creation with AI-powered intelligence
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center p-6"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Smart Analysis</h4>
              <p className="text-sm text-slate-600">
                Automatic content detection and structure enhancement
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center p-6"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Quality Scoring</h4>
              <p className="text-sm text-slate-600">
                Real-time quality metrics and improvement suggestions
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center p-6"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Visual Design</h4>
              <p className="text-sm text-slate-600">
                Professional layouts with Canva-quality visual composition
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center p-6"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Export Ready</h4>
              <p className="text-sm text-slate-600">
                PDF, PPTX, and DOCX formats with perfect formatting
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
