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
  TableProperties,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#EDEBE6] scroll-smooth">
      <Navbar />

      {/* Hero Section */}
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
      <section className="bg-[#F7F6F2] py-16 border-b border-[#E3E1DA]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { value: '20+', label: 'Premium Templates' },
              { value: '16',  label: 'Document Types' },
              { value: 'PDF', label: '+ PPTX Export' },
              { value: '4',   label: 'Product Suites' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center group cursor-default"
              >
                <div className="text-5xl font-bold text-[#111111] mb-2 group-hover:text-[#4F7563] transition-colors">{stat.value}</div>
                <div className="text-[#6B6B6B] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: How It Works */}
      <section className="relative bg-white py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EEF5F1] via-white to-[#F7F6F2]"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#4F7563]/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#4F7563]/5 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEF5F1] border border-[#DDE8E1] mb-6">
              <div className="w-2 h-2 rounded-full bg-[#4F7563] animate-pulse"></div>
              <span className="text-sm font-semibold text-[#355846]">Simple Process</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-[#111111] mb-6">
              How Pitchonix Works
            </h2>
            <p className="text-xl text-[#6B6B6B] max-w-2xl mx-auto">
              From raw ideas to professional documents in minutes.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[600px] hidden lg:flex items-center justify-center"
            >
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl shadow-2xl border border-[#E3E1DA] overflow-hidden bg-white"
              >
                <Image
                  src="/images/editable-business-presentation-template-psd-modern-design-set_53876-138527(1).jpg"
                  alt="Pitchonix Product Preview"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4F7563]/8 rounded-full blur-3xl"></div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#DDE8E1] via-[#A8B9AE] to-[#DDE8E1] hidden lg:block"></div>

              <div className="space-y-10">
                {[
                  { number: '01', icon: FileText,   title: 'Choose Your Document',      description: 'Select from CVs, Resumes, Presentations, or PDF documents.',                              gradient: 'from-[#4F7563] to-[#355846]' },
                  { number: '02', icon: Sparkles,   title: 'Fill Structured Forms',     description: 'Answer guided questions with smart forms — no chatbots, just clarity.',                 gradient: 'from-[#7A988A] to-[#4F7563]' },
                  { number: '03', icon: Layers,     title: 'Apply Professional Templates', description: 'Choose from 20+ premium templates designed by professionals.',                        gradient: 'from-[#355846] to-[#263F34]' },
                  { number: '04', icon: Download,   title: 'Export & Share',            description: 'Export polished documents in PDF or PPTX format instantly.',                             gradient: 'from-[#8c6210] to-[#6b4a0c]' },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                    className="relative flex gap-6 group"
                  >
                    <div className="relative flex-shrink-0 z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-[#9A9A9A]">{step.number}</span>
                        <h3 className="text-2xl font-bold text-[#111111] group-hover:text-[#4F7563] transition-colors">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-[#6B6B6B] leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Features Bento Grid */}
      <section id="features" className="bg-[#F7F6F2] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-fr">

            {/* Large Left Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-4 lg:row-span-2 bg-white rounded-3xl p-8 shadow-lg border border-[#E3E1DA] relative overflow-hidden group hover:shadow-xl transition-shadow duration-500"
            >
              <div className="absolute top-20 right-0 w-64 h-48 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-[#4F7563] to-[#263F34] rounded-2xl rotate-6"></div>
              </div>
              <div className="absolute bottom-20 right-10 w-48 h-32 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-[#355846] to-[#1E332A] rounded-2xl -rotate-6"></div>
              </div>
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-[#111111] mb-4 leading-tight">
                  Why Pitchonix
                </h2>
                <p className="text-base text-[#6B6B6B] leading-relaxed mb-6">
                  Professional document creation platform. Create CVs, presentations, and PDFs with structured workflows and premium templates.
                </p>
                <div className="space-y-2.5 opacity-80">
                  {[
                    { icon: Briefcase,    label: 'CV & Resume Builder',   gradient: 'from-[#4F7563] to-[#355846]' },
                    { icon: Presentation, label: 'PPTX Presentations',    gradient: 'from-[#355846] to-[#263F34]' },
                    { icon: FileText,     label: 'Professional Templates', gradient: 'from-[#7A988A] to-[#4F7563]' },
                  ].map(({ icon: Icon, label, gradient }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-[#111111]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Top Right Card #1 — Quality */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-4 lg:row-span-1 bg-white rounded-3xl p-6 shadow-lg border border-[#E3E1DA] relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F7563] to-[#355846] flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">Content Quality Checking</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Detect issues, improve clarity, and structure your content professionally.
                </p>
              </div>
              <div className="relative z-10 mt-4 p-3 bg-[#F7F6F2] rounded-xl border border-[#E3E1DA]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#111111]">Quality Score</span>
                  <span className="text-2xl font-bold text-[#4F7563]">92</span>
                </div>
                <div className="h-2 bg-[#E3E1DA] rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-gradient-to-r from-[#4F7563] to-[#7A988A]"></div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F7563]"></div>
                    <span>Structure optimized</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8c6210]"></div>
                    <span>2 suggestions</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Top Right Card #2 — Templates */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-4 lg:row-span-1 bg-white rounded-3xl p-6 shadow-lg border border-[#E3E1DA] relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#355846] to-[#263F34] flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">Premium Templates</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Access professionally designed presentations, reports, proposals, and PDFs instantly.
                </p>
              </div>
              <div className="relative z-10 mt-4 flex gap-2">
                <div className="flex-1 h-28 bg-[#EEF5F1] rounded-xl border border-[#DDE8E1] p-2 flex flex-col justify-between">
                  <div className="w-6 h-6 rounded bg-[#4F7563]"></div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#DDE8E1] rounded w-full"></div>
                    <div className="h-1.5 bg-[#A8B9AE] rounded w-3/4"></div>
                  </div>
                </div>
                <div className="flex-1 h-28 bg-[#F1F0EC] rounded-xl border border-[#E3E1DA] p-2 flex flex-col justify-between">
                  <div className="w-6 h-6 rounded bg-[#355846]"></div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-[#C9C6BD] rounded w-full"></div>
                    <div className="h-1.5 bg-[#DDE8E1] rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bottom Wide Card — Professional Results */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-4 lg:row-span-1 bg-gradient-to-br from-[#263F34] to-[#1E332A] rounded-3xl p-6 shadow-2xl border border-[#1A2D24] relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
            >
              <div className="relative z-10 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Professional Results</h3>
                <p className="text-[#DDE8E1] text-sm leading-relaxed">
                  Create investor-ready pitch decks, reports, and business documents with modern layouts.
                </p>
              </div>
              <div className="relative z-10 h-40 mt-4">
                <div className="h-full bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F7563] to-[#7A988A]"></div>
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#4F7563]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </motion.div>

            {/* Bottom Right Card — Built for Teams */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-4 lg:row-span-1 bg-gradient-to-br from-[#1E332A] to-[#263F34] rounded-3xl p-6 shadow-2xl border border-[#1A2D24] relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Built for Modern Teams</h3>
                <p className="text-[#DDE8E1] text-sm leading-relaxed mb-4">
                  Perfect for startups, agencies, consultants, and professionals creating high-quality business documents.
                </p>
                <div className="relative h-28 mt-4">
                  <div className="absolute inset-0 flex items-center justify-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-[#4F7563]/30 backdrop-blur-sm border border-white/20 rotate-6"></div>
                    <div className="w-16 h-16 rounded-2xl bg-[#7A988A]/30 backdrop-blur-sm border border-white/20 -rotate-6"></div>
                    <div className="w-16 h-16 rounded-2xl bg-[#A8B9AE]/30 backdrop-blur-sm border border-white/20 rotate-12"></div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#355846]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 4: Four Product Suites */}
      <section className="bg-[#F1F0EC] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-[#111111] mb-6">
              Four Powerful Product Suites
            </h2>
            <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto">
              Professional tools for CVs, Presentations, PDF documents, and Excel workbooks.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              {
                icon: Briefcase,
                title: 'CV & Resume Builder',
                desc: 'Professional CV and resume templates with ATS optimization, skill analysis, and multiple export formats.',
                features: ['ATS-optimized templates', 'Cover letter generator', 'Skills & experience tracking', 'PDF & DOCX export'],
                href: '/career',
                cta: 'Build Your CV',
                btnClass: 'bg-[#4F7563] hover:bg-[#355846]',
                iconGrad: 'from-[#4F7563] to-[#355846]',
                badge: null,
              },
              {
                icon: Presentation,
                title: 'Presentations & Slides',
                desc: 'Create professional business presentations with structured workflows and premium PPTX export.',
                features: ['16 document types', 'Pitch decks & proposals', 'Visual editor with themes', 'PPTX export'],
                href: '/dashboard',
                cta: 'Create Presentation',
                btnClass: 'bg-[#263F34] hover:bg-[#1A2D24]',
                iconGrad: 'from-[#263F34] to-[#1A2D24]',
                badge: null,
              },
              {
                icon: FileText,
                title: 'PDF Studio',
                desc: 'Professional PDF editor with visual layout tools, templates, and high-quality export.',
                features: ['Smart PDF builder', 'Professional templates', 'Layout customization', 'High-quality export'],
                href: '/pdf-studio',
                cta: 'Open PDF Studio',
                btnClass: 'bg-[#7A988A] hover:bg-[#4F7563]',
                iconGrad: 'from-[#7A988A] to-[#4F7563]',
                badge: null,
              },
              {
                icon: TableProperties,
                title: 'Excel Studio',
                desc: 'Analyze, audit, fix, and modernize spreadsheets into executive-ready workbooks without touching your data.',
                features: ['Workbook quality audit', 'Formula error detection', '12 professional templates', 'XLSX & PDF export'],
                href: '/excel-studio',
                cta: 'Open Excel Studio',
                btnClass: 'bg-[#355846] hover:bg-[#263F34]',
                iconGrad: 'from-[#355846] to-[#263F34]',
                badge: 'New',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-7 shadow-lg border border-[#E3E1DA] hover:shadow-xl transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.iconGrad} flex items-center justify-center`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  {card.badge && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#263F34] text-white">{card.badge}</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#111111] mb-3">{card.title}</h3>
                <p className="text-sm text-[#6B6B6B] mb-5 leading-relaxed">{card.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#111111]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#4F7563] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={card.href}>
                  <Button className={`w-full text-white ${card.btnClass}`}>
                    {card.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4B: Structured Forms */}
      <section className="bg-white py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEF5F1] border border-[#DDE8E1] mb-6">
                <CheckCircle className="w-4 h-4 text-[#4F7563]" />
                <span className="text-sm font-semibold text-[#355846]">Professional Workflow</span>
              </div>
              <h2 className="text-5xl font-bold text-[#111111] mb-6 leading-tight">
                Structured forms, not chatbots
              </h2>
              <p className="text-lg text-[#6B6B6B] mb-8 leading-relaxed">
                Fill guided forms with clear questions about your content. Choose professional templates. Export polished documents.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  { icon: CheckSquare, text: 'Select your document type' },
                  { icon: FileText,    text: 'Fill structured smart forms' },
                  { icon: Layers,      text: 'Choose from 20+ templates' },
                  { icon: Eye,         text: 'Preview and customize' },
                  { icon: Download,    text: 'Export PDF or PPTX' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#4F7563] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[#111111] font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button size="lg" className="bg-[#4F7563] hover:bg-[#355846] text-white px-8">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative z-10 bg-white rounded-2xl p-6 shadow-xl border-2 border-dashed border-[#E3E1DA] mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-[#8c6210]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#4F7563]"></div>
                  <span className="ml-2 text-xs text-[#9A9A9A] font-medium">Raw Notes</span>
                </div>
                <div className="space-y-2.5 text-sm text-[#6B6B6B]">
                  {['our product helps teams…', 'market size is big', 'need funding $2m', 'competitors: company A, B', 'revenue model subscription'].map((note) => (
                    <div key={note} className="flex items-start gap-2">
                      <span className="text-[#C9C6BD]">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-20">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#4F7563] to-[#355846] rounded-full flex items-center justify-center shadow-xl animate-pulse">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#E3E1DA]">
                  <Image
                    src="/images/224170-P1XSV3-517.jpg"
                    alt="Professional PDF Document"
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                    priority
                  />
                </div>
                <div className="absolute -top-3 -right-3 px-4 py-1.5 bg-gradient-to-r from-[#4F7563] to-[#355846] text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Professional PDF
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Document Types */}
      <section className="bg-[#F7F6F2] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl font-bold text-[#111111] mb-6">Everything your business needs</h2>
            <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto">
              Professional documents for every business scenario.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: Presentation, title: 'Presentations', color: 'bg-[#4F7563]', dotColor: 'bg-[#4F7563]',
                hover: 'hover:text-[#4F7563]',
                items: ['Pitch Deck', 'Sales Deck', 'Strategy Presentation', 'Company Overview'],
              },
              {
                icon: FileText, title: 'PDF Documents', color: 'bg-[#355846]', dotColor: 'bg-[#355846]',
                hover: 'hover:text-[#355846]',
                items: ['Business Plan', 'Financial Report', 'Proposal', 'One Pager', 'Case Study'],
              },
              {
                icon: Briefcase, title: 'Career Documents', color: 'bg-[#263F34]', dotColor: 'bg-[#263F34]',
                hover: 'hover:text-[#263F34]',
                items: ['CV & Resume', 'Cover Letter', 'Portfolio', 'LinkedIn Profile'],
              },
            ].map((col, i) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-xl ${col.color} flex items-center justify-center mb-4`}>
                    <col.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#111111] mb-2">{col.title}</h3>
                </div>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className={`flex items-center gap-3 text-[#111111] ${col.hover} transition-colors cursor-pointer`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`}></div>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Quality & Structure */}
      <section className="bg-white py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl font-bold text-[#111111] mb-6">Enterprise-Grade Quality</h2>
            <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto">
              Every document analyzed, optimized, and perfected.
            </p>
          </motion.div>

          <div className="space-y-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="w-12 h-12 rounded-lg bg-[#4F7563] flex items-center justify-center mb-6">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-[#111111] mb-4">Structure Analysis</h3>
                <p className="text-lg text-[#6B6B6B] mb-6 leading-relaxed">
                  Comprehensive detection of missing sections, inconsistent formatting, and structural issues
                  that could weaken your presentation.
                </p>
                <ul className="space-y-3">
                  {['Missing executive summary', 'Weak problem statement', 'Incomplete financials'].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#4F7563]" />
                      <span className="text-[#111111]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-xl border border-[#E3E1DA]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-semibold text-[#111111]">Quality Score</span>
                  <span className="text-3xl font-bold text-[#4F7563]">92/100</span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Content',   value: 95, color: 'bg-[#4F7563]' },
                    { label: 'Structure', value: 88, color: 'bg-[#355846]' },
                    { label: 'Design',    value: 93, color: 'bg-[#7A988A]' },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#111111] font-medium">{metric.label}</span>
                        <span className="text-[#111111] font-bold">{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-[#E3E1DA] rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color}`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="order-2 lg:order-1 bg-white rounded-2xl p-8 shadow-xl border border-[#E3E1DA]">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-[#FCF1F1] border border-[#F7E3E3] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#9a3737] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <div className="font-semibold text-[#9a3737] mb-1">Weak value proposition</div>
                      <div className="text-sm text-[#9a3737]/80">Make your unique value clearer</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#FAEEDB] border border-[#F5D98A] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#8c6210] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <div className="font-semibold text-[#8c6210] mb-1">Missing market data</div>
                      <div className="text-sm text-[#8c6210]/80">Add TAM/SAM/SOM metrics</div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#4F7563] hover:bg-[#355846] text-white">
                    <Zap className="w-4 h-4 mr-2" />
                    Fix All Issues
                  </Button>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="order-1 lg:order-2">
                <div className="w-12 h-12 rounded-lg bg-[#355846] flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-[#111111] mb-4">Professional Templates</h3>
                <p className="text-lg text-[#6B6B6B] mb-6 leading-relaxed">
                  20+ professionally designed templates for every document type,
                  ensuring high-quality, polished output.
                </p>
                <ul className="space-y-3">
                  {['Premium designs', 'Multiple styles', 'Fully customizable'].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#4F7563]" />
                      <span className="text-[#111111]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden old sections */}
      <section id="how-it-works" className="hidden"></section>
      <section className="hidden"></section>
      <section id="about" className="hidden"></section>
      <section className="hidden"></section>
      <section id="pricing" className="hidden"></section>
      <section className="hidden"></section>

      {/* SECTION 7: Final CTA */}
      <section className="bg-[#263F34] py-28">
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

            <p className="text-xl md:text-2xl text-[#DDE8E1] mb-12 max-w-3xl mx-auto leading-relaxed">
              CVs, Presentations, and PDFs designed for modern professionals and businesses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-[#263F34] hover:bg-[#F7F6F2] text-lg px-10 py-7 shadow-2xl font-bold">
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/templates">
                <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-10 py-7">
                  <Eye className="w-5 h-5 mr-2" />
                  Explore Templates
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A2D24] text-[#DDE8E1]">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#4F7563] to-[#263F34] rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold text-white">Pitchonix</span>
              </div>
              <p className="text-[#9A9A9A] leading-relaxed mb-4">
                Professional document creation platform. Built for entrepreneurs and businesses who need quality content fast.
              </p>
              <div className="flex space-x-4">
                <Globe className="h-5 w-5 text-[#9A9A9A]" />
                <Users className="h-5 w-5 text-[#9A9A9A]" />
                <Shield className="h-5 w-5 text-[#9A9A9A]" />
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Features',    href: '#features' },
                  { label: 'Pricing',     href: '#pricing' },
                  { label: 'Get Started', href: '/register' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-[#9A9A9A] hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: 'About',    href: '#about' },
                  { label: 'Login',    href: '/login' },
                  { label: 'Register', href: '/register' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-[#9A9A9A] hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-[#6B6B6B] text-sm">Privacy Policy (coming soon)</span></li>
                <li><span className="text-[#6B6B6B] text-sm">Terms of Service (coming soon)</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#263F34] pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-[#6B6B6B] text-sm mb-4 md:mb-0">
              © 2026 Pitchonix. Built for entrepreneurs and founders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
