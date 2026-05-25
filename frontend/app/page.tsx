'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/ui/mini-navbar';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Lock,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Users,
  Star,
  Globe,
  Shield,
  Layers,
  FileText,
  PieChart,
  Target,
  TrendingUp,
  Award,
  Eye,
  Download,
  Briefcase,
  MessageSquare,
  Presentation,
  Rocket,
  LineChart,
  CheckSquare,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <Navbar />

      {/* Hero Section with Video Background - Added top padding for navbar */}
      <section className="relative overflow-hidden h-[90vh] pt-20">
        <div className="absolute inset-0 w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1920&auto=format&fit=crop"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/hero/hero-preview.mp4" type="video/mp4" />
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1920&auto=format&fit=crop"
              alt="Hero background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </video>
        </div>
      </section>

      {/* SECTION 1: Trust / Stats Strip */}
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center group cursor-default"
            >
              <div className="text-5xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">20+</div>
              <div className="text-slate-600 font-medium">Premium Templates</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center group cursor-default"
            >
              <div className="text-5xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">16</div>
              <div className="text-slate-600 font-medium">Document Types</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center group cursor-default"
            >
              <div className="text-5xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">PDF</div>
              <div className="text-slate-600 font-medium">+ PPTX Export</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center group cursor-default"
            >
              <div className="text-5xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">AI</div>
              <div className="text-slate-600 font-medium">Smart PDF Builder</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: How It Works */}
      <section className="relative bg-white py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/20"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#4F7563]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#4F7563]/5 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#4F7563] animate-pulse"></div>
              <span className="text-sm font-semibold text-blue-700">Simple Process</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              How Pitchonix Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From raw ideas to professional documents in minutes.
            </p>
          </motion.div>

          {/* 2-Column Layout */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* LEFT: Floating UI Composition */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[600px] hidden lg:flex items-center justify-center"
            >
              {/* Single Large Image - Center */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden bg-white"
              >
                <Image
                  src="/images/editable-business-presentation-template-psd-modern-design-set_53876-138527(1).jpg"
                  alt="Pitchonix Product Preview"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>

              {/* Glow Effects */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
            </motion.div>

            {/* RIGHT: Vertical Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Vertical Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-cyan-200 to-blue-200 hidden lg:block"></div>

              <div className="space-y-10">
                {[
                  {
                    number: '01',
                    icon: FileText,
                    title: 'Paste Your Content',
                    description: 'Paste raw notes, ideas, or documents into Pitchonix.',
                    color: 'blue',
                    gradient: 'from-blue-500 to-cyan-600',
                  },
                  {
                    number: '02',
                    icon: Sparkles,
                    title: 'Analyze & Improve',
                    description: 'Smart analysis detects issues, improves structure, and enhances clarity.',
                    color: 'purple',
                    gradient: 'from-purple-500 to-pink-600',
                  },
                  {
                    number: '03',
                    icon: Layers,
                    title: 'Generate Professional Layouts',
                    description: 'Automatically transform content into premium presentations and PDFs.',
                    color: 'emerald',
                    gradient: 'from-emerald-500 to-teal-600',
                  },
                  {
                    number: '04',
                    icon: Download,
                    title: 'Export & Share',
                    description: 'Export polished documents in PDF or PPTX format instantly.',
                    color: 'orange',
                    gradient: 'from-orange-500 to-amber-600',
                  },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                    className="relative flex gap-6 group"
                  >
                    {/* Icon Container */}
                    <div className="relative flex-shrink-0 z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      {/* Glow Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300 rounded-xl`}></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-slate-400">{step.number}</span>
                        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Features - Why Pitchonix Bento Grid */}
      <section id="features" className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-fr">
            
            {/* LARGE LEFT CARD - Why Pitchonix */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-4 lg:row-span-2 bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 shadow-xl border border-slate-200 relative overflow-hidden group hover:shadow-2xl transition-shadow duration-500"
            >
              {/* Background Visual Elements */}
              <div className="absolute top-20 right-0 w-64 h-48 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl rotate-6"></div>
              </div>
              <div className="absolute bottom-20 right-10 w-48 h-32 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl -rotate-6"></div>
              </div>

              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                  Why Pitchonix
                </h2>
                <p className="text-base text-slate-600 leading-relaxed mb-6">
                  More than a document generator. A smarter way to create professional business presentations, PDFs, and reports.
                </p>

                {/* Mini Floating UI Elements */}
                <div className="space-y-2.5 opacity-70">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">AI-Powered Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Quality Scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Professional Templates</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TOP RIGHT SMALL CARD #1 - Smart Content Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-4 lg:row-span-1 bg-white rounded-3xl p-6 shadow-lg border border-slate-200 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Content Analysis</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically detect issues, improve clarity, and structure your content professionally.
                </p>
              </div>

              {/* Mini Quality Score UI */}
              <div className="relative z-10 mt-4 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Quality Score</span>
                  <span className="text-2xl font-bold text-green-600">92</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-gradient-to-r from-green-500 to-emerald-500"></div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span>Structure optimized</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    <span>2 suggestions</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TOP RIGHT SMALL CARD #2 - Premium Templates */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-4 lg:row-span-1 bg-white rounded-3xl p-6 shadow-lg border border-slate-200 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Premium Templates</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Access professionally designed presentations, reports, proposals, and PDFs instantly.
                </p>
              </div>

              {/* Mini Template Previews */}
              <div className="relative z-10 mt-4 flex gap-2">
                <div className="flex-1 h-28 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-slate-200 p-2 flex flex-col justify-between">
                  <div className="w-6 h-6 rounded bg-[#4F7563]"></div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-blue-200 rounded w-full"></div>
                    <div className="h-1.5 bg-blue-100 rounded w-3/4"></div>
                  </div>
                </div>
                <div className="flex-1 h-28 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-slate-200 p-2 flex flex-col justify-between">
                  <div className="w-6 h-6 rounded bg-[#4F7563]"></div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-purple-200 rounded w-full"></div>
                    <div className="h-1.5 bg-[#DDE8E1] rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* BOTTOM WIDE HERO CARD - Professional Results */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-4 lg:row-span-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
            >
              <div className="relative z-10 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Professional Results</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Create investor-ready pitch decks, reports, and business documents with modern layouts.
                </p>
              </div>

              {/* Main Visual Composition - Single Presentation Preview */}
              <div className="relative z-10 h-40 mt-4">
                <div className="h-full bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-white/30 rounded w-2/3"></div>
                      <div className="h-1.5 bg-white/20 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-lg flex items-center justify-center">
                    <Presentation className="w-12 h-12 text-white/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-6 bg-white/10 rounded"></div>
                    <div className="h-6 bg-white/10 rounded"></div>
                    <div className="h-6 bg-white/10 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </motion.div>

            {/* BOTTOM RIGHT TALL CARD - Built for Modern Teams */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-4 lg:row-span-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Built for Modern Teams</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Perfect for startups, agencies, consultants, and professionals creating high-quality business documents.
                </p>

                {/* Abstract Creative Visual */}
                <div className="relative h-28 mt-4">
                  <div className="absolute inset-0 flex items-center justify-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 backdrop-blur-sm border border-white/20 rotate-6"></div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm border border-white/20 -rotate-6"></div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 backdrop-blur-sm border border-white/20 rotate-12"></div>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 4: Smart PDF Builder */}
      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4F7563]/10 border border-blue-200/50 mb-6">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Smart PDF Builder</span>
              </div>
              
              <h2 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Turn messy notes into professional PDFs
              </h2>
              
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Paste your raw content and watch as AI analyzes structure, improves writing, 
                designs pages automatically, and exports a polished PDF ready to share.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  { icon: CheckSquare, text: 'Paste raw content or bullet points' },
                  { icon: Sparkles, text: 'AI analyzes and identifies issues' },
                  { icon: Zap, text: 'Auto-improve writing and structure' },
                  { icon: Layers, text: 'Generate professional layouts' },
                  { icon: Download, text: 'Export polished PDF instantly' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#4F7563] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-slate-700 font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>

              <Link href="/pdf-studio/smart-builder">
                <Button size="lg" className="bg-[#4F7563] hover:bg-[#355846] text-white px-8">
                  Try Smart PDF Builder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {/* Right: Visual Preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Before: Messy Notes */}
              <div className="relative z-10 bg-white rounded-2xl p-6 shadow-xl border-2 border-dashed border-slate-300 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-xs text-slate-500 font-medium">Raw Notes</span>
                </div>
                <div className="space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>our product helps teams...</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>market size is big</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>need funding $2m</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>competitors: company A, B</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>revenue model subscription</span>
                  </div>
                </div>
                <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-20">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* After: Professional PDF */}
              <div className="relative">
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="/images/224170-P1XSV3-517.jpg"
                    alt="Professional PDF Document"
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                    priority
                  />
                </div>
                <div className="absolute -top-3 -right-3 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Professional PDF
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Document Types */}
      <section className="bg-white py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl font-bold text-slate-900 mb-6">Everything your business needs</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Professional documents for every business scenario.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Presentations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <div className="w-14 h-14 rounded-xl bg-[#4F7563] flex items-center justify-center mb-4">
                  <Presentation className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Presentations</h3>
              </div>
              <ul className="space-y-3">
                {['Pitch Deck', 'Sales Deck', 'Strategy Presentation', 'Company Overview'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F7563]"></div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* PDF Documents */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="mb-6">
                <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">PDF Documents</h3>
              </div>
              <ul className="space-y-3">
                {['Business Plan', 'Financial Report', 'Proposal', 'One Pager', 'Case Study'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700 hover:text-emerald-600 transition-colors cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Smart Documents */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Smart Documents</h3>
              </div>
              <ul className="space-y-3">
                {['Smart PDF Builder', 'PRD', 'Technical Docs', 'Meeting Notes'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700 hover:text-[#4F7563] transition-colors cursor-pointer">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Quality & Structure */}
      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl font-bold text-slate-900 mb-6">Enterprise-Grade Quality</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Every document analyzed, optimized, and perfected.
            </p>
          </motion.div>

          <div className="space-y-24">
            {/* Feature 1: Structure Analysis */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 rounded-lg bg-[#4F7563] flex items-center justify-center mb-6">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-4">Structure Analysis</h3>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  Automatically detect missing sections, inconsistent formatting, and structural issues 
                  that could weaken your presentation.
                </p>
                <ul className="space-y-3">
                  {['Missing executive summary', 'Weak problem statement', 'Incomplete financials'].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-semibold text-slate-700">Quality Score</span>
                  <span className="text-3xl font-bold text-green-600">92/100</span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Content', value: 95, color: 'bg-green-500' },
                    { label: 'Structure', value: 88, color: 'bg-[#4F7563]' },
                    { label: 'Design', value: 93, color: 'bg-[#4F7563]' },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-700 font-medium">{metric.label}</span>
                        <span className="text-slate-900 font-bold">{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color}`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Feature 2: Content Enhancement */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1 bg-white rounded-2xl p-8 shadow-xl border border-slate-200"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <div className="font-semibold text-red-900 mb-1">Weak value proposition</div>
                      <div className="text-sm text-red-700">Make your unique value clearer</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-900 mb-1">Missing market data</div>
                      <div className="text-sm text-yellow-700">Add TAM/SAM/SOM metrics</div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#4F7563] hover:bg-[#355846]">
                    <Zap className="w-4 h-4 mr-2" />
                    Fix All Issues
                  </Button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-slate-900 mb-4">Content Enhancement</h3>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  AI-powered suggestions to improve clarity, strengthen messaging, 
                  and ensure investor-ready quality.
                </p>
                <ul className="space-y-3">
                  {['Clarity improvements', 'Data-driven insights', 'Professional formatting'].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - OLD VERSION REMOVED */}
      <section id="how-it-works" className="hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 leading-relaxed">Create professional presentations in 3 simple steps</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#4F7563] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <FileText className="h-12 w-12 mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold tracking-tight mb-3">Choose Your Type</h3>
                  <p className="text-blue-50 leading-relaxed">
                    Select from 15+ document types: pitch decks, business plans, proposals, reports, and more
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="h-8 w-8 text-gray-300" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                  <Layers className="h-12 w-12 mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold tracking-tight mb-3">Fill Smart Forms</h3>
                  <p className="text-purple-50 leading-relaxed">
                    Answer guided questions about your business, target market, and goals. No chatbots, just clarity
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="h-8 w-8 text-gray-300" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-xl">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <Target className="h-12 w-12 mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold tracking-tight mb-3">Edit &amp; Export</h3>
                  <p className="text-green-50 leading-relaxed">
                    Fine-tune slides in our visual editor, check your quality score, and export to PPTX or PDF
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Types - OLD VERSION REMOVED */}
      <section className="hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for Every Business Need</h2>
            <p className="text-xl text-gray-600">15+ specialized document types with tailored workflows</p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              { icon: '🚀', name: 'Pitch Decks', desc: 'Investor-ready presentations' },
              { icon: '📊', name: 'Business Plans', desc: 'Comprehensive strategies' },
              { icon: '📝', name: 'Proposals', desc: 'Win more clients' },
              { icon: '📈', name: 'Marketing Plans', desc: 'Growth strategies' },
              { icon: '💼', name: 'Sales Decks', desc: 'Close more deals' },
              { icon: '🎓', name: 'Training Docs', desc: 'Educational content' },
              { icon: '📑', name: 'Reports', desc: 'Professional analysis' },
              { icon: '🎯', name: 'Strategy Docs', desc: 'Planning & execution' },
              { icon: '💡', name: 'Product Launches', desc: 'Go-to-market plans' },
              { icon: '🏢', name: 'Corporate Decks', desc: 'Internal communications' },
              { icon: '🌟', name: 'Case Studies', desc: 'Success stories' },
              { icon: '📊', name: 'Financial Models', desc: 'Projections & forecasts' },
            ].map((type, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-[#A8B9AE]"
              >
                <div className="text-4xl mb-3">{type.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{type.name}</h3>
                <p className="text-gray-600 text-sm">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About - OLD VERSION REMOVED */}
      <section id="about" className="hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">About Pitchonix</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Pitchonix is a smart business content generation platform designed for entrepreneurs,
              founders, and professionals who need investor-ready presentations fast.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">15+</div>
              <p className="text-gray-600 font-medium">Document Types</p>
              <p className="text-sm text-gray-500 mt-2">Pitch decks, business plans, proposals, reports, and more</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#4F7563] mb-2">100+</div>
              <p className="text-gray-600 font-medium">Slide Templates</p>
              <p className="text-sm text-gray-500 mt-2">Professional designs for every business need</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">10+</div>
              <p className="text-gray-600 font-medium">Design Themes</p>
              <p className="text-sm text-gray-500 mt-2">From luxury to minimal, corporate to startup style</p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-8 text-center">What Makes Us Different</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-lg mb-2">🎯 Structured Workflow</h4>
                <p className="text-gray-600">
                  No chatbots or confusing AI agents. Fill smart forms, choose templates, edit visually.
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
                <h4 className="font-semibold text-lg mb-2">✨ Professional Quality</h4>
                <p className="text-gray-600">
                  Every deck gets a quality score and auto-fix suggestions for investor readiness.
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100">
                <h4 className="font-semibold text-lg mb-2">🎨 Beautiful Design</h4>
                <p className="text-gray-600">
                  Premium templates, brand kits, and design themes that look amazing.
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-xl border border-orange-100">
                <h4 className="font-semibold text-lg mb-2">📊 Smart Content</h4>
                <p className="text-gray-600">
                  Structured generation with charts, metrics, financials, and speaker notes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - OLD VERSION REMOVED */}
      <section className="hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by Founders Worldwide</h2>
            <p className="text-xl text-gray-600">Join 5,000+ entrepreneurs creating winning presentations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {[
              {
                quote:
                  '"Pitchonix helped us create a pitch deck that landed $2M in funding. The quality score feature ensured our deck was investor-ready."',
                initials: 'SK',
                name: 'Sarah Kim',
                title: 'Founder, TechVenture',
                color: 'from-blue-500 to-blue-600',
              },
              {
                quote:
                  '"No more staring at blank slides! The structured workflow and templates saved us weeks of work. Highly recommended."',
                initials: 'MJ',
                name: 'Michael Johnson',
                title: 'CEO, GrowthLab',
                color: 'from-purple-500 to-purple-600',
              },
              {
                quote:
                  '"The brand kit feature keeps all our decks on-brand. Perfect for agencies managing multiple clients."',
                initials: 'EP',
                name: 'Emily Parker',
                title: 'Director, CreativeWorks',
                color: 'from-green-500 to-green-600',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">{t.quote}</p>
                <div className="flex items-center">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${t.color} rounded-full flex items-center justify-center text-white font-bold`}
                  >
                    {t.initials}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-gray-600 text-sm">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: '5,000+', label: 'Active Users', color: 'text-blue-600' },
              { value: '50K+', label: 'Decks Created', color: 'text-[#4F7563]' },
              { value: '$500M+', label: 'Raised by Customers', color: 'text-green-600' },
              { value: '98%', label: 'Satisfaction Rate', color: 'text-[#8c6210]' },
            ].map((stat, i) => (
              <div key={i}>
                <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - OLD VERSION REMOVED */}
      <section id="pricing" className="hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-[#4F7563] transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['3 projects per month', 'Basic templates', 'PPTX export', 'Quality checks'].map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
                {['Brand kit', 'Premium themes'].map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-gray-400 mr-2">✗</span>
                    <span className="text-gray-400">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full" variant="outline">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white transform scale-105 shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black text-sm font-bold px-4 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-white/80">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited projects',
                  'All templates',
                  'PPTX + PDF export',
                  'Advanced quality checks',
                  'Brand kit',
                  'Premium themes',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-yellow-300 mr-2">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                  Start Pro Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-purple-500 transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pro',
                  'Team collaboration',
                  'Custom templates',
                  'API access',
                  'Dedicated support',
                  'SLA guarantee',
                ].map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - OLD VERSION REMOVED */}
      <section className="hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about Pitchonix</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                color: 'text-blue-600',
                q: 'How is Pitchonix different from other AI tools?',
                a: 'Unlike chatbot-based tools, Pitchonix uses a structured workflow with smart forms and templates. You fill in business details step-by-step, ensuring complete, professional content every time.',
              },
              {
                color: 'text-[#4F7563]',
                q: "What's included in the quality score?",
                a: 'The Pitchonix Score evaluates content completeness, clarity, data inclusion, visual appeal, and structure. You get specific suggestions to improve your deck and make it investor-ready.',
              },
              {
                color: 'text-green-600',
                q: 'Can I customize the templates and designs?',
                a: 'Absolutely! Choose from 10+ design themes, apply your brand kit (colors, fonts, logo), and edit any slide in our visual editor.',
              },
              {
                color: 'text-[#8c6210]',
                q: 'What export formats are supported?',
                a: 'Pro users can export to PowerPoint (PPTX) and PDF. All exports are high-quality with proper formatting, charts, and speaker notes included.',
              },
              {
                color: 'text-red-600',
                q: 'Do you offer refunds?',
                a: 'Yes! We offer a 14-day money-back guarantee. If you are not satisfied, contact us within 14 days of purchase for a full refund.',
              },
              {
                color: 'text-blue-600',
                q: 'Is my data secure?',
                a: 'Absolutely. All data is encrypted in transit and at rest. We never share your business information with third parties.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200"
              >
                <h3 className="text-xl font-semibold mb-3 flex items-start">
                  <CheckCircle className={`h-6 w-6 ${item.color} mr-3 flex-shrink-0 mt-0.5`} />
                  {item.q}
                </h3>
                <p className="text-gray-600 ml-9">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: Final CTA */}
      <section className="bg-slate-900 py-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl mb-8">
              <Rocket className="w-4 h-4 text-[#A8B9AE]" />
              <span className="text-sm font-semibold text-white">Start Creating Today</span>
            </div>

            <h2 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Create documents that<br />actually look professional
            </h2>

            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Pitch decks, reports, proposals, and PDFs designed for modern businesses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-10 py-7 shadow-2xl"
                >
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/templates">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-10 py-7"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Explore Templates
                </Button>
              </Link>
            </div>


          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold text-white">Pitchonix</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                The smart way to create investor-ready presentations. Built for entrepreneurs who move fast.
              </p>
              <div className="flex space-x-4">
                <Globe className="h-5 w-5 text-gray-400" />
                <Users className="h-5 w-5 text-gray-400" />
                <Shield className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#about" className="text-gray-400 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                    Register
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <span className="text-gray-500 text-sm">Privacy Policy (coming soon)</span>
                </li>
                <li>
                  <span className="text-gray-500 text-sm">Terms of Service (coming soon)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © 2026 Pitchonix. Built for entrepreneurs and founders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
