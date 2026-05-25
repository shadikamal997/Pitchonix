'use client';

import { Check, ArrowRight } from 'lucide-react';

interface Section {
  title: string;
  content: string;
  type: string;
}

interface EnhancementPreviewProps {
  originalContent: string;
  enhancedContent?: string;
  sections?: Section[];
  fixedIssues?: string[];
  improvement?: number;
}

export function EnhancementPreview({
  originalContent,
  enhancedContent,
  sections,
  fixedIssues,
  improvement,
}: EnhancementPreviewProps) {
  if (!enhancedContent && !sections) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {improvement !== undefined && (
        <div className="bg-[#EEF5F1] border-2 border-[#DDE8E1] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#DDE8E1] rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-[#4F7563]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                Content Enhanced Successfully!
              </h3>
              <p className="text-sm text-[#355846]">
                {improvement.toFixed(1)}% improvement in quality
              </p>
            </div>
          </div>

          {fixedIssues && fixedIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-900">Fixed Issues:</p>
              <div className="flex flex-wrap gap-2">
                {fixedIssues.map((issue, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white text-green-800 text-xs font-medium rounded-full border border-[#DDE8E1]"
                  >
                    <Check className="w-3 h-3 inline mr-1" />
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Before/After Comparison */}
      {enhancedContent && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#FCF1F1] border-2 border-[#F7E3E3] rounded-xl p-6">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#F7E3E3] rounded-full flex items-center justify-center text-xs">
                1
              </span>
              Original Content
            </h4>
            <div className="bg-white p-4 rounded-lg border border-[#F7E3E3] max-h-60 overflow-y-auto">
              <p className="text-sm text-[#111111] whitespace-pre-wrap">
                {originalContent.substring(0, 500)}
                {originalContent.length > 500 && '...'}
              </p>
            </div>
          </div>

          <div className="bg-[#EEF5F1] border-2 border-[#DDE8E1] rounded-xl p-6">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#DDE8E1] rounded-full flex items-center justify-center text-xs">
                2
              </span>
              Enhanced Content
              <ArrowRight className="w-4 h-4 ml-auto text-[#4F7563]" />
            </h4>
            <div className="bg-white p-4 rounded-lg border border-[#DDE8E1] max-h-60 overflow-y-auto">
              <p className="text-sm text-[#111111] whitespace-pre-wrap">
                {enhancedContent.substring(0, 500)}
                {enhancedContent.length > 500 && '...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Structured Sections */}
      {sections && sections.length > 0 && (
        <div className="bg-white border-2 border-blue-100 rounded-xl p-6">
          <h4 className="font-semibold text-[#111111] mb-4">
            Structured Sections ({sections.length})
          </h4>
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={index}
                className="border border-[#E3E1DA] rounded-lg p-4 hover:border-[#A8B9AE] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-6 h-6 bg-[#DDE8E1] text-[#4F7563] rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <h5 className="font-semibold text-[#111111]">{section.title}</h5>
                  <span className="ml-auto px-2 py-1 bg-[#F1F0EC] text-[#6B6B6B] text-xs rounded">
                    {section.type}
                  </span>
                </div>
                <p className="text-sm text-[#6B6B6B] line-clamp-2 pl-9">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
