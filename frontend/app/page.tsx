'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

export default function HomePage() {
  // Scroll-to-section helper
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Header background on scroll — registered once, cleaned up on unmount
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (!header) return;
      if (window.scrollY > 100) {
        header.classList.add('bg-black/80', 'backdrop-blur-md');
        header.classList.remove('bg-transparent');
      } else {
        header.classList.remove('bg-black/80', 'backdrop-blur-md');
        header.classList.add('bg-transparent');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-300">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-xl">P</span>
            </div>
            <span className="text-2xl font-bold text-white drop-shadow-lg">Pitchonix</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-black hover:text-gray-700 font-medium transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-black hover:text-gray-700 font-medium transition-colors"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-black hover:text-gray-700 font-medium transition-colors"
            >
              Pricing
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-gray-100">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-gray-100">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative overflow-hidden h-[90vh]">
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

      {/* Features */}
      <section id="features" className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-20">Why Pitchonix?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <Zap className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold tracking-tight mb-3">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">Generate complete pitch decks in minutes with our AI-powered system</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <Sparkles className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold tracking-tight mb-3">Smart Content</h3>
              <p className="text-gray-600 leading-relaxed">Structured, professional content tailored to your business needs</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold tracking-tight mb-3">Data Driven</h3>
              <p className="text-gray-600 leading-relaxed">Include market data, metrics, and projections automatically</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <Lock className="h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold tracking-tight mb-3">Export Ready</h3>
              <p className="text-gray-600 leading-relaxed">Download as PPTX or PDF, ready for presentations</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 leading-relaxed">Create professional presentations in 3 simple steps</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
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

      {/* Product Types Showcase */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-20">
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
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-blue-300"
              >
                <div className="text-4xl mb-3">{type.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{type.name}</h3>
                <p className="text-gray-600 text-sm">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-20">
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
              <div className="text-5xl font-bold text-purple-600 mb-2">100+</div>
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

      {/* Testimonials */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-white py-20">
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
              { value: '50K+', label: 'Decks Created', color: 'text-purple-600' },
              { value: '$500M+', label: 'Raised by Customers', color: 'text-green-600' },
              { value: '98%', label: 'Satisfaction Rate', color: 'text-orange-600' },
            ].map((stat, i) => (
              <div key={i}>
                <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-xl">
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

      {/* FAQ Section */}
      <section className="bg-white py-20">
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
                color: 'text-purple-600',
                q: "What's included in the quality score?",
                a: 'The Pitchonix Score evaluates content completeness, clarity, data inclusion, visual appeal, and structure. You get specific suggestions to improve your deck and make it investor-ready.',
              },
              {
                color: 'text-green-600',
                q: 'Can I customize the templates and designs?',
                a: 'Absolutely! Choose from 10+ design themes, apply your brand kit (colors, fonts, logo), and edit any slide in our visual editor.',
              },
              {
                color: 'text-orange-600',
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

      {/* CTA */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 rounded-3xl p-12 md:p-16 text-white text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Create Your Deck?</h2>
            <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto">
              Join thousands of founders who trust Pitchonix for their presentations
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="text-lg px-12 py-6 bg-white text-black hover:bg-gray-100 shadow-xl"
              >
                Get Started Now
              </Button>
            </Link>
          </div>
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
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Pricing
                  </button>
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
                  <button
                    onClick={() => scrollToSection('about')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    About
                  </button>
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
