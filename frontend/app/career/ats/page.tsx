'use client';

/**
 * PHASE Ω.2 — ATS OPTIMIZATION CENTER
 * 
 * /career/ats
 * 
 * Upload CV, paste job description, get:
 * - ATS Score (0-100)
 * - Keyword Match %
 * - Missing Skills
 * - Formatting Risks
 * - One-Click Fixes
 * - Job Match Analysis
 */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, FileText, Sparkles, Target, CheckCircle,
  AlertTriangle, XCircle, TrendingUp, Award, Brain, Zap,
  Users, Briefcase, GraduationCap, Shield, BarChart3, Eye,
  RefreshCw, Download, Share2, Search, Clock, ArrowRight,
} from 'lucide-react';
import { useCvDocuments, useCvProfile } from '@/features/career/hooks';
import { api } from '@/lib/api';
import { FeedbackWidget } from '@/features/career/FeedbackWidget';

// =============================================================================
// TYPES
// =============================================================================

interface AtsAnalysisResult {
  overallScore: number;
  breakdown: {
    keywords: AtsScoreCategory;
    skills: AtsScoreCategory;
    experience: AtsScoreCategory;
    education: AtsScoreCategory;
    formatting: AtsScoreCategory;
    sections: AtsScoreCategory;
    readability: AtsScoreCategory;
  };
  recommendations: AtsRecommendation[];
  parsedData: AtsParsedData;
  risks: AtsRisk[];
  strengths: string[];
}

interface AtsScoreCategory {
  score: number;
  weight: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  details: string;
  issues: string[];
  suggestions: string[];
}

interface AtsRecommendation {
  id: string;
  type: 'critical' | 'important' | 'suggested';
  category: string;
  title: string;
  description: string;
  impact: string;
  action?: any;
}

interface AtsParsedData {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  experience: any[];
  education: any[];
  skills: string[];
  certifications: string[];
  languages: string[];
  parseSuccessRate: number;
  parsingIssues: string[];
}

interface AtsRisk {
  severity: 'high' | 'medium' | 'low';
  type: string;
  description: string;
  fix: string;
}

interface JobMatchResult {
  overallMatch: number;
  breakdown: {
    skills: MatchCategory;
    keywords: MatchCategory;
    experience: MatchCategory;
    education: MatchCategory;
    certifications: MatchCategory;
  };
  gaps: JobGap[];
  strengths: JobStrength[];
  improvements: JobImprovement[];
  recommendation: 'strong-match' | 'good-match' | 'partial-match' | 'weak-match';
}

interface MatchCategory {
  score: number;
  matched: string[];
  missing: string[];
  details: string;
}

interface JobGap {
  type: string;
  severity: string;
  item: string;
  description: string;
  fix: any;
}

interface JobStrength {
  type: string;
  item: string;
  description: string;
}

interface JobImprovement {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action?: any;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AtsOptimizationCenter() {
  const router = useRouter();
  const { items: documents, loading: docsLoading } = useCvDocuments();
  const { profile, loading: profileLoading } = useCvProfile();
  
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsAnalysisResult | null>(null);
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(null);
  const [activeTab, setActiveTab] = useState<'ats' | 'match' | 'fixes' | 'simulator'>('ats');

  const openSelectedDocument = useCallback(() => {
    if (selectedDocumentId) router.push(`/career/builder/${selectedDocumentId}`);
  }, [router, selectedDocumentId]);

  const exportReport = useCallback(() => {
    if (!atsResult) return;
    const report = {
      exportedAt: new Date().toISOString(),
      documentId: selectedDocumentId,
      ats: atsResult,
      jobMatch: jobMatchResult,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats-report-${selectedDocumentId || 'cv'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [atsResult, jobMatchResult, selectedDocumentId]);

  // Handle analysis
  const handleAnalyze = useCallback(async () => {
    if (!selectedDocumentId) {
      alert('Please select a document first');
      return;
    }
    
    setAnalyzing(true);
    try {
      // Run ATS analysis
      const atsResponse = await api.post('/career/ats/analyze', {
        documentId: selectedDocumentId,
        jobDescription: jobDescription || undefined
      });
      setAtsResult(atsResponse.data);
      
      // Run job matching if job description provided
      if (jobDescription) {
        const matchResponse = await api.post('/career/ats/match-job', {
          documentId: selectedDocumentId,
          jobDescription
        });
        setJobMatchResult(matchResponse.data);
        setActiveTab('match');
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedDocumentId, jobDescription]);

  // Loading state
  if (docsLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EDEBE6] to-[#E5E3DE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDEBE6] to-[#E5E3DE]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#D1CFC8]">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/career" 
                className="p-2 hover:bg-[#EDEBE6] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#4A4A4A]" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Shield className="w-6 h-6 text-[#4F7563]" />
                  ATS Optimization Center
                </h1>
                <p className="text-sm text-[#6B6B6B]">Get your CV past applicant tracking systems</p>
              </div>
            </div>
            
            {atsResult && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-[#6B6B6B]">ATS Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(atsResult.overallScore)}`}>
                    {atsResult.overallScore}/100
                  </div>
                </div>
                {jobMatchResult && (
                  <div className="text-right">
                    <div className="text-sm text-[#6B6B6B]">Job Match</div>
                    <div className={`text-2xl font-bold ${getScoreColor(jobMatchResult.overallMatch)}`}>
                      {jobMatchResult.overallMatch}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {!atsResult ? (
          // Input Stage
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Select Document */}
            <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Your CV or Resume
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.filter(d => d.doctype === 'cv' || d.doctype === 'resume').map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedDocumentId === doc.id
                        ? 'border-[#4F7563] bg-[#EEF5F1]'
                        : 'border-[#D1CFC8] hover:border-[#1A1A1A] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-5 h-5 text-[#4A4A4A]" />
                      {selectedDocumentId === doc.id && (
                        <CheckCircle className="w-5 h-5 text-[#4F7563]" />
                      )}
                    </div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-1">{doc.title}</h3>
                    <p className="text-sm text-[#6B6B6B]">
                      {doc.templateId ? 'Template applied' : 'No template'}
                    </p>
                  </button>
                ))}
              </div>
              
              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[#9B9B9B] mx-auto mb-4" />
                  <p className="text-[#6B6B6B] mb-4">No CV documents found</p>
                  <Link
                    href="/career/builder/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    Create Your First CV
                  </Link>
                </div>
              )}
            </div>

            {/* Job Description (Optional) */}
            <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Job Description (Optional)
              </h2>
              <p className="text-sm text-[#6B6B6B] mb-4">
                Paste a job description to get keyword matching and job-specific recommendations
              </p>
              
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
                className="w-full h-64 p-4 border border-[#D1CFC8] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] text-[#1A1A1A]"
              />
              
              <div className="mt-4 text-sm text-[#6B6B6B]">
                <strong>Tip:</strong> Including a job description provides:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Keyword match percentage</li>
                  <li>Missing skills analysis</li>
                  <li>Job-specific ATS recommendations</li>
                  <li>Overall job match score</li>
                </ul>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!selectedDocumentId || analyzing}
              className="w-full py-4 bg-[#4F7563] text-white rounded-xl font-semibold text-lg hover:bg-[#355846] transition-colors disabled:bg-[#9B9B9B] disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze ATS Compatibility
                </>
              )}
            </button>
          </div>
        ) : (
          // Results Stage
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl p-2 border border-[#D1CFC8] flex gap-2">
              <button
                onClick={() => setActiveTab('ats')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'ats'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                ATS Score
              </button>
              {jobMatchResult && (
                <button
                  onClick={() => setActiveTab('match')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'match'
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#4A4A4A] hover:bg-[#EDEBE6]'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  Job Match
                </button>
              )}
              <button
                onClick={() => setActiveTab('fixes')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'fixes'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Quick Fixes
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                ATS Simulator
              </button>
            </div>

            {/* ATS Score Tab */}
            {activeTab === 'ats' && atsResult && (
              <AtsScoreView result={atsResult} />
            )}

            {/* Job Match Tab */}
            {activeTab === 'match' && jobMatchResult && (
              <JobMatchView result={jobMatchResult} onOpenBuilder={openSelectedDocument} />
            )}

            {/* Quick Fixes Tab */}
            {activeTab === 'fixes' && atsResult && (
              <QuickFixesView recommendations={atsResult.recommendations} onOpenBuilder={openSelectedDocument} />
            )}

            {/* ATS Simulator Tab */}
            {activeTab === 'simulator' && atsResult && (
              <AtsSimulatorView parsedData={atsResult.parsedData} />
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-6 border border-[#D1CFC8]">
              <button
                onClick={() => setAtsResult(null)}
                className="px-6 py-3 bg-[#EDEBE6] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#D1CFC8] transition-colors"
              >
                Analyze Another CV
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={exportReport}
                  className="px-6 py-3 bg-white border border-[#D1CFC8] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#EDEBE6] transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fixes')}
                  className="px-6 py-3 bg-[#4F7563] text-white rounded-lg font-medium hover:bg-[#355846] transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Apply All Fixes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Phase Ω.4 — beta feedback widget */}
      <FeedbackWidget context={{ page: 'ats' }} />
    </div>
  );
}

// =============================================================================
// ATS SCORE VIEW
// =============================================================================

function AtsScoreView({ result }: { result: AtsAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-[#4F7563] rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium opacity-90 mb-2">Overall ATS Score</h2>
            <div className="text-6xl font-bold">{result.overallScore}</div>
            <p className="text-lg opacity-90 mt-2">{getScoreLabel(result.overallScore)}</p>
          </div>
          <div className="w-32 h-32 rounded-full border-8 border-white/30 flex items-center justify-center">
            <Shield className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Score Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(result.breakdown).map(([key, category]: [string, any]) => (
            <ScoreCategoryCard key={key} name={key} category={category} />
          ))}
        </div>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {result.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {result.risks.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
          <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Risks & Issues
          </h3>
          <div className="space-y-4">
            {result.risks.map((risk, i) => (
              <div key={i} className="flex gap-4">
                <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${
                  risk.severity === 'high' ? 'bg-red-500' :
                  risk.severity === 'medium' ? 'bg-orange-500' :
                  'bg-yellow-500'
                }`} />
                <div>
                  <p className="font-semibold text-red-900">{risk.description}</p>
                  <p className="text-sm text-red-700 mt-1">Fix: {risk.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCategoryCard({ name, category }: { name: string; category: AtsScoreCategory }) {
  const icon = getCategoryIcon(name);
  return (
    <div className="border border-[#D1CFC8] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h4 className="font-semibold text-[#1A1A1A] capitalize">{name}</h4>
            <p className="text-sm text-[#6B6B6B]">{category.details}</p>
          </div>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
          {category.score}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-[#EDEBE6] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            category.status === 'excellent' ? 'bg-green-500' :
            category.status === 'good' ? 'bg-blue-500' :
            category.status === 'needs-improvement' ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      
      {/* Issues & Suggestions */}
      {category.issues.length > 0 && (
        <div className="mt-4 space-y-2">
          {category.issues.map((issue, i) => (
            <p key={i} className="text-sm text-red-600 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {issue}
            </p>
          ))}
        </div>
      )}
      {category.suggestions.length > 0 && (
        <div className="mt-2 space-y-2">
          {category.suggestions.slice(0, 2).map((suggestion, i) => (
            <p key={i} className="text-sm text-blue-600 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// JOB MATCH VIEW
// =============================================================================

function JobMatchView({ result, onOpenBuilder }: { result: JobMatchResult; onOpenBuilder: () => void }) {
  return (
    <div className="space-y-6">
      {/* Overall Match */}
      <div className={`rounded-2xl p-8 text-white ${
        result.recommendation === 'strong-match' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
        result.recommendation === 'good-match' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
        result.recommendation === 'partial-match' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
        'bg-gradient-to-br from-red-500 to-rose-600'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium opacity-90 mb-2">Job Match Score</h2>
            <div className="text-6xl font-bold">{result.overallMatch}%</div>
            <p className="text-lg opacity-90 mt-2 capitalize">
              {result.recommendation.replace('-', ' ')}
            </p>
          </div>
          <Target className="w-24 h-24 opacity-50" />
        </div>
      </div>

      {/* Match Breakdown */}
      <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Match Breakdown</h3>
        <div className="space-y-6">
          {Object.entries(result.breakdown).map(([key, cat]: [string, any]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#1A1A1A] capitalize">{key}</span>
                <span className={`font-bold ${getScoreColor(cat.score)}`}>{cat.score}%</span>
              </div>
              <p className="text-sm text-[#6B6B6B] mb-2">{cat.details}</p>
              {cat.matched.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {cat.matched.slice(0, 5).map((item: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              )}
              {cat.missing.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cat.missing.slice(0, 5).map((item: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      ✗ {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Gaps to Address</h3>
          <div className="space-y-4">
            {result.gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-4 p-4 border border-[#D1CFC8] rounded-xl">
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  gap.severity === 'critical' ? 'bg-red-100 text-red-600' :
                  gap.severity === 'important' ? 'bg-orange-100 text-orange-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#1A1A1A]">{gap.item}</h4>
                  <p className="text-sm text-[#6B6B6B] mt-1">{gap.description}</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenBuilder}
                  className="shrink-0 px-4 py-2 bg-[#4F7563] text-white rounded-lg text-sm font-medium hover:bg-[#355846] transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <h3 className="text-xl font-bold text-green-900 mb-4">Your Strengths for This Role</h3>
          <div className="space-y-2">
            {result.strengths.map((strength, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">{strength.item}</p>
                  <p className="text-sm text-green-700">{strength.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// QUICK FIXES VIEW
// =============================================================================

function QuickFixesView({ recommendations, onOpenBuilder }: { recommendations: AtsRecommendation[]; onOpenBuilder: () => void }) {
  const critical = recommendations.filter(r => r.type === 'critical');
  const important = recommendations.filter(r => r.type === 'important');
  const suggested = recommendations.filter(r => r.type === 'suggested');
  
  return (
    <div className="space-y-6">
      {critical.length > 0 && (
        <RecommendationSection
          title="Critical Fixes"
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          color="red"
          recommendations={critical}
          onOpenBuilder={onOpenBuilder}
        />
      )}
      
      {important.length > 0 && (
        <RecommendationSection
          title="Important Improvements"
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          color="orange"
          recommendations={important}
          onOpenBuilder={onOpenBuilder}
        />
      )}
      
      {suggested.length > 0 && (
        <RecommendationSection
          title="Suggested Enhancements"
          icon={<Sparkles className="w-6 h-6 text-blue-600" />}
          color="blue"
          recommendations={suggested}
          onOpenBuilder={onOpenBuilder}
        />
      )}
    </div>
  );
}

function RecommendationSection({ 
  title, 
  icon, 
  color, 
  recommendations,
  onOpenBuilder,
}: { 
  title: string; 
  icon: React.ReactNode; 
  color: string; 
  recommendations: AtsRecommendation[];
  onOpenBuilder: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
      <h3 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="p-6 border border-[#D1CFC8] rounded-xl hover:border-[#1A1A1A] transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-[#1A1A1A]">{rec.title}</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                color === 'red' ? 'bg-red-100 text-red-700' :
                color === 'orange' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {rec.impact}
              </span>
            </div>
            <p className="text-sm text-[#6B6B6B] mb-4">{rec.description}</p>
            <button
              type="button"
              onClick={onOpenBuilder}
              className="w-full py-2 bg-[#4F7563] text-white rounded-lg font-medium hover:bg-[#355846] transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Apply Fix
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ATS SIMULATOR VIEW
// =============================================================================

function AtsSimulatorView({ parsedData }: { parsedData: AtsParsedData }) {
  return (
    <div className="space-y-6">
      {/* Parse Success Rate */}
      <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#1A1A1A]">ATS Parsing Success Rate</h3>
          <div className={`text-3xl font-bold ${getScoreColor(parsedData.parseSuccessRate)}`}>
            {parsedData.parseSuccessRate}%
          </div>
        </div>
        
        <div className="w-full h-4 bg-[#EDEBE6] rounded-full overflow-hidden mb-4">
          <div 
            className={`h-full ${
              parsedData.parseSuccessRate >= 85 ? 'bg-green-500' :
              parsedData.parseSuccessRate >= 70 ? 'bg-blue-500' :
              parsedData.parseSuccessRate >= 50 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${parsedData.parseSuccessRate}%` }}
          />
        </div>
        
        <p className="text-sm text-[#6B6B6B]">
          This shows how successfully ATS systems can extract information from your CV
        </p>
      </div>

      {/* What ATS Sees */}
      <div className="bg-white rounded-2xl p-8 border border-[#D1CFC8]">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">What ATS Systems See</h3>
        
        <div className="space-y-6">
          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-[#1A1A1A] mb-3">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Name" value={parsedData.name} />
              <InfoField label="Email" value={parsedData.email} />
              <InfoField label="Phone" value={parsedData.phone} />
              <InfoField label="Location" value={parsedData.location} />
            </div>
          </div>
          
          {/* Skills */}
          {parsedData.skills.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#1A1A1A] mb-3">Parsed Skills ({parsedData.skills.length})</h4>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-[#EEF5F1] text-[#355846] rounded-lg text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Experience */}
          {parsedData.experience.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#1A1A1A] mb-3">Parsed Experience ({parsedData.experience.length})</h4>
              <div className="space-y-3">
                {parsedData.experience.map((exp, i) => (
                  <div key={i} className={`p-4 rounded-lg ${exp.parsed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{exp.title || '❌ Title not parsed'}</p>
                        <p className="text-sm text-[#6B6B6B]">{exp.company || '❌ Company not parsed'}</p>
                      </div>
                      {exp.parsed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Education */}
          {parsedData.education.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#1A1A1A] mb-3">Parsed Education ({parsedData.education.length})</h4>
              <div className="space-y-3">
                {parsedData.education.map((edu, i) => (
                  <div key={i} className={`p-4 rounded-lg ${edu.parsed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{edu.degree || '❌ Degree not parsed'}</p>
                        <p className="text-sm text-[#6B6B6B]">{edu.school || '❌ School not parsed'}</p>
                      </div>
                      {edu.parsed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parsing Issues */}
      {parsedData.parsingIssues.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
          <h3 className="text-xl font-bold text-red-900 mb-4">Parsing Issues Detected</h3>
          <ul className="space-y-2">
            {parsedData.parsingIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-3 bg-[#EDEBE6] rounded-lg">
      <div className="text-xs text-[#6B6B6B] mb-1">{label}</div>
      <div className={`text-sm font-medium ${value ? 'text-[#1A1A1A]' : 'text-red-600'}`}>
        {value || '❌ Not parsed'}
      </div>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent ATS Compatibility';
  if (score >= 70) return 'Good ATS Compatibility';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor ATS Compatibility';
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    keywords: <Search className="w-5 h-5 text-blue-600" />,
    skills: <Brain className="w-5 h-5 text-purple-600" />,
    experience: <Briefcase className="w-5 h-5 text-orange-600" />,
    education: <GraduationCap className="w-5 h-5 text-green-600" />,
    formatting: <FileText className="w-5 h-5 text-cyan-600" />,
    sections: <BarChart3 className="w-5 h-5 text-pink-600" />,
    readability: <Eye className="w-5 h-5 text-indigo-600" />
  };
  return icons[category] || <FileText className="w-5 h-5 text-gray-600" />;
}
