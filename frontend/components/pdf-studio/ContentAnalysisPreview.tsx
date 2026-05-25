'use client';

import { AlertCircle, CheckCircle, TrendingUp, Tag, List, FileText } from 'lucide-react';

interface ContentAnalysisPreviewProps {
  analysis: {
    detectedType: string;
    confidence: number;
    primaryLanguage?: string;
    contentLength?: number;
    wordCount: number;
    characterCount: number;
    keywords: string[];
    topics: string[];
    categories: string[];
    hasTitle: boolean;
    hasHeadings: boolean;
    hasBullets: boolean;
    hasNumbers: boolean;
    sectionCount: number;
    paragraphCount: number;
    readabilityScore: number;
    grammarIssues: number;
    spellingIssues: number;
    clarityScore: number;
    suggestedTitle?: string;
    suggestedSections?: Array<{ title: string; type: string }> | string[];
  };
}

export function ContentAnalysisPreview({ analysis }: ContentAnalysisPreviewProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-[#4F7563] bg-[#EEF5F1] border-[#DDE8E1]';
    if (confidence >= 0.6) return 'text-[#8c6210] bg-[#FAEEDB] border-[#F2DCAE]';
    return 'text-[#8c6210] bg-[#FAEEDB] border-orange-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#4F7563]';
    if (score >= 50) return 'text-[#8c6210]';
    return 'text-[#9a3737]';
  };

  const getTypeLabel = (type: string) => {
    // Handle various type formats
    const cleanType = type?.toLowerCase() || '';
    
    const labels: Record<string, string> = {
      'business': 'Business Document',
      'business overview': 'Business Overview',
      'academic': 'Academic Paper',
      'report': 'Report',
      'technical': 'Technical Documentation',
      'article': 'Article',
      'notes': 'Notes',
      'notes document': 'Notes Document',
      'mixed': 'Mixed Content',
      'general document': 'General Document',
      'startup': 'Startup Pitch',
    };
    
    // Return matched label or capitalize the original type
    return labels[cleanType] || type?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Document';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#DDE8E1] rounded-lg flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-[#4F7563]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#111111]">Content Analysis Complete</h3>
          <p className="text-sm text-[#6B6B6B]">Here's what we detected in your content</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Document Type */}
          <div>
            <h4 className="text-sm font-medium text-[#111111] mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Type
            </h4>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getConfidenceColor(analysis.confidence)}`}>
              <span className="font-semibold">{getTypeLabel(analysis.detectedType)}</span>
              <span className="text-xs opacity-75">
                {Math.round(analysis.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          {/* Content Statistics */}
          <div>
            <h4 className="text-sm font-medium text-[#111111] mb-3">Content Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#EDEBE6] rounded-lg">
                <div className="text-2xl font-bold text-[#111111]">{analysis.wordCount || 0}</div>
                <div className="text-xs text-[#6B6B6B]">Words</div>
              </div>
              <div className="p-3 bg-[#EDEBE6] rounded-lg">
                <div className="text-2xl font-bold text-[#111111]">{analysis.characterCount || 0}</div>
                <div className="text-xs text-[#6B6B6B]">Characters</div>
              </div>
              <div className="p-3 bg-[#EDEBE6] rounded-lg">
                <div className="text-2xl font-bold text-[#111111]">{analysis.paragraphCount || 0}</div>
                <div className="text-xs text-[#6B6B6B]">Paragraphs</div>
              </div>
              <div className="p-3 bg-[#EDEBE6] rounded-lg">
                <div className="text-2xl font-bold text-[#111111]">{analysis.sectionCount || 0}</div>
                <div className="text-xs text-[#6B6B6B]">Sections</div>
              </div>
            </div>
          </div>

          {/* Features Detected */}
          <div>
            <h4 className="text-sm font-medium text-[#111111] mb-3">Features Detected</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {analysis.hasTitle ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-300" />
                )}
                <span className={`text-sm ${analysis.hasTitle ? 'text-[#111111]' : 'text-[#C9C6BD]'}`}>
                  Title
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.hasHeadings ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-300" />
                )}
                <span className={`text-sm ${analysis.hasHeadings ? 'text-[#111111]' : 'text-[#C9C6BD]'}`}>
                  Headings
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.hasBullets ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-300" />
                )}
                <span className={`text-sm ${analysis.hasBullets ? 'text-[#111111]' : 'text-[#C9C6BD]'}`}>
                  Bullet Points
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.hasNumbers ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-300" />
                )}
                <span className={`text-sm ${analysis.hasNumbers ? 'text-[#111111]' : 'text-[#C9C6BD]'}`}>
                  Numbers/Data
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quality Scores */}
          <div>
            <h4 className="text-sm font-medium text-[#111111] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Quality Metrics
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#6B6B6B]">Readability</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.readabilityScore || 0)}`}>
                    {Math.round(analysis.readabilityScore || 0)}/100
                  </span>
                </div>
                <div className="w-full bg-[#E3E1DA] rounded-full h-2">
                  <div
                    className="bg-[#4F7563] h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, analysis.readabilityScore || 0))}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#6B6B6B]">Clarity</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.clarityScore || 0)}`}>
                    {Math.round(analysis.clarityScore || 0)}/100
                  </span>
                </div>
                <div className="w-full bg-[#E3E1DA] rounded-full h-2">
                  <div
                    className="bg-[#4F7563] h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, analysis.clarityScore || 0))}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Issues */}
            <div className="mt-4 space-y-2">
              {analysis.grammarIssues > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#8c6210]">
                  <AlertCircle className="w-4 h-4" />
                  {analysis.grammarIssues} potential grammar issue{analysis.grammarIssues > 1 ? 's' : ''}
                </div>
              )}
              {analysis.spellingIssues > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#8c6210]">
                  <AlertCircle className="w-4 h-4" />
                  {analysis.spellingIssues} potential spelling issue{analysis.spellingIssues > 1 ? 's' : ''}
                </div>
              )}
              {analysis.grammarIssues === 0 && analysis.spellingIssues === 0 && (
                <div className="flex items-center gap-2 text-sm text-[#4F7563]">
                  <CheckCircle className="w-4 h-4" />
                  No major issues detected
                </div>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <h4 className="text-sm font-medium text-[#111111] mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.slice(0, 8).map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[#EEF5F1] text-[#355846] text-xs font-medium rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Topics */}
          {analysis.topics && analysis.topics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#111111] mb-3">Topics</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#EEF5F1] text-[#355846] text-xs font-medium rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Title */}
      {analysis.suggestedTitle && (
        <div className="mt-6 pt-6 border-t border-[#E3E1DA]">
          <h4 className="text-sm font-medium text-[#111111] mb-2">Suggested Title</h4>
          <div className="text-lg font-semibold text-[#111111]">{analysis.suggestedTitle}</div>
        </div>
      )}

      {/* Suggested Structure */}
      {analysis.suggestedSections && analysis.suggestedSections.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#E3E1DA]">
          <h4 className="text-sm font-medium text-[#111111] mb-3 flex items-center gap-2">
            <List className="w-4 h-4" />
            Suggested Structure ({analysis.suggestedSections.length} sections)
          </h4>
          <div className="space-y-2">
            {analysis.suggestedSections.map((section, index) => {
              const sectionTitle = typeof section === 'string' ? section : section.title;
              return (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 bg-[#DDE8E1] text-[#4F7563] rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-[#111111]">{sectionTitle}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
