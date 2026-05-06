'use client';

import Link from 'next/link';
import { FileText, Sparkles, ArrowRight, Book, FileCheck, Layout, Zap } from 'lucide-react';

export default function PdfStudioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">PDF Studio</h1>
            <p className="text-gray-600 mt-2">Transform any content into professional PDFs</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Create Professional Documents
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your path: Use structured templates for business documents or transform
            any raw content into beautifully designed PDFs
          </p>
        </div>

        {/* Two Main Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Smart PDF Builder */}
          <Link href="/pdf-studio/smart-builder">
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-500 cursor-pointer overflow-hidden">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Smart PDF Builder
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Transform ANY raw content into professional PDFs. Paste business notes, school notes,
                  research, articles, or mixed content - we'll structure, enhance, and design it.
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Zap className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Universal content support - works with anything</span>
                  </li>
                  <li className="flex items-start">
                    <Layout className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Auto-detects content type and structure</span>
                  </li>
                  <li className="flex items-start">
                    <FileCheck className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Improves writing and fixes grammar</span>
                  </li>
                </ul>

                {/* CTA */}
                <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                  Start Building
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
            </div>
          </Link>

          {/* Structured Documents */}
          <Link href="/pdf-studio/structured">
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-green-500 cursor-pointer overflow-hidden">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Structured Documents
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Create professional business documents using guided templates.
                  Perfect for business plans, proposals, company profiles, and more.
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Book className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Pre-built business templates</span>
                  </li>
                  <li className="flex items-start">
                    <Layout className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Guided step-by-step creation</span>
                  </li>
                  <li className="flex items-start">
                    <FileCheck className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Professional layouts and styling</span>
                  </li>
                </ul>

                {/* CTA */}
                <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700">
                  Browse Templates
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-12">
            Why Choose PDF Studio?
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Smart Content Analysis</h4>
              <p className="text-sm text-gray-600">
                Automatically detects content type, extracts structure, and suggests improvements
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Quality Enhancement</h4>
              <p className="text-sm text-gray-600">
                Fixes grammar, improves writing, and applies professional tone automatically
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Layout className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Professional Design</h4>
              <p className="text-sm text-gray-600">
                Beautiful templates and layouts that make your content look polished
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
